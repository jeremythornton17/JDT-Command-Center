export type RelationshipInput = {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  client?: unknown;
  clientId?: unknown;
  clientName?: unknown;
  project?: unknown;
  projectId?: unknown;
  projectName?: unknown;
  job?: unknown;
  jobId?: unknown;
  jobName?: unknown;
  task?: unknown;
  jobScheduleId?: unknown;
  projectsId?: unknown;
  treeId?: unknown;
  treeAssetId?: unknown;
  tag?: unknown;
  treeTag?: unknown;
};

export type RelationshipFields = {
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  jobId?: string;
  jobName?: string;
};

export function slugifyRelationshipPart(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clientIdFromName(clientName: unknown): string {
  const slug = slugifyRelationshipPart(clientName);
  return slug ? `client-${slug}` : "";
}

export function projectIdFromName(clientName: unknown, projectName: unknown): string {
  const parts = [clientName, projectName].map(slugifyRelationshipPart).filter(Boolean);
  return parts.length ? `project-${parts.join("-")}` : "";
}

export function jobIdFromName(projectName: unknown, jobName: unknown): string {
  const parts = [projectName, jobName].map(slugifyRelationshipPart).filter(Boolean);
  return parts.length ? `job-${parts.join("-")}` : "";
}

export function workOrderIdFromName(jobIdOrName: unknown, workOrderName: unknown): string {
  const parts = [jobIdOrName, workOrderName].map(slugifyRelationshipPart).filter(Boolean);
  return parts.length ? `work-order-${parts.join("-")}` : "";
}

export function clientOperatingCodeFromName(clientName: unknown): string {
  const words = cleanString(clientName)
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .match(/[a-z0-9]+/gi) || [];

  if (words.length > 1) return words.map((word) => word[0]).join("").toUpperCase();

  const compact = words[0] || cleanString(clientName).replace(/[^a-z0-9]/gi, "");
  return compact ? compact.slice(0, 4).toUpperCase() : "PROJECT";
}

export function operatingDateCode(dateLike?: unknown): string {
  const raw = cleanString(dateLike);
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return `${isoMatch[2].padStart(2, "0")}${isoMatch[3].padStart(2, "0")}${isoMatch[1].slice(-2)}`;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) return `${slashMatch[1].padStart(2, "0")}${slashMatch[2].padStart(2, "0")}${slashMatch[3].slice(-2)}`;

  const parsed = dateLike instanceof Date
    ? dateLike
    : raw
      ? new Date(raw)
      : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
}

export function projectOperatingIdFromParts(clientName: unknown, createdDate?: unknown): string {
  return `${clientOperatingCodeFromName(clientName)}-${operatingDateCode(createdDate)}`;
}

function relationshipWords(value: unknown): string[] {
  return slugifyRelationshipPart(value).split("-").filter(Boolean);
}

function projectSuffixCodeFromName(clientName: unknown, projectName: unknown): string {
  const clientWords = new Set(relationshipWords(clientName));
  const clientInitials = relationshipWords(clientName).map((word) => word[0]).join("");
  if (clientInitials) clientWords.add(clientInitials);
  if (clientWords.has("golf") && clientWords.has("club")) clientWords.add("gc");
  if (clientWords.has("country") && clientWords.has("club")) clientWords.add("cc");

  const projectWords = relationshipWords(projectName);
  const specificWords = projectWords.filter((word) => !clientWords.has(word));
  const suffixWords = specificWords.length ? specificWords : projectWords;
  return suffixWords.slice(0, 3).map((word) => word.toUpperCase()).join("-");
}

function projectOperatingIdFromRecord(record: RelationshipInput): string {
  return cleanString(record.projectId) || cleanString(record.projectsId) || cleanString(record.id);
}

function projectNameFromRecord(record: RelationshipInput): string {
  return cleanString(record.projectName) || cleanString(record.title) || cleanString(record.name) || cleanString(record.project);
}

