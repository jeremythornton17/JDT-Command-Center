import type {
  DocumentRecord,
  ProjectMaterialItemRecord,
  ProjectRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from './records';
import {
  assetCategoryOptions,
  carePhaseOptions,
  careTaskStatusOptions,
  canopyStatusOptions,
  conditionObservedOptions,
  currentFieldLocationOptions,
  installationStatusOptions,
  irrigationStatusOptions,
  leafStatusOptions,
  mapGeometryStatusOptions,
  moveTaskStatusOptions,
  moveTypeOptions,
  rootPruneTaskStatusOptions,
  soilMoistureStatusOptions,
  stressLevelOptions,
  treatmentTypeOptions,
  treeFinalOutcomeOptions,
  treeRelocationSchemaVersion,
  treeRelocationStatusOptions,
  wateringStatusOptions,
  warrantyRiskOptions,
} from './treeRelocationSchema';

export type WorkbookWorkOrderType =
  | "tree_pruning"
  | "tree_relocation_work"
  | "treatment_aftercare"
  | "move_readiness"
  | "change_order"
  | "billing_milestone"
  | "daily_field_update"
  | "freight"
  | "equipment"
  | "general_task";

export type WorkbookSourceRef = {
  sourceType: "google_sheet";
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  rowNumber?: number;
  rowId?: string;
};

export type WorkbookTabConfig = {
  sheetName: string;
  primaryId: string;
  primaryIdAliases?: string[];
  appPurpose: string;
  columns: string[];
  legacySheetNames?: string[];
  workOrderType?: WorkbookWorkOrderType;
};

export type WorkbookExportValue = string | number | boolean | undefined;
export type WorkbookExportRow = Record<string, WorkbookExportValue>;
export type WorkbookExportTable = {
  sheetName: string;
  primaryId: string;
  columns: string[];
  rows: WorkbookExportRow[];
};

export type ProjectWorkbookExportInput = {
  projects?: ProjectRecord[];
  treeAssets?: TreeRelocationRecord[];
  workOrders?: WorkOrderRecord[];
  materialItems?: ProjectMaterialItemRecord[];
  documents?: DocumentRecord[];
  syncBatchId?: string;
};

export const projectWorkbookSchemaVersion = treeRelocationSchemaVersion;

const syncColumns = ["App_Record_ID", "App_Updated_At", "Last_Sync_Batch_ID", "Schema_Version"];
const auditColumns = ["Created_By", "Created_At", "Last_Updated_By", "Last_Updated_At"];

const projectsMasterColumns = [
  "Project_ID",
  "Client_ID",
  "Client_Name",
  "Project_Name",
  "Division",
  "Project_Type",
  "Status",
  "Main_Jobsite_Address",
  "Crew_Access_Address",
  "Truck_Equipment_Access_Address",
  "Construction_Access_Pin",
  "Load_Unload_Pin",
  "Secondary_Load_Unload_Pin",
  "Project_Manager",
  "Start_Date",
  "Target_Date",
  "Notes",
  ...syncColumns,
];

const treeAssetColumns = [
  "Tree_Asset_ID",
  "Project_ID",
  "Client_ID",
  "Asset_Category",
  "Tree_Tag",
  "Tree_Type",
  "Species_Common_Name",
  "Species_Botanical_Name",
  "DBH_IN",
  "Height_FT",
  "Spread_FT",
  "Condition",
  "Difficulty",
  "Priority",
  "Existing_Location_Description",
  "Existing_Source_Pin",
  "Existing_Latitude",
  "Existing_Longitude",
  "Source_Northing",
  "Source_Easting",
  "Source_CRS_WKID",
  "Source_CRS_Label",
  "Survey_Township_Range",
  "Proposed_Final_Location_Description",
  "Destination_Pin",
  "Destination_Latitude",
  "Destination_Longitude",
  "Holding_Area_Name",
  "Current_Field_Location",
  "Tree_Relocation_Status",
  "Installation_Status",
  "Root_Prune_Required",
  "Nutrient_Care_Required",
  "Relocation_Required",
  "Installation_Required",
  "Estimated_Relocation_Cost",
  "Contract_Relocation_Cost",
  "Tree_Final_Outcome",
  "Outcome_Date",
  "Outcome_Reason",
  "Outcome_Decided_By",
  "Outcome_Notes",
  "Risk_Level",
  "Risk_Notes",
  "Access_Notes",
  "Watering_Responsibility",
  "Map_Geometry_Status",
  "ArcGIS_Feature_ID",
  "Photos_Complete",
  "Notes",
  ...auditColumns,
  ...syncColumns,
];

const rootPruningColumns = [
  "Root_Pruning_ID",
  "Root_Prune_Cycle_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Client_ID",
  "Tree_Tag",
  "Tree_Type",
  "DBH_IN",
  "Assigned_Crew",
  "Assigned_Crew_Leader",
  "Scheduled_Date",
  "Completed_Date",
  "Root_Prune_Task_Status",
  "Root_Prune_Event_Number",
  "Recommended_Root_Pruning_Period_Months",
  "Months_From_Cycle_Start",
  "Planned_Cut_Percent",
  "Actual_Cut_Percent",
  "Cumulative_Cut_Percent_After_Event",
  "Cut_Stage_Completed",
  "Root_Prune_Method",
  "Rootball_Size",
  "Rootball_Depth",
  "Equipment_Used",
  "Utility_Clearance_Status",
  "Locate_Ticket",
  "Nutrient_Care_Required_After_Event",
  "Water_Started",
  "Photos_Required",
  "Photos_Complete",
  "Next_Action",
  "Blocker_Reason",
  "Notes",
  ...auditColumns,
  ...syncColumns,
];

const treeRelocationWorkColumns = [
  "Relocation_Work_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Client_ID",
  "Tree_Tag",
  "Tree_Type",
  "DBH_IN",
  "Assigned_Crew",
  "Assigned_Crew_Leader",
  "Scheduled_Move_Date",
  "Actual_Move_Date",
  "Move_Task_Status",
  "Move_Type",
  "Origin_Location",
  "Destination_Location",
  "Holding_Area_Name",
  "Equipment_Used",
  "Truck_Used",
  "Trailer_Used",
  "Operator",
  "Access_Confirmed",
  "Irrigation_Ready",
  "Final_Grade_Ready",
  "Tree_Set_Complete",
  "Backfill_Complete",
  "Staking_Guying_Complete",
  "Water_In_Complete",
  "Photos_Required",
  "Photos_Complete",
  "Blocker_Reason",
  "Notes",
  ...auditColumns,
  ...syncColumns,
];

const nutrientCareColumns = [
  "Nutrient_Care_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Client_ID",
  "Related_Root_Pruning_ID",
  "Tree_Tag",
  "Tree_Type",
  "DBH_IN",
  "Care_Phase",
  "Assigned_Crew",
  "Assigned_Crew_Leader",
  "Vendor",
  "Scheduled_Date",
  "Completed_Date",
  "Care_Task_Status",
  "Treatment_Required",
  "Treatment_Type",
  "Treatment_Product",
  "Treatment_Rate",
  "Treatment_Quantity",
  "Condition_Observed",
  "Stress_Level",
  "Canopy_Status",
  "Leaf_Status",
  "Watering_Status",
  "Irrigation_Status",
  "Soil_Moisture_Status",
  "Silt_Buildup_Observed",
  "Drainage_Issue_Observed",
  "Follow_Up_Needed",
  "Next_Follow_Up_Date",
  "Follow_Up_Action",
  "Warranty_Risk",
  "Photos_Required",
  "Photos_Complete",
  "Notes",
  ...auditColumns,
  ...syncColumns,
];

const treePhotoColumns = [
  "Tree_Photo_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Photo_URL",
  "Photo_Type",
  "Captured_By",
  "Captured_Date",
  "Photo_Location",
  "Notes",
  ...syncColumns,
];

const materialItemColumns = [
  "Material_Item_ID",
  "Project_ID",
  "Client_ID",
  "Project_Name",
  "Area",
  "Source",
  "Material_Type",
  "Size_Class",
  "Quantity_Required",
  "Quantity_Installed",
  "Unit_Price",
  "Install_Status",
  "Notes",
  ...syncColumns,
];

const workPurposeColumns = [
  "Work_Purpose_ID",
  "Project_ID",
  "Client_ID",
  "Purpose_Type",
  "Division",
  "Tree_Asset_ID",
  "Material_Item_ID",
  "Needed_Date",
  "Status",
  "Priority",
  "Summary",
  "Notes",
  ...syncColumns,
];

export const canonicalProjectWorkbookTabNames = [
  "Projects_Master",
  "Project_Tree_Assets",
  "Project_Root_Pruning",
  "Project_Tree_Relocation_Work",
  "Project_Nutrient_Care",
  "Project_Tree_Photos",
  "Project_Material_Items",
  "Project_Work_Purposes",
] as const;

export const appImportSetupSheetName = "App Import Setup";

export const jdtProjectFlowWorkbook = {
  title: "JDT Command Center",
  spreadsheetName: "JDT Command Center",
  spreadsheetId: "1hhth3Z9DRnVdDiLNZLvLtIME7N6wSfsd8Qz1xJNM1VY",
  tabs: {
    App_Schema_Map: {
      sheetName: "App_Schema_Map",
      primaryId: "Workbook_Column",
      appPurpose: "sync_schema",
      columns: ["Workbook_Tab", "Workbook_Column", "App_Field", "Data_Type", "Required", "Import_Enabled", "Export_Enabled", "Allowed_Values", "Schema_Version", "Notes"],
    },
    Projects_Master: {
      sheetName: "Projects_Master",
      primaryId: "Project_ID",
      primaryIdAliases: ["Projects_ID"],
      appPurpose: "projects",
      columns: projectsMasterColumns,
      legacySheetNames: ["Projects"],
    },
    Project_Tree_Assets: {
      sheetName: "Project_Tree_Assets",
      primaryId: "Tree_Asset_ID",
      primaryIdAliases: ["Tree_Assets_ID", "Tree Assets_ID"],
      appPurpose: "tree_assets",
      columns: treeAssetColumns,
      legacySheetNames: ["Tree Assets", "Relocation Details Master List", "Relocation & Installation Tree Details Master List"],
    },
    Project_Root_Pruning: {
      sheetName: "Project_Root_Pruning",
      primaryId: "Root_Pruning_ID",
      primaryIdAliases: ["Tree_Prune_ID"],
      appPurpose: "work_orders",
      workOrderType: "tree_pruning",
      columns: rootPruningColumns,
      legacySheetNames: ["Tree Pruning"],
    },
    Project_Tree_Relocation_Work: {
      sheetName: "Project_Tree_Relocation_Work",
      primaryId: "Relocation_Work_ID",
      appPurpose: "work_orders",
      workOrderType: "tree_relocation_work",
      columns: treeRelocationWorkColumns,
      legacySheetNames: ["Tree Relocation Work", "Tree Move Work"],
    },
    Project_Nutrient_Care: {
      sheetName: "Project_Nutrient_Care",
      primaryId: "Nutrient_Care_ID",
      primaryIdAliases: ["Treatment_Aftercare Logs_ID"],
      appPurpose: "work_orders",
      workOrderType: "treatment_aftercare",
      columns: nutrientCareColumns,
      legacySheetNames: ["Treatment or Aftercare", "Treatment / Aftercare"],
    },
    Project_Tree_Photos: {
      sheetName: "Project_Tree_Photos",
      primaryId: "Tree_Photo_ID",
      primaryIdAliases: ["Tree_Photos_ID"],
      appPurpose: "tree_photos",
      columns: treePhotoColumns,
      legacySheetNames: ["Tree Photos"],
    },
    Project_Material_Items: {
      sheetName: "Project_Material_Items",
      primaryId: "Material_Item_ID",
      primaryIdAliases: ["Project_Material_Items_ID"],
      appPurpose: "project_material_items",
      columns: materialItemColumns,
    },
    Project_Work_Purposes: {
      sheetName: "Project_Work_Purposes",
      primaryId: "Work_Purpose_ID",
      appPurpose: "work_purposes",
      workOrderType: "general_task",
      columns: workPurposeColumns,
    },
  } satisfies Record<string, WorkbookTabConfig>,
};

export function workbookColumnsForTab(sheetName: string): string[] {
  return [...(resolveWorkbookTab(sheetName)?.columns || [])];
}

export function workOrderTypeForWorkbookTab(sheetName: string): WorkbookWorkOrderType {
  return resolveWorkbookTab(sheetName)?.workOrderType || "general_task";
}

export function workbookTabForWorkOrderType(type: WorkbookWorkOrderType): string {
  const match = (Object.values(jdtProjectFlowWorkbook.tabs) as WorkbookTabConfig[]).find((tab) => tab.workOrderType === type);
  return match?.sheetName || "Project_Work_Purposes";
}

export function sourceRefFromWorkbookRow(
  sheetName: string,
  row: Record<string, unknown>,
  rowNumber?: number,
): WorkbookSourceRef {
  const tab = resolveWorkbookTab(sheetName);
  const rowId = tab ? clean(row[tab.primaryId]) || firstClean(tab.primaryIdAliases?.map((alias) => row[alias]) || []) : "";

  return {
    sourceType: "google_sheet",
    spreadsheetId: jdtProjectFlowWorkbook.spreadsheetId,
    spreadsheetName: jdtProjectFlowWorkbook.spreadsheetName,
    sheetName: tab?.sheetName || sheetName,
    ...(rowNumber ? { rowNumber } : {}),
    ...(rowId ? { rowId } : {}),
  };
}

export function buildProjectWorkbookExport(input: ProjectWorkbookExportInput): WorkbookExportTable[] {
  const syncBatchId = input.syncBatchId || "";
  const tables: WorkbookExportTable[] = [
    buildExportTable("Projects_Master", (input.projects || []).map((project) => compactRow(rowForProject(project, syncBatchId)))),
    buildExportTable("Project_Tree_Assets", (input.treeAssets || []).map((tree) => compactRow(rowForTreeAsset(tree, syncBatchId)))),
    buildExportTable("Project_Root_Pruning", (input.workOrders || []).filter((workOrder) => workOrder.workOrderType === "tree_pruning").map((workOrder) => compactRow(rowForRootPruning(workOrder, syncBatchId)))),
    buildExportTable("Project_Tree_Relocation_Work", (input.workOrders || []).filter((workOrder) => workOrder.workOrderType === "tree_relocation_work").map((workOrder) => compactRow(rowForTreeRelocationWork(workOrder, syncBatchId)))),
    buildExportTable("Project_Nutrient_Care", (input.workOrders || []).filter((workOrder) => workOrder.workOrderType === "treatment_aftercare").map((workOrder) => compactRow(rowForNutrientCare(workOrder, syncBatchId)))),
    buildExportTable("Project_Tree_Photos", (input.documents || []).filter((document) => document.category === "Tree Photo" || Boolean(document.treeId)).map((document) => compactRow(rowForTreePhoto(document, syncBatchId)))),
    buildExportTable("Project_Material_Items", (input.materialItems || []).map((item) => compactRow(rowForMaterialItem(item, syncBatchId)))),
    buildExportTable("Project_Work_Purposes", (input.workOrders || []).map((workOrder) => compactRow(rowForWorkPurpose(workOrder, syncBatchId)))),
  ];

  return tables;
}

export function buildWorkbookSetupTables(): WorkbookExportTable[] {
  const schemaColumns = jdtProjectFlowWorkbook.tabs.App_Schema_Map.columns;
  const schemaRows = canonicalProjectWorkbookTabNames.flatMap((sheetName) => {
    const tab = resolveWorkbookTab(sheetName);
    if (!tab) return [];
    return tab.columns.map((column) => compactRow({
      Workbook_Tab: tab.sheetName,
      Workbook_Column: column,
      App_Field: appFieldForWorkbookColumn(column),
      Data_Type: dataTypeForWorkbookColumn(column),
      Required: isRequiredWorkbookColumn(tab, column) ? "Yes" : "",
      Import_Enabled: "Yes",
      Export_Enabled: "Yes",
      Allowed_Values: allowedValuesForWorkbookColumn(column),
      Schema_Version: projectWorkbookSchemaVersion,
      Notes: notesForWorkbookColumn(tab, column),
    }));
  });

  return [
    {
      sheetName: appImportSetupSheetName,
      primaryId: "Setup_Item",
      columns: ["Setup_Item", "Value", "Workbook_Tab", "Import_Enabled", "Export_Enabled", "Notes"],
      rows: [
        {
          Setup_Item: "Source Workbook",
          Value: jdtProjectFlowWorkbook.spreadsheetName,
          Notes: "Use this workbook as the single backup and bulk-entry source for the app.",
        },
        {
          Setup_Item: "Spreadsheet ID",
          Value: jdtProjectFlowWorkbook.spreadsheetId,
          Notes: "The app writes to this exact Google Sheets file through the Google Sheets API.",
        },
        {
          Setup_Item: "Schema Version",
          Value: projectWorkbookSchemaVersion,
          Notes: "Update this when app/workbook columns intentionally change.",
        },
        {
          Setup_Item: "Stable ID Rule",
          Value: "Do not rename or recycle ID values",
          Notes: "Project_ID, Tree_Asset_ID, work IDs, and material IDs keep app records linked across imports and exports.",
        },
        ...canonicalProjectWorkbookTabNames.map((sheetName) => {
          const tab = resolveWorkbookTab(sheetName)!;
          return {
            Setup_Item: `Tab: ${tab.sheetName}`,
            Value: tab.appPurpose,
            Workbook_Tab: tab.sheetName,
            Import_Enabled: "Yes",
            Export_Enabled: "Yes",
            Notes: `Primary ID: ${tab.primaryId}. ${tab.legacySheetNames?.length ? `Legacy names accepted on import: ${tab.legacySheetNames.join(", ")}.` : "Use this exact tab name for new bulk entry."}`,
          };
        }),
      ],
    },
    {
      sheetName: jdtProjectFlowWorkbook.tabs.App_Schema_Map.sheetName,
      primaryId: jdtProjectFlowWorkbook.tabs.App_Schema_Map.primaryId,
      columns: schemaColumns,
      rows: schemaRows,
    },
  ];
}

export function workbookExportTableToTsv(table: WorkbookExportTable): string {
  return [
    table.columns.join("\t"),
    ...table.rows.map((row) => table.columns.map((column) => formatTsvValue(row[column])).join("\t")),
  ].join("\n");
}

function buildExportTable(sheetName: string, rows: WorkbookExportRow[]): WorkbookExportTable {
  const tab = resolveWorkbookTab(sheetName);
  if (!tab) throw new Error(`Unknown workbook tab: ${sheetName}`);
  return {
    sheetName: tab.sheetName,
    primaryId: tab.primaryId,
    columns: [...tab.columns],
    rows,
  };
}

function rowForProject(project: ProjectRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Project_ID: project.projectId || project.projectsId || project.id,
    Client_ID: project.clientId || project.companiesId,
    Client_Name: project.clientName || project.client,
    Project_Name: project.name || project.title,
    Division: project.division,
    Project_Type: project.projectType,
    Status: project.status,
    Main_Jobsite_Address: project.location,
    Crew_Access_Address: project.crewAccessAddress,
    Truck_Equipment_Access_Address: project.truckAccessAddress,
    Construction_Access_Pin: project.constructionAccessPin,
    Load_Unload_Pin: project.loadUnloadPin,
    Secondary_Load_Unload_Pin: project.secondaryLoadUnloadPin,
    Project_Manager: project.pm,
    Start_Date: project.startDate || project.date,
    Target_Date: project.scheduledDate,
    Notes: project.notes,
  }, project, syncBatchId);
}

