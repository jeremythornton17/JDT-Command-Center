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

export const fullAccessRoles: PersonnelRole[] = ["Admin", "Owner"];

export const personnelRoleFilters = [
  { value: "All", label: "All Roles" },
  ...personnelRoles.map((role) => ({ value: role, label: role })),
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
  return normalizePersonnelRole(role) === filter;
}
