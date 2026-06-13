import type {
  AlertRecord,
  ClientRecord,
  CommandRecord,
  DocumentRecord,
  EquipmentRecord,
  FieldUpdateRecord,
  FleetTelematicsEventRecord,
  ImportBatchRecord,
  InventoryItemRecord,
  JobRecord,
  LoadRecord,
  ProjectRecord,
  RanchOakRecord,
  ScheduleTaskRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from "./records";
import { sameProject } from "./relationships";
import { buildRevealTelematicsKpis } from "./telematicsIntelligence";

export type RelationshipIssue = {
  id: string;
  severity: "High" | "Medium" | "Low";
  recordType: string;
  recordId: string;
  field: string;
  currentValue: string;
  expectedValue: string;
  message: string;
};

export type ProjectRiskScore = {
  id: string;
  jobId: string;
  projectId: string;
  title: string;
  clientName: string;
  score: number;
  level: "Critical" | "High" | "Watch" | "Low";
  reasons: string[];
  targetTab: "tracker";
  drawerType: "job";
  recordId: string;
};

export type CommandBriefItem = {
  id: string;
  title: string;
  detail: string;
  owner?: string;
  targetTab: string;
  drawerType: string;
  recordId?: string;
};

export type DailyCommandBrief = {
  todayIso: string;
  tomorrowIso: string;
  summary: string;
  today: CommandBriefItem[];
  tomorrow: CommandBriefItem[];
  decisions: CommandBriefItem[];
  equipmentIssues: CommandBriefItem[];
  freightIssues: CommandBriefItem[];
  fieldUpdates: CommandBriefItem[];
};

export type OperatingKpiMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "ready" | "watch" | "bad" | "context";
};

export type OperatingKpiGroup = {
  id: "projectHealth" | "crewCommunication" | "freightReadiness" | "equipmentReadiness" | "treeLifecycle" | "revealTelematics" | "dataQuality";
  title: string;
  metrics: OperatingKpiMetric[];
};

export type DataQualityActionItem = {
  id: string;
  severity: "High" | "Medium" | "Low";
  sourceType: string;
  sourceId: string;
  title: string;
  detail: string;
  recommendedAction: string;
  targetTab: string;
  drawerType: string;
  recordId?: string;
  field?: string;
  currentValue?: string;
  expectedValue?: string;
};

export type WorkflowReadinessStage = "Save" | "Dispatch" | "Closeout" | "Review";

export type WorkflowReadinessIssue = {
  id: string;
  severity: "High" | "Medium" | "Low";
  workflow: string;
  stage: WorkflowReadinessStage;
  sourceType: string;
  sourceId: string;
  title: string;
  missingFields: string[];
  detail: string;
  recommendedAction: string;
  targetTab: string;
  drawerType: string;
  recordId?: string;
};