function rowForTreeAsset(tree: TreeRelocationRecord, syncBatchId: string): WorkbookExportRow {
  const relocationMap = tree.relocationMap as { source?: { lat?: number; lng?: number }; destination?: { lat?: number; lng?: number } } | undefined;
  return withSyncColumns({
    Tree_Asset_ID: tree.treeAssetId || tree.id || tree.treeId,
    Project_ID: tree.projectId || tree.projectsId,
    Client_ID: tree.clientId,
    Asset_Category: tree.assetCategory || "Relocation",
    Tree_Tag: tree.treeTag || tree.tag || tree.treeId,
    Tree_Type: tree.treeType || tree.type || tree.ranchOakType,
    Species_Common_Name: tree.speciesCommonName || tree.species || tree.commonName,
    Species_Botanical_Name: tree.speciesBotanicalName,
    Tag: tree.tag || tree.treeId,
    DBH_IN: tree.dbh,
    Height_FT: tree.heightFt || tree.height,
    Spread_FT: tree.spreadFt || tree.spread,
    Difficulty: tree.difficulty,
    Condition: tree.condition,
    Existing_Location_Description: tree.existingLocationDescription || tree.location,
    Existing_Source_Pin: tree.existingSourcePin || pointText(relocationMap?.source),
    Existing_Latitude: tree.existingLatitude || relocationMap?.source?.lat,
    Existing_Longitude: tree.existingLongitude || relocationMap?.source?.lng,
    Source_Northing: tree.sourceNorthing,
    Source_Easting: tree.sourceEasting,
    Source_CRS_WKID: tree.sourceCrsWkid,
    Source_CRS_Label: tree.sourceCrsLabel,
    Survey_Township_Range: tree.surveyTownshipRange,
    Proposed_Final_Location_Description: tree.proposedFinalLocationDescription,
    Destination_Pin: tree.destinationPin || pointText(relocationMap?.destination),
    Destination_Latitude: tree.destinationLatitude || relocationMap?.destination?.lat,
    Destination_Longitude: tree.destinationLongitude || relocationMap?.destination?.lng,
    Holding_Area_Name: tree.holdingAreaName,
    Current_Field_Location: tree.currentFieldLocation || "Existing Location",
    Tree_Relocation_Status: tree.treeRelocationStatus || tree.relocationStatus || tree.status,
    Installation_Status: tree.installationStatus,
    Root_Prune_Required: tree.rootPruneRequired,
    Nutrient_Care_Required: tree.nutrientCareRequired,
    Relocation_Required: tree.relocationRequired,
    Installation_Required: tree.installationRequired,
    Estimated_Relocation_Cost: tree.estimatedRelocationCost || tree.relocationCost,
    Contract_Relocation_Cost: tree.contractRelocationCost,
    Tree_Final_Outcome: tree.treeFinalOutcome || "Active in Scope",
    Outcome_Date: tree.outcomeDate,
    Outcome_Reason: tree.outcomeReason,
    Outcome_Decided_By: tree.outcomeDecidedBy,
    Outcome_Notes: tree.outcomeNotes,
    Risk_Level: tree.riskLevel,
    Risk_Notes: tree.riskNotes,
    Access_Notes: tree.accessNotes,
    Watering_Responsibility: tree.wateringResponsibility,
    Map_Geometry_Status: tree.mapGeometryStatus,
    ArcGIS_Feature_ID: tree.arcGisFeatureId,
    Photos_Complete: tree.photosComplete,
    Priority: tree.priority,
    Notes: tree.notes,
  }, tree, syncBatchId);
}

