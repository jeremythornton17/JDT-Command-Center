import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  columnTextsToDelimitedRows,
  delimitedRowsToColumnTexts,
  previewRowsFromColumnTexts,
} from "./importPasteGrid";

describe("spreadsheet-style import paste grid", () => {
  it("combines separate pasted columns into import rows", () => {
    const rows = columnTextsToDelimitedRows(["Tree_Type", "Tag", "DBH_IN"], {
      Tree_Type: "Live Oak\nLive Oak\nGumbo Limbo",
      Tag: "1\n2\n3",
      DBH_IN: "33\n28\n14",
    });

    assert.equal(rows, "Live Oak\t1\t33\nLive Oak\t2\t28\nGumbo Limbo\t3\t14");
  });

  it("keeps rows aligned when only one selected column has a blank middle value", () => {
    const rows = columnTextsToDelimitedRows(["Tree_Type", "Tag", "DBH_IN"], {
      Tree_Type: "Live Oak\nLive Oak\nGumbo Limbo",
      Tag: "1\n2\n3",
      DBH_IN: "33\n\n14",
    });

    assert.equal(rows, "Live Oak\t1\t33\nLive Oak\t2\t\nGumbo Limbo\t3\t14");
  });

  it("restores grid columns from a saved data-only draft", () => {
    const columns = delimitedRowsToColumnTexts(
      ["Tree_Type", "Tag", "DBH_IN"],
      "Live Oak\t1\t33\nLive Oak\t2\t28",
    );

    assert.deepEqual(columns, {
      Tree_Type: "Live Oak\nLive Oak",
      Tag: "1\n2",
      DBH_IN: "33\n28",
    });
  });

  it("builds a compact row preview from selected column text", () => {
    assert.deepEqual(previewRowsFromColumnTexts(["Tree_Type", "Tag"], {
      Tree_Type: "Live Oak\nGumbo Limbo",
      Tag: "1\n2",
    }), [
      { rowNumber: 1, cells: ["Live Oak", "1"] },
      { rowNumber: 2, cells: ["Gumbo Limbo", "2"] },
    ]);
  });
});