export function uniqueProjectOperatingIdFromParts({
  clientName,
  projectName,
  createdDate,
  existingProjects = [],
}: {
  clientName?: unknown;
  projectName?: unknown;
  createdDate?: unknown;
  existingProjects?: RelationshipInput[];
}): string {
  const baseId = projectOperatingIdFromParts(clientName, createdDate);
  const requestedProjectName = normalizeName(projectName);
  const existingIds = new Set(existingProjects.map(projectOperatingIdFromRecord).filter(Boolean));

  const baseRecord = existingProjects.find((project) => projectOperatingIdFromRecord(project) === baseId);
  if (!baseRecord) return baseId;

  const baseRecordName = normalizeName(projectNameFromRecord(baseRecord));
  if (requestedProjectName && baseRecordName === requestedProjectName) return baseId;

  const suffix = projectSuffixCodeFromName(clientName, projectName) || "PROJECT";
  let candidate = `${baseId}-${suffix}`;
  let sequence = 2;

  while (existingIds.has(candidate)) {
    const existing = existingProjects.find((project) => projectOperatingIdFromRecord(project) === candidate);
    if (requestedProjectName && normalizeName(projectNameFromRecord(existing || {})) === requestedProjectName) return candidate;
    candidate = `${baseId}-${suffix}-${String(sequence).padStart(2, "0")}`;
    sequence += 1;
  }

  return candidate;
}

function clientNameFromRecord(record: RelationshipInput): string {
  return cleanString(record.clientName) || cleanString(record.client) || cleanString(record.name) || cleanString(record.title);
}

export function resolveClientIdentityFromList(record: RelationshipInput, clients: RelationshipInput[] = []): RelationshipFields {
  const explicitClientId = cleanString(record.clientId);
  const requestedClientName = cleanString(record.clientName) || cleanString(record.client);
  const explicitMatch = explicitClientId
    ? clients.find((client) => cleanString(client.clientId) === explicitClientId || cleanString(client.id) === explicitClientId)
    : undefined;
  const nameMatch = requestedClientName
    ? clients.find((client) => normalizeName(clientNameFromRecord(client)) === normalizeName(requestedClientName))
    : undefined;
  const matched = explicitMatch || nameMatch;
  const clientName = matched ? clientNameFromRecord(matched) || requestedClientName : requestedClientName;
  const clientId = matched
    ? cleanString(matched.clientId) || cleanString(matched.id) || clientIdFromName(clientName)
    : explicitClientId || clientIdFromName(clientName);

  return compactRelationshipFields({
    clientId,
    clientName,
  });
}

