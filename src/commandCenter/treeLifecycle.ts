import type { JobRecord, TreeRelocationRecord, WorkOrderRecord } from "./records";
import { sameProject } from "./relationships";
import { statusPillClass } from "./visualLanguage";

export const defaultRelocationStatus = "Not Started";

export const relocationStatusOptions = [
  "Not Started",
  "1st Cut Scheduled",
  "1st Cut Complete",
  "2nd Cut Scheduled",
  "2nd Cut Complete",
  "Ready For Relocation",
  "Relocated",
  "Moved To Holding Area",
  "Invoiced",
  "Paid",
  "In Nutrient Care Phase",
] as const;

export type TreeLifecycleAction =
  | "schedule_first_cut"
  | "confirm_first_cut_complete"
  | "schedule_second_cut"
  | "confirm_second_cut_complete"
  | "mark_ready_for_relocation"
  | "invoice_relocated_tree"
  | "start_nutrient_care_phase"
  | "schedule_nutrient_after_first_cut"
  | "schedule_nutrient_after_second_cut"
  | "schedule_nutrient_after_relocation";

export type TreeLifecycleAlert = {
  id: string;
  treeId: string;
  treeName: string;
  projectId: string;
  projectName: string;
  jobId?: string;
  action: TreeLifecycleAction;
  title: string;
  detail: string;
  dueDate?: string;
  targetTab: "tracker";
  drawerType: "job";
  recordId?: string;
};

