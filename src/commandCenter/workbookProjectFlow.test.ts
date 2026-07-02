import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectWorkbookExport,
  buildWorkbookSetupTables,
  canonicalProjectWorkbookTabNames,
  jdtProjectFlowWorkbook,
  projectWorkbookSchemaVersion,
  workbookColumnsForTab,
  workbookTabForWorkOrderType,
  workOrderTypeForWorkbookTab,
  sourceRefFromWorkbookRow,
} from "./workbookProjectFlow";

test("JDT Project Flow Workbook exposes every canonical tab and ID field", () => {
  assert.equal(jdtProjectFlowWorkbook.title, "JDT Command Center");
  assert.equal(jdtProjectFlowWorkbook.spreadsheetId, "1hhth3Z9DRnVdDiLNZLvLtIME7N6wSfsd8Qz1xJNM1VY");
  assert.equal(projectWorkbookSchemaVersion, "2026-06-14");

  assert.equal(jdtProjectFlowWorkbook.tabs.Projects_Master.primaryId, "Project_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Tree_Assets.primaryId, "Tree_Asset_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Root_Pruning.primaryId, "Root_Pruning_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Tree_Relocation_Work.primaryId, "Relocation_Work_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Nutrient_Care.primaryId, "Nutrient_Care_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Tree_Photos.primaryId, "Tree_Photo_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.primaryId, "Material_Item_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Work_Purposes.primaryId, "Work_Purpose_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.appPurpose, "project_material_items");
  assert.deepEqual(canonicalProjectWorkbookTabNames, [
    "Projects_Master",
    "Project_Tree_Assets",
    "Project_Root_Pruning",
    "Project_Tree_Relocation_Work",
    "Project_Nutrient_Care",
    "Project_Tree_Photos",
    "Project_Material_Items",
    "Project_Work_Purposes",
  ]);
  assert.equal(workbookColumnsForTab("Project_Tree_Assets").includes("App_Updated_At"), true);
  assert.equal(workbookColumnsForTab("Project_Tree_Assets").includes("Tree_Relocation_Status"), true);
  assert.equal(workbookColumnsForTab("Project_Tree_Assets").includes("Current_Status"), false);
  assert.equal(workbookColumnsForTab("Project_Tree_Assets").includes("Tree_Final_Outcome"), true);
});

test("maps workbook operating tabs to work-order types", () => {
  assert.equal(workOrderTypeForWorkbookTab("Project_Root_Pruning"), "tree_pruning");
  assert.equal(workOrderTypeForWorkbookTab("Tree Pruning"), "tree_pruning");
  assert.equal(workOrderTypeForWorkbookTab("Project_Nutrient_Care"), "treatment_aftercare");
  assert.equal(workOrderTypeForWorkbookTab("Treatment / Aftercare"), "treatment_aftercare");
  assert.equal(workOrderTypeForWorkbookTab("Project_Tree_Relocation_Work"), "tree_relocation_work");
  assert.equal(workOrderTypeForWorkbookTab("Project_Work_Purposes"), "general_task");
  assert.equal(workbookTabForWorkOrderType("tree_pruning"), "Project_Root_Pruning");
  assert.equal(workbookTabForWorkOrderType("treatment_aftercare"), "Project_Nutrient_Care");
  assert.equal(workbookTabForWorkOrderType("tree_relocation_work"), "Project_Tree_Relocation_Work");
});

test("builds source references from workbook rows", () => {
  assert.deepEqual(sourceRefFromWorkbookRow("Project_Root_Pruning", {
    Tree_Asset_ID: "tree-boca-001",
    Root_Pruning_ID: "prune-boca-001",
  }, 12), {
    sourceType: "google_sheet",
    spreadsheetId: "1hhth3Z9DRnVdDiLNZLvLtIME7N6wSfsd8Qz1xJNM1VY",
    spreadsheetName: "JDT Command Center",
    sheetName: "Project_Root_Pruning",
    rowNumber: 12,
    rowId: "prune-boca-001",
  });
});

