import type { TreeRelocationRecord, WorkOrderRecord } from "./records";
import { parseGoogleMapsLocationText } from "../treeRelocationMap";

export const treeRelocationSchemaVersion = "2026-06-14";

export const assetCategoryOptions = ["Relocation", "Installation", "Relocation + Installation"] as const;
export const treeFinalOutcomeOptions = [
  "Active in Scope",
  "Preserved by Client",
  "Removed by Client",
  "Removed by Others",
  "Cancelled from Scope",
  "Completed by JDT",
] as const;
export const treeRelocationStatusOptions = [
  "Not Started",
  "25% Cut",
  "50% Cut",
  "75% Cut",
  "100% Cut",
  "Ready for Relocation",
  "Moved to Holding",
  "Relocated",
] as const;
export const installationStatusOptions = ["Not Started", "Scheduled", "In Progress", "Installed", "Complete", "Blocked", "On Hold", "Cancelled"] as const;
export const currentFieldLocationOptions = ["Existing Location", "Holding Area", "Final Location", "Nursery", "Offsite", "Unknown"] as const;
export const mapGeometryStatusOptions = ["Missing", "Parsed", "Synced", "Error"] as const;
export const rootPruneTaskStatusOptions = ["Not Assigned", "Assigned", "Scheduled", "In Progress", "Completed", "Blocked", "On Hold", "Cancelled"] as const;
export const moveTaskStatusOptions = ["Not Assigned", "Assigned", "Scheduled", "In Progress", "Moved to Holding", "Relocated", "Blocked", "On Hold", "Cancelled"] as const;
export const moveTypeOptions = ["Existing to Holding", "Holding to Final", "Existing to Final", "Nursery to Final", "Final Adjustment"] as const;
export const careTaskStatusOptions = ["Not Assigned", "Assigned", "Scheduled", "In Progress", "Completed", "Needs Follow-Up", "Blocked", "On Hold", "Cancelled"] as const;
export const carePhaseOptions = [
  "Pre-Relocation Assessment",
  "During Root Pruning Cycle",
  "After Root Prune Event",
  "Holding Period",
  "Post-Relocation",
  "Warranty / Monitoring",
  "Preservation Monitoring",
] as const;
export const treatmentTypeOptions = ["Nutrient", "Injection", "Soil Drench", "Root Stimulator", "Fungicide", "Insecticide", "Watering", "Inspection", "Other"] as const;
export const stressLevelOptions = ["None", "Low", "Medium", "High", "Critical"] as const;
export const conditionObservedOptions = ["Healthy", "Stable", "Improving", "Wilting", "Leaf Browning", "Leaf Drop", "Canopy Thinning", "Dieback", "Declining", "Dead"] as const;
export const canopyStatusOptions = ["Full", "Thinning", "Browning", "Defoliating", "Dormant", "Unknown"] as const;
export const leafStatusOptions = ["Green", "Yellowing", "Brown Attached", "Brown Dropping", "Wilting", "Defoliated", "Unknown"] as const;
export const wateringStatusOptions = ["Adequate", "Too Dry", "Too Wet", "Inconsistent", "Unknown"] as const;
export const irrigationStatusOptions = ["Working", "Temporary", "Missing", "Broken", "Client Responsibility", "Unknown"] as const;
export const soilMoistureStatusOptions = ["Dry", "Moist", "Saturated", "Unknown"] as const;
export const warrantyRiskOptions = ["Low", "Medium", "High", "Critical"] as const;

export type TreeRelocationSchemaMigrationInput = {
  treeAssets?: TreeRelocationRecord[];
  workOrders?: WorkOrderRecord[];
};

export type TreeRelocationSchemaMigrationOptions = {
  actorEmail?: string;
  nowIso?: string;
};

export function treeRelocationStatusFromRootPrunePercent(percent: unknown): string | undefined {
  const amount = Number(percent);
  if (!Number.isFinite(amount)) return undefined;
  if (amount >= 100) return "100% Cut";
  if (amount >= 75) return "75% Cut";
  if (amount >= 50) return "50% Cut";
  if (amount >= 25) return "25% Cut";
  return undefined;
}