function rowForRootPruning(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Root_Pruning_ID: workOrder.id,
    Root_Prune_Cycle_ID: workOrder.rootPruneCycleId,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Client_ID: workOrder.clientId,
    Tree_Tag: firstListValue(workOrder.treeNames),
    Tree_Type: fieldFromNotes(workOrder.notes, "Tree type"),
    DBH_IN: fieldFromNotes(workOrder.notes, "DBH"),
    Assigned_Crew: workOrder.assignedCrewNames?.join(", "),
    Assigned_Crew_Leader: workOrder.crewLeadName,
    Scheduled_Date: workOrder.scheduledDate,
    Completed_Date: workOrder.completedDate,
    Root_Prune_Task_Status: workOrder.rootPruneTaskStatus || workOrder.status,
    Root_Prune_Event_Number: workOrder.rootPruneEventNumber || fieldFromNotes(workOrder.notes, "Root prune event"),
    Recommended_Root_Pruning_Period_Months: workOrder.recommendedRootPruningPeriodMonths,
    Months_From_Cycle_Start: workOrder.monthsFromCycleStart,
    Planned_Cut_Percent: workOrder.plannedCutPercent,
    Actual_Cut_Percent: workOrder.actualCutPercent,
    Cumulative_Cut_Percent_After_Event: workOrder.cumulativeCutPercentAfterEvent,
    Cut_Stage_Completed: workOrder.cutStageCompleted,
    Root_Prune_Method: workOrder.rootPruneMethod,
    Rootball_Size: workOrder.rootballSize,
    Rootball_Depth: workOrder.rootballDepth,
    Equipment_Used: workOrder.equipmentNames?.join(", "),
    Utility_Clearance_Status: workOrder.utilityClearanceStatus,
    Locate_Ticket: workOrder.locateTicket,
    Nutrient_Care_Required_After_Event: workOrder.nutrientCareRequiredAfterEvent,
    Water_Started: workOrder.waterStarted,
    Photos_Required: workOrder.photosRequired,
    Photos_Complete: workOrder.photosComplete,
    Next_Action: workOrder.taskType === "Root Pruning" ? "" : workOrder.taskType,
    Blocker_Reason: workOrder.blockerReason,
    Notes: workOrder.notes,
  }, workOrder, syncBatchId);
}