export function assigneeInitialsFromName(name: unknown): string {
  const words = cleanString(name)
    .replace(/['’]/g, "")
    .match(/[a-z0-9]+/gi) || [];
  if (!words.length) return "";
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
}

export function jobPurposeCodeFromName(purpose: unknown): string {
  const normalized = slugifyRelationshipPart(purpose);
  const mapped: Record<string, string> = {
    "root-pruning": "ROOTPRUNE",
    "root-prune": "ROOTPRUNE",
    "tree-pruning": "ROOTPRUNE",
    "equipment": "EQUIP",
    "equipment-change": "EQUIP",
    "equipment-request": "EQUIP",
    "freight": "FREIGHT",
    "freight-support": "FREIGHT",
    "dispatch": "FREIGHT",
    "installation": "INSTALL",
    "install": "INSTALL",
    "relocation": "RELOCATE",
    "relocation-job": "RELOCATE",
    "field-work": "WORK",
    "general-task": "WORK",
  };
  if (mapped[normalized]) return mapped[normalized];

  const compact = normalized.replace(/-/g, "").toUpperCase();
  return compact ? compact.slice(0, 14) : "WORK";
}

export function operatingJobIdFromParts({
  projectId,
  projectName,
  purpose,
  assigneeName,
  date,
  sequence,
}: {
  projectId?: unknown;
  projectName?: unknown;
  purpose?: unknown;
  assigneeName?: unknown;
  date?: unknown;
  sequence?: unknown;
}): string {
  const projectCode = cleanString(projectId) || slugifyRelationshipPart(projectName).toUpperCase() || "PROJECT";
  const purposeCode = jobPurposeCodeFromName(purpose);
  const assigneeCode = assigneeInitialsFromName(assigneeName);
  const dateCode = operatingDateCode(date);
  const sequenceCode = String(Number(sequence) > 0 ? Number(sequence) : 1).padStart(2, "0");
  return [projectCode, purposeCode, assigneeCode, dateCode, sequenceCode].filter(Boolean).join("-");
}

export function normalizeProjectRelationship(record: RelationshipInput): RelationshipFields {
  const clientName = cleanString(record.clientName) || cleanString(record.client);
  const projectName = cleanString(record.projectName)
    || cleanString(record.project)
    || cleanString(record.title)
    || cleanString(record.name)
    || cleanString(record.jobScheduleId);

  return compactRelationshipFields({
    clientId: cleanString(record.clientId) || clientIdFromName(clientName),
    clientName,
    projectId: cleanString(record.projectId) || projectIdFromName(clientName, projectName),
    projectName,
  });
}

export function normalizeJobRelationship(record: RelationshipInput): RelationshipFields {
  const projectRelationship = normalizeProjectRelationship(record);
  const jobName = cleanString(record.jobName)
    || cleanString(record.job)
    || cleanString(record.task)
    || cleanString(record.title)
    || cleanString(record.name);

  return compactRelationshipFields({
    ...projectRelationship,
    jobId: cleanString(record.jobId) || jobIdFromName(projectRelationship.projectName, jobName),
    jobName,
  });
}

export function normalizeWorkOrderRelationship(record: RelationshipInput): RelationshipFields & { id?: string; title?: string } {
  const jobRelationship = normalizeJobRelationship(record);
  const title = cleanString(record.title) || cleanString(record.task) || cleanString(record.name) || cleanString(record.jobName);
  const jobAnchor = cleanString(jobRelationship.jobId) || cleanString(jobRelationship.jobName);

  return compactRelationshipFields({
    ...jobRelationship,
    id: cleanString(record.id) || workOrderIdFromName(jobAnchor, title),
    title,
  });
}

export function sameClient(client: RelationshipInput, record: RelationshipInput): boolean {
  const clientId = cleanString(client.clientId) || cleanString(client.id) || clientIdFromName(client.name || client.title);
  const recordClientId = cleanString(record.clientId) || clientIdFromName(record.clientName || record.client);
  if (clientId && recordClientId) return clientId === recordClientId;

  const clientName = normalizeName(client.clientName || client.name || client.title);
  const recordClientName = normalizeName(record.clientName || record.client || record.name || record.title);
  return Boolean(clientName && recordClientName && clientName === recordClientName);
}

export function sameProject(project: RelationshipInput, record: RelationshipInput): boolean {
  const projectId = cleanString(project.projectId) || cleanString(project.id) || projectIdFromName(project.clientName || project.client, project.projectName || project.name || project.title);
  const recordProjectId = cleanString(record.projectId) || projectIdFromName(record.clientName || record.client, record.projectName || record.project || record.jobScheduleId);
  if (projectId && recordProjectId) return projectId === recordProjectId;

  const projectName = normalizeName(project.projectName || project.name || project.title);
  const recordProjectName = normalizeName(record.projectName || record.project || record.jobScheduleId || record.title);
  return Boolean(projectName && recordProjectName && projectName === recordProjectName);
}

export function sameProjectTreeAsset(left: RelationshipInput, right: RelationshipInput): boolean {
  const leftTreeId = cleanString(left.treeId) || cleanString(left.id);
  const rightTreeId = cleanString(right.treeId) || cleanString(right.id);
  const leftTreeTag = treeAssetTag(left);
  const rightTreeTag = treeAssetTag(right);
  const sameTreeId = Boolean(leftTreeId && rightTreeId && leftTreeId === rightTreeId);
  const sameTag = Boolean(leftTreeTag && rightTreeTag && leftTreeTag === rightTreeTag);
  if (!sameTreeId && !sameTag) return false;

  const leftProjectId = cleanString(left.projectId) || cleanString(left.projectsId);
  const rightProjectId = cleanString(right.projectId) || cleanString(right.projectsId);
  if (leftProjectId || rightProjectId) return Boolean(leftProjectId && rightProjectId && leftProjectId === rightProjectId);

  const leftJobId = cleanString(left.jobId);
  const rightJobId = cleanString(right.jobId);
  if (leftJobId || rightJobId) return Boolean(leftJobId && rightJobId && leftJobId === rightJobId);

  return cleanString(left.id) === cleanString(right.id);
}

function treeAssetTag(record: RelationshipInput): string {
  return normalizeTreeAssetTag(
    cleanString(record.tag)
    || cleanString(record.treeTag)
    || lastTreeIdSegment(record.treeAssetId)
    || lastTreeIdSegment(record.treeId)
    || lastTreeIdSegment(record.id),
  );
}

function lastTreeIdSegment(value: unknown): string {
  const text = cleanString(value);
  if (!text) return "";
  const segments = text.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return segments[segments.length - 1] || "";
}

function normalizeTreeAssetTag(value: unknown): string {
  const normalized = cleanString(value).replace(/^#+/, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (/^\d+$/.test(normalized)) return normalized.replace(/^0+(?=\d)/, "");
  return normalized;
}

function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function normalizeName(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function compactRelationshipFields<T extends Record<string, string | undefined>>(fields: T): T {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => Boolean(value)),
  ) as T;
}
