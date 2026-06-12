import type { CommandRecord, CrewRecord, FieldUpdateRecord, JobRecord, LoadRecord, WorkOrderRecord } from "./records";

export type CloseoutAssignmentType = "load" | "workOrder" | "job";

export type CloseoutPrompt = {
  id: string;
  type: CloseoutAssignmentType;
  title: string;
  projectName?: string;
  jobName?: string;
  scheduleLabel: string;
  locationLabel: string;
  statusLabel: string;
  closeoutStatus: "Needs Closeout" | "Submitted";
  recommendedAction: string;
  treeOrMaterialLabels: string[];
  source: LoadRecord | WorkOrderRecord | JobRecord;
};

export type DailyCloseoutInput = {
  crew: CrewRecord;
  assignment: {
    id: string;
    type: CloseoutAssignmentType;
    title: string;
    source: LoadRecord | WorkOrderRecord | JobRecord;
  };
  closeoutDate?: string;
  workCompleted?: string;
  treeTagText?: string;
  locationDetail?: string;
  issueSummary?: string;
  tomorrowPlan?: string;
  photoNotes?: string;
  proofAttachmentText?: string;
  userEmail?: string | null;
};

export type FieldCloseoutReviewStatus = "Needs Review" | "Needs Proof" | "Ready for Review";

export type FieldCloseoutReviewItem = {
  id: string;
  title: string;
  crewName: string;
  projectName: string;
  reviewStatus: FieldCloseoutReviewStatus;
  severity: "High" | "Medium" | "Low";
  proofCount: number;
  detail: string;
  recommendedAction: string;
  targetTab: "crewView";
  drawerType: "fieldUpdate";
  recordId: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function firstText(...values: unknown[]) {
  return values.map(clean).find(Boolean) || "";
}

function displayName(member: CrewRecord) {
  return member.name || member.email || member.id || "Crew member";
}

export function parseProofLinks(text: string | undefined) {
  const matches = clean(text).match(/https?:\/\/[^\s,]+/g) || [];
  const seen = new Set<string>();

  return matches
    .map((url) => url.replace(/[.)\]}]+$/, ""))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((url, index) => ({
      label: `Proof ${index + 1}`,
      url,
    }));
}

export function recordMatchesCrew(record: Record<string, unknown>, member: CrewRecord) {
  const memberId = normalize(member.id || member.email || member.name);
  const memberName = normalize(member.name);
  const memberEmail = normalize(member.email);
  const scalarValues = [
    record.driver,
    record.assignee,
    record.crew,
    record.pm,
    record.operator,
    record.crewLeadName,
    record.assignedCrewName,
    record.assignedDriverName,
  ].map(normalize);
  const arrayValues = [
    ...(Array.isArray(record.assignedCrewIds) ? record.assignedCrewIds : []),
    ...(Array.isArray(record.assignedCrewNames) ? record.assignedCrewNames : []),
  ].map(normalize);
  const allValues = [...scalarValues, ...arrayValues];

  return allValues.some((value) => value && (value === memberId || value === memberName || value === memberEmail));
}

function dateForRecord(record: LoadRecord | WorkOrderRecord | JobRecord) {
  return firstText(
    (record as LoadRecord).date,
    (record as LoadRecord).pickupDate,
    (record as LoadRecord).deliveryDate,
    (record as WorkOrderRecord).startDate,
    (record as WorkOrderRecord).scheduledDate,
    (record as WorkOrderRecord).dueDate,
    (record as JobRecord).startDate,
    (record as JobRecord).scheduledDate,
    (record as JobRecord).date,
  );
}

function endDateForRecord(record: LoadRecord | WorkOrderRecord | JobRecord) {
  return firstText(
    (record as WorkOrderRecord).endDate,
    (record as WorkOrderRecord).dueDate,
    (record as JobRecord).endDate,
    (record as JobRecord).scheduledEndDate,
    (record as LoadRecord).deliveryDate,
  );
}

function recordIsRelevantForDate(record: LoadRecord | WorkOrderRecord | JobRecord, dateIso?: string) {
  if (!dateIso) return true;
  const start = dateForRecord(record);
  const end = endDateForRecord(record);
  if (!start) return true;
  if (end) return start <= dateIso && end >= dateIso;
  return start === dateIso;
}

function scheduleLabel(record: LoadRecord | WorkOrderRecord | JobRecord) {
  const start = dateForRecord(record);
  const end = endDateForRecord(record);
  if (start && end && start !== end) return `${start} -> ${end}`;
  return start || "No schedule date";
}