export type TreeLifecycleInput = {
  trees?: TreeRelocationRecord[];
  jobs?: JobRecord[];
  workOrders?: WorkOrderRecord[];
  todayIso?: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalized(value: unknown): string {
  return clean(value).toLowerCase();
}

function dateOnly(value: unknown): string {
  return clean(value).slice(0, 10);
}

function numericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function addMonthsIso(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function isOnOrBefore(leftIso: string | undefined, rightIso: string): boolean {
  return Boolean(leftIso && rightIso && leftIso <= rightIso);
}

function statusIn(status: unknown, values: string[]): boolean {
  const cleanStatus = normalized(status);
  return values.map((value) => value.toLowerCase()).includes(cleanStatus);
}

function treeId(tree: TreeRelocationRecord): string {
  return clean(tree.treeId || tree.id || tree.title);
}

function treeLabel(tree: TreeRelocationRecord): string {
  return clean(tree.type || tree.treeType || tree.title || treeId(tree) || "Project tree");
}

function treeStatus(tree: TreeRelocationRecord): string {
  return clean(tree.relocationStatus || tree.status || tree.currentStatus || defaultRelocationStatus);
}

function relatedJob(tree: TreeRelocationRecord, jobs: JobRecord[]): JobRecord | undefined {
  return jobs.find((job) => (
    clean(job.id) === clean(tree.jobId)
    || clean(job.jobId) === clean(tree.jobId)
    || clean(job.projectId) === clean(tree.projectId)
    || clean(job.projectId) === clean(tree.projectsId)
    || sameProject(job, tree)
  ));
}

function workOrderMatchesTree(workOrder: WorkOrderRecord, tree: TreeRelocationRecord): boolean {
  const id = treeId(tree);
  return (
    (workOrder.treeIds || []).map(clean).includes(id)
    || (workOrder.treeNames || []).map(clean).includes(id)
    || clean(workOrder.relatedRecordId) === clean(tree.id)
    || clean(workOrder.projectId) === clean(tree.projectId)
    || sameProject(workOrder, tree)
  );
}

function relatedTreeWorkOrders(tree: TreeRelocationRecord, workOrders: WorkOrderRecord[], workOrderType: WorkOrderRecord["workOrderType"]): WorkOrderRecord[] {
  return workOrders.filter((workOrder) => workOrder.workOrderType === workOrderType && workOrderMatchesTree(workOrder, tree));
}

function isComplete(record: Record<string, unknown>): boolean {
  return normalized(record.status).includes("complete") || Boolean(record.completedDate);
}

function rootPruningMonths(tree: TreeRelocationRecord, job: JobRecord | undefined): number {
  const treeMonths = numericValue(tree.rootPruningPeriodMonths);
  if (treeMonths !== undefined) return treeMonths;
  const jobMonths = numericValue(job?.rootPruningPeriodMonths);
  if (jobMonths !== undefined) return jobMonths;
  return 4;
}

function alertFor(tree: TreeRelocationRecord, job: JobRecord | undefined, action: TreeLifecycleAction, title: string, detail: string, dueDate?: string): TreeLifecycleAlert {
  const id = treeId(tree);
  const projectName = clean(tree.projectName || job?.projectName || job?.title || "Project");
  const recordId = clean(job?.id || tree.jobId || tree.projectId || tree.projectsId || tree.id);
  return {
    id: `tree-lifecycle-${action}-${clean(tree.id || id)}`,
    treeId: id,
    treeName: treeLabel(tree),
    projectId: clean(tree.projectId || tree.projectsId || job?.projectId),
    projectName,
    jobId: clean(tree.jobId || job?.id || job?.jobId) || undefined,
    action,
    title,
    detail,
    dueDate,
    targetTab: "tracker",
    drawerType: "job",
    recordId,
  };
}

export function formatRelocationCost(value: unknown): string {
  const amount = numericValue(value);
  if (amount === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function relocationStatusBadgeClass(status: unknown): string {
  return statusPillClass(status || defaultRelocationStatus);
}

export function buildTreeLifecycleAlerts(input: TreeLifecycleInput): TreeLifecycleAlert[] {
  const trees = input.trees || [];
  const jobs = input.jobs || [];
  const workOrders = input.workOrders || [];
  const todayIso = dateOnly(input.todayIso || new Date().toISOString());
  const alerts: TreeLifecycleAlert[] = [];

  for (const tree of trees) {
    const id = treeId(tree);
    if (!id) continue;

    const job = relatedJob(tree, jobs);
    const status = treeStatus(tree);
    const rootPruningOrders = relatedTreeWorkOrders(tree, workOrders, "tree_pruning");
    const nutrientOrders = relatedTreeWorkOrders(tree, workOrders, "treatment_aftercare");
    const firstCutDate = dateOnly(tree.firstCutDate || rootPruningOrders.find((order) => dateOnly(order.scheduledDate))?.scheduledDate);
    const secondCutDate = dateOnly(tree.secondCutDate || rootPruningOrders.find((order) => dateOnly(order.secondCutDate))?.secondCutDate);
    const relocationDate = dateOnly(tree.relocationDate);
    const hasNutrientAfterFirstCut = nutrientOrders.some((order) => normalized(order.taskType || order.title).includes("first cut"));
    const hasNutrientAfterSecondCut = nutrientOrders.some((order) => normalized(order.taskType || order.title).includes("second cut"));
    const hasNutrientAfterRelocation = nutrientOrders.some((order) => normalized(order.taskType || order.title).includes("relocation"));
    const projectLine = clean(tree.projectName || job?.projectName || job?.title);

    if (statusIn(status, [defaultRelocationStatus, "Open"]) && rootPruningOrders.length === 0) {
      alerts.push(alertFor(tree, job, "schedule_first_cut", "Schedule 1st Cut", `${treeLabel(tree)} ${id} needs first root pruning scheduled${projectLine ? ` for ${projectLine}` : ""}.`));
    }

    const scheduledFirstCut = rootPruningOrders.find((order) => dateOnly(order.scheduledDate) && !isComplete(order));
    if (statusIn(status, ["1st Cut Scheduled"]) && isOnOrBefore(dateOnly(scheduledFirstCut?.scheduledDate), todayIso)) {
      alerts.push(alertFor(tree, job, "confirm_first_cut_complete", "Confirm 1st Cut Complete", `${treeLabel(tree)} ${id} had a first cut scheduled for ${dateOnly(scheduledFirstCut?.scheduledDate)}. Confirm completion or reschedule.`, dateOnly(scheduledFirstCut?.scheduledDate)));
    }

    const months = rootPruningMonths(tree, job);
    const secondCutDue = firstCutDate ? addMonthsIso(firstCutDate, months / 2) : "";
    const readyDue = firstCutDate ? addMonthsIso(firstCutDate, months) : "";

    if (firstCutDate && !secondCutDate && !statusIn(status, ["2nd Cut Scheduled", "2nd Cut Complete", "Ready For Relocation", "Relocated", "Moved To Holding Area", "Invoiced", "Paid", "In Nutrient Care Phase"]) && isOnOrBefore(secondCutDue, todayIso)) {
      alerts.push(alertFor(tree, job, "schedule_second_cut", "Schedule 2nd Cut", `${treeLabel(tree)} ${id} is due for the halfway root pruning cut.`, secondCutDue));
    }

    const scheduledSecondCut = rootPruningOrders.find((order) => dateOnly(order.secondCutDate) && !isComplete(order));
    if (statusIn(status, ["2nd Cut Scheduled"]) && isOnOrBefore(dateOnly(scheduledSecondCut?.secondCutDate), todayIso)) {
      alerts.push(alertFor(tree, job, "confirm_second_cut_complete", "Confirm 2nd Cut Complete", `${treeLabel(tree)} ${id} had a second cut scheduled for ${dateOnly(scheduledSecondCut?.secondCutDate)}. Confirm completion or reschedule.`, dateOnly(scheduledSecondCut?.secondCutDate)));
    }

    if (firstCutDate && !statusIn(status, ["Ready For Relocation", "Relocated", "Moved To Holding Area", "Invoiced", "Paid", "In Nutrient Care Phase"]) && isOnOrBefore(readyDue, todayIso)) {
      alerts.push(alertFor(tree, job, "mark_ready_for_relocation", "Mark Ready For Relocation", `${treeLabel(tree)} ${id} has reached the ${months}-month root pruning window.`, readyDue));
    }

    if (statusIn(status, ["1st Cut Complete", "2nd Cut Scheduled", "2nd Cut Complete", "Ready For Relocation"]) && firstCutDate && !hasNutrientAfterFirstCut) {
      alerts.push(alertFor(tree, job, "schedule_nutrient_after_first_cut", "Schedule Nutrient Care After 1st Cut", `${treeLabel(tree)} ${id} needs nutrient care after the first cut.`, firstCutDate));
    }

    if ((secondCutDate || statusIn(status, ["2nd Cut Complete", "Ready For Relocation"])) && !hasNutrientAfterSecondCut) {
      alerts.push(alertFor(tree, job, "schedule_nutrient_after_second_cut", "Schedule Nutrient Care After 2nd Cut", `${treeLabel(tree)} ${id} needs nutrient care after the second cut.`, secondCutDate || todayIso));
    }

    if (statusIn(status, ["Relocated"]) && !statusIn(status, ["Invoiced", "Paid"])) {
      alerts.push(alertFor(tree, job, "invoice_relocated_tree", "Invoice Relocated Tree", `${treeLabel(tree)} ${id} is marked relocated and should be reviewed for invoicing.`, relocationDate || todayIso));
    }

    if (statusIn(status, ["Paid"])) {
      alerts.push(alertFor(tree, job, "start_nutrient_care_phase", "Start Nutrient Care Phase", `${treeLabel(tree)} ${id} is paid. Move it into nutrient care tracking.`, todayIso));
    }

    if ((relocationDate || statusIn(status, ["Relocated", "Moved To Holding Area", "Invoiced", "Paid", "In Nutrient Care Phase"])) && !hasNutrientAfterRelocation) {
      alerts.push(alertFor(tree, job, "schedule_nutrient_after_relocation", "Schedule Nutrient Care After Relocation", `${treeLabel(tree)} ${id} needs nutrient care after relocation.`, relocationDate || todayIso));
    }
  }

  return alerts;
}