function rowForTreeRelocationWork(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Relocation_Work_ID: workOrder.id,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Client_ID: workOrder.clientId,
    Tree_Tag: firstListValue(workOrder.treeNames),
    Tree_Type: fieldFromNotes(workOrder.notes, "Tree type"),
    DBH_IN: fieldFromNotes(workOrder.notes, "DBH"),
    Assigned_Crew: workOrder.assignedCrewNames?.join(", "),
    Assigned_Crew_Leader: workOrder.crewLeadName,
    Scheduled_Move_Date: workOrder.scheduledDate,
    Actual_Move_Date: workOrder.completedDate,
    Move_Task_Status: workOrder.moveTaskStatus || workOrder.status,
    Move_Type: workOrder.moveType || workOrder.taskType,
    Origin_Location: workOrder.origin,
    Destination_Location: workOrder.destination,
    Holding_Area_Name: workOrder.holdingAreaName,
    Equipment_Used: workOrder.equipmentNames?.join(", "),
    Truck_Used: workOrder.truckNames?.join(", "),
    Trailer_Used: workOrder.trailerNames?.join(", "),
    Operator: workOrder.operator || workOrder.crewLeadName,
    Access_Confirmed: workOrder.accessConfirmed,
    Irrigation_Ready: workOrder.irrigationReady,
    Final_Grade_Ready: workOrder.finalGradeReady,
    Tree_Set_Complete: workOrder.treeSetComplete,
    Backfill_Complete: workOrder.backfillComplete,
    Staking_Guying_Complete: workOrder.stakingGuyingComplete,
    Water_In_Complete: workOrder.waterInComplete,
    Photos_Required: workOrder.photosRequired,
    Photos_Complete: workOrder.photosComplete,
    Blocker_Reason: workOrder.blockerReason,
    Notes: workOrder.notes,
  }, workOrder, syncBatchId);
}

