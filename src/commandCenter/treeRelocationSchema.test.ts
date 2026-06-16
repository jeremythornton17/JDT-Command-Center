import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assetCategoryOptions,
  carePhaseOptions,
  currentFieldLocationOptions,
  mapGeometryStatusOptions,
  migrateTreeRelocationSchemaRecords,
  moveTaskStatusOptions,
  moveTypeOptions,
  rootPruneTaskStatusOptions,
  treeFinalOutcomeOptions,
  treeRelocationStatusFromMove,
  treeRelocationStatusFromRootPrunePercent,
  treeRelocationStatusOptions,
  type TreeRelocationSchemaMigrationInput,
} from "./treeRelocationSchema";

describe("tree relocation operating schema", () => {
  it("uses JDT relocation-specific categories, final outcomes, statuses, and task phases", () => {
    assert.deepEqual(assetCategoryOptions, ["Relocation", "Installation", "Relocation + Installation"]);
    assert.equal(assetCategoryOptions.includes("Preservation"), false);
    assert.equal(assetCategoryOptions.includes("Removal"), false);
    assert.deepEqual(treeFinalOutcomeOptions, [
      "Active in Scope",
      "Preserved by Client",
      "Removed by Client",
      "Removed by Others",
      "Cancelled from Scope",
      "Completed by JDT",
    ]);
    assert.deepEqual(treeRelocationStatusOptions, [
      "Not Started",
      "25% Cut",
      "50% Cut",
      "75% Cut",
      "100% Cut",
      "Ready for Relocation",
      "Moved to Holding",
      "Relocated",
    ]);
    assert.deepEqual(currentFieldLocationOptions, ["Existing Location", "Holding Area", "Final Location", "Nursery", "Offsite", "Unknown"]);
    assert.deepEqual(mapGeometryStatusOptions, ["Missing", "Parsed", "Synced", "Error"]);
    assert.deepEqual(rootPruneTaskStatusOptions, ["Not Assigned", "Assigned", "Scheduled", "In Progress", "Completed", "Blocked", "On Hold", "Cancelled"]);
    assert.deepEqual(moveTaskStatusOptions, ["Not Assigned", "Assigned", "Scheduled", "In Progress", "Moved to Holding", "Relocated", "Blocked", "On Hold", "Cancelled"]);
    assert.deepEqual(moveTypeOptions, ["Existing to Holding", "Holding to Final", "Existing to Final", "Nursery to Final", "Final Adjustment"]);
    assert.equal(carePhaseOptions.includes("After Root Prune Event"), true);
  });

  it("maps root pruning event completion and move completion to the tree relocation pipeline status", () => {
    assert.equal(treeRelocationStatusFromRootPrunePercent(25), "25% Cut");
    assert.equal(treeRelocationStatusFromRootPrunePercent(50), "50% Cut");
    assert.equal(treeRelocationStatusFromRootPrunePercent(75), "75% Cut");
    assert.equal(treeRelocationStatusFromRootPrunePercent(100), "100% Cut");
    assert.equal(treeRelocationStatusFromRootPrunePercent(10), undefined);
    assert.equal(treeRelocationStatusFromMove("Existing to Holding"), "Moved to Holding");
    assert.equal(treeRelocationStatusFromMove("Existing to Final"), "Relocated");
    assert.equal(treeRelocationStatusFromMove("Holding to Final"), "Relocated");
  });

  it("migrates legacy tree records without deleting old source fields or changing stable ids", () => {
    const input: TreeRelocationSchemaMigrationInput = {
      treeAssets: [{
        id: "BWCC-060426-TREE-1003",
        treeId: "1003",
        projectId: "BWCC-060426",
        clientId: "CLI-2275",
        type: "Live Oak",
        currentStatus: "Active project status that should be preserved",
        relocationStatus: "2nd Cut Complete",
        preservationRequired: "Yes",
        removalRequired: "No",
        relocationRequired: "Yes",
        relocationMap: { source: { lat: 26.387315, lng: -80.1712583 }, destination: { lat: 26.388, lng: -80.172 } },
        appUpdatedAt: "2026-06-01T00:00:00.000Z",
        lastSyncBatchId: "batch-1",
        schemaVersion: "legacy",
      }],
      workOrders: [{
        id: "WO-BWCC-ROOT-1003",
        workOrderType: "tree_pruning",
        projectId: "BWCC-060426",
        clientId: "CLI-2275",
        treeIds: ["BWCC-060426-TREE-1003"],
        status: "Complete",
      }],
    };

    const migrated = migrateTreeRelocationSchemaRecords(input, { actorEmail: "jeremy@jdtnurseries.com", nowIso: "2026-06-14T12:00:00.000Z" });
    const tree = migrated.treeAssets[0] as any;
    const rootPrune = migrated.workOrders[0] as any;

    assert.equal(tree.id, "BWCC-060426-TREE-1003");
    assert.equal(tree.treeAssetId, "BWCC-060426-TREE-1003");
    assert.equal(tree.projectId, "BWCC-060426");
    assert.equal(tree.clientId, "CLI-2275");
    assert.equal(tree.currentStatus, "Active project status that should be preserved");
    assert.equal(tree.relocationStatus, "50% Cut");
    assert.equal(tree.treeRelocationStatus, "50% Cut");
    assert.equal(tree.assetCategory, "Relocation");
    assert.equal(tree.treeFinalOutcome, "Active in Scope");
    assert.equal(tree.mapGeometryStatus, "Parsed");
    assert.equal(tree.existingLatitude, 26.387315);
    assert.equal(tree.existingLongitude, -80.1712583);
    assert.equal(tree.destinationLatitude, 26.388);
    assert.equal(tree.destinationLongitude, -80.172);
    assert.equal(tree.appUpdatedAt, "2026-06-01T00:00:00.000Z");
    assert.equal(tree.lastSyncBatchId, "batch-1");
    assert.equal(rootPrune.rootPruneCycleId, "RPC-BWCC-060426-BWCC-060426-TREE-1003");
    assert.equal(rootPrune.rootPruneTaskStatus, "Completed");
  });
});