export function treeRelocationStatusFromMove(moveType: unknown): string | undefined {
  const normalized = clean(moveType).toLowerCase();
  if (normalized === "existing to holding") return "Moved to Holding";
  if (normalized === "existing to final" || normalized === "holding to final") return "Relocated";
  return undefined;
}

export function normalizeTreeRelocationStatus(status: unknown): string {
  const normalized = clean(status).toLowerCase();
  const direct = treeRelocationStatusOptions.find((option) => option.toLowerCase() === normalized);
  if (direct) return direct;
  if (["1st cut complete", "first cut complete", "25 cut", "25%"].includes(normalized)) return "25% Cut";
  if (["2nd cut complete", "second cut complete", "50 cut", "50%"].includes(normalized)) return "50% Cut";
  if (["3rd cut complete", "third cut complete", "75 cut", "75%"].includes(normalized)) return "75% Cut";
  if (["4th cut complete", "final cut complete", "100 cut", "100%"].includes(normalized)) return "100% Cut";
  if (["ready for relocation", "ready to relocate"].includes(normalized)) return "Ready for Relocation";
  if (["moved to holding area", "moved to holding", "holding area"].includes(normalized)) return "Moved to Holding";
  if (["relocated", "installed", "complete", "completed"].includes(normalized)) return "Relocated";
  return "Not Started";
}

export function migrateTreeRelocationSchemaRecords(
  input: TreeRelocationSchemaMigrationInput,
  options: TreeRelocationSchemaMigrationOptions = {},
) {
  const nowIso = options.nowIso || new Date().toISOString();
  const treeAssets = (input.treeAssets || []).map((tree) => migrateTreeAssetRecord(tree, options.actorEmail, nowIso));
  const workOrders = (input.workOrders || []).map((workOrder) => migrateTreeOperationRecord(workOrder, options.actorEmail, nowIso));
  return { treeAssets, workOrders };
}

export function migrateTreeAssetRecord(tree: TreeRelocationRecord, actorEmail?: string, nowIso = new Date().toISOString()): TreeRelocationRecord {
  const source = tree as TreeRelocationRecord & Record<string, unknown>;
  const relocationMap = source.relocationMap as { source?: { lat?: number; lng?: number }; destination?: { lat?: number; lng?: number } } | undefined;
  const existingPoint = relocationMap?.source || parseGoogleMapsLocationText(firstText(source.existingSourcePin, source.existingLocationDescription, source.location));
  const destinationPoint = relocationMap?.destination || parseGoogleMapsLocationText(firstText(source.destinationPin, source.proposedFinalLocationDescription));
  const treeRelocationStatus = normalizeTreeRelocationStatus(firstText(source.treeRelocationStatus, source.Tree_Relocation_Status, source.relocationStatus, source.Relocation_Status, source.status));

  return {
    ...tree,
    treeAssetId: firstText(source.treeAssetId, source.Tree_Asset_ID, source.id, source.appRecordId, source.App_Record_ID, source.treeId),
    assetCategory: normalizeAssetCategory(source.assetCategory || source.Asset_Category || source.relocationRequired || source.installationRequired),
    treeTag: firstText(source.treeTag, source.Tree_Tag, source.tag, source.treeId),
    treeType: firstText(source.treeType, source.Tree_Type, source.type),
    treeRelocationStatus,
    relocationStatus: treeRelocationStatus,
    installationStatus: firstText(source.installationStatus, source.Installation_Status, source.installStatus) || "Not Started",
    currentFieldLocation: normalizeCurrentFieldLocation(source.currentFieldLocation || source.Current_Field_Location),
    treeFinalOutcome: normalizeTreeFinalOutcome(source.treeFinalOutcome || source.Tree_Final_Outcome),
    mapGeometryStatus: existingPoint || destinationPoint ? "Parsed" : "Missing",
    existingLatitude: numberOrUndefined(source.existingLatitude) ?? existingPoint?.lat,
    existingLongitude: numberOrUndefined(source.existingLongitude) ?? existingPoint?.lng,
    destinationLatitude: numberOrUndefined(source.destinationLatitude) ?? destinationPoint?.lat,
    destinationLongitude: numberOrUndefined(source.destinationLongitude) ?? destinationPoint?.lng,
    schemaVersion: firstText(source.schemaVersion, source.Schema_Version) || treeRelocationSchemaVersion,
    lastUpdatedBy: firstText(source.lastUpdatedBy, source.Last_Updated_By, actorEmail),
    lastUpdatedAt: firstText(source.lastUpdatedAt, source.Last_Updated_At, nowIso),
  } as TreeRelocationRecord;
}

