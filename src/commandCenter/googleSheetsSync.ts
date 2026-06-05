import type { WorkbookExportTable, WorkbookExportValue } from './workbookProjectFlow';

export const googleSheetsScope = 'https://www.googleapis.com/auth/spreadsheets';
export const jdtCommandCenterSpreadsheetId = '1hhth3Z9DRnVdDiLNZLvLtIME7N6wSfsd8Qz1xJNM1VY';

type SheetsFetch = typeof fetch;

type SheetsApiResponse = {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
};

export type WriteWorkbookExportOptions = {
  accessToken: string;
  spreadsheetId?: string;
  tables: WorkbookExportTable[];
  fetchImpl?: SheetsFetch;
};

export type WriteWorkbookExportResult = {
  spreadsheetId: string;
  sheetNames: string[];
  rowCount: number;
};

export async function writeWorkbookExportTablesToSheets({
  accessToken,
  spreadsheetId = jdtCommandCenterSpreadsheetId,
  tables,
  fetchImpl = fetch,
}: WriteWorkbookExportOptions): Promise<WriteWorkbookExportResult> {
  if (!accessToken) throw new Error('Google Sheets authorization is required before writing workbook backups.');
  if (!tables.length) throw new Error('No workbook export tables were provided.');

  const metadata = await sheetsRequest<SheetsApiResponse>({
    accessToken,
    fetchImpl,
    url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`,
  });
  const existingNames = new Set((metadata.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean) as string[]);
  const missingTables = tables.filter((table) => !existingNames.has(table.sheetName));

  if (missingTables.length > 0) {
    await sheetsRequest({
      accessToken,
      fetchImpl,
      url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      method: 'POST',
      body: {
        requests: missingTables.map((table) => ({
          addSheet: {
            properties: {
              title: table.sheetName,
              gridProperties: {
                frozenRowCount: 1,
                rowCount: Math.max(table.rows.length + 50, 1000),
                columnCount: Math.max(table.columns.length, 10),
              },
            },
          },
        })),
      },
    });
  }

  for (const table of tables) {
    const quotedName = quoteSheetNameForA1(table.sheetName);
    await sheetsRequest({
      accessToken,
      fetchImpl,
      url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quotedName}!A:ZZ`)}:clear`,
      method: 'POST',
      body: {},
    });

    await sheetsRequest({
      accessToken,
      fetchImpl,
      url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quotedName}!A1`)}?valueInputOption=RAW`,
      method: 'PUT',
      body: {
        majorDimension: 'ROWS',
        values: tableValuesForSheetsApi(table),
      },
    });
  }

  return {
    spreadsheetId,
    sheetNames: tables.map((table) => table.sheetName),
    rowCount: tables.reduce((sum, table) => sum + table.rows.length, 0),
  };
}

export function tableValuesForSheetsApi(table: WorkbookExportTable): string[][] {
  return [
    table.columns,
    ...table.rows.map((row) => table.columns.map((column) => sheetsCellValue(row[column]))),
  ];
}

export function quoteSheetNameForA1(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

async function sheetsRequest<T = unknown>({
  accessToken,
  fetchImpl,
  url,
  method = 'GET',
  body,
}: {
  accessToken: string;
  fetchImpl: SheetsFetch;
  url: string;
  method?: string;
  body?: unknown;
}): Promise<T> {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Google Sheets API request failed (${response.status} ${response.statusText}): ${message || 'No response body'}`);
  }

  return response.json() as Promise<T>;
}

function sheetsCellValue(value: WorkbookExportValue): string {
  if (value === null || value === undefined) return '';
  return String(value);
}
