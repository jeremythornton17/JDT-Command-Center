import type {
  AlertRecord,
  ClientRecord,
  CommandRecord,
  CrewRecord,
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
import { buildOperatingCalendar, type OperatingCalendarConflict } from "./calendar";
import { buildComplianceReviewQueue, type ComplianceReviewItem } from "./compliance";
import {
  buildDataQualityActionQueue,
  buildDailyCommandBrief,
  buildProjectRiskScores,
  buildWorkflowReadinessQueue,
  type DataQualityActionItem,
  type DailyCommandBrief,
  type ProjectRiskScore,
  type WorkflowReadinessIssue,
} from "./operatingIntelligence";
import { buildTreeLifecycleAlerts, type TreeLifecycleAlert } from "./treeLifecycle";
import { normalizeTreeRelocationStatus, treeRelocationStatusOptions } from "./treeRelocationSchema";
import { buildFieldCloseoutReviewQueue, type FieldCloseoutReviewItem } from "./fieldCloseout";
import { buildTelematicsExceptionAlerts } from "./telematicsIntelligence";

export type DashboardPipelineStage = {
  id: "inquiries" | "siteVisits" | "estimates" | "approved" | "scheduled" | "completed" | "invoiced";
  label: string;
  value: number;
  detail: string;
};

export type FeaturedOperation = {
  id: "relocation" | "freight" | "nursery" | "equipment";
  label: string;
  title: string;
  subtitle: string;
  status: string;
  value: string;
  valueLabel: string;
  targetTab: string;
  drawerType: string;
  recordId?: string;
  actionLabel: string;
  empty: boolean;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

export type DashboardCommandAlert = {
  id:
    | "todayWork"
    | "blockedDecision"
    | "treesReady"
    | "rootPruneDue"
    | "careFollowUps"
    | "equipmentConflicts";
  label: string;
  value: string;
  detail: string;
  tone: "context" | "bad" | "ready" | "warn" | "blue";
  targetTab: string;
};

export type DashboardWorkItem = {
  id: string;
  title: string;
  assignee: string;
  status: string;
  detail: string;
  targetTab: string;
  drawerType: string;
  recordId?: string;
  tone: "relocation" | "freight" | "task" | "equipment";
  crewLeader?: string;
  projectName?: string;
  workType?: string;
  treeCount?: number;
  treeTags?: string[];
  equipmentAssigned?: string[];
  scheduledDate?: string;
  blockerFlag?: boolean;
  decisionNeeded?: string;
  impact?: string;
  dueDate?: string;
  suggestedNextAction?: string;
};

export type DashboardTreePipelineBucket = {
  status: string;
  count: number;
  detail: string;
  targetTab: string;
};

export type DashboardOwnerReviewGroup = {
  id: string;
  label: string;
  items: DashboardWorkItem[];
};

export type DashboardDataQualityGroup = {
  id: string;
  label: string;
  items: DataQualityActionItem[];
};

export type DashboardOverviewKpi = {
  id:
    | "activeProjects"
    | "inProgress"
    | "upcoming"
    | "onHold"
    | "openIssues"
    | "relocatedTrees"
    | "activeAlerts"
    | "reportsToday";
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "red" | "purple" | "teal";
  targetTab: string;
};

export type DashboardFleetMovement = {
  id: string;
  label: string;
  status: string;
  detail: string;
  tone: "active" | "moving" | "scheduled" | "issue" | "stale";
};

export type DashboardFleetMapMarker = {
  id: string;
  label: string;
  status: string;
  lat?: number;
  lng?: number;
  tone: DashboardFleetMovement["tone"];
};

export type DashboardFleetGpsQuickGlance = {
  visibleAssets: number;
  vehiclesOnRoad: number;
  equipmentOffsite: number;
  unmatchedAssets: number;
  lastSyncAt: string;
  movements: DashboardFleetMovement[];
  mapMarkers: DashboardFleetMapMarker[];
};

export type DashboardProjectSnapshot = {
  id: string;
  name: string;
  location: string;
  status: string;
  phase: string;
  crewLead: string;
  equipment: string[];
  treesTotalCount: number;
  treesRelocatedCount: number;
  issuesCount: number;
  nextAction: string;
  progressPercent: number;
  targetTab: string;
  drawerType: string;
  recordId?: string;
};

export type DashboardFreightAssignment = {
  id: string;
  driverName: string;
  assignmentSummary: string;
  destination: string;
  vehicle?: string;
  trailer?: string;
  status: string;
  eta?: string;
};

export type DashboardCrewAssignment = {
  id: string;
  crewLead: string;
  currentJob: string;
  phase: string;
  status: string;
};

export type DashboardNurseryPickup = {
  id: string;
  customer: string;
  time: string;
};

export type DashboardNurseryOverview = {
  ordersToday: number;
  treesPrepped: number;
  needsPrepped: number;
  stagedForDelivery: number;
  irrigationStatus: string;
  customerPickups: DashboardNurseryPickup[];
};

export type DashboardEquipmentStatusOverview = {
  inUse: number;
  available: number;
  maintenance: number;
  down: number;
  utilizationPercent: number;
  availablePercent: number;
  maintenancePercent: number;
  downPercent: number;
  keyIssue: string;
};

export type DashboardAttentionItem = {
  id: string;
  severity: "High" | "Medium" | "Low" | "Info";
  count: number;
  title: string;
  detail: string;
  targetTab: string;
  drawerType?: string;
  recordId?: string;
};

export type CommandCenterOverview = {
  date: string;
  kpis: DashboardOverviewKpi[];
  fleetGps: DashboardFleetGpsQuickGlance;
  projectSnapshots: DashboardProjectSnapshot[];
  freightToday: DashboardFreightAssignment[];
  crewAtGlance: DashboardCrewAssignment[];
  nurserySnapshot: DashboardNurseryOverview;
  equipmentStatus: DashboardEquipmentStatusOverview;
  alerts: DashboardAttentionItem[];
};

export type DashboardSummary = {
  overview: CommandCenterOverview;
  commandAlerts: DashboardCommandAlert[];
  dailyBrief: DailyCommandBrief;
  dataQualityQueue: DataQualityActionItem[];
  scheduleBlockingDataQualityQueue: DataQualityActionItem[];
  dataQualityGroups: DashboardDataQualityGroup[];
  workflowReadinessQueue: WorkflowReadinessIssue[];
  fieldCloseoutReviewQueue: FieldCloseoutReviewItem[];
  complianceReviewQueue: ComplianceReviewItem[];
  dispatchBlockingComplianceQueue: ComplianceReviewItem[];
  resourceConflictQueue: OperatingCalendarConflict[];
  projectRisks: ProjectRiskScore[];
  todaySchedule: DashboardWorkItem[];
  tomorrowQueue: DashboardWorkItem[];
  ownerReviewQueue: DashboardWorkItem[];
  ownerReviewGroups: DashboardOwnerReviewGroup[];
  treePipeline: DashboardTreePipelineBucket[];
  rootPruneDueQueue: DashboardWorkItem[];
  nutrientCareDueQueue: DashboardWorkItem[];
  relocationWorkDueQueue: DashboardWorkItem[];
  equipmentBoard: DashboardWorkItem[];
  pipeline: DashboardPipelineStage[];
  operationList: FeaturedOperation[];
  operations: Record<FeaturedOperation["id"], FeaturedOperation>;
};

export type DashboardSummaryInput = {
  jobs?: JobRecord[];
  loads?: LoadRecord[];
  trees?: Array<RanchOakRecord | InventoryItemRecord>;
  equipment?: EquipmentRecord[];
  crew?: CrewRecord[];
  clients?: ClientRecord[];
  projects?: ProjectRecord[];
  workOrders?: WorkOrderRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  documents?: DocumentRecord[];
  alerts?: AlertRecord[];
  fleetTelematicsEvents?: FleetTelematicsEventRecord[];
  fieldUpdates?: FieldUpdateRecord[];
  importBatches?: ImportBatchRecord[];
  todayIso?: string;
};

const emptyArrays: Required<DashboardSummaryInput> = {
  jobs: [],
  loads: [],
  trees: [],
  equipment: [],
  crew: [],
  clients: [],
  projects: [],
  workOrders: [],
  scheduleTasks: [],
  treeRelocationRecords: [],
  documents: [],
  alerts: [],
  fleetTelematicsEvents: [],
  fieldUpdates: [],
  importBatches: [],
  todayIso: "",
};

function recordText(record: Record<string, unknown>) {
  return Object.values(record)
    .map((value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
      if (Array.isArray(value)) return value.map((entry) => String(entry)).join(" ");
      return "";
    })
    .join(" ")
    .toLowerCase();
}

function hasAny(record: Record<string, unknown>, keywords: string[]) {
  const text = recordText(record);
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function isInactive(record: Record<string, unknown>) {
  return hasAny(record, ["completed", "complete", "delivered", "cancelled", "canceled", "closed"]);
}

function displayValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      const nested: string = firstText(...value);
      if (nested) return nested;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function normalizeStringList(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => normalizeStringList(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(/[,\n|]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dashboardDate(record: Record<string, unknown>) {
  return firstText(
    record.scheduledDate,
    record.startDate,
    record.pickupDate,
    record.deliveryDate,
    record.dueDate,
    record.date,
  );
}

function workOrderTypeLabel(workOrderType: unknown) {
  const type = String(workOrderType || "").toLowerCase();
  if (type.includes("prun")) return "Root Pruning";
  if (type.includes("nutrient") || type.includes("care") || type.includes("treatment")) return "Nutrient Care";
  if (type.includes("relocat") || type.includes("move")) return "Relocation Work";
  if (type.includes("install")) return "Installation";
  if (type.includes("freight") || type.includes("delivery") || type.includes("truck")) return "Freight";
  if (type.includes("equipment") || type.includes("maintenance") || type.includes("service")) return "Equipment";
  return "Field Work";
}

function toneForWorkType(workType: string): DashboardWorkItem["tone"] {
  if (workType === "Freight") return "freight";
  if (workType === "Equipment") return "equipment";
  if (["Root Pruning", "Nutrient Care", "Relocation Work", "Installation"].includes(workType)) return "relocation";
  return "task";
}

function suggestedActionForItem(item: Pick<DashboardWorkItem, "title" | "status" | "detail" | "tone">) {
  const text = [item.title, item.status, item.detail].join(" ").toLowerCase();
  if (text.includes("invoice") || text.includes("billing") || text.includes("paid")) return "Confirm billing status and update the project record.";
  if (text.includes("schedule") || text.includes("cut") || text.includes("prun")) return "Create or assign the next scheduled field work.";
  if (text.includes("client") || text.includes("pm") || text.includes("confirm")) return "Confirm the detail with the client or project manager.";
  if (text.includes("blocked") || text.includes("hold") || text.includes("issue") || text.includes("down")) return "Decide the next action or assign someone to clear the blocker.";
  if (item.tone === "equipment") return "Review equipment status and decide repair, swap, or dispatch hold.";
  if (item.tone === "freight") return "Open the freight move and confirm driver, truck, route, and timing.";
  return "Open the record and choose the next action.";
}

function firstActive<T extends Record<string, unknown>>(items: T[], predicate: (item: T) => boolean) {
  return items.find((item) => predicate(item) && !isInactive(item));
}

function countMatches<T extends Record<string, unknown>>(items: T[], keywords: string[]) {
  return items.filter((item) => hasAny(item, keywords)).length;
}

function isScheduledJob(job: JobRecord) {
  return Boolean(job.startDate || job.scheduledDate || job.date) || hasAny(job, ["scheduled", "on schedule", "onschedule", "dispatched"]);
}

function isApprovedUnscheduledJob(job: JobRecord) {
  return !isInactive(job) && hasAny(job, ["approved", "accepted", "won"]) && !isScheduledJob(job);
}

function isBlockedRecord(record: Record<string, unknown>) {
  return !isInactive(record) && hasAny(record, ["blocked", "hold", "urgent", "down", "repair hold", "permit issue", "issue"]);
}

function isEquipmentHold(item: EquipmentRecord) {
  return !isInactive(item) && hasAny(item, ["needs service", "maintenance", "down", "repair", "service due", "hold"]);
}

function isFreightIssue(load: LoadRecord) {
  return !isInactive(load) && (!load.driver || !load.truck || hasAny(load, ["permit", "issue", "hold", "blocked", "delayed", "missing"]));
}

function isCrewDispatchGap(task: ScheduleTaskRecord) {
  return !isInactive(task) && (!task.assignee || hasAny(task, ["not dispatched", "unassigned", "pending dispatch", "dispatch gap"]));
}

function isFieldUpdateNeedingReview(update: FieldUpdateRecord) {
  return !isInactive(update) && (
    update.needsAdminReview === true
    || hasAny(update, ["delayed", "need help", "needs help", "issue", "blocked", "hold", "stuck", "down"])
  );
}

function workItem(record: CommandRecord, overrides: Partial<DashboardWorkItem> & Pick<DashboardWorkItem, "targetTab" | "drawerType" | "tone">): DashboardWorkItem {
  return {
    ...overrides,
    id: record.id || record.title || record.name || "record",
    title: displayValue(overrides.title || record.title || record.name, "Untitled record"),
    assignee: displayValue(overrides.assignee, "Unassigned"),
    status: displayValue(overrides.status || record.status, "Active"),
    detail: displayValue(overrides.detail || record.notes, "Open record details"),
    targetTab: overrides.targetTab,
    drawerType: overrides.drawerType,
    recordId: overrides.recordId || record.id || record.title || record.name,
    tone: overrides.tone,
  };
}

function buildTodaySchedule(jobs: JobRecord[], loads: LoadRecord[], scheduleTasks: ScheduleTaskRecord[], workOrders: WorkOrderRecord[]): DashboardWorkItem[] {
  const workOrderItems = workOrders
    .filter((workOrder) => !isInactive(workOrder))
    .map((workOrder) => {
      const workType = workOrderTypeLabel(workOrder.workOrderType || workOrder.type || workOrder.activityType);
      const crewLeader = firstText(workOrder.crewLeadName, workOrder.crewLeader, workOrder.assignee, workOrder.crewName);
      const projectName = firstText(workOrder.projectName, workOrder.jobName, workOrder.clientName, workOrder.projectId);
      const treeTags = normalizeStringList(workOrder.treeTags || workOrder.treeIds || workOrder.treeAssetIds || workOrder.materialTags);
      const equipmentAssigned = normalizeStringList(workOrder.equipmentNames || workOrder.equipmentIds || workOrder.equipmentAssigned);
      const scheduledDate = dashboardDate(workOrder);
      return workItem(workOrder, {
        title: workOrder.title || workOrder.name || `${workType} - ${projectName || "Unassigned Project"}`,
        assignee: crewLeader,
        status: workOrder.status,
        detail: [
          projectName,
          workType,
          treeTags.length ? `${treeTags.length} tree${treeTags.length === 1 ? "" : "s"}` : "",
          equipmentAssigned.length ? equipmentAssigned.join(", ") : "",
        ].filter(Boolean).join(" - "),
        targetTab: "tracker",
        drawerType: "workOrder",
        tone: toneForWorkType(workType),
        crewLeader,
        projectName,
        workType,
        treeCount: treeTags.length,
        treeTags,
        equipmentAssigned,
        scheduledDate,
        blockerFlag: isBlockedRecord(workOrder),
      });
    });

  const jobItems = jobs
    .filter((job) => !isInactive(job) && isScheduledJob(job))
    .map((job) => {
      const crewLeader = firstText(job.crew, job.pm, job.projectManager);
      const projectName = firstText(job.projectName, job.title);
      const scheduledDate = dashboardDate(job);
      return workItem(job, {
        assignee: crewLeader,
        detail: [job.client, job.location, scheduledDate].filter(Boolean).join(" - "),
        targetTab: "tracker",
        drawerType: "job",
        tone: "relocation",
        crewLeader,
        projectName,
        workType: firstText(job.jobType, job.division, "Project Work"),
        scheduledDate,
        blockerFlag: isBlockedRecord(job),
      });
    });

  const loadItems = loads
    .filter((load) => !isInactive(load))
    .map((load) => {
      const scheduledDate = dashboardDate(load);
      return workItem(load, {
        title: load.title || load.loadNumber,
        assignee: load.driver,
        status: load.status,
        detail: [load.origin, load.delivery, load.eta || scheduledDate].filter(Boolean).join(" - "),
        targetTab: "freight",
        drawerType: "freight",
        tone: "freight",
        crewLeader: firstText(load.driver),
        projectName: firstText(load.projectName, load.jobName, load.clientName),
        workType: "Freight",
        equipmentAssigned: normalizeStringList([load.truck, load.trailer, load.linkedEquipment]),
        scheduledDate,
        blockerFlag: isBlockedRecord(load) || isFreightIssue(load),
      });
    });

  const taskItems = scheduleTasks
    .filter((task) => !isInactive(task) && Boolean(task.startDate || task.endDate || task.assignee || task.locationName || task.activityType))
    .map((task) => {
      const scheduledDate = dashboardDate(task);
      return workItem(task, {
        title: task.title || task.task || task.activityType,
        assignee: task.assignee,
        status: task.loadStatus || task.status,
        detail: [task.clientCompany || task.clientName, task.locationName || task.mainAddress, scheduledDate].filter(Boolean).join(" - "),
        targetTab: "calendar",
        drawerType: "schedule",
        tone: "task",
        crewLeader: firstText(task.assignee),
        projectName: firstText(task.projectName, task.jobName, task.clientCompany, task.clientName),
        workType: firstText(task.activityType, task.taskType, "Schedule Task"),
        scheduledDate,
        blockerFlag: isCrewDispatchGap(task),
      });
    });

  return [...workOrderItems, ...jobItems, ...loadItems, ...taskItems].slice(0, 10);
}

function buildTomorrowQueue(jobs: JobRecord[], scheduleTasks: ScheduleTaskRecord[]): DashboardWorkItem[] {
  const approvedJobs = jobs
    .filter(isApprovedUnscheduledJob)
    .map((job) => workItem(job, {
      assignee: job.crew || job.pm,
      status: "Ready",
      detail: [job.client, job.location].filter(Boolean).join(" - ") || "Approved and ready to schedule",
      targetTab: "tracker",
      drawerType: "job",
      tone: "relocation",
    }));

  const readyTasks = scheduleTasks
    .filter((task) => !isInactive(task) && hasAny(task, ["ready", "tomorrow", "approved"]) && !isCrewDispatchGap(task))
    .map((task) => workItem(task, {
      title: task.title || task.task || task.activityType,
      assignee: task.assignee,
      status: displayValue(task.status || task.loadStatus, "Ready"),
      detail: [task.locationName, task.clientCompany || task.clientName].filter(Boolean).join(" - ") || "Ready for tomorrow planning",
      targetTab: "calendar",
      drawerType: "schedule",
      tone: "task",
    }));

  return [...approvedJobs, ...readyTasks].slice(0, 6);
}

function treeLifecycleWorkItem(alert: TreeLifecycleAlert): DashboardWorkItem {
  const item: DashboardWorkItem = {
    id: alert.id,
    title: alert.title,
    assignee: alert.treeName,
    status: alert.dueDate || "Needs scheduling",
    detail: alert.detail,
    targetTab: alert.targetTab,
    drawerType: alert.drawerType,
    recordId: alert.recordId,
    tone: "relocation",
    decisionNeeded: alert.title,
    projectName: alert.projectName,
    impact: alert.detail,
    dueDate: alert.dueDate,
    suggestedNextAction: "",
  };
  return {
    ...item,
    suggestedNextAction: suggestedActionForItem(item),
  };
}

function withReviewFields(item: DashboardWorkItem): DashboardWorkItem {
  return {
    ...item,
    decisionNeeded: item.decisionNeeded || item.title,
    impact: item.impact || item.detail,
    dueDate: item.dueDate || item.scheduledDate || item.status,
    suggestedNextAction: item.suggestedNextAction || suggestedActionForItem(item),
  };
}

function buildOwnerReviewQueue(jobs: JobRecord[], loads: LoadRecord[], equipment: EquipmentRecord[], alerts: AlertRecord[], fieldUpdates: FieldUpdateRecord[], treeLifecycleAlerts: TreeLifecycleAlert[]): DashboardWorkItem[] {
  const blockedJobs = jobs
    .filter(isBlockedRecord)
    .map((job) => workItem(job, {
      assignee: job.crew || job.pm,
      detail: [job.client, job.location, job.status].filter(Boolean).join(" - "),
      targetTab: "tracker",
      drawerType: "job",
      tone: "relocation",
    }));

  const freightIssues = loads
    .filter((load) => isBlockedRecord(load) || isFreightIssue(load))
    .map((load) => workItem(load, {
      title: load.title || load.loadNumber,
      assignee: load.driver,
      detail: [load.origin, load.delivery, load.status].filter(Boolean).join(" - "),
      targetTab: "freight",
      drawerType: "freight",
      tone: "freight",
    }));

  const equipmentIssues = equipment
    .filter(isEquipmentHold)
    .map((item) => workItem(item, {
      title: item.name || item.asset || item.type || item.eqType,
      assignee: item.operator,
      detail: [item.status, item.serviceStatus, item.nextServiceDue].filter(Boolean).join(" - "),
      targetTab: "equipment",
      drawerType: "equipment",
      tone: "equipment",
    }));

  const alertIssues = alerts
    .filter((alert) => !isInactive(alert))
    .map((alert) => workItem(alert, {
      title: alert.title || alert.name,
      assignee: alert.createdBy,
      status: alert.severity || alert.status,
      detail: alert.body || alert.notes || alert.time,
      targetTab: alert.targetTab || "alerts",
      drawerType: alert.relatedEntityType === "equipment" ? "equipment" : "alert",
      recordId: alert.relatedEntityId || alert.id,
      tone: alert.relatedEntityType === "equipment" ? "equipment" : "task",
    }));

  const fieldUpdateIssues = fieldUpdates
    .filter(isFieldUpdateNeedingReview)
    .map((update) => workItem(update, {
      title: update.relatedTitle || update.title || update.name,
      assignee: update.crewName,
      status: update.fieldStatus || update.updateType || update.status,
      detail: [update.notes, update.locationName, update.relatedRecordType].filter(Boolean).join(" - "),
      targetTab: "crewView",
      drawerType: "fieldUpdate",
      tone: "task",
    }));

  const treeIssues = treeLifecycleAlerts.map(treeLifecycleWorkItem);

  return [...blockedJobs, ...treeIssues, ...freightIssues, ...equipmentIssues, ...fieldUpdateIssues, ...alertIssues]
    .map(withReviewFields)
    .slice(0, 10);
}

function buildTreePipeline(treeRelocationRecords: TreeRelocationRecord[]): DashboardTreePipelineBucket[] {
  return treeRelocationStatusOptions.map((status) => {
    const count = treeRelocationRecords.filter((tree) => (
      normalizeTreeRelocationStatus(tree.treeRelocationStatus || tree.relocationStatus || tree.currentStatus || tree.status) === status
    )).length;
    return {
      status,
      count,
      detail: count === 1 ? "1 tree" : `${count} trees`,
      targetTab: "tracker",
    };
  });
}

function buildOwnerReviewGroups(ownerReviewQueue: DashboardWorkItem[]): DashboardOwnerReviewGroup[] {
  const groups: DashboardOwnerReviewGroup[] = [
    { id: "jeremyDecision", label: "Needs Jeremy Decision", items: [] },
    { id: "scheduling", label: "Needs Scheduling", items: [] },
    { id: "billing", label: "Needs Billing", items: [] },
    { id: "clientConfirmation", label: "Needs Client/PM Confirmation", items: [] },
    { id: "highRiskTree", label: "High Risk Tree", items: [] },
  ];

  ownerReviewQueue.forEach((item) => {
    const text = [item.title, item.status, item.detail, item.suggestedNextAction].join(" ").toLowerCase();
    if (text.includes("invoice") || text.includes("billing") || text.includes("paid")) {
      groups[2].items.push(item);
      return;
    }
    if (text.includes("schedule") || text.includes("dispatch") || text.includes("cut") || text.includes("care")) {
      groups[1].items.push(item);
      return;
    }
    if (text.includes("client") || text.includes("pm") || text.includes("confirm")) {
      groups[3].items.push(item);
      return;
    }
    if (item.drawerType === "tree" || text.includes("tree") || text.includes("risk")) {
      groups[4].items.push(item);
      return;
    }
    groups[0].items.push(item);
  });

  return groups;
}

function buildDataQualityGroups(dataQualityQueue: DataQualityActionItem[]): DashboardDataQualityGroup[] {
  const groups: DashboardDataQualityGroup[] = [
    { id: "blockingSchedule", label: "Blocking Schedule", items: [] },
    { id: "blockingReports", label: "Blocking Reports", items: [] },
    { id: "blockingBilling", label: "Blocking Billing", items: [] },
    { id: "cleanupOnly", label: "Cleanup Only", items: [] },
  ];

  dataQualityQueue.forEach((item) => {
    const text = [item.title, item.detail, item.sourceType, item.recommendedAction].join(" ").toLowerCase();
    if (text.includes("schedule") || text.includes("project") || text.includes("job") || text.includes("assignment")) {
      groups[0].items.push(item);
      return;
    }
    if (text.includes("invoice") || text.includes("billing") || text.includes("cost") || text.includes("client")) {
      groups[2].items.push(item);
      return;
    }
    if (text.includes("report") || text.includes("closeout") || text.includes("photo")) {
      groups[1].items.push(item);
      return;
    }
    groups[3].items.push(item);
  });

  return groups;
}

function isRootPruneItem(item: DashboardWorkItem) {
  return [item.title, item.workType, item.detail].join(" ").toLowerCase().includes("prun")
    || [item.title, item.detail].join(" ").toLowerCase().includes("cut");
}

function isNutrientCareItem(item: DashboardWorkItem) {
  const text = [item.title, item.workType, item.detail].join(" ").toLowerCase();
  return text.includes("nutrient") || text.includes("aftercare") || text.includes("care") || text.includes("treatment");
}

function isRelocationMoveItem(item: DashboardWorkItem) {
  const text = [item.title, item.workType, item.detail].join(" ").toLowerCase();
  return text.includes("relocation") || text.includes("move") || text.includes("holding");
}

function buildEquipmentBoard(equipment: EquipmentRecord[]): DashboardWorkItem[] {
  return equipment
    .filter((item) => !isInactive(item))
    .map((item) => workItem(item, {
      title: firstText(item.name, item.asset, item.type, item.eqType),
      assignee: firstText(item.operator, item.assignedCrewDriver, item.currentLocation),
      status: firstText(item.status, item.serviceStatus),
      detail: [
        item.category || item.type || item.eqType,
        item.currentLocation,
        item.currentAddress || item.currentAddressSiteDetail,
      ].filter(Boolean).join(" - "),
      targetTab: "equipment",
      drawerType: "equipment",
      tone: "equipment",
      projectName: firstText(item.assignedProject, item.currentLocation),
      workType: "Equipment",
      scheduledDate: dashboardDate(item),
      blockerFlag: isEquipmentHold(item),
    }))
    .slice(0, 8);
}

function quantityTotal(trees: Array<RanchOakRecord | InventoryItemRecord>) {
  return trees.reduce((total, tree) => {
    const quantity = Number(tree.quantity);
    return Number.isFinite(quantity) ? total + quantity : total;
  }, 0);
}

function recordValue(record: CommandRecord | Record<string, unknown>, ...keys: string[]) {
  const source = record as Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

function numberValue(value: unknown, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function percentValue(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function hasExactRelocatedStatus(tree: TreeRelocationRecord) {
  const status = firstText(tree.treeRelocationStatus, tree.relocationStatus, tree.status);
  return status.trim().toLowerCase() === "relocated";
}

function projectName(record: CommandRecord) {
  return firstText(record.projectName, record.jobName, record.title, record.name, record.id);
}

function projectLocation(record: CommandRecord) {
  const source = record as JobRecord & ProjectRecord & Record<string, unknown>;
  return firstText(source.location, source.locationName, source.mainAddress, source.currentLocation, source.clientName, source.client, "Location TBD");
}

function projectStatus(record: CommandRecord) {
  const status = firstText(record.status, recordValue(record, "phase", "projectStatus", "projectStatusId"));
  if (/hold|blocked|awaiting action/i.test(status)) return "On Hold";
  if (/upcoming|scheduled soon|awaiting scheduling/i.test(status)) return "Upcoming";
  if (/progress|active workflow/i.test(status)) return "In Progress";
  if (/complete|completed|closed/i.test(status)) return "Complete";
  return status || "Active";
}

function projectPhase(record: CommandRecord, treesForProject: TreeRelocationRecord[]) {
  const explicit = firstText(recordValue(record, "phase", "jobStage", "projectPhase"), record.status);
  if (explicit && !/^active$/i.test(explicit)) return explicit;
  const statusCounts = new Map<string, number>();
  treesForProject.forEach((tree) => {
    const status = firstText(tree.treeRelocationStatus, tree.relocationStatus, tree.status);
    if (!status) return;
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  const mostCommon = [...statusCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return mostCommon || explicit || "Active";
}

function projectIdentityValues(record: CommandRecord) {
  const source = record as JobRecord & ProjectRecord & Record<string, unknown>;
  return [
    source.id,
    source.projectId,
    source.projectsId,
    source.jobId,
    source.jobName,
    source.projectName,
    source.title,
    source.name,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function treeBelongsToProject(tree: TreeRelocationRecord, project: CommandRecord) {
  const projectIds = new Set(projectIdentityValues(project));
  const treeValues = [
    tree.projectId,
    tree.projectsId,
    tree.jobId,
    tree.sourceJobId,
    tree.projectName,
    tree.jobName,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);

  if (treeValues.some((value) => projectIds.has(value))) return true;
  const name = projectName(project).toLowerCase();
  return Boolean(name && treeValues.some((value) => value === name));
}

function uniqueProjectRecords(jobs: JobRecord[], projects: ProjectRecord[]) {
  const records = [...jobs, ...projects];
  const seen = new Set<string>();
  return records.filter((record) => {
    const key = firstText(record.projectId, (record as JobRecord).projectsId, record.id, projectName(record)).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOnHoldProject(record: CommandRecord) {
  return !isInactive(record) && hasAny(record, ["hold", "on hold", "blocked", "awaiting action"]);
}

function isUpcomingProject(record: CommandRecord) {
  return !isInactive(record) && hasAny(record, ["upcoming", "scheduled soon", "awaiting scheduling"]);
}

function isInProgressProject(record: CommandRecord) {
  return !isInactive(record) && hasAny(record, ["in progress", "active workflow", "progress", "50% cut", "70% cut"]);
}

function isActiveProject(record: CommandRecord) {
  if (isInactive(record) || isOnHoldProject(record) || isUpcomingProject(record)) return false;
  const text = recordText(record);
  if (!text) return true;
  return hasAny(record, ["active", "in progress", "scheduled", "on schedule", "relocation", "installation", "tree"]);
}

function fleetTone(status: unknown): DashboardFleetMovement["tone"] {
  const text = String(status || "").toLowerCase();
  if (/down|issue|no signal|stale|lost|error|repair/.test(text)) return text.includes("stale") || text.includes("signal") ? "stale" : "issue";
  if (/en route|moving|transit|driving/.test(text)) return "moving";
  if (/scheduled|pending|loading/.test(text)) return "scheduled";
  return "active";
}

function newestTimestamp(...records: Array<Record<string, unknown>[]>) {
  return records
    .flat()
    .map((record) => firstText(record.eventAt, record.receivedAt, record.lastTelematicsAt, record.revealLastReceivedAt, record.updatedAtIso))
    .filter(Boolean)
    .sort()
    .at(-1) || "";
}

function buildOverviewProjectSnapshots(
  projectRecords: CommandRecord[],
  treeRelocationRecords: TreeRelocationRecord[],
  ownerReviewQueue: DashboardWorkItem[],
  projectRisks: ProjectRiskScore[],
): DashboardProjectSnapshot[] {
  const issueTextForProject = (project: CommandRecord) => {
    const values = projectIdentityValues(project);
    return values.concat(projectName(project).toLowerCase());
  };

  return projectRecords
    .filter((record) => !isInactive(record))
    .slice(0, 8)
    .map((record) => {
      const projectTrees = treeRelocationRecords.filter((tree) => treeBelongsToProject(tree, record));
      const fallbackTotal = numberValue((record as JobRecord).relocationTreeCount || (record as JobRecord).installItemCount);
      const total = projectTrees.length || fallbackTotal;
      const relocated = projectTrees.filter(hasExactRelocatedStatus).length;
      const projectIssueKeys = issueTextForProject(record);
      const issuesFromQueue = ownerReviewQueue.filter((item) => {
        const text = [item.title, item.projectName, item.detail, item.recordId].join(" ").toLowerCase();
        return projectIssueKeys.some((key) => key && text.includes(key));
      }).length;
      const risk = projectRisks.find((item) => {
        const text = [item.id, item.title, item.recordId].join(" ").toLowerCase();
        return projectIssueKeys.some((key) => key && text.includes(key));
      });
      const issuesCount = issuesFromQueue + (risk ? Math.max(1, risk.reasons?.length || 0) : 0);
      return {
        id: firstText(record.id, record.projectId, projectName(record)),
        name: projectName(record),
        location: projectLocation(record),
        status: projectStatus(record),
        phase: projectPhase(record, projectTrees),
        crewLead: firstText((record as JobRecord).crew, (record as ProjectRecord).crew, (record as JobRecord).pm, record.createdBy, "Unassigned"),
        equipment: normalizeStringList(recordValue(record, "equipment", "equipmentNames", "assignedEquipment")).slice(0, 3),
        treesTotalCount: total,
        treesRelocatedCount: relocated,
        issuesCount,
        nextAction: firstText(recordValue(record, "nextAction", "nextWork", "recommendedAction"), issuesCount ? "Review open issue" : "Continue operations"),
        progressPercent: percentValue(relocated, total),
        targetTab: "tracker",
        drawerType: "job",
        recordId: firstText(record.id, record.projectId),
      };
    });
}

function buildFleetGpsQuickGlance(
  equipment: EquipmentRecord[],
  loads: LoadRecord[],
  fleetTelematicsEvents: FleetTelematicsEventRecord[],
): DashboardFleetGpsQuickGlance {
  const gpsEquipment = equipment.filter((item) => (
    Boolean(item.lastTelematicsLatitude && item.lastTelematicsLongitude)
    || Boolean(item.revealVehicleId || item.verizonVehicleId || item.revealAssetId || item.telematicsProvider)
  ));
  const uniqueAssetIds = new Set<string>();
  gpsEquipment.forEach((item) => uniqueAssetIds.add(firstText(item.id, item.revealVehicleId, item.verizonVehicleId, item.name)));
  fleetTelematicsEvents.forEach((event) => uniqueAssetIds.add(firstText(event.providerVehicleId, event.id, event.vehicleName)));

  const movingEquipment = gpsEquipment.filter((item) => (
    numberValue(item.lastTelematicsSpeedMph) > 0 || /moving|transit|en route|driving/i.test(firstText(item.lastTelematicsStatus, item.status))
  ));
  const movingLoads = loads.filter((load) => !isInactive(load) && /en route|transit|dispatched|moving|pickup|delivery/i.test(firstText(load.status)));
  const offsiteEquipment = equipment.filter((item) => {
    if (isInactive(item)) return false;
    const location = firstText(item.currentLocationName, item.currentLocation, item.location, item.lastTelematicsAddress).toLowerCase();
    if (!location) return false;
    return !/home base|main office|1010 e sugarland|jd thornton nurseries/.test(location);
  });
  const unmatchedAssets = fleetTelematicsEvents.filter((event) => !firstText(event.matchedEquipmentDocumentName, event.title, event.name)).length;

  const eventMovements: DashboardFleetMovement[] = fleetTelematicsEvents.slice(0, 5).map((event) => ({
    id: firstText(event.id, event.providerVehicleId, event.vehicleName),
    label: firstText(event.driverName, event.vehicleName, event.vehicleNumber, "GPS Asset"),
    status: firstText(event.status, numberValue(event.speedMph) > 0 ? "Moving" : "Stopped"),
    detail: firstText(event.address, event.coordinateText, event.vehicleName, "Live GPS update"),
    tone: fleetTone(firstText(event.status, numberValue(event.speedMph) > 0 ? "Moving" : "Stopped")),
  }));

  const equipmentMovements: DashboardFleetMovement[] = gpsEquipment.slice(0, 5).map((item) => ({
    id: firstText(item.id, item.revealVehicleId, item.name),
    label: firstText(item.lastTelematicsDriverName, item.operator, item.name, "GPS Asset"),
    status: firstText(item.lastTelematicsStatus, item.status, "On Site"),
    detail: firstText(item.assignedProjectName, item.currentLocationName, item.lastTelematicsAddress, item.currentLocation, "Tracked asset"),
    tone: fleetTone(firstText(item.lastTelematicsStatus, item.status)),
  }));

  const loadMovements: DashboardFleetMovement[] = movingLoads.slice(0, 5).map((load) => ({
    id: firstText(load.id, load.loadNumber, load.title),
    label: firstText(load.driver, load.truck, load.title, "Freight"),
    status: firstText(load.status, "Scheduled"),
    detail: firstText(load.delivery, load.destination, load.projectName, load.clientName, "Freight move"),
    tone: fleetTone(load.status),
  }));

  const markers: DashboardFleetMapMarker[] = [
    ...fleetTelematicsEvents.map((event) => ({
      id: firstText(event.id, event.providerVehicleId, event.vehicleName),
      label: firstText(event.vehicleName, event.vehicleNumber, event.driverName, "GPS"),
      status: firstText(event.status, "GPS"),
      lat: event.latitude,
      lng: event.longitude,
      tone: fleetTone(event.status),
    })),
    ...gpsEquipment.map((item) => ({
      id: firstText(item.id, item.revealVehicleId, item.name),
      label: firstText(item.name, item.asset, item.vehicleNumber, "Equipment"),
      status: firstText(item.lastTelematicsStatus, item.status, "GPS"),
      lat: item.lastTelematicsLatitude,
      lng: item.lastTelematicsLongitude,
      tone: fleetTone(firstText(item.lastTelematicsStatus, item.status)),
    })),
  ].filter((marker) => marker.id);

  return {
    visibleAssets: uniqueAssetIds.size,
    vehiclesOnRoad: movingEquipment.length + movingLoads.length,
    equipmentOffsite: offsiteEquipment.length,
    unmatchedAssets,
    lastSyncAt: newestTimestamp(fleetTelematicsEvents, gpsEquipment) || "No sync yet",
    movements: [...eventMovements, ...equipmentMovements, ...loadMovements].slice(0, 5),
    mapMarkers: markers.slice(0, 10),
  };
}

function buildFreightToday(loads: LoadRecord[]): DashboardFreightAssignment[] {
  return loads
    .filter((load) => !isInactive(load))
    .slice(0, 5)
    .map((load) => ({
      id: firstText(load.id, load.loadNumber, load.title),
      driverName: firstText(load.driver, "Unassigned Driver"),
      assignmentSummary: firstText(load.title, load.loadNumber, [load.origin, load.delivery || load.destination].filter(Boolean).join(" to "), "Freight move"),
      destination: firstText(load.delivery, load.destination, load.projectName, "Destination TBD"),
      vehicle: firstText(load.truck),
      trailer: firstText(load.trailer, load.requiredTrailerType),
      status: firstText(load.status, "Scheduled"),
      eta: firstText(load.eta, load.deliveryDate, load.pickupDate),
    }));
}

function buildCrewAtGlance(crew: CrewRecord[], workOrders: WorkOrderRecord[], scheduleTasks: ScheduleTaskRecord[], jobs: JobRecord[]): DashboardCrewAssignment[] {
  const workOrderAssignments = workOrders
    .filter((item) => !isInactive(item))
    .map((item) => ({
      id: firstText(item.id, item.title),
      crewLead: firstText(item.crewLeadName, item.assignedCrewNames?.[0], item.assignee, item.crewName, "Unassigned Crew"),
      currentJob: firstText(item.projectName, item.jobName, item.clientName, item.title, "Field Work"),
      phase: workOrderTypeLabel(item.workOrderType || item.taskType),
      status: firstText(item.status, "Scheduled"),
    }));

  const scheduledAssignments = scheduleTasks
    .filter((item) => !isInactive(item) && firstText(item.assignee))
    .map((item) => ({
      id: firstText(item.id, item.title, item.task),
      crewLead: firstText(item.assignee, "Assigned Crew"),
      currentJob: firstText(item.projectName, item.jobName, item.locationName, item.clientCompany, item.title, "Scheduled Work"),
      phase: firstText(item.activityType, item.task, "Scheduled"),
      status: firstText(item.status, item.loadStatus, "Scheduled"),
    }));

  const activeCrew = crew
    .filter((person) => !isInactive(person) && firstText(person.activeJob))
    .map((person) => ({
      id: firstText(person.id, person.name),
      crewLead: firstText(person.name, "Crew"),
      currentJob: firstText(person.activeJob, "Assigned Work"),
      phase: firstText(person.skill, person.role, "Assigned"),
      status: firstText(person.availability, person.status, "Active"),
    }));

  const activeJobs = jobs
    .filter((job) => !isInactive(job) && firstText(job.crew))
    .map((job) => ({
      id: firstText(job.id, job.title),
      crewLead: firstText(job.crew, "Assigned Crew"),
      currentJob: projectName(job),
      phase: firstText(job.jobType, job.status, "Project Work"),
      status: firstText(job.status, "Active"),
    }));

  const seen = new Set<string>();
  return [...workOrderAssignments, ...scheduledAssignments, ...activeCrew, ...activeJobs]
    .filter((item) => {
      const key = `${item.crewLead}-${item.currentJob}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function buildNurseryOverview(trees: Array<RanchOakRecord | InventoryItemRecord>, scheduleTasks: ScheduleTaskRecord[]): DashboardNurseryOverview {
  const nurseryTasks = scheduleTasks.filter((task) => hasAny(task, ["nursery", "pickup", "load", "staged", "prep", "watering", "irrigation"]));
  const customerPickups = nurseryTasks
    .filter((task) => hasAny(task, ["pickup", "customer"]))
    .map((task) => ({
      id: firstText(task.id, task.title, task.task),
      customer: firstText(task.clientCompany, task.clientName, task.title, task.task, "Customer Pickup"),
      time: firstText(task.startDate, task.loadStatus, "Time TBD"),
    }))
    .slice(0, 3);

  return {
    ordersToday: nurseryTasks.filter((task) => hasAny(task, ["order", "pickup", "delivery"])).length,
    treesPrepped: trees.filter((tree) => hasAny(tree, ["prepped", "ready", "staged"])).length,
    needsPrepped: trees.filter((tree) => hasAny(tree, ["needs prep", "prep needed", "not prepped"])).length,
    stagedForDelivery: trees.filter((tree) => hasAny(tree, ["staged", "loaded", "delivery"])).length,
    irrigationStatus: nurseryTasks.some((task) => hasAny(task, ["irrigation issue", "water issue", "needs water"])) ? "Needs Update" : "Good",
    customerPickups,
  };
}

function buildEquipmentStatusOverview(equipment: EquipmentRecord[]): DashboardEquipmentStatusOverview {
  const activeEquipment = equipment.filter((item) => !isInactive(item));
  const inUse = activeEquipment.filter((item) => hasAny(item, ["in use", "assigned", "on site", "offsite", "in transit"])).length;
  const available = activeEquipment.filter((item) => hasAny(item, ["available", "ready"])).length;
  const maintenance = activeEquipment.filter((item) => hasAny(item, ["maintenance", "inspection", "service"])).length;
  const down = activeEquipment.filter((item) => hasAny(item, ["down", "repair", "broken", "blown"])).length;
  const total = activeEquipment.length || inUse + available + maintenance + down;
  const issue = activeEquipment.find((item) => hasAny(item, ["down", "repair", "broken", "blown", "maintenance", "service due"]));

  return {
    inUse,
    available,
    maintenance,
    down,
    utilizationPercent: percentValue(inUse, total),
    availablePercent: percentValue(available, total),
    maintenancePercent: percentValue(maintenance, total),
    downPercent: percentValue(down, total),
    keyIssue: issue
      ? [firstText(issue.name, issue.asset, issue.type, "Equipment"), firstText(issue.currentLocationName, issue.currentLocation, issue.assignedProjectName), firstText(issue.status, issue.serviceStatus)].filter(Boolean).join(" - ")
      : "No critical equipment issue",
  };
}

function buildAttentionItems(
  ownerReviewQueue: DashboardWorkItem[],
  alerts: AlertRecord[],
  dataQualityQueue: DataQualityActionItem[],
  equipment: EquipmentRecord[],
): DashboardAttentionItem[] {
  const alertItems = alerts
    .filter((alert) => !isInactive(alert))
    .map((alert) => ({
      id: firstText(alert.id, alert.title, alert.name),
      severity: /critical|high|urgent/i.test(firstText(alert.severity, alert.status)) ? "High" as const : /medium|watch|warning/i.test(firstText(alert.severity, alert.status)) ? "Medium" as const : "Low" as const,
      count: 1,
      title: firstText(alert.title, alert.name, "Alert"),
      detail: firstText(alert.body, alert.notes, alert.time, "Needs attention"),
      targetTab: firstText(alert.targetTab, "alerts"),
      drawerType: alert.relatedEntityType === "equipment" ? "equipment" : "alert",
      recordId: firstText(alert.relatedEntityId, alert.id),
    }));

  const ownerItems = ownerReviewQueue.slice(0, 4).map((item) => ({
    id: item.id,
    severity: item.blockerFlag || /block|hold|down|urgent|high/i.test([item.title, item.status, item.detail].join(" ")) ? "High" as const : "Medium" as const,
    count: 1,
    title: item.title,
    detail: item.projectName || item.detail,
    targetTab: item.targetTab,
    drawerType: item.drawerType,
    recordId: item.recordId,
  }));

  const dataItems = dataQualityQueue.slice(0, 2).map((item) => ({
    id: item.id,
    severity: item.severity === "High" ? "High" as const : item.severity === "Medium" ? "Medium" as const : "Low" as const,
    count: 1,
    title: item.title,
    detail: item.recommendedAction || item.detail,
    targetTab: item.targetTab,
    drawerType: item.drawerType,
    recordId: item.recordId,
  }));

  const equipmentItems = equipment
    .filter((item) => !isInactive(item) && hasAny(item, ["down", "repair", "broken", "blown", "service due"]))
    .slice(0, 2)
    .map((item) => ({
      id: firstText(item.id, item.name),
      severity: /down|broken|blown/i.test(recordText(item)) ? "High" as const : "Medium" as const,
      count: 1,
      title: firstText(item.name, item.asset, "Equipment issue"),
      detail: firstText(item.status, item.serviceStatus, item.currentLocationName, "Needs review"),
      targetTab: "equipment",
      drawerType: "equipment",
      recordId: firstText(item.id, item.name),
    }));

  const seen = new Set<string>();
  return [...alertItems, ...ownerItems, ...equipmentItems, ...dataItems]
    .filter((item) => {
      const key = `${item.title}-${item.detail}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function buildCommandCenterOverview(input: {
  jobs: JobRecord[];
  projects: ProjectRecord[];
  loads: LoadRecord[];
  trees: Array<RanchOakRecord | InventoryItemRecord>;
  equipment: EquipmentRecord[];
  crew: CrewRecord[];
  workOrders: WorkOrderRecord[];
  scheduleTasks: ScheduleTaskRecord[];
  treeRelocationRecords: TreeRelocationRecord[];
  alerts: AlertRecord[];
  fleetTelematicsEvents: FleetTelematicsEventRecord[];
  fieldUpdates: FieldUpdateRecord[];
  dataQualityQueue: DataQualityActionItem[];
  ownerReviewQueue: DashboardWorkItem[];
  projectRisks: ProjectRiskScore[];
  todayIso: string;
}): CommandCenterOverview {
  const projectRecords = uniqueProjectRecords(input.jobs, input.projects);
  const activeProjects = projectRecords.filter(isActiveProject);
  const activeTreeSourceProjects = activeProjects.length ? activeProjects : projectRecords.filter((record) => !isInactive(record));
  const activeProjectTrees = activeTreeSourceProjects.flatMap((project) => input.treeRelocationRecords.filter((tree) => treeBelongsToProject(tree, project)));
  const relocatedTrees = activeProjectTrees.filter(hasExactRelocatedStatus).length;
  const totalTrees = activeProjectTrees.length || input.treeRelocationRecords.length;
  const openIssues = input.ownerReviewQueue.length + input.dataQualityQueue.filter((item) => item.severity !== "Low").length;
  const reportsToday = input.fieldUpdates.filter((update) => hasAny(update, ["closeout", "report", "submitted", "review"])).length;
  const inProgress = projectRecords.filter(isInProgressProject).length
    || input.workOrders.filter((item) => !isInactive(item) && hasAny(item, ["active", "progress", "assigned", "scheduled"])).length;
  const upcoming = projectRecords.filter(isUpcomingProject).length;
  const onHold = projectRecords.filter(isOnHoldProject).length;

  const kpis: DashboardOverviewKpi[] = [
    { id: "activeProjects", label: "Active Projects", value: String(activeProjects.length), detail: "In the field", tone: "green", targetTab: "tracker" },
    { id: "inProgress", label: "In Progress", value: String(inProgress), detail: "Active workflows", tone: "green", targetTab: "calendar" },
    { id: "upcoming", label: "Upcoming", value: String(upcoming), detail: "Scheduled soon", tone: "blue", targetTab: "calendar" },
    { id: "onHold", label: "On Hold", value: String(onHold), detail: "Awaiting action", tone: "amber", targetTab: "alerts" },
    { id: "openIssues", label: "Open Issues", value: String(openIssues), detail: "Needs attention", tone: "red", targetTab: "alerts" },
    { id: "relocatedTrees", label: "Relocated Trees", value: `${relocatedTrees} of ${totalTrees}`, detail: "Across active projects", tone: "green", targetTab: "treeGisMap" },
    { id: "activeAlerts", label: "Active Alerts", value: String(input.alerts.filter((alert) => !isInactive(alert)).length), detail: "Needs attention", tone: "amber", targetTab: "alerts" },
    { id: "reportsToday", label: "Reports Today", value: String(reportsToday), detail: "View latest reports", tone: "teal", targetTab: "reports" },
  ];

  return {
    date: input.todayIso || new Date().toISOString().slice(0, 10),
    kpis,
    fleetGps: buildFleetGpsQuickGlance(input.equipment, input.loads, input.fleetTelematicsEvents),
    projectSnapshots: buildOverviewProjectSnapshots(projectRecords, input.treeRelocationRecords, input.ownerReviewQueue, input.projectRisks),
    freightToday: buildFreightToday(input.loads),
    crewAtGlance: buildCrewAtGlance(input.crew, input.workOrders, input.scheduleTasks, input.jobs),
    nurserySnapshot: buildNurseryOverview(input.trees, input.scheduleTasks),
    equipmentStatus: buildEquipmentStatusOverview(input.equipment),
    alerts: buildAttentionItems(input.ownerReviewQueue, input.alerts, input.dataQualityQueue, input.equipment),
  };
}

export function buildDashboardSummary(input: DashboardSummaryInput): DashboardSummary {
  const {
    jobs,
    loads,
    trees,
    equipment,
    crew,
    clients,
    projects,
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts,
    fleetTelematicsEvents,
    fieldUpdates,
    importBatches,
    todayIso,
  } = { ...emptyArrays, ...input };

  const telematicsAlerts = buildTelematicsExceptionAlerts({
    equipment,
    loads,
    events: fleetTelematicsEvents,
    now: todayIso ? `${todayIso}T23:59:59.000Z` : undefined,
  });
  const alertsForDashboard = [...telematicsAlerts, ...alerts];

  const intelligenceInput = {
    clients,
    projects,
    jobs,
    workOrders,
    loads,
    equipment,
    fieldUpdates,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts: alertsForDashboard,
    fleetTelematicsEvents,
    importBatches,
    ranchOaks: trees as RanchOakRecord[],
    todayIso,
  };
  const dailyBrief = buildDailyCommandBrief(intelligenceInput);
  const dataQualityQueue = buildDataQualityActionQueue(intelligenceInput);
  const dataQualityGroups = buildDataQualityGroups(dataQualityQueue);
  const scheduleBlockingDataQualityQueue = dataQualityGroups[0]?.items || [];
  const workflowReadinessQueue = buildWorkflowReadinessQueue(intelligenceInput);
  const fieldCloseoutReviewQueue = buildFieldCloseoutReviewQueue(fieldUpdates);
  const complianceReviewQueue = buildComplianceReviewQueue({ crew, equipment, todayIso });
  const dispatchBlockingComplianceQueue = complianceReviewQueue
    .filter((item) => hasAny(item as unknown as Record<string, unknown>, ["missing", "expired", "blocked", "dispatch"]))
    .slice(0, 6);
  const resourceConflictQueue = buildOperatingCalendar({
    jobs,
    loads,
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    equipment,
    todayIso,
  }).conflicts.slice(0, 8);
  const projectRisks = buildProjectRiskScores(intelligenceInput);
  const treeLifecycleAlerts = buildTreeLifecycleAlerts({ trees: treeRelocationRecords, jobs, workOrders, todayIso });
  const todaySchedule = buildTodaySchedule(jobs, loads, scheduleTasks, workOrders);
  const tomorrowQueue = buildTomorrowQueue(jobs, scheduleTasks);
  const ownerReviewQueue = buildOwnerReviewQueue(jobs, loads, equipment, alertsForDashboard, fieldUpdates, treeLifecycleAlerts);
  const ownerReviewGroups = buildOwnerReviewGroups(ownerReviewQueue);
  const treePipeline = buildTreePipeline(treeRelocationRecords);
  const rootPruneDueQueue = ownerReviewQueue.filter(isRootPruneItem).slice(0, 6);
  const nutrientCareDueQueue = ownerReviewQueue.filter(isNutrientCareItem).slice(0, 6);
  const relocationWorkDueQueue = ownerReviewQueue.filter(isRelocationMoveItem).slice(0, 6);
  const equipmentBoard = buildEquipmentBoard(equipment);
  const fieldUpdateReviewCount = fieldUpdates.filter(isFieldUpdateNeedingReview).length;
  const blockedCount = jobs.filter(isBlockedRecord).length + loads.filter(isBlockedRecord).length + equipment.filter(isEquipmentHold).length + alertsForDashboard.filter((alert) => !isInactive(alert)).length + fieldUpdateReviewCount;
  const treesReadyToMove = treePipeline.find((bucket) => bucket.status === "Ready for Relocation")?.count || 0;
  const rootPruneDueCount = rootPruneDueQueue.length;
  const nutrientCareDueCount = nutrientCareDueQueue.length;
  const equipmentConflictCount = resourceConflictQueue.filter((conflict) => (
    ["equipment", "truck", "trailer", "driver"].includes(String(conflict.resourceKind || "").toLowerCase())
  )).length || equipment.filter(isEquipmentHold).length;

  const commandAlerts: DashboardCommandAlert[] = [
    {
      id: "todayWork",
      label: "Today's Work",
      value: String(todaySchedule.length),
      detail: "Crew work orders, freight, and scheduled field work",
      tone: "context",
      targetTab: "calendar",
    },
    {
      id: "blockedDecision",
      label: "Blocked / Needs Decision",
      value: String(blockedCount),
      detail: "Owner decisions, holds, or field issues",
      tone: blockedCount > 0 ? "bad" : "ready",
      targetTab: "alerts",
    },
    {
      id: "treesReady",
      label: "Trees Ready to Move",
      value: String(treesReadyToMove),
      detail: "Ready for relocation status",
      tone: treesReadyToMove > 0 ? "ready" : "context",
      targetTab: "tracker",
    },
    {
      id: "rootPruneDue",
      label: "Root Prune Due",
      value: String(rootPruneDueCount),
      detail: "Cut scheduling or confirmation needed",
      tone: rootPruneDueCount > 0 ? "warn" : "ready",
      targetTab: "tracker",
    },
    {
      id: "careFollowUps",
      label: "Care Follow-Ups",
      value: String(nutrientCareDueCount),
      detail: "Nutrient care or treatment follow-up",
      tone: nutrientCareDueCount > 0 ? "blue" : "ready",
      targetTab: "tracker",
    },
    {
      id: "equipmentConflicts",
      label: "Equipment Conflicts",
      value: String(equipmentConflictCount),
      detail: "Double-booked, down, or dispatch-blocking",
      tone: equipmentConflictCount > 0 ? "warn" : "ready",
      targetTab: "equipment",
    },
  ];

  const pipeline: DashboardPipelineStage[] = [
    {
      id: "inquiries",
      label: "Inquiries",
      value: countMatches(clients, ["inquiry", "lead", "prospect"]) + countMatches(jobs, ["inquiry", "lead", "prospect"]),
      detail: "New work not yet scoped",
    },
    {
      id: "siteVisits",
      label: "Site Visits",
      value: countMatches(jobs, ["site visit", "site walk", "walkthrough"]) + countMatches(scheduleTasks, ["site visit", "site walk", "walkthrough"]),
      detail: "Field walks and site checks",
    },
    {
      id: "estimates",
      label: "Estimates",
      value: countMatches(jobs, ["estimate", "quote", "proposal", "bid", "draft"]) + countMatches(clients, ["estimate", "quote", "proposal", "bid", "draft"]),
      detail: "Pricing and proposal work",
    },
    {
      id: "approved",
      label: "Approved",
      value: countMatches(jobs, ["approved", "accepted", "won"]) + countMatches(clients, ["approved", "accepted", "won"]),
      detail: "Ready to schedule",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: jobs.filter((job) => !isInactive(job) && (hasAny(job, ["scheduled", "onschedule", "on schedule", "dispatched"]) || Boolean(job.startDate || job.scheduledDate || job.date))).length,
      detail: "On the operations calendar",
    },
    {
      id: "completed",
      label: "Completed",
      value: countMatches(jobs, ["completed", "complete", "done", "closed"]),
      detail: "Finished work",
    },
    {
      id: "invoiced",
      label: "Invoiced",
      value: countMatches(jobs, ["invoiced", "invoice", "billed", "paid"]) + countMatches(clients, ["invoiced", "invoice", "billed", "paid"]),
      detail: "Billing follow-through",
    },
  ];

  const relocationJob = firstActive(jobs, (job) => {
    const division = String(job.division || "").toLowerCase();
    return division === "" || division.includes("relocation") || division.includes("install") || division.includes("nursery");
  });

  const freightLoad = firstActive(loads, () => true);
  const serviceEquipment = equipment.find((item) => !isInactive(item) && hasAny(item, ["needs service", "maintenance", "down", "repair", "service due"])) || equipment.find((item) => !isInactive(item));
  const firstTree = trees[0];
  const treeQuantity = quantityTotal(trees);

  const operations: DashboardSummary["operations"] = {
    relocation: {
      id: "relocation",
      label: "Relocation & Installation",
      title: displayValue(relocationJob?.title || relocationJob?.client, "No Active Relocations"),
      subtitle: displayValue(relocationJob?.location || relocationJob?.client, "Create or import a relocation project"),
      status: displayValue(relocationJob?.status, relocationJob ? "Active" : "Idle"),
      value: String(treeRelocationRecords.length || jobs.filter((job) => hasAny(job, ["relocation", "install"])).length),
      valueLabel: "relocation records",
      targetTab: "tracker",
      drawerType: "job",
      recordId: relocationJob?.id,
      actionLabel: relocationJob ? "Details" : "Open Tracking",
      empty: !relocationJob,
      stats: [
        { label: "Target", value: displayValue(relocationJob?.startDate || relocationJob?.scheduledDate || relocationJob?.date, "TBD") },
        { label: "Crew", value: displayValue(relocationJob?.crew || relocationJob?.pm, "Unassigned") },
        { label: "Client", value: displayValue(relocationJob?.client, "No client") },
      ],
    },
    freight: {
      id: "freight",
      label: "Freight Dispatch",
      title: displayValue(freightLoad?.title || freightLoad?.loadNumber, "No Active Freight"),
      subtitle: displayValue([freightLoad?.origin, freightLoad?.delivery].filter(Boolean).join(" to "), "Dispatch loads from the Freight board"),
      status: displayValue(freightLoad?.status, freightLoad ? "Active" : "Idle"),
      value: String(loads.filter((load) => !isInactive(load)).length),
      valueLabel: "active loads",
      targetTab: "freight",
      drawerType: "freight",
      recordId: freightLoad?.id,
      actionLabel: freightLoad ? "Dispatch" : "Open Freight",
      empty: !freightLoad,
      stats: [
        { label: "Driver", value: displayValue(freightLoad?.driver, "Pending") },
        { label: "Truck", value: displayValue(freightLoad?.truck, "TBD") },
        { label: "ETA", value: displayValue(freightLoad?.eta || freightLoad?.deliveryDate, "TBD") },
      ],
    },
    nursery: {
      id: "nursery",
      label: "Nursery Production",
      title: firstTree ? `${displayValue(firstTree.treeId || firstTree.name, "Tree Inventory")} + ${Math.max(trees.length - 1, 0)} more` : "No Nursery Trees",
      subtitle: firstTree ? displayValue([firstTree.farm, firstTree.zone].filter(Boolean).join(" / "), "Inventory ready for details") : "Import inventory or add nursery records",
      status: firstTree ? displayValue(firstTree.status, "Inventory") : "Idle",
      value: String(trees.length),
      valueLabel: "tree records",
      targetTab: "inventory",
      drawerType: "tree",
      recordId: firstTree?.id || firstTree?.treeId,
      actionLabel: firstTree ? "Nursery" : "Open Nursery",
      empty: trees.length === 0,
      stats: [
        { label: "Quantity", value: treeQuantity > 0 ? String(treeQuantity) : "-" },
        { label: "Farm", value: displayValue(firstTree?.farm, "TBD") },
        { label: "Status", value: displayValue(firstTree?.status, "Inventory") },
      ],
    },
    equipment: {
      id: "equipment",
      label: "Maintenance / Equip",
      title: displayValue(serviceEquipment?.name || serviceEquipment?.asset || serviceEquipment?.type || serviceEquipment?.eqType, "All Equipment Good"),
      subtitle: displayValue(serviceEquipment?.operator || serviceEquipment?.make || serviceEquipment?.model, "Track service and readiness"),
      status: displayValue(serviceEquipment?.status || serviceEquipment?.serviceStatus, serviceEquipment ? "Active" : "Ready"),
      value: String(equipment.filter((item) => !isInactive(item) && hasAny(item, ["needs service", "maintenance", "down", "repair", "service due"])).length),
      valueLabel: "service flags",
      targetTab: "equipment",
      drawerType: "equipment",
      recordId: serviceEquipment?.id || serviceEquipment?.name,
      actionLabel: serviceEquipment ? "Details" : "Open Equipment",
      empty: equipment.length === 0,
      stats: [
        { label: "Type", value: displayValue(serviceEquipment?.type || serviceEquipment?.eqType, "General") },
        { label: "Hours", value: displayValue(serviceEquipment?.hours, "-") },
        { label: "Service", value: displayValue(serviceEquipment?.nextServiceDue || serviceEquipment?.serviceStatus, "TBD") },
      ],
    },
  };

  const overview = buildCommandCenterOverview({
    jobs,
    projects,
    loads,
    trees,
    equipment,
    crew,
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    alerts: alertsForDashboard,
    fleetTelematicsEvents,
    fieldUpdates,
    dataQualityQueue,
    ownerReviewQueue,
    projectRisks,
    todayIso,
  });

  return {
    overview,
    commandAlerts,
    dailyBrief,
    dataQualityQueue,
    scheduleBlockingDataQualityQueue,
    dataQualityGroups,
    workflowReadinessQueue,
    fieldCloseoutReviewQueue,
    complianceReviewQueue,
    dispatchBlockingComplianceQueue,
    resourceConflictQueue,
    projectRisks,
    todaySchedule,
    tomorrowQueue,
    ownerReviewQueue,
    ownerReviewGroups,
    treePipeline,
    rootPruneDueQueue,
    nutrientCareDueQueue,
    relocationWorkDueQueue,
    equipmentBoard,
    pipeline,
    operations,
    operationList: [operations.relocation, operations.freight, operations.nursery, operations.equipment],
  };
}