function rowForNutrientCare(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Nutrient_Care_ID: workOrder.id,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Client_ID: workOrder.clientId,
    Related_Root_Pruning_ID: workOrder.relatedRootPruningId,
    Tree_Tag: firstListValue(workOrder.treeNames),
    Tree_Type: fieldFromNotes(workOrder.notes, "Tree type"),
    DBH_IN: fieldFromNotes(workOrder.notes, "DBH"),
    Care_Phase: workOrder.carePhase,
    Assigned_Crew: workOrder.assignedCrewNames?.join(", "),
    Assigned_Crew_Leader: workOrder.crewLeadName,
    Vendor: workOrder.vendor,
    Scheduled_Date: workOrder.scheduledDate,
    Completed_Date: workOrder.completedDate,
    Care_Task_Status: workOrder.careTaskStatus || workOrder.status,
    Treatment_Required: workOrder.treatmentRequired,
    Treatment_Type: workOrder.treatmentType || fieldFromNotes(workOrder.notes, "Treatment type") || workOrder.taskType,
    Treatment_Product: workOrder.treatmentProduct || fieldFromNotes(workOrder.notes, "Treatments"),
    Treatment_Rate: workOrder.treatmentRate,
    Treatment_Quantity: workOrder.treatmentQuantity,
    Condition_Observed: workOrder.conditionObserved || fieldFromNotes(workOrder.notes, "Condition observed"),
    Stress_Level: workOrder.stressLevel || fieldFromNotes(workOrder.notes, "Stress level"),
    Canopy_Status: workOrder.canopyStatus,
    Leaf_Status: workOrder.leafStatus,
    Watering_Status: workOrder.wateringStatus || fieldFromNotes(workOrder.notes, "Watering"),
    Irrigation_Status: workOrder.irrigationStatus || fieldFromNotes(workOrder.notes, "Irrigation"),
    Soil_Moisture_Status: workOrder.soilMoistureStatus,
    Silt_Buildup_Observed: workOrder.siltBuildupObserved,
    Drainage_Issue_Observed: workOrder.drainageIssueObserved,
    Follow_Up_Needed: workOrder.scheduledDate ? "Yes" : "",
    Next_Follow_Up_Date: workOrder.scheduledDate,
    Follow_Up_Action: workOrder.followUpAction,
    Warranty_Risk: workOrder.warrantyRisk,
    Photos_Required: workOrder.photosRequired,
    Photos_Complete: workOrder.photosComplete,
    Notes: workOrder.notes,
  }, workOrder, syncBatchId);
}

