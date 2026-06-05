import type {
  DocumentRecord,
  ProjectMaterialItemRecord,
  ProjectRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from './records';

export type WorkbookWorkOrderType =
  | "tree_pruning"
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

export const projectWorkbookSchemaVersion = "2026-06-04";

const syncColumns = ["App_Record_ID", "App_Updated_At", "Last_Sync_Batch_ID", "Schema_Version"];

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
  "Tree_Type",
  "Tag",
  "DBH_IN",
  "Height",
  "Spread",
  "Difficulty",
  "Condition",
  "Existing_Location_Description",
  "Existing_Source_Pin",
  "Proposed_Final_Location_Description",
  "Destination_Pin",
  "Current_Status",
  "Relocation_Required",
  "Installation_Required",
  "Preservation_Required",
  "Removal_Required",
  "Relocation_Status",
  "Relocation_Cost",
  "Priority",
  "Notes",
  ...syncColumns,
];

const rootPruningColumns = [
  "Root_Pruning_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Cut_Count",
  "Date_1st_Cut",
  "Date_2nd_Cut",
  "Date_3rd_Cut",
  "Prep_Checks",
  "Readiness_Status",
  "Next_Action",
  "Notes",
  ...syncColumns,
];

const nutrientCareColumns = [
  "Nutrient_Care_ID",
  "Tree_Asset_ID",
  "Project_ID",
  "Treatment",
  "Treatment_Type",
  "Date_Last_Treatment",
  "Treatment_Action",
  "Completed_By",
  "Condition_Observed",
  "Watering_Status",
  "Irrigation_Status",
  "Stress_Level",
  "Follow_Up_Needed",
  "Next_Follow_Up_Date",
  "Notes",
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
  "Project_Nutrient_Care",
  "Project_Tree_Photos",
  "Project_Material_Items",
  "Project_Work_Purposes",
] as const;

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
    buildExportTable("Project_Nutrient_Care", (input.workOrders || []).filter((workOrder) => workOrder.workOrderType === "treatment_aftercare").map((workOrder) => compactRow(rowForNutrientCare(workOrder, syncBatchId)))),
    buildExportTable("Project_Tree_Photos", (input.documents || []).filter((document) => document.category === "Tree Photo" || Boolean(document.treeId)).map((document) => compactRow(rowForTreePhoto(document, syncBatchId)))),
    buildExportTable("Project_Material_Items", (input.materialItems || []).map((item) => compactRow(rowForMaterialItem(item, syncBatchId)))),
    buildExportTable("Project_Work_Purposes", (input.workOrders || []).map((workOrder) => compactRow(rowForWorkPurpose(workOrder, syncBatchId)))),
  ];

  return tables;
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
    Tree_Asset_ID: tree.id || tree.treeId,
    Project_ID: tree.projectId || tree.projectsId,
    Client_ID: tree.clientId,
    Tree_Type: tree.treeType || tree.type || tree.ranchOakType,
    Tag: tree.tag || tree.treeId,
    DBH_IN: tree.dbh,
    Height: tree.height,
    Spread: tree.spread,
    Difficulty: tree.difficulty,
    Condition: tree.condition,
    Existing_Location_Description: tree.existingLocationDescription || tree.location,
    Existing_Source_Pin: pointText(relocationMap?.source),
    Proposed_Final_Location_Description: tree.proposedFinalLocationDescription,
    Destination_Pin: pointText(relocationMap?.destination),
    Current_Status: tree.currentStatus || tree.status,
    Relocation_Required: tree.relocationRequired,
    Installation_Required: tree.installationRequired,
    Preservation_Required: tree.preservationRequired,
    Removal_Required: tree.removalRequired,
    Relocation_Status: tree.relocationStatus,
    Relocation_Cost: tree.relocationCost,
    Priority: tree.priority,
    Notes: tree.notes,
  }, tree, syncBatchId);
}

function rowForRootPruning(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Root_Pruning_ID: workOrder.id,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Cut_Count: fieldFromNotes(workOrder.notes, "Root prune cuts"),
    Date_1st_Cut: workOrder.scheduledDate,
    Date_2nd_Cut: "",
    Date_3rd_Cut: "",
    Prep_Checks: fieldFromNotes(workOrder.notes, "Prep checks"),
    Readiness_Status: workOrder.status,
    Next_Action: workOrder.taskType === "Root Pruning" ? "" : workOrder.taskType,
    Notes: workOrder.notes,
  }, workOrder, syncBatchId);
}

function rowForNutrientCare(workOrder: WorkOrderRecord, syncBatchId: string): WorkbookExportRow {
  return withSyncColumns({
    Nutrient_Care_ID: workOrder.id,
    Tree_Asset_ID: firstListValue(workOrder.treeIds),
    Project_ID: workOrder.projectId || workOrder.projectsId,
    Treatment: fieldFromNotes(workOrder.notes, "Treatments"),
    Treatment_Type: fieldFromNotes(workOrder.notes, "Treatment type") || workOrder.taskType,
    Date_Last_Treatment: workOrder.completedDate,
    Treatment_Action: fieldFromNotes(workOrder.notes, "Action") || workOrder.status,
    Completed_By: workOrder.crewLeadName,
    Condition_Observed: fieldFromNotes(workOrder.notes, "Condition observed"),
    Watering_Status: fieldFromNotes(workOrder.notes, "Watering"),
    Irrigation_Status: fieldFromNotes(workOrder.notes, "Irrigation"),
    Stress_Level: fieldFromNotes(workOrder.notes, "Stress level"),
    Follow_Up_Needed: workOrder.scheduledDate ? "Yes" : "",
    Next_Follow_Up_Date: workOrder.scheduledDate,
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
  if (workOrder.workOrderType === "treatment_aftercare") return "Nutrient Care";
  if (workOrder.workOrderType === "freight") return "Freight Support";
  if (workOrder.workOrderType === "equipment") return "Equipment Change";
  return workOrder.title || workOrder.name || "General Task";
}

function formatTsvValue(value: WorkbookExportValue): string {
  const text = clean(value);
  if (!text) return "";
  return text.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}
