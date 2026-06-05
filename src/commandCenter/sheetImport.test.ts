import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nurseryInventoryCardTitle, nurseryInventoryCode, nurseryInventoryDisplayName, nurseryInventorySearchText, nurseryInventoryTableTitle, nurseryInventoryType } from "./nurseryDisplay";
import {
  buildImportPreview,
  parseDelimitedRows,
  pasteHeadersForTemplate,
  previewDetailsForRecord,
  previewSummary,
  sheetImportTemplates,
} from "./sheetImport";
import { jdtHomeBase } from "./equipmentFreight";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("sheet import mapping", () => {
  it("parses copied Google Sheet ranges as tab-delimited rows", () => {
    const rows = parseDelimitedRows("Name\tPhone\nRegina Kane\t863-228-1201\n");

    assert.deepEqual(rows, [
      ["Name", "Phone"],
      ["Regina Kane", "863-228-1201"],
    ]);
  });

  it("does not treat inch marks in pasted inventory heights as TSV quotes", () => {
    const pasted = [
      "Farm ID\tZone\tSpecies\tQuantity \tHeight\tSpread\tRootball Size\tPrice",
      "Main Office\t1B\tLive Oak\t5\t12\"+\t\t\t",
      "Main Office\t1B\tShady Lady\t1\t11\"\t\t\t",
      "Main Office\t2B\tThatch Palm\t50\t36\"\t\t\t",
    ].join("\n");

    const rows = parseDelimitedRows(pasted);
    assert.equal(rows.length, 4);
    assert.deepEqual(rows[1].slice(0, 5), ["Main Office", "1B", "Live Oak", "5", "12\"+"]);
    assert.deepEqual(rows[2].slice(0, 5), ["Main Office", "1B", "Shady Lady", "1", "11\""]);

    const preview = buildImportPreview("inventory", pasted);
    const inventory = preview.targets.find((target) => target.collectionName === "inventoryItems")?.records as any[];

    assert.equal(inventory?.length, 3);
    assert.equal(inventory[0].height, "12\"+");
    assert.equal(inventory[1].height, "11\"");
    assert.equal(inventory[2].height, "36\"");
  });

  it("still parses quoted CSV fields when a quote opens the field", () => {
    const rows = parseDelimitedRows('Name,Notes\n"Live Oak, Field Grown","Needs review"\n');

    assert.deepEqual(rows, [
      ["Name", "Notes"],
      ["Live Oak, Field Grown", "Needs review"],
    ]);
  });

  it("groups repeated client companies into one client with contact members", () => {
    const preview = buildImportPreview("clients", [
      ["Client Company", "Contact Name", "Phone", "Email", "Address"],
      ["A Better Landscape Co", "A Better Landscape Co", "561-741-2106", "tim@example.com", "1312 Commerce Lane"],
      ["A Better Landscape Co", "Pat", "561-718-5985", "", ""],
      ["A Better Landscape Co", "Beth Williams", "561-351-9975", "", ""],
    ]);

    const clients = preview.targets.find((target) => target.collectionName === "clients")?.records as any[];

    assert.equal(clients?.length, 1);
    assert.equal(clients[0].id, "client-a-better-landscape-co");
    assert.equal(clients[0].contactName, "A Better Landscape Co");
    assert.equal(clients[0].members.length, 2);
    assert.equal(clients[0].members[0].name, "Pat");
  });

  it("skips blank equipment rows even when formula columns contain service text", () => {
    const preview = buildImportPreview("equipment", [
      ["JDT Equipment Master List", "Make", "Model", "Last Service Date", "Service Interval (Days)", "Next Service Due", "Service Status"],
      ["Loader", "Komatsu", "500 - 1", "", "", "", "Service Upcoming"],
      ["", "", "", "", "", "", "Service Upcoming"],
    ]);

    const equipment = preview.targets.find((target) => target.collectionName === "equipment")?.records as any[];

    assert.equal(equipment?.length, 1);
    assert.equal(equipment[0].name, "Komatsu 500 - 1");
    assert.equal(equipment[0].type, "Loader");
    assert.equal(equipment[0].currentLocationName, jdtHomeBase.name);
    assert.equal(equipment[0].currentLocation, jdtHomeBase.address);
    assert.equal(equipment[0].currentLocationType, jdtHomeBase.locationType);
  });

  it("preserves equipment master truck trailer implement and location details", () => {
    const preview = buildImportPreview("equipment", [
      [
        "Equipment ID",
        "JDT Equipment Master List",
        "Make",
        "Model",
        "Truck Type",
        "Trailer Type",
        "Implement Type",
        "Current Location",
        "Location Type",
        "Assigned To",
        "Compatible Implements",
      ],
      ["EQ-001", "Truck", "Peterbilt", "Semi", "Semi Tractor", "", "", "25 Acre Farm", "Farm", "Alex Bueno", "Lowboy, Flatbed"],
      ["EQ-002", "Trailer", "Trail King", "Lowboy", "", "Lowboy", "", "Boca West", "Job Site", "", ""],
      ["EQ-003", "Implement", "JDT", "Root Pruner", "", "", "Root Pruner", "Shop", "Shop", "", ""],
    ]);

    const equipment = preview.targets.find((target) => target.collectionName === "equipment")?.records as any[];

    assert.equal(equipment?.length, 3);
    assert.equal(equipment[0].assetId, "EQ-001");
    assert.equal(equipment[0].truckType, "Semi Tractor");
    assert.deepEqual(equipment[0].compatibleImplementTypes, ["Lowboy", "Flatbed"]);
    assert.equal(equipment[1].trailerType, "Lowboy");
    assert.equal(equipment[1].currentLocationType, "Job Site");
    assert.equal(equipment[2].implementType, "Root Pruner");
    assert.equal(equipment[2].category, "Implement");
  });

  it("normalizes inventory rows into import-ready nursery records", () => {
    const preview = buildImportPreview("inventory", [
      ["Farm ID", "Zone", "Species", "Quantity ", "Height", "Spread", "Rootball Size", "Price"],
      ["Main Office", "2B", "Fox Tail", "38", "4'", "", "", "$125"],
    ]);

    const inventory = preview.targets.find((target) => target.collectionName === "inventoryItems")?.records as any[];

    assert.equal(inventory?.length, 1);
    assert.equal(inventory[0].id, "inventory-main-office-2b-fox-tail-4");
    assert.equal(inventory[0].farm, "Main Office");
    assert.equal(inventory[0].zone, "2B");
    assert.equal(inventory[0].quantity, 38);
    assert.equal(inventory[0].price, 125);
  });

  it("shows inventory paste and preview fields needed to verify zone and quantity", () => {
    const inventoryTemplate = sheetImportTemplates.find((template) => template.id === "inventory");
    assert.ok(inventoryTemplate);

    assert.deepEqual(pasteHeadersForTemplate(inventoryTemplate), [
      "Farm ID",
      "Zone",
      "Species",
      "Quantity",
      "Height",
      "Spread",
      "Rootball Size",
      "Price",
    ]);

    const preview = buildImportPreview("inventory", [
      ["Farm ID", "Zone", "Species", "Quantity ", "Height", "Spread", "Rootball Size", "Price"],
      ["Main Office", "2B", "Fox Tail", "38", "4'", "", "", "$125"],
    ]);
    const record = preview.targets[0].records[0];

    assert.deepEqual(previewDetailsForRecord(inventoryTemplate, record), [
      { label: "Farm", value: "Main Office" },
      { label: "Zone", value: "2B" },
      { label: "Qty", value: "38" },
      { label: "Height", value: "4'" },
    ]);
  });

  it("formats imported inventory for readable Nursery cards and table rows", () => {
    const preview = buildImportPreview("inventory", [
      ["Farm ID", "Zone", "Species", "Quantity ", "Height", "Spread", "Rootball Size", "Price"],
      ["Main Office", "2B", "Fox Tail", "38", "4'", "", "", "$125"],
    ]);
    const record = preview.targets[0].records[0];

    assert.equal(nurseryInventoryDisplayName(record), "Fox Tail - Main Office 2B");
    assert.equal(nurseryInventoryType(record), "Fox Tail");
    assert.equal(nurseryInventoryCode(record), "inventory-main-office-2b-fox-tail-4");
    assert.match(nurseryInventorySearchText(record), /2B/);
    assert.match(nurseryInventorySearchText(record), /38/);
  });

  it("keeps imported inventory card headers to the tree name only", () => {
    const preview = buildImportPreview("inventory", [
      ["Farm ID", "Zone", "Species", "Quantity ", "Height", "Spread", "Rootball Size", "Price"],
      ["Main Office", "2B", "Fox Tail", "38", "4'", "", "", "$125"],
    ]);
    const record = preview.targets[0].records[0];

    assert.equal(nurseryInventoryCardTitle(record), "Fox Tail");
    assert.doesNotMatch(nurseryInventoryCardTitle(record), /Main Office|2B|inventory-/);
  });

  it("keeps imported inventory table first column to the tree name only", () => {
    const preview = buildImportPreview("inventory", [
      ["Farm ID", "Zone", "Species", "Quantity ", "Height", "Spread", "Rootball Size", "Price"],
      ["Main Office", "2B", "Fox Tail", "38", "4'", "", "", "$125"],
    ]);
    const record = preview.targets[0].records[0];
    const nurseryBoard = readProjectFile("src/components/NurseryBoard.tsx");

    assert.equal(nurseryInventoryTableTitle(record), "Fox Tail");
    assert.doesNotMatch(nurseryInventoryTableTitle(record), /Main Office|2B|inventory-/);
    assert.match(nurseryBoard, /Tree Name/);
    assert.match(nurseryBoard, /nurseryInventoryTableTitle\(oak\)/);
    assert.doesNotMatch(nurseryBoard, /Tree ID \/ Type/);
  });

  it("reconstructs a readable Nursery label when only a generated inventory id is available", () => {
    const record = {
      id: "inventory-main-office-2b-fox-tail-4",
      treeId: "inventory-main-office-2b-fox-tail-4",
      species: "Fox Tail",
      farm: "Main Office",
      zone: "2B",
    };

    assert.equal(nurseryInventoryDisplayName(record), "Fox Tail - Main Office 2B");
    assert.equal(nurseryInventoryCode(record), "inventory-main-office-2b-fox-tail-4");
  });

  it("prefers species over generated inventory ids in Nursery headers", () => {
    const record = {
      id: "inventory-25-acre-1-back-podocarpus-weeping-4",
      treeId: "inventory-25-acre-1-back-podocarpus-weeping-4",
      name: "inventory-25-acre-1-back-podocarpus-weeping-4",
      title: "inventory-25-acre-1-back-podocarpus-weeping-4",
      ranchOakType: "inventory-25-acre-1-back-podocarpus-weeping-4",
      species: "Podocarpus Weeping",
      farm: "25 Acre",
      zone: "1 Back",
    };

    assert.equal(nurseryInventoryCardTitle(record), "Podocarpus Weeping");
    assert.equal(nurseryInventoryTableTitle(record), "Podocarpus Weeping");
    assert.doesNotMatch(nurseryInventoryCardTitle(record), /inventory-|25 Acre|1 Back/);
    assert.doesNotMatch(nurseryInventoryTableTitle(record), /inventory-|25 Acre|1 Back/);
  });

  it("maps staff rows into the staff collection with clean owner roles", () => {
    const preview = buildImportPreview("staff", [
      ["Staff Name", "Role", "Phone", "Email"],
      ["Jeremy Thornton ", "Owner/Operator", "561-312-3004", "jeremy@jdtnurseries.com"],
      ["Regina Kane", "Office Admin", "863-228-1201", "regina@jdtnurseries.com"],
    ]);

    const staff = preview.targets.find((target) => target.collectionName === "staff")?.records as any[];

    assert.equal(staff?.length, 2);
    assert.equal(staff[0].name, "Jeremy Thornton");
    assert.equal(staff[0].role, "Owner");
    assert.equal(staff[1].appAccess, "authorized");
  });

  it("reports a useful summary for Jennifer and Regina before import", () => {
    const preview = buildImportPreview("locations", [
      ["Location ID", "Location Name", "Main Address", "Crew Access Point", "Equipment Access Point"],
      ["Farm", "Main Office", "1010 E Sugarland Hwy, Clewiston, FL 33440", "", ""],
      ["", "", "", "", ""],
    ]);

    assert.equal(previewSummary(preview), "1 Locations record ready, 1 warning");
    assert.equal(sheetImportTemplates.some((template) => template.id === "locations"), true);
  });

  it("stamps schedule imports with client, project, and job relationship ids", () => {
    const preview = buildImportPreview("schedule", [
      ["Job/Schedule ID", "Status", "Assignee", "Task", "Client Company", "Location Name", "Start Date"],
      ["McArthur Hole 3", "Scheduled", "Jeff", "Install palms", "McArthur Golf Club", "Hole 3", "2026-06-03"],
    ]);

    const schedule = preview.targets.find((target) => target.collectionName === "scheduleTasks")?.records as any[];

    assert.equal(schedule?.length, 1);
    assert.equal(schedule[0].clientId, "client-mcarthur-golf-club");
    assert.equal(schedule[0].clientName, "McArthur Golf Club");
    assert.equal(schedule[0].projectId, "project-mcarthur-golf-club-mcarthur-hole-3");
    assert.equal(schedule[0].projectName, "McArthur Hole 3");
    assert.equal(schedule[0].jobId, "job-mcarthur-hole-3-install-palms");
    assert.equal(schedule[0].jobName, "Install palms");
  });

  it("stamps relocation imports with project and job relationship ids from job id", () => {
    const preview = buildImportPreview("relocation", [
      ["JOB ID", "TAG", "TYPE", "LOCATION", "RELOCATION STATUS"],
      ["McArthur Hole 3", "T-17", "Live Oak", "Hole 3 left side", "Root Pruned"],
    ]);

    const relocation = preview.targets.find((target) => target.collectionName === "treeRelocationRecords")?.records as any[];

    assert.equal(relocation?.length, 1);
    assert.equal(relocation[0].projectId, "project-mcarthur-hole-3");
    assert.equal(relocation[0].projectName, "McArthur Hole 3");
    assert.equal(relocation[0].jobId, "job-mcarthur-hole-3-t-17");
    assert.equal(relocation[0].jobName, "T-17");
  });

  it("maps JDT project flow workbook tree pruning rows into work orders", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_pruning", [
      ["Tree Assets_ID", "Tree_Prune_ID", "Root Prune Cuts", "Date of 1st Cut", "Prep Checks", "Readiness Reviews"],
      ["tree-boca-001", "prune-boca-001", "2", "2026-06-01", "Access clear", "Ready"],
    ]);
    const workOrders = preview.targets.find((target) => target.collectionName === "workOrders")?.records as any[];

    assert.equal(workOrders?.length, 1);
    assert.equal(workOrders[0].id, "prune-boca-001");
    assert.equal(workOrders[0].workOrderType, "tree_pruning");
    assert.equal(workOrders[0].sourceSheetName, "Project_Root_Pruning");
    assert.equal(workOrders[0].sourceRowId, "prune-boca-001");
    assert.equal(workOrders[0].treeIds?.[0], "tree-boca-001");
  });

  it("maps JDT project flow material item rows into project material items", () => {
    const preview = buildImportPreview("jdt_project_flow_project_material_items", [
      ["Project_Material_Items_ID", "Projects_ID", "Project Name", "Hole Number / Area", "Source", "Material Type", "Size / Class", "Quantity Required", "Quantity Installed", "Install Status"],
      ["mat-boca-hole-7-pine", "project-boca-west", "Boca West Relocation", "Hole 7", "JD Thornton", "Pine", "Large", "12", "5", "Delivered"],
    ]);
    const materialItems = preview.targets.find((target) => target.collectionName === "projectMaterialItems")?.records as any[];

    assert.equal(materialItems?.length, 1);
    assert.equal(materialItems[0].id, "mat-boca-hole-7-pine");
    assert.equal(materialItems[0].projectName, "Boca West Relocation");
    assert.equal(materialItems[0].holeNumberOrArea, "Hole 7");
    assert.equal(materialItems[0].sourceSheetName, "Project_Material_Items");
    assert.equal(materialItems[0].sourceRowId, "mat-boca-hole-7-pine");
  });

  it("maps JDT project flow tree asset rows into relocation tree records with source pins", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_assets", [
      ["Tree_Assets_ID", "Projects_ID", "Tree Type", "DBH (IN)", "Difficulty ", "Condition", "Existing Location Description", "Proposed Final Location Description", "Current Status", "Relocation Required", "Relocation Cost", "Relocation Status", "Priority"],
      ["tree-boca-109", "project-boca-west", "Live Oak", "31", "Hard", "Good", "26.3712687, -80.1623054", "Hole 7 green", "Root Pruning", "Yes", "$12,732.50", "Invoiced", "High"],
    ]);
    const trees = preview.targets.find((target) => target.collectionName === "treeRelocationRecords")?.records as any[];

    assert.equal(trees?.length, 1);
    assert.equal(trees[0].id, "tree-boca-109");
    assert.equal(trees[0].treeId, "tree-boca-109");
    assert.equal(trees[0].projectId, "project-boca-west");
    assert.equal(trees[0].type, "Live Oak");
    assert.equal(trees[0].relocationStatus, "Invoiced");
    assert.equal(trees[0].priority, "High");
    assert.deepEqual(trees[0].relocationMap.source, {
      lat: 26.37127,
      lng: -80.16231,
      label: "Imported source pin",
    });
  });

  it("maps canonical JDT Command Center project tree asset headers into relocation tree records", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_assets", [
      ["Tree_Asset_ID", "Project_ID", "Client_ID", "Tree_Type", "Tag", "DBH_IN", "Existing_Source_Pin", "Destination_Pin", "Current_Status", "Relocation_Status", "Priority"],
      ["BWCC-060426-TREE-1003", "BWCC-060426", "CLI-2275", "Live Oak", "1003", "33", "26.387315,-80.1712583", "26.388,-80.172", "Ready for Relocation", "Ready for Relocation", "High"],
    ]);
    const trees = preview.targets.find((target) => target.collectionName === "treeRelocationRecords")?.records as any[];

    assert.equal(trees?.length, 1);
    assert.equal(trees[0].id, "BWCC-060426-TREE-1003");
    assert.equal(trees[0].projectId, "BWCC-060426");
    assert.equal(trees[0].clientId, "CLI-2275");
    assert.equal(trees[0].treeType, "Live Oak");
    assert.equal(trees[0].tag, "1003");
    assert.deepEqual(trees[0].relocationMap.source, {
      lat: 26.38732,
      lng: -80.17126,
      label: "Imported source pin",
    });
    assert.deepEqual(trees[0].relocationMap.destination, {
      lat: 26.388,
      lng: -80.172,
      label: "Imported destination pin",
    });
  });

  it("defaults imported project tree assets with blank relocation status to Not Started", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_assets", [
      ["Tree_Asset_ID", "Project_ID", "Tree_Type", "Relocation_Status"],
      ["BWCC-060426-TREE-1004", "BWCC-060426", "Live Oak", ""],
    ]);
    const trees = preview.targets.find((target) => target.collectionName === "treeRelocationRecords")?.records as any[];

    assert.equal(trees?.length, 1);
    assert.equal(trees[0].relocationStatus, "Not Started");
    assert.equal(trees[0].status, "Not Started");
  });

  it("maps canonical JDT Command Center root pruning and nutrient care headers into work orders", () => {
    const pruningPreview = buildImportPreview("jdt_project_flow_tree_pruning", [
      ["Root_Pruning_ID", "Tree_Asset_ID", "Project_ID", "Cut_Count", "Date_1st_Cut", "Readiness_Status", "Next_Action", "Notes"],
      ["RP-BWCC-1003", "BWCC-060426-TREE-1003", "BWCC-060426", "1", "2026-06-06", "Scheduled", "Second cut", "First cut assigned"],
    ]);
    const pruning = pruningPreview.targets.find((target) => target.collectionName === "workOrders")?.records as any[];

    assert.equal(pruning?.length, 1);
    assert.equal(pruning[0].id, "RP-BWCC-1003");
    assert.equal(pruning[0].workOrderType, "tree_pruning");
    assert.equal(pruning[0].sourceSheetName, "Project_Root_Pruning");
    assert.equal(pruning[0].sourceRowId, "RP-BWCC-1003");
    assert.equal(pruning[0].projectId, "BWCC-060426");
    assert.equal(pruning[0].treeIds?.[0], "BWCC-060426-TREE-1003");
    assert.match(pruning[0].notes, /Second cut/);

    const nutrientPreview = buildImportPreview("jdt_project_flow_treatment_aftercare", [
      ["Nutrient_Care_ID", "Tree_Asset_ID", "Project_ID", "Treatment", "Treatment_Type", "Date_Last_Treatment", "Treatment_Action", "Completed_By", "Follow_Up_Needed", "Next_Follow_Up_Date"],
      ["NC-BWCC-1003", "BWCC-060426-TREE-1003", "BWCC-060426", "Deep root feed", "Fertilizer", "2026-06-01", "Monitor", "Samuel Rivera", "Yes", "2026-06-10"],
    ]);
    const nutrient = nutrientPreview.targets.find((target) => target.collectionName === "workOrders")?.records as any[];

    assert.equal(nutrient?.length, 1);
    assert.equal(nutrient[0].id, "NC-BWCC-1003");
    assert.equal(nutrient[0].workOrderType, "treatment_aftercare");
    assert.equal(nutrient[0].sourceSheetName, "Project_Nutrient_Care");
    assert.equal(nutrient[0].projectId, "BWCC-060426");
    assert.equal(nutrient[0].treeIds?.[0], "BWCC-060426-TREE-1003");
    assert.equal(nutrient[0].crewLeadName, "Samuel Rivera");
  });

  it("stamps project tree asset imports with the selected project context", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_assets", [
      ["Tree_Assets_ID", "Projects_ID", "Tree Type", "DBH (IN)", "Existing Location Description", "Current Status"],
      ["1001", "", "Live Oak", "28", "26.387315,-80.1712583", "Ready for Relocation"],
    ], {
      projectContext: {
        clientId: "cli-waterford",
        clientName: "Waterford",
        projectId: "project-waterford",
        projectName: "Waterford Relocation",
        jobId: "job-waterford-relocation",
        jobName: "Tree relocation",
      },
    });
    const trees = preview.targets.find((target) => target.collectionName === "treeRelocationRecords")?.records as any[];

    assert.equal(trees?.length, 1);
    assert.equal(trees[0].treeId, "1001");
    assert.equal(trees[0].clientId, "cli-waterford");
    assert.equal(trees[0].clientName, "Waterford");
    assert.equal(trees[0].projectId, "project-waterford");
    assert.equal(trees[0].projectsId, "project-waterford");
    assert.equal(trees[0].projectName, "Waterford Relocation");
    assert.equal(trees[0].jobId, "job-waterford-relocation");
    assert.equal(trees[0].jobName, "Tree relocation");
    assert.equal(preview.warnings.some((warning) => warning.includes("Projects_ID")), false);
  });

  it("maps JDT project flow treatment or aftercare rows into tree-linked work orders", () => {
    const preview = buildImportPreview("jdt_project_flow_treatment_aftercare", [
      ["Treatment_Aftercare Logs_ID", "Tree Assets_ID", "Treatments", "Treatments Type", "Date Of Last Treatment", "Treatment Action", "Completed By", "Condition Observed", "Watering Status", "Irrigation Status", "Stress Level", "Follow-up Needed", "Next Follow-up Date", "Notes"],
      ["treat-boca-109-1", "tree-boca-109", "5", "Fertilizer", "2026-05-06", "Up to Date", "Samuel Rivera", "Good canopy", "Adequate", "Checked", "Low", "Yes", "2026-06-06", "Monitor weekly"],
    ]);
    const workOrders = preview.targets.find((target) => target.collectionName === "workOrders")?.records as any[];

    assert.equal(workOrders?.length, 1);
    assert.equal(workOrders[0].id, "treat-boca-109-1");
    assert.equal(workOrders[0].workOrderType, "treatment_aftercare");
    assert.equal(workOrders[0].sourceSheetName, "Project_Nutrient_Care");
    assert.equal(workOrders[0].treeIds?.[0], "tree-boca-109");
    assert.match(workOrders[0].notes, /Fertilizer/);
    assert.match(workOrders[0].notes, /Monitor weekly/);
  });

  it("maps JDT project flow tree photo rows into linked document records", () => {
    const preview = buildImportPreview("jdt_project_flow_tree_photos", [
      ["Tree_Photos_ID", "Tree Assets_ID", "Photo", "Captured By", "Captured Date", "Photo Location", "Notes"],
      ["photo-boca-109-before", "tree-boca-109", "https://drive.google.com/file/d/photo", "Jennifer Bermudez", "2026-05-31", "North side", "Before relocation"],
    ]);
    const documents = preview.targets.find((target) => target.collectionName === "documents")?.records as any[];

    assert.equal(documents?.length, 1);
    assert.equal(documents[0].id, "photo-boca-109-before");
    assert.equal(documents[0].category, "Tree Photo");
    assert.equal(documents[0].treeId, "tree-boca-109");
    assert.equal(documents[0].url, "https://drive.google.com/file/d/photo");
    assert.equal(documents[0].takenBy, "Jennifer Bermudez");
    assert.equal(documents[0].photoDate, "2026-05-31");
    assert.equal(documents[0].sourceSheetName, "Project_Tree_Photos");
  });
});
