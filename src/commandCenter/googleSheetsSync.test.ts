import test from "node:test";
import assert from "node:assert/strict";
import {
  googleSheetsScope,
  quoteSheetNameForA1,
  tableValuesForSheetsApi,
  writeWorkbookExportTablesToSheets,
} from "./googleSheetsSync";
import type { WorkbookExportTable } from "./workbookProjectFlow";

const sampleTable: WorkbookExportTable = {
  sheetName: "Project_Tree_Assets",
  primaryId: "Tree_Asset_ID",
  columns: ["Tree_Asset_ID", "Project_ID", "Tree_Type"],
  rows: [
    { Tree_Asset_ID: "BWCC-060426-TREE-1003", Project_ID: "BWCC-060426", Tree_Type: "Live Oak" },
  ],
};

test("uses the narrow Google Sheets OAuth scope for workbook writes", () => {
  assert.equal(googleSheetsScope, "https://www.googleapis.com/auth/spreadsheets");
});

test("formats workbook export tables into Sheets API values", () => {
  assert.deepEqual(tableValuesForSheetsApi(sampleTable), [
    ["Tree_Asset_ID", "Project_ID", "Tree_Type"],
    ["BWCC-060426-TREE-1003", "BWCC-060426", "Live Oak"],
  ]);
});

test("quotes sheet names for A1 ranges", () => {
  assert.equal(quoteSheetNameForA1("Project_Tree_Assets"), "'Project_Tree_Assets'");
  assert.equal(quoteSheetNameForA1("Bob's Sheet"), "'Bob''s Sheet'");
});

test("writes missing export sheets, clears old data, and updates values through Sheets API", async () => {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetchImpl: typeof fetch = async (input, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({
      url,
      method: init.method || "GET",
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (url.includes("?fields=sheets.properties")) {
      return response({ sheets: [{ properties: { sheetId: 1, title: "Existing" } }] });
    }

    return response({});
  };

  await writeWorkbookExportTablesToSheets({
    accessToken: "token",
    spreadsheetId: "sheet-id",
    tables: [sampleTable],
    fetchImpl,
  });

  assert.equal(calls[0].method, "GET");
  assert.match(calls[1].url, /:batchUpdate$/);
  assert.deepEqual((calls[1].body as any).requests[0].addSheet.properties.title, "Project_Tree_Assets");
  assert.match(calls[2].url, /values\/'Project_Tree_Assets'!A%3AZZ:clear$/);
  assert.match(calls[3].url, /values\/'Project_Tree_Assets'!A1\?/);
  assert.deepEqual((calls[3].body as any).values, tableValuesForSheetsApi(sampleTable));
});

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}