test("exports project records into canonical JDT Command Center workbook rows", () => {
  const tables = buildProjectWorkbookExport({
    projects: [{
      id: "BWCC-060426",
      title: "Boca West Course 1 Renovation",
      clientId: "CLI-2275",
      clientName: "Boca West Country Club",
      division: "Relocation & Installation",
      projectType: "Relocation Job",
      status: "Active",
      location: "20583 Boca West Dr, Boca Raton, FL 33434",
      constructionAccessPin: "26.387315,-80.1712583",
      updatedAtIso: "2026-06-04T12:00:00.000Z",
    }],
    treeAssets: [{
      id: "BWCC-060426-TREE-1003",
      treeId: "1003",
      projectId: "BWCC-060426",
      clientId: "CLI-2275",
      type: "Live Oak",
      dbh: 33,
      status: "Ready for Relocation",
      relocationStatus: "Ready for Relocation",
      treeRelocationStatus: "Ready for Relocation",
      assetCategory: "Relocation",
      treeFinalOutcome: "Active in Scope",
      currentFieldLocation: "Existing Location",
      existingSourcePin: "26.37289,-80.16132",
      existingLatitude: 26.37289,
      existingLongitude: -80.16132,
      sourceNorthing: 742114.38,
      sourceEasting: 930763.398,
      sourceCrsWkid: 2236,
      sourceCrsLabel: "NAD83 / Florida East (ftUS)",
      surveyTownshipRange: "Township 47 S, Range 42 E",
      priority: "High",
      updatedAtIso: "2026-06-04T12:00:00.000Z",
    }],
    workOrders: [{
      id: "WO-BWCC-ROOT-1003",
      projectId: "BWCC-060426",
      clientId: "CLI-2275",
      workOrderType: "tree_pruning",
      taskType: "Root Pruning",
      status: "Scheduled",
      scheduledDate: "2026-06-06",
      treeIds: ["BWCC-060426-TREE-1003"],
      crewLeadName: "Carlos Reyes",
      truckNames: ["Semi #1"],
      updatedAtIso: "2026-06-04T12:00:00.000Z",
    }, {
      id: "MOVE-BWCC-1003",
      projectId: "BWCC-060426",
      clientId: "CLI-2275",
      workOrderType: "tree_relocation_work",
      taskType: "Tree Move",
      status: "Scheduled",
      scheduledDate: "2026-07-01",
      treeIds: ["BWCC-060426-TREE-1003"],
      crewLeadName: "Neftali Euceda",
      origin: "Existing Location",
      destination: "Holding Area",
    }],
    materialItems: [{
      id: "MAT-BWCC-001",
      projectId: "BWCC-060426",
      materialType: "Pine",
      source: "JD Thornton",
      quantityRequired: 12,
      installStatus: "Needed",
    }],
    documents: [{
      id: "PHOTO-BWCC-1003",
      treeId: "BWCC-060426-TREE-1003",
      projectId: "BWCC-060426",
      category: "Tree Photo",
      url: "https://drive.google.com/file/d/tree-photo",
      photoDate: "2026-06-04",
    }],
  });

  const treeRow = tables.find((table) => table.sheetName === "Project_Tree_Assets")?.rows[0];
  assert.equal(treeRow?.Project_ID, "BWCC-060426");
  assert.equal(treeRow?.Tree_Asset_ID, "BWCC-060426-TREE-1003");
  assert.equal(treeRow?.Tree_Type, "Live Oak");
  assert.equal(treeRow?.Asset_Category, "Relocation");
  assert.equal(treeRow?.Tree_Relocation_Status, "Ready for Relocation");
  assert.equal(treeRow?.Tree_Final_Outcome, "Active in Scope");
  assert.equal(treeRow?.Current_Field_Location, "Existing Location");
  assert.equal(treeRow?.Existing_Source_Pin, "26.37289,-80.16132");
  assert.equal(treeRow?.Source_Northing, 742114.38);
  assert.equal(treeRow?.Source_Easting, 930763.398);
  assert.equal(treeRow?.Source_CRS_WKID, 2236);
  assert.equal(treeRow?.Survey_Township_Range, "Township 47 S, Range 42 E");

  const pruneRow = tables.find((table) => table.sheetName === "Project_Root_Pruning")?.rows[0];
  assert.equal(pruneRow?.Root_Pruning_ID, "WO-BWCC-ROOT-1003");
  assert.equal(pruneRow?.Tree_Asset_ID, "BWCC-060426-TREE-1003");
  assert.equal(pruneRow?.Root_Prune_Task_Status, "Scheduled");

  const moveRow = tables.find((table) => table.sheetName === "Project_Tree_Relocation_Work")?.rows[0];
  assert.equal(moveRow?.Relocation_Work_ID, "MOVE-BWCC-1003");
  assert.equal(moveRow?.Tree_Asset_ID, "BWCC-060426-TREE-1003");
  assert.equal(moveRow?.Move_Task_Status, "Scheduled");

  const purposeRow = tables.find((table) => table.sheetName === "Project_Work_Purposes")?.rows[0];
  assert.equal(purposeRow?.Purpose_Type, "Root Pruning");
  assert.equal(purposeRow?.Project_ID, "BWCC-060426");
  assert.equal(purposeRow?.Summary, "Root Pruning");
  assert.equal("Crew_Lead" in purposeRow!, false);
  assert.equal("Truck_Names" in purposeRow!, false);
});

test("builds workbook setup and schema map tables for Google Sheets writeback", () => {
  const setupTables = buildWorkbookSetupTables();
  const setupTable = setupTables.find((table) => table.sheetName === "App Import Setup");
  const schemaMap = setupTables.find((table) => table.sheetName === "App_Schema_Map");

  assert.equal(setupTables.length, 2);
  assert.equal(setupTable?.primaryId, "Setup_Item");
  assert.equal(setupTable?.rows.some((row) => row.Workbook_Tab === "Project_Tree_Assets"), true);
  assert.equal(schemaMap?.primaryId, "Workbook_Column");
  assert.equal(schemaMap?.columns.includes("Schema_Version"), true);
  assert.equal(schemaMap?.rows.some((row) => row.Workbook_Tab === "Project_Tree_Assets" && row.Workbook_Column === "Tree_Type" && row.App_Field === "treeType"), true);
  assert.equal(schemaMap?.rows.some((row) => row.Workbook_Tab === "Project_Tree_Assets" && row.Workbook_Column === "Tree_Relocation_Status" && String(row.Allowed_Values).includes("25% Cut")), true);
  assert.equal(schemaMap?.rows.some((row) => row.Workbook_Tab === "Project_Tree_Relocation_Work" && row.Workbook_Column === "Move_Type" && String(row.Allowed_Values).includes("Existing to Holding")), true);
  assert.equal(schemaMap?.rows.some((row) => row.Workbook_Column === "Construction_Access_Pin" && row.Data_Type === "lat_lng_or_maps_pin"), true);
});
