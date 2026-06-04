import test from "node:test";
import assert from "node:assert/strict";
import {
  jdtProjectFlowWorkbook,
  workbookTabForWorkOrderType,
  workOrderTypeForWorkbookTab,
  sourceRefFromWorkbookRow,
} from "./workbookProjectFlow";

test("JDT Project Flow Workbook exposes every canonical tab and ID field", () => {
  assert.equal(jdtProjectFlowWorkbook.title, "JDT Project Flow Workbook");
  assert.equal(jdtProjectFlowWorkbook.spreadsheetId, "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg");

  assert.equal(jdtProjectFlowWorkbook.tabs.Companies.primaryId, "Companies_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Projects.primaryId, "Projects_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Tree Assets"].primaryId, "Tree_Assets_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Tree Pruning"].primaryId, "Tree_Prune_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Move Readiness"].primaryId, "Move_Readiness_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Daily Field Updates"].primaryId, "Daily Field Updates_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.primaryId, "Project_Material_Items_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.appPurpose, "project_material_items");
});

test("maps workbook operating tabs to work-order types", () => {
  assert.equal(workOrderTypeForWorkbookTab("Tree Pruning"), "tree_pruning");
  assert.equal(workOrderTypeForWorkbookTab("Treatment / Aftercare"), "treatment_aftercare");
  assert.equal(workOrderTypeForWorkbookTab("Move Readiness"), "move_readiness");
  assert.equal(workOrderTypeForWorkbookTab("Change Orders"), "change_order");
  assert.equal(workOrderTypeForWorkbookTab("Billing Milestones"), "billing_milestone");
  assert.equal(workOrderTypeForWorkbookTab("Daily Field Updates"), "daily_field_update");
  assert.equal(workbookTabForWorkOrderType("move_readiness"), "Move Readiness");
});

test("builds source references from workbook rows", () => {
  assert.deepEqual(sourceRefFromWorkbookRow("Tree Pruning", {
    Tree_Assets_ID: "tree-boca-001",
    Tree_Prune_ID: "prune-boca-001",
  }, 12), {
    sourceType: "google_sheet",
    spreadsheetId: "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg",
    spreadsheetName: "JDT Nurseries",
    sheetName: "Tree Pruning",
    rowNumber: 12,
    rowId: "prune-boca-001",
  });
});