export function migrateTreeOperationRecord(workOrder: WorkOrderRecord, actorEmail?: string, nowIso = new Date().toISOString()): WorkOrderRecord {
  const source = workOrder as WorkOrderRecord & Record<string, unknown>;
  const treeId = firstListValue(workOrder.treeIds) || firstText(source.treeAssetId, source.Tree_Asset_ID);
  const projectId = firstText(workOrder.projectId, source.Project_ID);
  const next: WorkOrderRecord & Record<string, unknown> = {
    ...workOrder,
    schemaVersion: firstText(source.schemaVersion, source.Schema_Version) || treeRelocationSchemaVersion,
    lastUpdatedBy: firstText(source.lastUpdatedBy, source.Last_Updated_By, actorEmail),
    lastUpdatedAt: firstText(source.lastUpdatedAt, source.Last_Updated_At, nowIso),
  };
  if (workOrder.workOrderType === "tree_pruning") {
    next.rootPruneCycleId = firstText(source.rootPruneCycleId, source.Root_Prune_Cycle_ID) || stableId("RPC", projectId, treeId);
    next.rootPruneTaskStatus = normalizeTaskStatus(workOrder.status, rootPruneTaskStatusOptions);
  }
  if (workOrder.workOrderType === "tree_relocation_work") {
    next.moveTaskStatus = normalizeTaskStatus(workOrder.status, moveTaskStatusOptions);
  }
  if (workOrder.workOrderType === "treatment_aftercare") {
    next.careTaskStatus = normalizeTaskStatus(workOrder.status, careTaskStatusOptions);
  }
  return next;
}

function normalizeAssetCategory(value: unknown): string {
  const text = clean(value);
  const direct = assetCategoryOptions.find((option) => option.toLowerCase() === text.toLowerCase());
  if (direct) return direct;
  if (/install/i.test(text) && /relocat/i.test(text)) return "Relocation + Installation";
  if (/install/i.test(text)) return "Installation";
  return "Relocation";
}

function normalizeTreeFinalOutcome(value: unknown): string {
  const text = clean(value);
  return treeFinalOutcomeOptions.find((option) => option.toLowerCase() === text.toLowerCase()) || "Active in Scope";
}

function normalizeCurrentFieldLocation(value: unknown): string {
  const text = clean(value);
  return currentFieldLocationOptions.find((option) => option.toLowerCase() === text.toLowerCase()) || "Existing Location";
}

function normalizeTaskStatus<T extends readonly string[]>(value: unknown, options: T): T[number] {
  const text = clean(value);
  const direct = options.find((option) => option.toLowerCase() === text.toLowerCase());
  if (direct) return direct as T[number];
  if (/complete/i.test(text)) return "Completed" as T[number];
  if (/progress|active/i.test(text)) return "In Progress" as T[number];
  if (/schedule/i.test(text)) return "Scheduled" as T[number];
  if (/assign/i.test(text)) return "Assigned" as T[number];
  if (/block/i.test(text)) return "Blocked" as T[number];
  if (/hold/i.test(text)) return "On Hold" as T[number];
  if (/cancel/i.test(text)) return "Cancelled" as T[number];
  return "Not Assigned" as T[number];
}

function stableId(prefix: string, ...parts: unknown[]): string {
  const body = parts.map(clean).filter(Boolean).join("-");
  return `${prefix}-${body || "UNASSIGNED"}`.replace(/[^A-Za-z0-9_-]+/g, "-");
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function firstText(...values: unknown[]): string {
  return values.map(clean).find(Boolean) || "";
}

function firstListValue(values?: string[]): string {
  return Array.isArray(values) ? clean(values[0]) : "";
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
