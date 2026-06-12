import { parseDelimitedRows } from './sheetImport';

export type ImportPasteGridColumns = Record<string, string>;
export type ImportPasteGridPreviewRow = {
  rowNumber: number;
  cells: string[];
};

export function columnTextsToDelimitedRows(headers: string[], columns: ImportPasteGridColumns): string {
  const columnRows = headers.map((header) => splitColumnText(columns[header] || ''));
  const rowCount = Math.max(0, ...columnRows.map((rows) => rows.length));
  const rows: string[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = columnRows.map((rows) => cleanGridCell(rows[rowIndex] || ''));
    if (!cells.some(Boolean)) continue;
    rows.push(cells.join('\t'));
  }

  return rows.join('\n');
}

export function delimitedRowsToColumnTexts(headers: string[], text: string): ImportPasteGridColumns {
  const rows = dropSelectedHeaderRow(parseDelimitedRows(text), headers);
  return Object.fromEntries(headers.map((header, columnIndex) => [
    header,
    trimTrailingBlankCells(rows.map((row) => cleanGridCell(row[columnIndex] || ''))).join('\n'),
  ]));
}

export function previewRowsFromColumnTexts(headers: string[], columns: ImportPasteGridColumns): ImportPasteGridPreviewRow[] {
  const columnRows = headers.map((header) => splitColumnText(columns[header] || ''));
  const rowCount = Math.max(0, ...columnRows.map((rows) => rows.length));
  const previewRows: ImportPasteGridPreviewRow[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const cells = columnRows.map((rows) => cleanGridCell(rows[rowIndex] || ''));
    if (!cells.some(Boolean)) continue;
    previewRows.push({ rowNumber: rowIndex + 1, cells });
  }

  return previewRows;
}

export function emptyColumnTexts(headers: string[]): ImportPasteGridColumns {
  return Object.fromEntries(headers.map((header) => [header, '']));
}

function splitColumnText(text: string): string[] {
  const rows = String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(cleanGridCell);
  return trimTrailingBlankCells(rows);
}

function trimTrailingBlankCells(cells: string[]): string[] {
  const trimmed = [...cells];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1]) trimmed.pop();
  return trimmed;
}

function cleanGridCell(value: string): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\t+/g, ' ').trim();
}

function dropSelectedHeaderRow(rows: string[][], headers: string[]): string[][] {
  if (!rows.length) return rows;
  const selected = headers.map(normalizedGridHeader);
  const first = rows[0].map(normalizedGridHeader);
  const matches = selected.every((header, index) => first[index] === header);
  return matches ? rows.slice(1) : rows;
}

function normalizedGridHeader(value: string): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
