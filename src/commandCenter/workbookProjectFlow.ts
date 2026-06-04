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
  appPurpose: string;
  workOrderType?: WorkbookWorkOrderType;
};

export const jdtProjectFlowWorkbook = {
  title: "JDT Project Flow Workbook",
  spreadsheetName: "JDT Nurseries",
  spreadsheetId: "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg",
  tabs: {
    Users: { sheetName: "Users", primaryId: "User_ID", appPurpose: "users" },
    Companies: { sheetName: "Companies", primaryId: "Companies_ID", appPurpose: "clients" },
    Company: { sheetName: "Company", primaryId: "Contacts_ID", appPurpose: "contacts" },
    Projects: { sheetName: "Projects", primaryId: "Projects_ID", appPurpose: "projects" },
    "Project Areas": { sheetName: "Project Areas", primaryId: "Project_Area_ID", appPurpose: "project_areas" },
    "Project Statuses": { sheetName: "Project Statuses", primaryId: "Project_Status_ID", appPurpose: "project_statuses" },
    "Tree Assets": { sheetName: "Tree Assets", primaryId: "Tree_Assets_ID", appPurpose: "tree_assets" },
    "Tree Pruning": { sheetName: "Tree Pruning", primaryId: "Tree_Prune_ID", appPurpose: "work_orders", workOrderType: "tree_pruning" },
    "Treatment or Aftercare": { sheetName: "Treatment or Aftercare", primaryId: "Treatment_Aftercare Logs_ID", appPurpose: "work_orders", workOrderType: "treatment_aftercare" },
    "Treatment / Aftercare": { sheetName: "Treatment or Aftercare", primaryId: "Treatment_Aftercare Logs_ID", appPurpose: "work_orders", workOrderType: "treatment_aftercare" },
    "Tree Photos": { sheetName: "Tree Photos", primaryId: "Tree_Photos_ID", appPurpose: "tree_photos" },
    "Move Readiness": { sheetName: "Move Readiness", primaryId: "Move_Readiness_ID", appPurpose: "work_orders", workOrderType: "move_readiness" },
    "Change Orders": { sheetName: "Change Orders", primaryId: "Change_Orders_ID", appPurpose: "work_orders", workOrderType: "change_order" },
    "Billing Milestones": { sheetName: "Billing Milestones", primaryId: "Billing Milestones_ID", appPurpose: "work_orders", workOrderType: "billing_milestone" },
    "Daily Field Updates": { sheetName: "Daily Field Updates", primaryId: "Daily Field Updates_ID", appPurpose: "work_orders", workOrderType: "daily_field_update" },
    Project_Material_Items: { sheetName: "Project_Material_Items", primaryId: "Project_Material_Items_ID", appPurpose: "project_material_items" },
  } satisfies Record<string, WorkbookTabConfig>,
};

export function workOrderTypeForWorkbookTab(sheetName: string): WorkbookWorkOrderType {
  const tab = jdtProjectFlowWorkbook.tabs[sheetName as keyof typeof jdtProjectFlowWorkbook.tabs] as WorkbookTabConfig | undefined;
  return tab?.workOrderType || "general_task";
}

export function workbookTabForWorkOrderType(type: WorkbookWorkOrderType): string {
  const match = (Object.values(jdtProjectFlowWorkbook.tabs) as WorkbookTabConfig[]).find((tab) => tab.workOrderType === type);
  return match?.sheetName || "Daily Field Updates";
}

export function sourceRefFromWorkbookRow(
  sheetName: string,
  row: Record<string, unknown>,
  rowNumber?: number,
): WorkbookSourceRef {
  const tab = jdtProjectFlowWorkbook.tabs[sheetName as keyof typeof jdtProjectFlowWorkbook.tabs] as WorkbookTabConfig | undefined;
  const rowId = tab ? clean(row[tab.primaryId]) : "";

  return {
    sourceType: "google_sheet",
    spreadsheetId: jdtProjectFlowWorkbook.spreadsheetId,
    spreadsheetName: jdtProjectFlowWorkbook.spreadsheetName,
    sheetName,
    ...(rowNumber ? { rowNumber } : {}),
    ...(rowId ? { rowId } : {}),
  };
}

function clean(value: unknown): string {
  return String(value || "").trim();
}
