export const personnelRoles = [
  "Admin",
  "Owner",
  "Crew Leader",
  "Crew Member",
  "Sales",
  "Irrigation Tech",
  "Driver",
  "Mechanic",
  "Project Manager",
  "Operations Coordinator",
  "Contractor",
] as const;

export type PersonnelRole = (typeof personnelRoles)[number];

export const ADD_NEW_PERSONNEL_ROLE_VALUE = "__add_new_personnel_role__";

export const authorizationLevels = [
  { value: "full", label: "Full Access" },
  { value: "manager", label: "Manager Access" },
  { value: "field", label: "Field Access" },
  { value: "external", label: "External / Contractor Access" },
] as const;

export type AuthorizationLevel = (typeof authorizationLevels)[number]["value"];

export const authorizationLevelLabels: Record<AuthorizationLevel, string> = {
  full: "Full Access",
  manager: "Manager Access",
  field: "Field Access",
  external: "External / Contractor Access",
};

export const roleAuthorizations: Record<PersonnelRole, AuthorizationLevel> = {
  Admin: "full",
  Owner: "full",
  "Crew Leader": "field",
  "Crew Member": "field",
  Sales: "manager",
  "Irrigation Tech": "field",
  Driver: "field",
  Mechanic: "field",
  "Project Manager": "manager",
  "Operations Coordinator": "manager",
  Contractor: "external",
};

export const fullAccessRoles = personnelRoles.filter((role) => roleAuthorizations[role] === "full");

export const authorizedWorkspaceUsers = [
  { name: "Buck Thornton", email: "Office@jdtnurseries.com", role: "Owner" },
  { name: "Jeremy Thornton", email: "jeremy@jdtnurseries.com", role: "Owner" },
] as const;

export const personnelRoleFilters = [
  { value: "All", label: "All Roles" },
  ...personnelRoles.map((role) => ({ value: role, label: role })),
] as const;

export const personnelRoleSelectOptions = [
  ...personnelRoles.map((role) => ({ value: role, label: role })),
  { value: ADD_NEW_PERSONNEL_ROLE_VALUE, label: "+ Add New Role / Function" },
] as const;

const roleAliases: Record<string, PersonnelRole> = {
  "crew lead": "Crew Leader",
  "field hand": "Crew Member",
  "heavy haul driver": "Driver",
  "lead mechanic": "Mechanic",
  manager: "Project Manager",
  pms: "Project Manager",
};

export function normalizePersonnelRole(role?: string): PersonnelRole | "" {
  const normalized = role?.trim().toLowerCase() ?? "";
  if (!normalized) return "";

  const directMatch = personnelRoles.find((candidate) => candidate.toLowerCase() === normalized);
  return directMatch ?? roleAliases[normalized] ?? "";
}

export function getPersonnelRoleDisplayName(role?: string): string {
  return normalizePersonnelRole(role) || role?.trim() || "Unassigned";
}

export function getRoleAuthorization(role?: string, requestedLevel?: string): AuthorizationLevel {
  const normalizedRole = normalizePersonnelRole(role);
  if (normalizedRole) return roleAuthorizations[normalizedRole];

  const requested = authorizationLevels.find((level) => level.value === requestedLevel)?.value;
  if (requested && requested !== "full") return requested;

  return "field";
}

export function isFullAccessRole(role?: string): boolean {
  const normalizedRole = normalizePersonnelRole(role);
  return fullAccessRoles.includes(normalizedRole as PersonnelRole);
}

function normalizeEmail(email?: string): string {
  return email?.trim().toLowerCase() ?? "";
}

export function getAuthorizedWorkspaceUser(email?: string) {
  const normalizedEmail = normalizeEmail(email);
  return authorizedWorkspaceUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
}

export function getCrewAllocationType(role?: string): string {
  const normalizedRole = normalizePersonnelRole(role);

  switch (normalizedRole) {
    case "Admin":
    case "Owner":
      return "Full Access";
    case "Crew Leader":
      return "Crew Leadership";
    case "Crew Member":
      return "Field Crew";
    case "Sales":
      return "Sales";
    case "Irrigation Tech":
      return "Irrigation";
    case "Driver":
      return "Freight / Transport";
    case "Mechanic":
      return "Maintenance / Equipment";
    case "Project Manager":
      return "Project Management";
    case "Operations Coordinator":
      return "Operations Coordination";
    case "Contractor":
      return "Contractor / Vendor";
    default:
      return "Field Crew";
  }
}

export function roleMatchesFilter(role: string | undefined, filter: string): boolean {
  if (filter === "All") return true;
  return getPersonnelRoleDisplayName(role).toLowerCase() === filter.toLowerCase();
}

export function buildPersonnelRoleFilters(crews: { role?: string }[] = []) {
  const customRoles = crews
    .map((crew) => getPersonnelRoleDisplayName(crew.role))
    .filter((role) => role !== "Unassigned" && !normalizePersonnelRole(role));

  const customRoleMap = new Map<string, string>();
  for (const role of customRoles) {
    const key = role.toLowerCase();
    if (!customRoleMap.has(key)) customRoleMap.set(key, role);
  }

  const uniqueCustomRoles = Array.from(customRoleMap.values()).sort((a, b) => a.localeCompare(b));

  return [
    ...personnelRoleFilters,
    ...uniqueCustomRoles.map((role) => ({ value: role, label: role })),
  ];
}
