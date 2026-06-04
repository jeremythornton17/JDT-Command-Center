import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ImportPreview } from "./sheetImport";
import {
  applyImportBatch,
  rollbackImportBatch,
  type ImportCollections,
} from "./importWorkflow";

describe("import workflow", () => {
  const preview: ImportPreview = {
    templateId: "inventory",
    label: "JDT Inventory",
    sourceSheet: "JDT Inventory Master List",
    warnings: ["1 warning"],
    targets: [
      {
        collectionName: "inventoryItems",
        label: "InventoryItems",
        warnings: [],
        records: [
          { id: "inventory-new", name: "New Fox Tail", quantity: 38 },
          { id: "inventory-existing", name: "Updated Oak", quantity: 12 },
        ],
      },
    ],
  };

  it("builds an import batch with created and updated record audit detail", () => {
    const current: ImportCollections = {
      inventoryItems: [
        { id: "inventory-existing", name: "Old Oak", quantity: 10 },
        { id: "inventory-keep", name: "Keep Me", quantity: 1 },
      ],
    };

    const result = applyImportBatch(preview, current, {
      actorEmail: "regina@jdtnurseries.com",
      nowIso: "2026-05-31T15:00:00.000Z",
    });

    assert.equal(result.batch.recordCount, 2);
    assert.equal(result.batch.createdCount, 1);
    assert.equal(result.batch.updatedCount, 1);
    assert.deepEqual(result.batch.targets[0].createdIds, ["inventory-new"]);
    assert.deepEqual(result.batch.targets[0].updatedIds, ["inventory-existing"]);
    assert.equal(result.batch.targets[0].previousRecords[0].name, "Old Oak");
    assert.equal(result.collections.inventoryItems?.find(item => item.id === "inventory-existing")?.quantity, 12);
    assert.equal(result.collections.inventoryItems?.find(item => item.id === "inventory-keep")?.quantity, 1);
  });

  it("rolls back created records and restores updated records from an import batch", () => {
    const applied = applyImportBatch(preview, {
      inventoryItems: [{ id: "inventory-existing", name: "Old Oak", quantity: 10 }],
    }, {
      actorEmail: "regina@jdtnurseries.com",
      nowIso: "2026-05-31T15:00:00.000Z",
    });

    const rolledBack = rollbackImportBatch(applied.collections, applied.batch);

    assert.equal(rolledBack.inventoryItems?.some(item => item.id === "inventory-new"), false);
    assert.equal(rolledBack.inventoryItems?.find(item => item.id === "inventory-existing")?.name, "Old Oak");
    assert.equal(rolledBack.inventoryItems?.find(item => item.id === "inventory-existing")?.quantity, 10);
  });
});