function locationLabel(record: LoadRecord | WorkOrderRecord | JobRecord) {
  const load = record as LoadRecord;
  const workOrder = record as WorkOrderRecord;
  const job = record as JobRecord;
  const origin = clean(load.origin || workOrder.origin);
  const destination = clean(load.delivery || load.destination || workOrder.destination);
  if (origin && destination) return `${origin} -> ${destination}`;
  return firstText(
    load.delivery,
    load.destination,
    workOrder.destination,
    workOrder.siteArea,
    workOrder.origin,
    job.location,
    job.loadUnloadPin,
    job.truckAccessAddress,
    job.crewAccessAddress,
  ) || "No location entered";
}

function treeOrMaterialLabels(record: LoadRecord | WorkOrderRecord | JobRecord) {
  const load = record as LoadRecord;
  const workOrder = record as WorkOrderRecord;
  const treeLabels = (workOrder.treeNames?.length ? workOrder.treeNames : workOrder.treeIds) || [];
  return [
    ...treeLabels,
    ...(workOrder.inventoryItemIds || []),
    ...(load.equipmentNames || []),
    ...(load.routeSteps || []).flatMap((step) => [step.equipmentName, step.materialName, step.trailerName]),
  ].map(clean).filter(Boolean);
}

function hasCloseout(update: FieldUpdateRecord, promptType: CloseoutAssignmentType, recordId: string) {
  const relatedMatches = normalize(update.relatedRecordId) === normalize(recordId)
    && normalize(update.relatedRecordType || promptType) === normalize(promptType);
  const genericCloseout = normalize(update.updateType).includes("closeout") || normalize(update.fieldStatus).includes("closeout");
  return relatedMatches && genericCloseout;
}

function promptForRecord(type: CloseoutAssignmentType, record: LoadRecord | WorkOrderRecord | JobRecord, fieldUpdates: FieldUpdateRecord[]): CloseoutPrompt {
  const id = record.id || record.title || record.name || type;
  const title = record.title || record.name || (type === "load" ? (record as LoadRecord).loadNumber : "") || "Field assignment";
  const closeoutSubmitted = fieldUpdates.some((update) => hasCloseout(update, type, id));

  return {
    id,
    type,
    title,
    projectName: record.projectName,
    jobName: record.jobName,
    scheduleLabel: scheduleLabel(record),
    locationLabel: locationLabel(record),
    statusLabel: record.status || "Assigned",
    closeoutStatus: closeoutSubmitted ? "Submitted" : "Needs Closeout",
    recommendedAction: closeoutSubmitted
      ? "Office can review this closeout in the field update history."
      : "Submit daily closeout before the office reviews tomorrow readiness.",
    treeOrMaterialLabels: treeOrMaterialLabels(record),
    source: record,
  };
}

