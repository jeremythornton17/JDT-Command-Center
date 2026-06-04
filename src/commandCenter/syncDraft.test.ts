import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDataSyncDraft,
  serializeDataSyncDraft,
} from "./syncDraft";

describe("data sync draft persistence", () => {
  it("preserves pasted spreadsheet rows and the selected import template across refresh", () => {
    const pastedRows = "Farm ID\tZone\tSpecies\tQuantity\n25 Acre\t1 Back\tPodocarpus Weeping\t4";
    const serialized = serializeDataSyncDraft({
      templateId: "inventory",
      pastedRows,
      savedAtIso: "2026-05-31T15:30:00.000Z",
    });

    assert.deepEqual(parseDataSyncDraft(serialized), {
      templateId: "inventory",
      pastedRows,
      savedAtIso: "2026-05-31T15:30:00.000Z",
    });
  });

  it("rejects stale draft payloads with an unknown import template", () => {
    const serialized = JSON.stringify({
      templateId: "old-inventory-template",
      pastedRows: "Tree\tQty\nOak\t2",
    });

    assert.equal(parseDataSyncDraft(serialized), null);
  });
});
