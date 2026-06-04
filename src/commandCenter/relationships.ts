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
  if (!leftTreeId || !rightTreeId || leftTreeId !== rightTreeId) return false;

  const leftProjectId = cleanString(left.projectId) || cleanString(left.projectsId);
  const rightProjectId = cleanString(right.projectId) || cleanString(right.projectsId);
  if (leftProjectId || rightProjectId) return Boolean(leftProjectId && rightProjectId && leftProjectId === rightProjectId);

  const leftJobId = cleanString(left.jobId);
  const rightJobId = cleanString(right.jobId);
  if (leftJobId || rightJobId) return Boolean(leftJobId && rightJobId && leftJobId === rightJobId);

  return cleanString(left.id) === cleanString(right.id);
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