export function buildCrewCloseoutPrompts(input: {
  crew?: CrewRecord;
  loads?: LoadRecord[];
  workOrders?: WorkOrderRecord[];
  jobs?: JobRecord[];
  fieldUpdates?: FieldUpdateRecord[];
  dateIso?: string;
}): CloseoutPrompt[] {
  const { crew, loads = [], workOrders = [], jobs = [], fieldUpdates = [], dateIso } = input;
  if (!crew) return [];

  const promptRecords: ReadonlyArray<readonly [CloseoutAssignmentType, LoadRecord | WorkOrderRecord | JobRecord]> = [
    ...loads.filter((load) => recordMatchesCrew(load, crew) && recordIsRelevantForDate(load, dateIso)).map((load) => ["load", load] as const),
    ...workOrders.filter((workOrder) => recordMatchesCrew(workOrder, crew) && recordIsRelevantForDate(workOrder, dateIso)).map((workOrder) => ["workOrder", workOrder] as const),
    ...jobs.filter((job) => recordMatchesCrew(job, crew) && recordIsRelevantForDate(job, dateIso)).map((job) => ["job", job] as const),
  ];

  return promptRecords.map(([type, record]) => promptForRecord(type, record, fieldUpdates));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function notesFromCloseout(input: DailyCloseoutInput) {
  const proofLinks = parseProofLinks(input.proofAttachmentText);
  return [
    ["Work completed", input.workCompleted],
    ["Tree tags/materials", input.treeTagText],
    ["GPS/location", input.locationDetail],
    ["Issues/delays", input.issueSummary],
    ["Tomorrow", input.tomorrowPlan],
    ["Proof links", proofLinks.map((link) => link.url).join(", ")],
    ["Photos", input.photoNotes],
  ]
    .filter(([, value]) => clean(value))
    .map(([label, value]) => `${label}: ${clean(value)}`)
    .join("\n");
}

export function buildDailyCloseoutUpdate(input: DailyCloseoutInput): Partial<FieldUpdateRecord> {
  const crewName = displayName(input.crew);
  const assignment = input.assignment;
  const source = assignment.source as CommandRecord;
  const hasIssue = Boolean(clean(input.issueSummary));
  const proofLinks = parseProofLinks(input.proofAttachmentText);

  return {
    title: `Daily Closeout: ${assignment.title}`,
    crewId: input.crew.id || input.crew.email || input.crew.name,
    crewName,
    crewRole: input.crew.role,
    userEmail: input.crew.email || input.userEmail || undefined,
    relatedRecordType: assignment.type,
    relatedRecordId: assignment.id,
    relatedTitle: assignment.title,
    clientId: source.clientId,
    clientName: source.clientName,
    projectId: source.projectId,
    projectName: source.projectName,
    jobId: source.jobId,
    jobName: source.jobName,
    updateType: "Daily Closeout",
    fieldStatus: "Closeout Submitted",
    closeoutDate: input.closeoutDate || todayIso(),
    workCompleted: clean(input.workCompleted),
    treeTagText: clean(input.treeTagText),
    locationDetail: clean(input.locationDetail),
    issueSummary: clean(input.issueSummary),
    tomorrowPlan: clean(input.tomorrowPlan),
    photoNotes: clean(input.photoNotes),
    proofAttachmentText: clean(input.proofAttachmentText),
    proofLinks,
    notes: notesFromCloseout(input),
    needsAdminReview: hasIssue,
    adminReviewStatus: hasIssue ? "Needs Review" : "Ready for Review",
    status: hasIssue ? "Needs Review" : "Submitted",
  };
}

function isDailyCloseout(update: FieldUpdateRecord) {
  return normalize(update.updateType).includes("closeout")
    || normalize(update.fieldStatus).includes("closeout")
    || normalize(update.title).includes("daily closeout");
}

function closeoutHasIssue(update: FieldUpdateRecord) {
  return update.needsAdminReview === true
    || Boolean(clean(update.issueSummary))
    || normalize(update.status).includes("needs review")
    || normalize(update.adminReviewStatus).includes("needs review");
}

function reviewStatusForCloseout(update: FieldUpdateRecord): FieldCloseoutReviewStatus {
  if (closeoutHasIssue(update)) return "Needs Review";
  const proofCount = (update.proofLinks || []).length + (update.proofDocumentIds || []).length;
  if (proofCount === 0) return "Needs Proof";
  return "Ready for Review";
}

function reviewRank(status: FieldCloseoutReviewStatus) {
  if (status === "Needs Review") return 0;
  if (status === "Needs Proof") return 1;
  return 2;
}

function recommendedActionForCloseout(status: FieldCloseoutReviewStatus) {
  if (status === "Needs Review") return "Review the reported issue and decide the follow-up before tomorrow planning.";
  if (status === "Needs Proof") return "Ask the crew to attach photo, BOL, POD, or job proof before filing this closeout.";
  return "Review and file this closeout into the project history.";
}

export function buildFieldCloseoutReviewQueue(fieldUpdates: FieldUpdateRecord[] = [], limit = 8): FieldCloseoutReviewItem[] {
  return fieldUpdates
    .filter(isDailyCloseout)
    .map((update) => {
      const reviewStatus = reviewStatusForCloseout(update);
      const proofCount = (update.proofLinks || []).length + (update.proofDocumentIds || []).length;
      const recordId = update.id || update.relatedRecordId || update.title || "field-update";
      const severity: FieldCloseoutReviewItem["severity"] = reviewStatus === "Needs Review" ? "High" : reviewStatus === "Needs Proof" ? "Medium" : "Low";

      return {
        id: recordId,
        title: update.relatedTitle || update.title || "Daily closeout",
        crewName: update.crewName || update.createdBy || "Crew user",
        projectName: update.projectName || update.jobName || "Unlinked project",
        reviewStatus,
        severity,
        proofCount,
        detail: [update.notes, update.issueSummary, update.locationDetail, update.closeoutDate].map(clean).filter(Boolean).join(" - ") || "Closeout submitted for office review.",
        recommendedAction: recommendedActionForCloseout(reviewStatus),
        targetTab: "crewView" as const,
        drawerType: "fieldUpdate" as const,
        recordId,
      };
    })
    .sort((a, b) => reviewRank(a.reviewStatus) - reviewRank(b.reviewStatus) || a.title.localeCompare(b.title))
    .slice(0, limit);
}
