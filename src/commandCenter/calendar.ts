import { buildTreeLifecycleAlerts } from "./treeLifecycle";
import type {
  EquipmentRecord,
  JobRecord,
  LoadRecord,
  ScheduleTaskRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from "./records";
import type { OperatingCategory } from "./visualLanguage";

export type CalendarView = "Today" | "Tomorrow" | "Week" | "Month";
export type CalendarGridView = "Day" | "Week" | "Month";

export type OperatingCalendarEvent = {
  id: string;
  sourceType: "job" | "freight" | "workOrder" | "scheduleTask" | "treeLifecycle" | "equipment";
  category: OperatingCategory;
  dateIso: string;
  endDateIso: string;
  durationDays: number;
  timeLabel: string;
  title: string;
  detail: string;
  status: string;
  clientName?: string;
  projectName?: string;
  assignee?: string;
  location?: string;
  drawerType: string;
  recordId?: string;
  readinessIssues: string[];
  conflicts: string[];
  resources: CalendarResourceRef[];
};

export type CalendarResourceRef = {
  key: string;
  label: string;
  kind: "crew" | "driver" | "truck" | "trailer" | "equipment";
};

export type OperatingCalendarConflict = {
  id: string;
  dateIso: string;
  resourceLabel: string;
  resourceKind: CalendarResourceRef["kind"];
  eventTitles: string[];
};

export type TomorrowReadinessSummary = {
  total: number;
  ready: number;
  needsReview: number;
  missingCrew: number;
  missingEquipment: number;
  missingFreight: number;
  missingLocation: number;
  conflicts: number;
};

export type OperatingCalendar = {
  todayIso: string;
  tomorrowIso: string;
  events: OperatingCalendarEvent[];
  conflicts: OperatingCalendarConflict[];
  tomorrowReadiness: TomorrowReadinessSummary;
};

export type CalendarGridDay = {
  dateIso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: OperatingCalendarEvent[];
};

export type OperatingCalendarInput = {
  jobs?: JobRecord[];
  loads?: LoadRecord[];
  workOrders?: WorkOrderRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  equipment?: EquipmentRecord[];
  todayIso?: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalized(value: unknown): string {
  return clean(value).toLowerCase();
}

function dateOnly(value: unknown): string {
  const raw = clean(value);
  if (!raw || raw === "TBD") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs)) return 1;
  return Math.max(1, Math.floor(diffMs / 86_400_000) + 1);
}

function startOfWeekIso(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return addDaysIso(iso, -date.getDay());
}

function startOfMonthIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function endOfMonthIso(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function calendarGridRange(view: CalendarGridView, focusIso: string): { startIso: string; endIso: string; currentMonthPrefix: string } {
  if (view === "Day") return { startIso: focusIso, endIso: focusIso, currentMonthPrefix: focusIso.slice(0, 7) };
  if (view === "Week") {
    const startIso = startOfWeekIso(focusIso);
    return { startIso, endIso: addDaysIso(startIso, 6), currentMonthPrefix: focusIso.slice(0, 7) };
  }

  const monthStart = startOfMonthIso(focusIso);
  const monthEnd = endOfMonthIso(focusIso);
  const startIso = startOfWeekIso(monthStart);
  const endDate = new Date(`${monthEnd}T00:00:00`);
  const trailingDays = 6 - endDate.getDay();
  return {
    startIso,
    endIso: addDaysIso(monthEnd, trailingDays),
    currentMonthPrefix: focusIso.slice(0, 7),
  };
}

function rangeForCalendarView(view: CalendarView, todayIso: string): { startIso: string; endIso: string } {
  const tomorrowIso = addDaysIso(todayIso, 1);
  if (view === "Today") return { startIso: todayIso, endIso: todayIso };
  if (view === "Tomorrow") return { startIso: tomorrowIso, endIso: tomorrowIso };
  if (view === "Month") return { startIso: startOfMonthIso(todayIso), endIso: endOfMonthIso(todayIso) };
  return { startIso: todayIso, endIso: addDaysIso(todayIso, 6) };
}

function dateRange(startDateIso: string, endDateIso?: string): { dateIso: string; endDateIso: string; durationDays: number } {
  const cleanEnd = dateOnly(endDateIso);
  const normalizedEnd = cleanEnd && cleanEnd >= startDateIso ? cleanEnd : startDateIso;
  return {
    dateIso: startDateIso,
    endDateIso: normalizedEnd,
    durationDays: diffDaysInclusive(startDateIso, normalizedEnd),
  };
}

function eventOverlapsRange(event: OperatingCalendarEvent, startIso: string, endIso: string): boolean {
  return event.dateIso <= endIso && event.endDateIso >= startIso;
}

function eventOccursOn(event: OperatingCalendarEvent, dateIsoValue: string): boolean {
  return event.dateIso <= dateIsoValue && event.endDateIso >= dateIsoValue;
}

function isInactive(status: unknown): boolean {
  const value = normalized(status);
  return value.includes("complete") || value.includes("cancel") || value.includes("closed") || value.includes("paid");
}

function firstDate(...values: unknown[]): string {
  for (const value of values) {
    const parsed = dateOnly(value);
    if (parsed) return parsed;
  }
  return "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const parsed = clean(value);
    if (parsed) return parsed;
  }
  return "";
}