function rowForTreePhoto(document: DocumentRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Tree_Photo_ID: document.id,
    Tree_Asset_ID: document.treeId || firstListValue(document.treeIds as string[] | undefined),
    Project_ID: document.projectId,
    Photo_URL: document.url,
    Photo_Type: document.photoType || document.category,
    Captured_By: document.takenBy,
    Captured_Date: document.photoDate,
    Photo_Location: document.photoLocation,
    Notes: document.notes,
  }, document, syncBatchId);
}

function rowForMaterialItem(item: ProjectMaterialItemRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Material_Item_ID: item.id || item.projectMaterialItemsId,
    Project_ID: item.projectId || item.projectsId,
    Client_ID: item.clientId || item.companiesId,
    Project_Name: item.projectName,
    Area: item.holeNumberOrArea,
    Source: item.source,
    Material_Type: item.materialType,
    Size_Class: item.sizeClass,
    Quantity_Required: item.quantityRequired,
    Quantity_Installed: item.quantityInstalled,
    Unit_Price: item.unitPrice,
    Install_Status: item.installStatus,
    Notes: item.notes,
  }, item, syncBatchId);
}

function rowForWorkPurpose(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Work_Purpose_ID: workOrder.id,
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Client_ID: workOrder.clientId,
    Purpose_Type: purposeType(workOrder),
    Division: workOrder.division,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Material_Item_ID: firstListValue(workOrder.inventoryItemIds),
    Needed_Date: workOrder.scheduledDate || workOrder.dueDate,
    Status: workOrder.status,
    Priority: workOrder.priority,
    Summary: workOrder.taskType || workOrder.title || workOrder.name,
    Notes: workOrder.notes,
  }, workOrder, syncBatchId);
}

