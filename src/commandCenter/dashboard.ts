import type {
  AlertRecord,
  ClientRecord,
  CommandRecord,
  CrewRecord,
  DocumentRecord,
  EquipmentRecord,
  FieldUpdateRecord,
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
import { buildFieldCloseoutReviewQueue, type FieldCloseoutReviewItem } from "./fieldCloseout";

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
  id: "today" | "blocked" | "approved" | "trees" | "crew" | "freight" | "equipment";
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
};

export type DashboardSummary = {
  commandAlerts: DashboardCommandAlert[];
  dailyBrief: DailyCommandBrief;
  dataQualityQueue: DataQualityActionItem[];
  workflowReadinessQueue: WorkflowReadinessIssue[];
  fieldCloseoutReviewQueue: FieldCloseoutReviewItem[];
  complianceReviewQueue: ComplianceReviewItem[];
  projectRisks: ProjectRiskScore[];
  todaySchedule: DashboardWorkItem[];
  tomorrowQueue: DashboardWorkItem[];
  ownerReviewQueue: DashboardWorkItem[];
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

function buildTodaySchedule(jobs: JobRecord[], loads: LoadRecord[], scheduleTasks: ScheduleTaskRecord[]): DashboardWorkItem[] {
  const jobItems = jobs
    .filter((job) => !isInactive(job) && isScheduledJob(job))
    .map((job) => workItem(job, {
      assignee: job.crew || job.pm,
      detail: [job.client, job.location, job.startDate || job.scheduledDate || job.date].filter(Boolean).join(" - "),
      targetTab: "tracker",
      drawerType: "job",
      tone: "relocation",
    }));

  const loadItems = loads
    .filter((load) => !isInactive(load))
    .map((load) => workItem(load, {
      title: load.title || load.loadNumber,
      assignee: load.driver,
      status: load.status,
      detail: [load.origin, load.delivery, load.eta || load.deliveryDate].filter(Boolean).join(" - "),
      targetTab: "freight",
      drawerType: "freight",
      tone: "freight",
    }));

  const taskItems = scheduleTasks
    .filter((task) => !isInactive(task) && Boolean(task.startDate || task.endDate || task.assignee || task.locationName || task.activityType))
    .map((task) => workItem(task, {
      title: task.title || task.task || task.activityType,
      assignee: task.assignee,
      status: task.loadStatus || task.status,
      detail: [task.clientCompany || task.clientName, task.locationName || task.mainAddress, task.startDate].filter(Boolean).join(" - "),
      targetTab: "calendar",
      drawerType: "schedule",
      tone: "task",
    }));

  return [...jobItems, ...loadItems, ...taskItems].slice(0, 8);
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
  return {
    id: alert.id,
    title: alert.title,
    assignee: alert.treeName,
    status: alert.dueDate || "Needs scheduling",
    detail: alert.detail,
    targetTab: alert.targetTab,
    drawerType: alert.drawerType,
    recordId: alert.recordId,
    tone: "relocation",
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
      targetTab: "alerts",
      drawerType: "alert",
      tone: "task",
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

  return [...blockedJobs, ...treeIssues, ...freightIssues, ...equipmentIssues, ...fieldUpdateIssues, ...alertIssues].slice(0, 6);
}

function quantityTotal(trees: Array<RanchOakRecord | InventoryItemRecord>) {
  return trees.reduce((total, tree) => {
    const quantity = Number(tree.quantity);
    return Number.isFinite(quantity) ? total + quantity : total;
  }, 0);
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
    fieldUpdates,
    importBatches,
    todayIso,
  } = { ...emptyArrays, ...input };

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
    alerts,
    importBatches,
    ranchOaks: trees as RanchOakRecord[],
    todayIso,
  };
  const dailyBrief = buildDailyCommandBrief(intelligenceInput);
  const dataQualityQueue = buildDataQualityActionQueue(intelligenceInput);
  const workflowReadinessQueue = buildWorkflowReadinessQueue(intelligenceInput);
  const fieldCloseoutReviewQueue = buildFieldCloseoutReviewQueue(fieldUpdates);
  const complianceReviewQueue = buildComplianceReviewQueue({ crew, equipment, todayIso });
  const projectRisks = buildProjectRiskScores(intelligenceInput);
  const treeLifecycleAlerts = buildTreeLifecycleAlerts({ trees: treeRelocationRecords, jobs, workOrders, todayIso });
  const todaySchedule = buildTodaySchedule(jobs, loads, scheduleTasks);
  const tomorrowQueue = buildTomorrowQueue(jobs, scheduleTasks);
  const ownerReviewQueue = buildOwnerReviewQueue(jobs, loads, equipment, alerts, fieldUpdates, treeLifecycleAlerts);
  const fieldUpdateReviewCount = fieldUpdates.filter(isFieldUpdateNeedingReview).length;
  const blockedCount = jobs.filter(isBlockedRecord).length + loads.filter(isBlockedRecord).length + equipment.filter(isEquipmentHold).length + alerts.filter((alert) => !isInactive(alert)).length + fieldUpdateReviewCount;
  const approvedUnscheduledCount = jobs.filter(isApprovedUnscheduledJob).length;
  const treeLifecycleCount = treeLifecycleAlerts.length;
  const crewGapCount = scheduleTasks.filter(isCrewDispatchGap).length + loads.filter((load) => !isInactive(load) && !load.driver).length + fieldUpdateReviewCount;
  const freightIssueCount = loads.filter(isFreightIssue).length;
  const equipmentHoldCount = equipment.filter(isEquipmentHold).length;

  const commandAlerts: DashboardCommandAlert[] = [
    {
      id: "today",
      label: "Today command",
      value: String(todaySchedule.length),
      detail: "Items on the working board",
      tone: "context",
      targetTab: "calendar",
    },
    {
      id: "blocked",
      label: "Blocked",
      value: String(blockedCount),
      detail: "Need owner decision",
      tone: blockedCount > 0 ? "bad" : "ready",
      targetTab: "alerts",
    },
    {
      id: "approved",
      label: "Approved",
      value: String(approvedUnscheduledCount),
      detail: "Not scheduled yet",
      tone: "ready",
      targetTab: "tracker",
    },
    {
      id: "trees",
      label: "Tree timeline",
      value: String(treeLifecycleCount),
      detail: "Root prune, relocation, or care cue",
      tone: treeLifecycleCount > 0 ? "warn" : "ready",
      targetTab: "tracker",
    },
    {
      id: "crew",
      label: "Crew status",
      value: String(crewGapCount),
      detail: "Field updates and dispatch gaps",
      tone: crewGapCount > 0 ? "warn" : "ready",
      targetTab: "crewView",
    },
    {
      id: "freight",
      label: "Freight",
      value: String(freightIssueCount),
      detail: "Route, driver, or truck issue",
      tone: freightIssueCount > 0 ? "blue" : "ready",
      targetTab: "freight",
    },
    {
      id: "equipment",
      label: "Equipment",
      value: String(equipmentHoldCount),
      detail: "Service holds",
      tone: equipmentHoldCount > 0 ? "warn" : "ready",
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

  return {
    commandAlerts,
    dailyBrief,
    dataQualityQueue,
    workflowReadinessQueue,
    fieldCloseoutReviewQueue,
    complianceReviewQueue,
    projectRisks,
    todaySchedule,
    tomorrowQueue,
    ownerReviewQueue,
    pipeline,
    operations,
    operationList: [operations.relocation, operations.freight, operations.nursery, operations.equipment],
  };
}