function resource(kind: CalendarResourceRef["kind"], label: unknown): CalendarResourceRef | undefined {
  const cleanLabel = clean(label);
  if (!cleanLabel) return undefined;
  return {
    kind,
    label: cleanLabel,
    key: `${kind}:${cleanLabel.toLowerCase()}`,
  };
}

function resourceList(...values: Array<CalendarResourceRef | undefined>): CalendarResourceRef[] {
  const seen = new Set<string>();
  return values.filter((item): item is CalendarResourceRef => {
    if (!item || seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function workOrderCategory(workOrder: WorkOrderRecord): OperatingCategory {
  const text = normalized([workOrder.workOrderType, workOrder.taskType, workOrder.title].filter(Boolean).join(" "));
  if (text.includes("freight") || text.includes("delivery") || text.includes("truck") || text.includes("trailer")) return "freight";
  if (text.includes("equipment") || text.includes("maintenance") || text.includes("service")) return "equipment";
  if (text.includes("tree") || text.includes("prun") || text.includes("nutrient") || text.includes("treatment") || text.includes("aftercare")) return "nursery";
  if (text.includes("relocation") || text.includes("install")) return "relocation";
  return "crew";
}

function scheduleTaskCategory(task: ScheduleTaskRecord): OperatingCategory {
  const text = normalized([task.activityType, task.task, task.jobStage, task.loadStatus, task.equipment, task.truck, task.trailer].filter(Boolean).join(" "));
  if (text.includes("freight") || text.includes("load") || text.includes("truck") || text.includes("trailer")) return "freight";
  if (text.includes("equipment") || text.includes("implement") || text.includes("service")) return "equipment";
  if (text.includes("tree") || text.includes("prun") || text.includes("nutrient") || text.includes("treatment")) return "nursery";
  if (text.includes("relocation") || text.includes("install") || text.includes("site")) return "relocation";
  return "crew";
}

function addReadinessIssues(event: OperatingCalendarEvent): OperatingCalendarEvent {
  const issues = new Set(event.readinessIssues);
  const status = normalized(event.status);

  if (status.includes("blocked") || status.includes("delayed") || status.includes("hold")) issues.add("Status needs review");
  if ((event.category === "crew" || event.category === "relocation" || event.category === "nursery") && !clean(event.assignee)) issues.add("Missing crew");
  if (event.category === "freight") {
    const hasDriver = event.resources.some((item) => item.kind === "driver");
    const hasTruck = event.resources.some((item) => item.kind === "truck");
    const hasTrailer = event.resources.some((item) => item.kind === "trailer");
    if (!hasDriver) issues.add("Missing driver");
    if (!hasTruck) issues.add("Missing truck");
    if (!hasTrailer) issues.add("Missing trailer");
  }
  if (event.category === "equipment" && event.sourceType === "workOrder" && !event.resources.some((item) => item.kind === "equipment")) issues.add("Missing equipment");
  if (!clean(event.location) && event.sourceType !== "treeLifecycle") issues.add("Missing location");

  return { ...event, readinessIssues: Array.from(issues) };
}

function calendarEvent(event: Omit<OperatingCalendarEvent, "dateIso" | "endDateIso" | "durationDays">, startDateIso: string, endDateIso?: string): OperatingCalendarEvent {
  return addReadinessIssues({
    ...event,
    ...dateRange(startDateIso, endDateIso),
  });
}

function buildJobEvents(jobs: JobRecord[]): OperatingCalendarEvent[] {
  return jobs.flatMap((job) => {
    const dateIso = firstDate(job.startDate, job.date, job.scheduledDate);
    if (!dateIso) return [];
    const endDateIso = firstDate(job.endDate, job.scheduledEndDate);
    const assignee = firstText(job.crew, job.pm);
    return [calendarEvent({
      id: `job-${firstText(job.id, job.jobId, job.projectId, job.title)}`,
      sourceType: "job",
      category: "relocation",
      timeLabel: firstText(job.time, "Scheduled"),
      title: firstText(job.title, job.projectName, job.clientName, job.client, "Scheduled job"),
      detail: [job.clientName || job.client, job.projectName, job.location].filter(Boolean).join(" - "),
      status: firstText(job.status, "Scheduled"),
      clientName: firstText(job.clientName, job.client),
      projectName: firstText(job.projectName, job.title),
      assignee,
      location: clean(job.location),
      drawerType: "job",
      recordId: firstText(job.id, job.jobId, job.projectId),
      readinessIssues: [],
      conflicts: [],
      resources: resourceList(resource("crew", job.crew)),
    }, dateIso, endDateIso)];
  });
}

function buildLoadEvents(loads: LoadRecord[]): OperatingCalendarEvent[] {
  return loads.flatMap((load) => {
    const dateIso = firstDate(load.date, load.pickupDate, load.deliveryDate);
    if (!dateIso) return [];
    const endDateIso = firstDate(load.deliveryDate);
    return [calendarEvent({
      id: `freight-${firstText(load.id, load.loadNumber, load.title)}`,
      sourceType: "freight",
      category: "freight",
      timeLabel: firstText(load.time, load.eta, "Scheduled"),
      title: firstText(load.title, load.loadNumber, "Scheduled freight"),
      detail: [load.driver, load.truck, load.trailer, load.origin, load.delivery || load.destination].filter(Boolean).join(" - "),
      status: firstText(load.status, "Scheduled"),
      clientName: clean(load.clientName),
      projectName: clean(load.projectName),
      assignee: clean(load.driver),
      location: firstText(load.origin, load.delivery, load.destination),
      drawerType: "freight",
      recordId: firstText(load.id, load.loadNumber, load.title),
      readinessIssues: [],
      conflicts: [],
      resources: resourceList(resource("driver", load.driver), resource("truck", load.truck), resource("trailer", load.trailer)),
    }, dateIso, endDateIso)];
  });
}

function buildWorkOrderEvents(workOrders: WorkOrderRecord[]): OperatingCalendarEvent[] {
  return workOrders.flatMap((workOrder) => {
    const dateIso = firstDate(workOrder.startDate, workOrder.scheduledDate, workOrder.dueDate, workOrder.completedDate);
    if (!dateIso) return [];
    const endDateIso = firstDate(workOrder.endDate, workOrder.dueDate, workOrder.completedDate);
    const assignee = firstText(workOrder.crewLeadName, ...(workOrder.assignedCrewNames || []));
    const category = workOrderCategory(workOrder);
    return [calendarEvent({
      id: `workOrder-${firstText(workOrder.id, workOrder.jobId, workOrder.title)}`,
      sourceType: "workOrder",
      category,
      timeLabel: firstText(workOrder.time, "Scheduled"),
      title: firstText(workOrder.title, workOrder.taskType, "Work order"),
      detail: [workOrder.clientName, workOrder.projectName, workOrder.taskType].filter(Boolean).join(" - "),
      status: firstText(workOrder.status, "Scheduled"),
      clientName: clean(workOrder.clientName),
      projectName: clean(workOrder.projectName),
      assignee,
      location: firstText(workOrder.siteArea, workOrder.origin, workOrder.destination),
      drawerType: "job",
      recordId: firstText(workOrder.jobId, workOrder.projectId, workOrder.id),
      readinessIssues: [],
      conflicts: [],
      resources: resourceList(
        ...((workOrder.assignedCrewNames || []).map((name) => resource("crew", name))),
        ...((workOrder.equipmentNames || []).map((name) => resource("equipment", name))),
        ...((workOrder.truckNames || []).map((name) => resource("truck", name))),
        ...((workOrder.trailerNames || []).map((name) => resource("trailer", name))),
      ),
    }, dateIso, endDateIso)];
  });
}

function buildScheduleTaskEvents(scheduleTasks: ScheduleTaskRecord[]): OperatingCalendarEvent[] {
  return scheduleTasks.flatMap((task) => {
    const dateIso = firstDate(task.startDate, task.endDate, task.date);
    if (!dateIso) return [];
    const endDateIso = firstDate(task.endDate);
    const category = scheduleTaskCategory(task);
    return [calendarEvent({
      id: `scheduleTask-${firstText(task.id, task.jobScheduleId, task.title, task.task)}`,
      sourceType: "scheduleTask",
      category,
      timeLabel: firstText(task.time, task.jobStage, task.loadStatus, "Scheduled"),
      title: firstText(task.task, task.title, task.activityType, "Scheduled task"),
      detail: [task.clientCompany, task.locationName, task.assignee].filter(Boolean).join(" - "),
      status: firstText(task.status, task.loadStatus, task.jobStage, "Scheduled"),
      clientName: clean(task.clientCompany),
      projectName: clean(task.projectName),
      assignee: clean(task.assignee),
      location: firstText(task.locationName, task.mainAddress),
      drawerType: "schedule",
      recordId: firstText(task.id, task.jobScheduleId),
      readinessIssues: [],
      conflicts: [],
      resources: resourceList(resource("crew", task.assignee), resource("truck", task.truck), resource("trailer", task.trailer), resource("equipment", task.equipment)),
    }, dateIso, endDateIso)];
  });
}

function buildEquipmentEvents(equipment: EquipmentRecord[]): OperatingCalendarEvent[] {
  return equipment.flatMap((item) => {
    const dateIso = firstDate(item.nextServiceDue, item.serviceDueDate);
    if (!dateIso) return [];
    const title = firstText(item.name, item.asset, item.model, item.id, "Equipment");
    return [calendarEvent({
      id: `equipment-${firstText(item.id, item.assetId, title)}`,
      sourceType: "equipment",
      category: "equipment",
      timeLabel: "Service due",
      title: `Service: ${title}`,
      detail: [item.serviceStatus, item.currentLocationName || item.location, item.operator].filter(Boolean).join(" - "),
      status: firstText(item.status, item.serviceStatus, "Service Due"),
      assignee: clean(item.operator || item.assignedCrewName),
      location: firstText(item.currentLocationName, item.location),
      drawerType: "equipment",
      recordId: firstText(item.id, item.assetId, item.name),
      readinessIssues: ["Service due"],
      conflicts: [],
      resources: resourceList(resource("equipment", title), resource("crew", item.operator || item.assignedCrewName)),
    }, dateIso)];
  });
}

function buildTreeLifecycleEvents(input: OperatingCalendarInput): OperatingCalendarEvent[] {
  return buildTreeLifecycleAlerts({
    trees: input.treeRelocationRecords || [],
    jobs: input.jobs || [],
    workOrders: input.workOrders || [],
    todayIso: input.todayIso,
  }).map((alert) => calendarEvent({
    id: `treeLifecycle-${alert.id}`,
    sourceType: "treeLifecycle",
    category: "nursery",
    timeLabel: "Action due",
    title: alert.title,
    detail: alert.detail,
    status: "Needs Review",
    projectName: alert.projectName,
    assignee: "",
    location: "",
    drawerType: alert.drawerType,
    recordId: alert.recordId,
    readinessIssues: ["Tree action due"],
    conflicts: [],
    resources: [],
  }, dateOnly(alert.dueDate) || dateOnly(input.todayIso) || new Date().toISOString().slice(0, 10)));
}

function applyConflicts(events: OperatingCalendarEvent[]): { events: OperatingCalendarEvent[]; conflicts: OperatingCalendarConflict[] } {
  const activeEvents = events.filter((event) => !isInactive(event.status));
  const grouped = new Map<string, OperatingCalendarEvent[]>();

  activeEvents.forEach((event) => {
    for (let dateIsoValue = event.dateIso; dateIsoValue <= event.endDateIso; dateIsoValue = addDaysIso(dateIsoValue, 1)) {
      event.resources.forEach((item) => {
        const key = `${dateIsoValue}|${item.key}`;
        grouped.set(key, [...(grouped.get(key) || []), event]);
      });
    }
  });

  const conflicts: OperatingCalendarConflict[] = [];
  const eventConflictMap = new Map<string, string[]>();

  grouped.forEach((items, key) => {
    const uniqueItems = Array.from(new Map(items.map((item) => [item.id, item])).values());
    if (uniqueItems.length < 2) return;
    const [dateIso, resourceKey] = key.split("|", 2);
    const resourceRef = uniqueItems.flatMap((item) => item.resources).find((item) => item.key === resourceKey);
    if (!resourceRef) return;
    const conflict = {
      id: `conflict-${dateIso}-${resourceRef.key.replace(/[^a-z0-9]+/gi, "-")}`,
      dateIso,
      resourceLabel: resourceRef.label,
      resourceKind: resourceRef.kind,
      eventTitles: uniqueItems.map((item) => item.title),
    };
    conflicts.push(conflict);
    uniqueItems.forEach((item) => {
      eventConflictMap.set(item.id, [...(eventConflictMap.get(item.id) || []), `${resourceRef.label} double-booked`]);
    });
  });

  return {
    conflicts: conflicts.sort((left, right) => left.dateIso.localeCompare(right.dateIso) || left.resourceLabel.localeCompare(right.resourceLabel)),
    events: events.map((event) => ({ ...event, conflicts: eventConflictMap.get(event.id) || [] })),
  };
}

function buildTomorrowReadiness(events: OperatingCalendarEvent[], conflicts: OperatingCalendarConflict[], tomorrowIso: string): TomorrowReadinessSummary {
  const tomorrowEvents = events.filter((event) => eventOccursOn(event, tomorrowIso));
  const tomorrowConflictCount = conflicts.filter((conflict) => conflict.dateIso === tomorrowIso).length;
  const hasIssue = (event: OperatingCalendarEvent, issue: string) => event.readinessIssues.some((item) => item.toLowerCase().includes(issue.toLowerCase()));

  return {
    total: tomorrowEvents.length,
    ready: tomorrowEvents.filter((event) => event.readinessIssues.length === 0 && event.conflicts.length === 0).length,
    needsReview: tomorrowEvents.filter((event) => event.readinessIssues.length > 0 || event.conflicts.length > 0).length,
    missingCrew: tomorrowEvents.filter((event) => hasIssue(event, "missing crew") || hasIssue(event, "missing driver")).length,
    missingEquipment: tomorrowEvents.filter((event) => hasIssue(event, "missing equipment") || hasIssue(event, "missing truck") || hasIssue(event, "missing trailer")).length,
    missingFreight: tomorrowEvents.filter((event) => event.category === "freight" && event.readinessIssues.length > 0).length,
    missingLocation: tomorrowEvents.filter((event) => hasIssue(event, "missing location")).length,
    conflicts: tomorrowConflictCount,
  };
}

export function buildOperatingCalendar(input: OperatingCalendarInput): OperatingCalendar {
  const todayIso = dateOnly(input.todayIso) || new Date().toISOString().slice(0, 10);
  const tomorrowIso = addDaysIso(todayIso, 1);
  const rawEvents = [
    ...buildJobEvents(input.jobs || []),
    ...buildLoadEvents(input.loads || []),
    ...buildWorkOrderEvents(input.workOrders || []),
    ...buildScheduleTaskEvents(input.scheduleTasks || []),
    ...buildEquipmentEvents(input.equipment || []),
    ...buildTreeLifecycleEvents({ ...input, todayIso }),
  ].sort((left, right) => (
    left.dateIso.localeCompare(right.dateIso)
    || left.timeLabel.localeCompare(right.timeLabel)
    || left.title.localeCompare(right.title)
  ));

  const { events, conflicts } = applyConflicts(rawEvents);

  return {
    todayIso,
    tomorrowIso,
    events,
    conflicts,
    tomorrowReadiness: buildTomorrowReadiness(events, conflicts, tomorrowIso),
  };
}

export function eventsForCalendarView(events: OperatingCalendarEvent[], view: CalendarView, todayIso: string): OperatingCalendarEvent[] {
  const { startIso, endIso } = rangeForCalendarView(view, todayIso);
  return events.filter((event) => eventOverlapsRange(event, startIso, endIso));
}

export function buildCalendarGridDays(events: OperatingCalendarEvent[], view: CalendarGridView, focusIso: string, todayIso = focusIso): CalendarGridDay[] {
  const cleanFocus = dateOnly(focusIso) || dateOnly(todayIso) || new Date().toISOString().slice(0, 10);
  const cleanToday = dateOnly(todayIso) || cleanFocus;
  const { startIso, endIso, currentMonthPrefix } = calendarGridRange(view, cleanFocus);
  const days: CalendarGridDay[] = [];

  for (let dateIsoValue = startIso; dateIsoValue <= endIso; dateIsoValue = addDaysIso(dateIsoValue, 1)) {
    days.push({
      dateIso: dateIsoValue,
      isCurrentMonth: dateIsoValue.startsWith(currentMonthPrefix),
      isToday: dateIsoValue === cleanToday,
      events: events.filter((event) => eventOccursOn(event, dateIsoValue)),
    });
  }

  return days;
}