function withSyncColumns(row: Record<string, unknown>, record: { id?: string; updatedAtIso?: string }, syncBatchId: string): WorkbookExportRow {
  return normalizeWorkbookRow({
    ...row,
    App_Record_ID: record.id,
    App_Updated_At: record.updatedAtIso,
    Last_Sync_Batch_ID: syncBatchId,
    Schema_Version: projectWorkbookSchemaVersion,
  });
}

function resolveWorkbookTab(sheetName: string): WorkbookTabConfig | undefined {
  const tabs = jdtProjectFlowWorkbook.tabs as Record<string, WorkbookTabConfig>;
  const direct = tabs[sheetName];
  if (direct) return direct;
  return Object.values(tabs).find((tab) => tab.sheetName === sheetName || (tab.legacySheetNames || []).includes(sheetName));
}

function compactRow(row: WorkbookExportRow): WorkbookExportRow {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function normalizeWorkbookRow(row: Record<string, unknown>): WorkbookExportRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, workbookValue(value)]));
}

function workbookValue(value: unknown): WorkbookExportValue {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function firstClean(values: unknown[]): string {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function firstListValue(values?: string[]): string {
  return Array.isArray(values) ? clean(values[0]) : "";
}

function pointText(point?: { lat?: number; lng?: number }): string {
  if (!point || typeof point.lat !== "number" || typeof point.lng !== "number") return "";
  return `${point.lat},${point.lng}`;
}

function fieldFromNotes(notes: unknown, label: string): string {
  const text = clean(notes);
  const match = text.match(new RegExp(`${escapeRegExp(label)}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function purposeType(workOrder: WorkOrderRecord): string {
  if (workOrder.taskType) return workOrder.taskType;
  if (workOrder.workOrderType === "tree_pruning") return "Root Pruning";
  if (workOrder.workOrderType === "tree_relocation_work") return "Tree Relocation Work";
  if (workOrder.workOrderType === "treatment_aftercare") return "Nutrient Care";
  if (workOrder.workOrderType === "freight") return "Freight Support";
  if (workOrder.workOrderType === "equipment") return "Equipment Change";
  return workOrder.title || workOrder.name || "General Task";
}

function appFieldForWorkbookColumn(column: string): string {
  const explicit: Record<string, string> = {
    App_Record_ID: "id",
    DBH_IN: "dbh",
    Photo_URL: "url",
    Tree_Asset_ID: "treeAssetId",
    Tree_Tag: "treeTag",
    Tree_Type: "treeType",
    Date_1st_Cut: "scheduledDate",
    Date_2nd_Cut: "secondCutDate",
    Date_3rd_Cut: "thirdCutDate",
    Date_Last_Treatment: "completedDate",
    Tree_Relocation_Status: "treeRelocationStatus",
    Tree_Final_Outcome: "treeFinalOutcome",
    ArcGIS_Feature_ID: "arcGisFeatureId",
  };
  if (explicit[column]) return explicit[column];

  return column.toLowerCase().replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function dataTypeForWorkbookColumn(column: string): string {
  if (/Date|Updated_At/.test(column)) return "date";
  if (/Cost|Price|Quantity|DBH|Height|Spread|Cut_Count|Percent|Months|Event_Number|Latitude|Longitude/.test(column)) return "number";
  if (/Required|Needed|Enabled|Complete|Confirmed|Ready|Started/.test(column)) return "yes_no";
  if (/Pin|Location/.test(column) && !/Description|Name/.test(column)) return "lat_lng_or_maps_pin";
  if (/URL/.test(column)) return "url";
  return "text";
}

function isRequiredWorkbookColumn(tab: WorkbookTabConfig, column: string): boolean {
  return column === tab.primaryId || column === "Project_ID" || column === "Tree_Asset_ID";
}

function allowedValuesForWorkbookColumn(column: string): string {
  if (column === "Division") return "Relocation & Installation; Nursery; Freight; Equipment";
  if (column === "Project_Type") return "Relocation Job; Installation Job; Mixed Job";
  if (column === "Asset_Category") return assetCategoryOptions.join("; ");
  if (column === "Tree_Final_Outcome") return treeFinalOutcomeOptions.join("; ");
  if (column === "Tree_Relocation_Status" || column === "Relocation_Status") return treeRelocationStatusOptions.join("; ");
  if (column === "Installation_Status" || column === "Install_Status") return installationStatusOptions.join("; ");
  if (column === "Current_Field_Location") return currentFieldLocationOptions.join("; ");
  if (column === "Map_Geometry_Status") return mapGeometryStatusOptions.join("; ");
  if (column === "Root_Prune_Task_Status") return rootPruneTaskStatusOptions.join("; ");
  if (column === "Move_Task_Status") return moveTaskStatusOptions.join("; ");
  if (column === "Move_Type") return moveTypeOptions.join("; ");
  if (column === "Care_Task_Status") return careTaskStatusOptions.join("; ");
  if (column === "Care_Phase") return carePhaseOptions.join("; ");
  if (column === "Treatment_Type") return treatmentTypeOptions.join("; ");
  if (column === "Condition_Observed") return conditionObservedOptions.join("; ");
  if (column === "Stress_Level") return stressLevelOptions.join("; ");
  if (column === "Canopy_Status") return canopyStatusOptions.join("; ");
  if (column === "Leaf_Status") return leafStatusOptions.join("; ");
  if (column === "Watering_Status") return wateringStatusOptions.join("; ");
  if (column === "Irrigation_Status") return irrigationStatusOptions.join("; ");
  if (column === "Soil_Moisture_Status") return soilMoistureStatusOptions.join("; ");
  if (column === "Warranty_Risk") return warrantyRiskOptions.join("; ");
  if (column === "Status" || column === "Current_Status" || column === "Install_Status") return "Planned; Active; Scheduled; In Progress; Ready; Complete; Blocked; On Hold";
  if (/Required|Needed|Enabled/.test(column)) return "Yes; No";
  if (column === "Priority") return "Low; Normal; High; Urgent";
  return "";
}

function notesForWorkbookColumn(tab: WorkbookTabConfig, column: string): string {
  if (column === tab.primaryId) return "Stable ID generated by the app unless you are bulk-entering a known existing record.";
  if (syncColumns.includes(column)) return "Managed by app sync. Leave blank during manual workbook entry.";
  if (column === "Project_ID") return "Required to tie this row back to the project profile.";
  if (column === "Tree_Asset_ID") return "Required to tie pruning, nutrient care, and photos back to one tree.";
  if (/Pin/.test(column)) return "Accepts pasted Google Maps link, decimal lat/long, or saved site pin text.";
  return "";
}

function formatTsvValue(value: WorkbookExportValue): string {
  const text = clean(value);
  if (!text) return "";
  return text.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}