export type OperatingIntelligenceInput = {
  clients?: ClientRecord[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  workOrders?: WorkOrderRecord[];
  loads?: LoadRecord[];
  equipment?: EquipmentRecord[];
  fieldUpdates?: FieldUpdateRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  documents?: DocumentRecord[];
  alerts?: AlertRecord[];
  fleetTelematicsEvents?: FleetTelematicsEventRecord[];
  importBatches?: ImportBatchRecord[];
  ranchOaks?: RanchOakRecord[];
  inventoryItems?: InventoryItemRecord[];
  todayIso?: string;
};

const emptyInput: Required<OperatingIntelligenceInput> = {
  clients: [],
  projects: [],
  jobs: [],
  workOrders: [],
  loads: [],
  equipment: [],
  fieldUpdates: [],
  scheduleTasks: [],
  treeRelocationRecords: [],
  documents: [],
  alerts: [],
  fleetTelematicsEvents: [],
  importBatches: [],
  ranchOaks: [],
  inventoryItems: [],
  todayIso: "",
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function sameKnownValue(left: unknown, right: unknown): boolean {
  const cleanLeft = clean(left);
  const cleanRight = clean(right);
  return Boolean(cleanLeft && cleanRight && cleanLeft === cleanRight);
}

function normalized(value: unknown): string {
  return clean(value).toLowerCase();
}

function includesAny(record: Record<string, unknown>, words: string[]) {
  const text = Object.values(record)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => typeof value === "object" ? "" : String(value))
    .join(" ")
    .toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

function isInactive(record: Record<string, unknown>) {
  return includesAny(record, ["complete", "completed", "cancelled", "canceled", "closed"]);
}

function isBlocked(record: Record<string, unknown>) {
  return !isInactive(record) && includesAny(record, ["blocked", "hold", "down", "repair hold", "permit issue", "issue"]);
}

function isEquipmentHold(equipment: EquipmentRecord) {
  return !isInactive(equipment) && includesAny(equipment, ["needs service", "maintenance", "down", "repair", "service due", "hold"]);
}

function isFreightGap(load: LoadRecord) {
  return !isInactive(load) && (!clean(load.driver) || !clean(load.truck) || includesAny(load, ["permit", "issue", "hold", "blocked", "delayed", "missing"]));
}

function needsProof(load: LoadRecord) {
  return !isInactive(load) && (
    (load.requiredDocuments || []).some((doc) => !includesAny(doc, ["complete", "filed", "received"]))
    || (load.stops || []).some((stop) => stop.requiredPhotos || stop.requiredSignature)
  );
}

function needsReview(update: FieldUpdateRecord) {
  return !isInactive(update) && (
    update.needsAdminReview === true
    || includesAny(update, ["delayed", "need help", "needs help", "issue", "blocked", "hold", "stuck", "down"])
  );
}

function isUnassignedTask(task: ScheduleTaskRecord) {
  return !isInactive(task) && (!clean(task.assignee) || includesAny(task, ["not dispatched", "unassigned", "pending dispatch", "dispatch gap"]));
}

function recordTitle(record: CommandRecord, fallback = "Untitled record") {
  return clean(record.title) || clean(record.name) || fallback;
}

function dateOnly(value: unknown) {
  const raw = clean(value);
  if (!raw) return "";
  return raw.slice(0, 10);
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function relatedWorkOrders(job: JobRecord, workOrders: WorkOrderRecord[]) {
  return workOrders.filter((workOrder) => (
    sameKnownValue(workOrder.jobId, job.id)
    || sameKnownValue(workOrder.jobId, job.jobId)
    || sameKnownValue(workOrder.projectId, job.projectId)
    || sameProject(job, workOrder)
  ));
}

function relatedLoads(job: JobRecord, loads: LoadRecord[]) {
  return loads.filter((load) => (
    sameKnownValue(load.jobId, job.id)
    || sameKnownValue(load.jobId, job.jobId)
    || sameKnownValue(load.projectId, job.projectId)
    || sameProject(job, load)
  ));
}

function relatedScheduleTasks(job: JobRecord, scheduleTasks: ScheduleTaskRecord[]) {
  return scheduleTasks.filter((task) => (
    sameKnownValue(task.jobId, job.id)
    || sameKnownValue(task.jobId, job.jobId)
    || sameKnownValue(task.projectId, job.projectId)
    || sameProject(job, task)
  ));
}

function relatedFieldUpdates(job: JobRecord, fieldUpdates: FieldUpdateRecord[], workOrders: WorkOrderRecord[], loads: LoadRecord[]) {
  const relatedIds = new Set<string>([
    job.id,
    job.jobId,
    job.projectId,
    ...relatedWorkOrders(job, workOrders).map((workOrder) => workOrder.id),
    ...relatedLoads(job, loads).map((load) => load.id),
  ].filter(Boolean).map(String));

  return fieldUpdates.filter((update) => relatedIds.has(clean(update.relatedRecordId)));
}

function issue(id: string, recordType: string, record: CommandRecord, field: string, currentValue: unknown, expectedValue: unknown, message: string, severity: RelationshipIssue["severity"] = "High"): RelationshipIssue {
  return {
    id,
    severity,
    recordType,
    recordId: clean(record.id) || recordTitle(record),
    field,
    currentValue: clean(currentValue),
    expectedValue: clean(expectedValue),
    message,
  };
}

export function findRelationshipIssues(input: OperatingIntelligenceInput): RelationshipIssue[] {
  const { clients, jobs, workOrders, loads, scheduleTasks, treeRelocationRecords, documents } = { ...emptyInput, ...input };
  const clientsById = new Map<string, ClientRecord>(
    clients
      .map((client): [string, ClientRecord] => [clean(client.id), client])
      .filter(([id]) => Boolean(id)),
  );
  const clientsByName = new Map<string, ClientRecord>(
    clients
      .map((client): [string, ClientRecord] => [normalized(client.name || client.title || client.clientName), client])
      .filter(([name]) => Boolean(name)),
  );
  const jobCandidates = jobs.filter((job) => clean(job.projectId) || clean(job.projectName) || clean(job.id));
  const issues: RelationshipIssue[] = [];

  jobs.forEach((job) => {
    const namedClient = clientsByName.get(normalized(job.clientName || job.client));
    if (namedClient && clean(job.clientId) !== clean(namedClient.id)) {
      issues.push(issue(
        `relationship-job-${job.id}-clientId`,
        "job",
        job,
        "clientId",
        job.clientId,
        namedClient.id,
        `${recordTitle(job)} is linked to ${job.clientId || "no client id"}, but ${job.clientName || job.client} is saved as ${namedClient.id}.`,
      ));
    } else if (clean(job.clientId) && !clientsById.has(clean(job.clientId))) {
      issues.push(issue(
        `relationship-job-${job.id}-missing-client`,
        "job",
        job,
        "clientId",
        job.clientId,
        "",
        `${recordTitle(job)} points to a client id that is not in the client directory.`,
        "Medium",
      ));
    }
  });

  const checkProjectJob = (recordType: string, record: CommandRecord) => {
    const match = jobCandidates.find((job) => (
      sameKnownValue(record.jobId, job.id)
      || sameKnownValue(record.jobId, job.jobId)
      || sameKnownValue(record.projectId, job.projectId)
      || sameKnownValue(normalized(record.projectName), normalized(job.projectName))
      || sameKnownValue(normalized(record.jobName), normalized(job.title))
      || sameProject(job, record)
    ));
    if (!match) return;

    if (!clean(record.projectId) && clean(match.projectId)) {
      issues.push(issue(
        `relationship-${recordType}-${record.id}-projectId`,
        recordType,
        record,
        "projectId",
        record.projectId,
        match.projectId,
        `${recordTitle(record)} is missing the project id for ${match.projectName || match.title}.`,
        "Medium",
      ));
    }
    if (!clean(record.jobId) && clean(match.id)) {
      issues.push(issue(
        `relationship-${recordType}-${record.id}-jobId`,
        recordType,
        record,
        "jobId",
        record.jobId,
        match.id,
        `${recordTitle(record)} is missing the job id for ${match.title || match.jobName}.`,
        "Medium",
      ));
    }
  };

  workOrders.forEach((record) => checkProjectJob("workOrder", record));
  loads.forEach((record) => checkProjectJob("load", record));
  scheduleTasks.forEach((record) => checkProjectJob("scheduleTask", record));
  treeRelocationRecords.forEach((record) => checkProjectJob("tree", record));
  documents.forEach((record) => checkProjectJob("document", record));

  return issues;
}

function sourceRecordForIssue(issue: RelationshipIssue, input: Required<OperatingIntelligenceInput>): CommandRecord | undefined {
  const collections: Record<string, CommandRecord[]> = {
    client: input.clients,
    project: input.projects,
    job: input.jobs,
    workOrder: input.workOrders,
    load: input.loads,
    scheduleTask: input.scheduleTasks,
    tree: input.treeRelocationRecords,
    document: input.documents,
    equipment: input.equipment,
    fieldUpdate: input.fieldUpdates,
    importBatch: input.importBatches,
  };
  return (collections[issue.recordType] || []).find((record) => (
    clean(record.id) === clean(issue.recordId)
    || clean(record.jobId) === clean(issue.recordId)
    || clean(record.projectId) === clean(issue.recordId)
    || recordTitle(record) === issue.recordId
  ));
}

function targetForSource(sourceType: string): Pick<DataQualityActionItem, "targetTab" | "drawerType"> {
  switch (sourceType) {
    case "job":
    case "project":
    case "workOrder":
    case "tree":
    case "scheduleTask":
      return { targetTab: "tracker", drawerType: sourceType === "project" ? "job" : sourceType };
    case "load":
      return { targetTab: "freight", drawerType: "freight" };
    case "document":
      return { targetTab: "documents", drawerType: "document" };
    case "equipment":
      return { targetTab: "equipment", drawerType: "equipment" };
    case "fieldUpdate":
      return { targetTab: "crewView", drawerType: "fieldUpdate" };
    case "importBatch":
      return { targetTab: "sheets", drawerType: "importBatch" };
    default:
      return { targetTab: "reports", drawerType: sourceType };
  }
}

function hasClientContext(record: CommandRecord & { client?: unknown }): boolean {
  return Boolean(clean(record.clientId) || clean(record.clientName) || clean(record.client));
}

function hasProjectContext(record: CommandRecord & { projectsId?: unknown; project?: unknown }): boolean {
  return Boolean(clean(record.projectId) || clean(record.projectName) || clean(record.projectsId) || clean(record.project));
}

function hasJobContext(record: CommandRecord & { job?: unknown }): boolean {
  return Boolean(clean(record.jobId) || clean(record.jobName) || clean(record.job));
}

function hasDocumentContext(record: DocumentRecord): boolean {
  const generic = record as DocumentRecord & {
    relatedRecordId?: unknown;
    treeId?: unknown;
    equipmentId?: unknown;
    personnelId?: unknown;
    loadId?: unknown;
  };
  return Boolean(
    hasClientContext(record)
    || hasProjectContext(record)
    || hasJobContext(record)
    || clean(record.job)
    || clean(generic.relatedRecordId)
    || clean(generic.treeId)
    || clean(generic.equipmentId)
    || clean(generic.personnelId)
    || clean(generic.loadId)
  );
}

function dataQualityItem(
  sourceType: string,
  record: CommandRecord,
  severity: DataQualityActionItem["severity"],
  detail: string,
  recommendedAction: string,
  suffix: string,
): DataQualityActionItem {
  const target = targetForSource(sourceType);
  return {
    id: `data-quality-${sourceType}-${clean(record.id) || clean(recordTitle(record))}-${suffix}`,
    severity,
    sourceType,
    sourceId: clean(record.id) || recordTitle(record),
    title: recordTitle(record),
    detail,
    recommendedAction,
    recordId: clean(record.id) || clean(record.jobId) || clean(record.projectId) || recordTitle(record),
    ...target,
  };
}

function severityRank(severity: DataQualityActionItem["severity"]): number {
  if (severity === "High") return 0;
  if (severity === "Medium") return 1;
  return 2;
}

function sourceRank(sourceType: string): number {
  const order = ["job", "project", "workOrder", "tree", "load", "document", "scheduleTask", "equipment", "fieldUpdate", "importBatch"];
  const index = order.indexOf(sourceType);
  return index === -1 ? order.length : index;
}

function compactMissing(fields: Array<[string, boolean]>): string[] {
  return fields.filter(([, missing]) => missing).map(([field]) => field);
}

function hasAnyField(record: CommandRecord, fields: string[]): boolean {
  const generic = record as Record<string, unknown>;
  return fields.some((field) => clean(generic[field]));
}

function hasAnyArray(record: CommandRecord, fields: string[]): boolean {
  const generic = record as Record<string, unknown>;
  return fields.some((field) => Array.isArray(generic[field]) && (generic[field] as unknown[]).length > 0);
}

function hasRouteStops(load: LoadRecord): boolean {
  return Boolean((load.stops || []).length || (load.routeSteps || []).length || clean(load.stepPlanText) || (clean(load.origin) && clean(load.delivery || load.destination)));
}

function hasTreeSourcePin(tree: TreeRelocationRecord): boolean {
  const generic = tree as TreeRelocationRecord & {
    sourcePin?: unknown;
    existingSourcePin?: unknown;
    sourcePoint?: unknown;
    sourceLatitude?: unknown;
    sourceLongitude?: unknown;
  };
  return Boolean(clean(generic.sourcePin) || clean(generic.existingSourcePin) || clean(generic.sourceLatitude) || clean(generic.sourceLongitude) || (generic.sourcePoint && typeof generic.sourcePoint === "object"));
}

function hasTreeDestinationPin(tree: TreeRelocationRecord): boolean {
  const generic = tree as TreeRelocationRecord & {
    destinationPin?: unknown;
    proposedDestinationPin?: unknown;
    destinationPoint?: unknown;
    destinationLatitude?: unknown;
    destinationLongitude?: unknown;
  };
  return Boolean(clean(generic.destinationPin) || clean(generic.proposedDestinationPin) || clean(generic.destinationLatitude) || clean(generic.destinationLongitude) || (generic.destinationPoint && typeof generic.destinationPoint === "object"));
}

function readinessItem(
  sourceType: string,
  workflow: string,
  stage: WorkflowReadinessStage,
  record: CommandRecord,
  missingFields: string[],
  recommendedAction: string,
  severity: WorkflowReadinessIssue["severity"] = "High",
): WorkflowReadinessIssue | null {
  if (!missingFields.length) return null;
  const target = targetForSource(sourceType);
  return {
    id: `workflow-readiness-${sourceType}-${clean(record.id) || clean(recordTitle(record))}-${stage.toLowerCase()}`,
    severity,
    workflow,
    stage,
    sourceType,
    sourceId: clean(record.id) || recordTitle(record),
    title: recordTitle(record),
    missingFields,
    detail: `${workflow} is missing ${missingFields.join(", ")} before ${stage.toLowerCase()}.`,
    recommendedAction,
    recordId: clean(record.id) || clean(record.jobId) || clean(record.projectId) || recordTitle(record),
    ...target,
  };
}

function workflowRank(item: WorkflowReadinessIssue): number {
  const order = ["Project", "Crew Work Order", "Freight Move", "Equipment / Maintenance", "Field Closeout", "Project Tree", "Nursery Inventory"];
  const index = order.indexOf(item.workflow);
  return index === -1 ? order.length : index;
}

export function buildWorkflowReadinessQueue(input: OperatingIntelligenceInput, limit = 12): WorkflowReadinessIssue[] {
  const merged = { ...emptyInput, ...input };
  const items: WorkflowReadinessIssue[] = [];

  merged.projects.forEach((project) => {
    const missing = compactMissing([
      ["Client", !hasClientContext(project)],
      ["Project name", !clean(project.projectName || project.title || project.name)],
      ["Division or status", !clean(project.division || project.projectType || project.status)],
      ["Main location", !hasAnyField(project, ["location", "mainAddress", "locationName", "locationId"])],
    ]);
    const item = readinessItem("project", "Project", "Dispatch", project, missing, "Complete project basics before assigning crews, freight, equipment, trees, or imports.", missing.some((field) => field !== "Main location") ? "High" : "Medium");
    if (item) items.push(item);
  });

  merged.workOrders.forEach((workOrder) => {
    const missing = compactMissing([
      ["Project", !hasProjectContext(workOrder)],
      ["Work type or task", !clean(workOrder.workOrderType || workOrder.taskType || workOrder.title || workOrder.name)],
      ["Scheduled date or date range", !hasAnyField(workOrder, ["scheduledDate", "startDate", "dueDate", "endDate"])],
      ["Crew lead or assigned crew", !clean(workOrder.crewLeadName || workOrder.crewLeadId) && !hasAnyArray(workOrder, ["assignedCrewNames", "assignedCrewIds"])],
      ["Work location", !hasAnyField(workOrder, ["origin", "destination", "siteArea", "location", "locationName", "mainAddress"])],
    ]);
    const item = readinessItem("workOrder", "Crew Work Order", "Dispatch", workOrder, missing, "Complete crew work order details before putting this on the working schedule.");
    if (item) items.push(item);
  });

  merged.loads.forEach((load) => {
    const missing = compactMissing([
      ["Project or job", !hasProjectContext(load) && !hasJobContext(load)],
      ["Driver", !clean(load.driver)],
      ["Truck", !clean(load.truck || load.truckId)],
      ["Move date", !hasAnyField(load, ["date", "pickupDate", "deliveryDate"])],
      ["Route stops or origin/delivery", !hasRouteStops(load)],
    ]);
    const item = readinessItem("load", "Freight Move", "Dispatch", load, missing, "Complete freight dispatch details before sending this move to a driver.");
    if (item) items.push(item);
  });

  merged.equipment.forEach((equipment) => {
    if (!isEquipmentHold(equipment)) return;
    const missing = compactMissing([
      ["Equipment identity", !clean(equipment.name || equipment.title || equipment.assetId || equipment.asset || equipment.model)],
      ["Current location", !hasAnyField(equipment, ["currentLocationName", "currentLocation", "location"])],
      ["Service status", !clean(equipment.serviceStatus)],
    ]);
    const item = readinessItem("equipment", "Equipment / Maintenance", "Review", equipment, missing, "Complete equipment location and service status so scheduling can see the downtime impact.", missing.includes("Equipment identity") ? "High" : "Medium");
    if (item) items.push(item);
  });

  merged.fieldUpdates.forEach((update) => {
    if (!needsReview(update) && normalized(update.updateType) !== "complete" && normalized(update.fieldStatus) !== "complete") return;
    const missing = compactMissing([
      ["Related record", !clean(update.relatedRecordId || update.relatedTitle || update.relatedRecordType)],
      ["Update type or status", !clean(update.updateType || update.fieldStatus || update.status)],
      ["Crew or user", !clean(update.crewName || update.crewId || update.userEmail)],
      ["Closeout notes or location detail", !clean(update.notes || update.locationDetail || update.locationName)],
    ]);
    const item = readinessItem("fieldUpdate", "Field Closeout", "Closeout", update, missing, "Attach this field update to the correct work and add enough closeout detail for office review.");
    if (item) items.push(item);
  });

  merged.treeRelocationRecords.forEach((tree) => {
    const status = clean(tree.relocationStatus || tree.status || tree.type);
    const needsMovePins = includesAny(tree, ["ready for relocation", "relocated", "moved to holding area"]);
    const missing = compactMissing([
      ["Project", !hasProjectContext(tree)],
      ["Tree ID or tag", !clean(tree.treeId || tree.tag || tree.id)],
      ["Tree type", !clean(tree.type || tree.title || tree.name)],
      ["Relocation status", !status],
      ["Source pin", needsMovePins && !hasTreeSourcePin(tree)],
      ["Destination pin", needsMovePins && !hasTreeDestinationPin(tree)],
    ]);
    const item = readinessItem("tree", "Project Tree", "Dispatch", tree, missing, "Complete project tree identity, status, and pins before using it for map or relocation assignments.");
    if (item) items.push(item);
  });

  [...merged.ranchOaks, ...merged.inventoryItems].forEach((inventory) => {
    const missing = compactMissing([
      ["Tree or species name", !clean(inventory.species || inventory.commonName || inventory.treeType || inventory.title || inventory.name)],
      ["Farm, location, or zone", !hasAnyField(inventory, ["farm", "fieldLocation", "zone", "row", "position"])],
      ["Quantity", !clean(inventory.quantity) && !clean(inventory.treeId)],
    ]);
    const item = readinessItem("tree", "Nursery Inventory", "Review", inventory, missing, "Complete inventory identity, location, and quantity before relying on nursery availability reports.", missing.includes("Tree or species name") ? "High" : "Medium");
    if (item) {
      item.targetTab = "inventory";
      items.push(item);
    }
  });

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.workflow}:${item.sourceId}:${item.missingFields.join("|")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => workflowRank(a) - workflowRank(b) || severityRank(a.severity) - severityRank(b.severity) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function buildDataQualityActionQueue(input: OperatingIntelligenceInput, limit = 12): DataQualityActionItem[] {
  const merged = { ...emptyInput, ...input };
  const items: DataQualityActionItem[] = [];
  const relationshipGroups = new Map<string, RelationshipIssue[]>();

  findRelationshipIssues(merged).forEach((relationshipIssue) => {
    const key = `${relationshipIssue.recordType}:${relationshipIssue.recordId}`;
    relationshipGroups.set(key, [...(relationshipGroups.get(key) || []), relationshipIssue]);
  });

  relationshipGroups.forEach((issues) => {
    const firstIssue = issues[0];
    const sourceRecord = sourceRecordForIssue(firstIssue, merged) || ({ id: firstIssue.recordId, title: firstIssue.recordId } as CommandRecord);
    const target = targetForSource(firstIssue.recordType);
    items.push({
      id: `data-quality-relationship-${firstIssue.recordType}-${firstIssue.recordId}`,
      severity: issues.some((item) => item.severity === "High") ? "High" : issues.some((item) => item.severity === "Medium") ? "Medium" : "Low",
      sourceType: firstIssue.recordType,
      sourceId: firstIssue.recordId,
      title: recordTitle(sourceRecord),
      detail: issues.length > 1
        ? `${firstIssue.message} ${issues.length} relationship fields need review.`
        : firstIssue.message,
      recommendedAction: "Fix the saved client/project/job link before using this record for scheduling or reports.",
      targetTab: target.targetTab,
      drawerType: target.drawerType,
      recordId: clean(sourceRecord.id) || firstIssue.recordId,
      field: issues.map((item) => item.field).join(", "),
      currentValue: issues.map((item) => item.currentValue || "-").join(", "),
      expectedValue: issues.map((item) => item.expectedValue || "-").join(", "),
    });
  });

  merged.projects.forEach((project) => {
    if (!hasClientContext(project)) {
      items.push(dataQualityItem(
        "project",
        project,
        "High",
        `${recordTitle(project)} is missing client context.`,
        "Select the saved client before this project is used for work orders, maps, imports, or reports.",
        "missing-client",
      ));
    }
  });

  merged.workOrders.forEach((workOrder) => {
    if (!hasProjectContext(workOrder)) {
      items.push(dataQualityItem(
        "workOrder",
        workOrder,
        "High",
        `${recordTitle(workOrder)} is missing project context.`,
        "Attach this work order to a saved project so crew, equipment, freight, field updates, and reports stay connected.",
        "missing-project",
      ));
    }
  });

  merged.loads.forEach((load) => {
    if (!hasProjectContext(load) || !hasJobContext(load)) {
      items.push(dataQualityItem(
        "load",
        load,
        "Medium",
        `${recordTitle(load)} is missing ${!hasProjectContext(load) && !hasJobContext(load) ? "project and job" : !hasProjectContext(load) ? "project" : "job"} context.`,
        "Attach this freight move to the saved project and work order before dispatching or reporting.",
        "missing-project-job",
      ));
    }
  });

  merged.treeRelocationRecords.forEach((tree) => {
    if (!hasProjectContext(tree)) {
      items.push(dataQualityItem(
        "tree",
        tree,
        "High",
        `${recordTitle(tree)} is missing project context.`,
        "Attach this tree to the correct project before using it in maps, root pruning, nutrient care, photos, or status reports.",
        "missing-project",
      ));
    }
  });

  merged.documents.forEach((document) => {
    if (!hasDocumentContext(document)) {
      items.push(dataQualityItem(
        "document",
        document,
        "Medium",
        `${recordTitle(document)} is not linked to an operating record.`,
        "Link this file or photo to a client, project, work order, tree, equipment, personnel record, or freight move.",
        "missing-link",
      ));
    }
  });

  merged.importBatches.forEach((batch) => {
    if (Number(batch.warningCount || 0) > 0 || (batch.warnings || []).length > 0) {
      items.push(dataQualityItem(
        "importBatch",
        batch,
        "Low",
        [batch.warningCount ? `${batch.warningCount} import warnings` : "", ...(batch.warnings || []).slice(0, 2)].filter(Boolean).join(" - "),
        "Review the import warnings before using these records as the source of truth.",
        "warnings",
      ));
    }
  });

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.sourceType}:${item.sourceId}:${item.recommendedAction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || sourceRank(a.sourceType) - sourceRank(b.sourceType) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function buildProjectRiskScores(input: OperatingIntelligenceInput): ProjectRiskScore[] {
  const { jobs, workOrders, loads, equipment, fieldUpdates, scheduleTasks } = { ...emptyInput, ...input };
  const equipmentHold = equipment.some(isEquipmentHold);

  return jobs
    .filter((job) => !isInactive(job))
    .map((job) => {
      let score = 0;
      const reasons: string[] = [];
      const add = (points: number, reason: string) => {
        if (!reasons.includes(reason)) reasons.push(reason);
        score += points;
      };
      const jobWorkOrders = relatedWorkOrders(job, workOrders);
      const jobLoads = relatedLoads(job, loads);
      const jobTasks = relatedScheduleTasks(job, scheduleTasks);
      const jobUpdates = relatedFieldUpdates(job, fieldUpdates, workOrders, loads);

      if (isBlocked(job)) add(30, "Project status is blocked or on hold");
      if (
        jobWorkOrders.some((workOrder) => !(workOrder.assignedCrewNames || []).length && !clean(workOrder.crewLeadName))
        || jobTasks.some(isUnassignedTask)
        || ((isBlocked(job) || includesAny(job, ["approved", "ready"])) && !clean(job.crew))
      ) add(15, "Crew assignment is missing");
      if (jobLoads.some(isFreightGap)) add(15, "Freight load is missing driver or truck");
      if (equipmentHold && (jobWorkOrders.length > 0 || jobLoads.length > 0 || isBlocked(job))) add(15, "Equipment is down, on hold, or needs service");
      if (jobUpdates.some(needsReview)) add(20, "Crew field update needs admin review");
      if (jobLoads.some(needsProof) || jobWorkOrders.some((workOrder) => !(workOrder.documentIds || []).length && !(workOrder.documentNames || []).length)) add(10, "Required documents or proof are missing");
      if (jobTasks.some(isUnassignedTask)) add(10, "Schedule task is not dispatched");

      const cappedScore = Math.min(score, 100);
      const level: ProjectRiskScore["level"] = cappedScore >= 80 ? "Critical" : cappedScore >= 55 ? "High" : cappedScore >= 30 ? "Watch" : "Low";
      return {
        id: `risk-${job.id || job.projectId || recordTitle(job)}`,
        jobId: clean(job.id || job.jobId),
        projectId: clean(job.projectId),
        title: recordTitle(job, "Project"),
        clientName: clean(job.clientName || job.client),
        score: cappedScore,
        level,
        reasons,
        targetTab: "tracker" as const,
        drawerType: "job" as const,
        recordId: clean(job.id || job.jobId || job.projectId),
      };
    })
    .filter((risk) => risk.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function briefItem(record: CommandRecord, overrides: Partial<CommandBriefItem>): CommandBriefItem {
  return {
    id: clean(record.id) || recordTitle(record),
    title: overrides.title || recordTitle(record),
    detail: overrides.detail || clean(record.notes) || "Open item",
    owner: overrides.owner,
    targetTab: overrides.targetTab || "board",
    drawerType: overrides.drawerType || "job",
    recordId: overrides.recordId || clean(record.id),
  };
}

export function buildDailyCommandBrief(input: OperatingIntelligenceInput): DailyCommandBrief {
  const merged = { ...emptyInput, ...input };
  const todayIso = clean(merged.todayIso) || new Date().toISOString().slice(0, 10);
  const tomorrowIso = addDaysIso(todayIso, 1);
  const today: CommandBriefItem[] = [
    ...merged.jobs
      .filter((job) => !isInactive(job) && [dateOnly(job.date), dateOnly(job.startDate), dateOnly(job.scheduledDate)].includes(todayIso))
      .map((job) => briefItem(job, { detail: [job.clientName || job.client, job.location, job.crew || job.pm].filter(Boolean).join(" - "), owner: job.crew || job.pm, targetTab: "tracker", drawerType: "job" })),
    ...merged.loads
      .filter((load) => !isInactive(load) && [dateOnly(load.date), dateOnly(load.pickupDate), dateOnly(load.deliveryDate)].includes(todayIso))
      .map((load) => briefItem(load, { detail: [load.driver, load.truck, load.origin, load.delivery || load.destination].filter(Boolean).join(" - "), owner: load.driver, targetTab: "freight", drawerType: "freight" })),
    ...merged.scheduleTasks
      .filter((task) => !isInactive(task) && [dateOnly(task.startDate), dateOnly(task.endDate)].includes(todayIso))
      .map((task) => briefItem(task, { title: recordTitle(task) || clean(task.task), detail: [task.assignee, task.locationName || task.mainAddress].filter(Boolean).join(" - "), owner: task.assignee, targetTab: "calendar", drawerType: "schedule" })),
  ];
  const tomorrow = merged.scheduleTasks
    .filter((task) => !isInactive(task) && [dateOnly(task.startDate), dateOnly(task.endDate)].includes(tomorrowIso))
    .map((task) => briefItem(task, { title: recordTitle(task) || clean(task.task), detail: [task.assignee, task.locationName || task.mainAddress].filter(Boolean).join(" - "), owner: task.assignee, targetTab: "calendar", drawerType: "schedule" }));
  const equipmentIssues = merged.equipment
    .filter(isEquipmentHold)
    .map((item) => briefItem(item, { title: clean(item.name || item.asset || item.type || item.eqType), detail: [item.status, item.serviceStatus, item.currentLocationName].filter(Boolean).join(" - "), owner: item.operator, targetTab: "equipment", drawerType: "equipment" }));
  const freightIssues = merged.loads
    .filter(isFreightGap)
    .map((load) => briefItem(load, { title: recordTitle(load) || clean(load.loadNumber), detail: [load.status, load.driver || "Missing driver", load.truck || "Missing truck"].filter(Boolean).join(" - "), owner: load.driver, targetTab: "freight", drawerType: "freight" }));
  const fieldUpdateItems = merged.fieldUpdates
    .filter(needsReview)
    .map((update) => briefItem(update, { title: clean(update.relatedTitle || update.title || update.name), detail: [update.fieldStatus || update.updateType, update.locationName].filter(Boolean).join(" - "), owner: update.crewName, targetTab: "crewView", drawerType: "fieldUpdate" }));
  const riskDecisions = buildProjectRiskScores(merged)
    .filter((risk) => risk.score >= 55)
    .map((risk) => ({ id: risk.id, title: risk.title, detail: `${risk.level} risk - ${risk.reasons[0] || "Review project"}`, owner: risk.clientName, targetTab: risk.targetTab, drawerType: risk.drawerType, recordId: risk.recordId }));
  const decisions = [...riskDecisions, ...freightIssues, ...equipmentIssues, ...fieldUpdateItems].slice(0, 8);

  return {
    todayIso,
    tomorrowIso,
    summary: `${today.length} today, ${tomorrow.length} tomorrow, ${decisions.length} owner decisions`,
    today,
    tomorrow,
    decisions,
    equipmentIssues,
    freightIssues,
    fieldUpdates: fieldUpdateItems,
  };
}

function metric(label: string, value: number, detail: string, tone: OperatingKpiMetric["tone"] = "context"): OperatingKpiMetric {
  return { label, value: String(value), detail, tone };
}

export function isSeedRecord(record: Record<string, unknown>, seedBatchId?: string): boolean {
  if (seedBatchId) return clean(record.seedBatchId) === seedBatchId || clean(record.id) === `import-${seedBatchId}`;
  return record.isSeedData === true || Boolean(clean(record.seedBatchId)) || clean(record.id).startsWith("import-seed-");
}

export function filterSeedRecords<T extends Record<string, unknown>>(records: T[], seedBatchId?: string): T[] {
  return records.filter((record) => !isSeedRecord(record, seedBatchId));
}

export function buildOperatingKpis(input: OperatingIntelligenceInput): OperatingKpiGroup[] {
  const merged = { ...emptyInput, ...input };
  const risks = buildProjectRiskScores(merged);
  const relationshipIssues = findRelationshipIssues(merged);
  const activeJobs = merged.jobs.filter((job) => !isInactive(job));
  const blockedJobs = activeJobs.filter(isBlocked);
  const missingCrew = risks.filter((risk) => risk.reasons.includes("Crew assignment is missing"));
  const activeLoads = merged.loads.filter((load) => !isInactive(load));
  const freightGaps = activeLoads.filter(isFreightGap);
  const proofNeeded = activeLoads.filter(needsProof);
  const serviceHolds = merged.equipment.filter(isEquipmentHold);
  const repairEquipment = merged.equipment.filter((item) => !isInactive(item) && includesAny(item, ["down", "repair", "hold"]));
  const reviewUpdates = merged.fieldUpdates.filter(needsReview);
  const unassignedTasks = merged.scheduleTasks.filter(isUnassignedTask);
  const readyTrees = merged.treeRelocationRecords.filter((tree) => includesAny(tree, ["ready for relocation", "ready"]));
  const rootPruningTrees = merged.treeRelocationRecords.filter((tree) => includesAny(tree, ["root pruning", "root prune"]));
  const installedTrees = merged.treeRelocationRecords.filter((tree) => includesAny(tree, ["installed", "relocated"]));
  const seedRecords = [
    ...merged.clients,
    ...merged.projects,
    ...merged.jobs,
    ...merged.workOrders,
    ...merged.loads,
    ...merged.equipment,
    ...merged.fieldUpdates,
    ...merged.scheduleTasks,
    ...merged.treeRelocationRecords,
    ...merged.documents,
    ...merged.importBatches,
  ].filter((record) => isSeedRecord(record));
  const importWarnings = merged.importBatches.reduce((total, batch) => total + Number(batch.warningCount || 0), 0);

  return [
    {
      id: "projectHealth",
      title: "Project Health",
      metrics: [
        metric("Active Projects", activeJobs.length, "Open projects and jobs", "context"),
        metric("At Risk", risks.filter((risk) => risk.score >= 55).length, "High or critical project risks", risks.some((risk) => risk.score >= 55) ? "bad" : "ready"),
        metric("Blocked", blockedJobs.length, "Projects on hold or blocked", blockedJobs.length ? "bad" : "ready"),
        metric("Missing Crew", missingCrew.length, "Projects or work orders without crew", missingCrew.length ? "watch" : "ready"),
      ],
    },
    {
      id: "crewCommunication",
      title: "Crew Communication",
      metrics: [
        metric("Field Updates", merged.fieldUpdates.length, "Crew-submitted updates", "context"),
        metric("Needs Review", reviewUpdates.length, "Updates needing admin action", reviewUpdates.length ? "bad" : "ready"),
        metric("Unassigned Tasks", unassignedTasks.length, "Schedule tasks missing dispatch", unassignedTasks.length ? "watch" : "ready"),
      ],
    },
    {
      id: "freightReadiness",
      title: "Freight Readiness",
      metrics: [
        metric("Active Loads", activeLoads.length, "Open freight moves", "context"),
        metric("Dispatch Gaps", freightGaps.length, "Missing driver, truck, or blocked route", freightGaps.length ? "bad" : "ready"),
        metric("Proof Needed", proofNeeded.length, "Loads needing BOL, photo, or signature", proofNeeded.length ? "watch" : "ready"),
      ],
    },
    {
      id: "equipmentReadiness",
      title: "Equipment Readiness",
      metrics: [
        metric("Fleet Records", merged.equipment.length, "Equipment, trucks, trailers, and implements", "context"),
        metric("Service Holds", serviceHolds.length, "Assets needing service attention", serviceHolds.length ? "bad" : "ready"),
        metric("Down / Repair", repairEquipment.length, "Assets down, held, or in repair", repairEquipment.length ? "bad" : "ready"),
      ],
    },
    {
      id: "treeLifecycle",
      title: "Tree Lifecycle",
      metrics: [
        metric("Relocation Trees", merged.treeRelocationRecords.length, "Project tree assets", "context"),
        metric("Ready", readyTrees.length, "Trees ready for relocation", "ready"),
        metric("Root Pruning", rootPruningTrees.length, "Trees in root pruning", "watch"),
        metric("Installed", installedTrees.length, "Trees installed or relocated", "ready"),
      ],
    },
    {
      id: "revealTelematics",
      title: "Reveal Telematics",
      metrics: buildRevealTelematicsKpis({
        equipment: merged.equipment,
        events: merged.fleetTelematicsEvents,
        loads: merged.loads,
        now: merged.todayIso ? `${merged.todayIso}T23:59:59.000Z` : undefined,
      }),
    },
    {
      id: "dataQuality",
      title: "Data Quality",
      metrics: [
        metric("Relationship Issues", relationshipIssues.length, "Broken client/project/job links", relationshipIssues.length ? "bad" : "ready"),
        metric("Seed Records", seedRecords.length, "Seed/test records still visible", seedRecords.length ? "watch" : "ready"),
        metric("Import Warnings", importWarnings, "Warnings from saved imports", importWarnings ? "watch" : "ready"),
      ],
    },
  ];
}
