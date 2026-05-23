import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fullAccessRoles, getCrewAllocationType, personnelRoleFilters, personnelRoles } from "./personnelRoles";

describe("personnel role configuration", () => {
  it("uses one shared ordered role list across profile forms and filters", () => {
    assert.deepEqual(personnelRoles, [
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
    ]);

    assert.deepEqual(personnelRoleFilters.map((filter) => filter.value), ["All", ...personnelRoles]);
  });

  it("keeps full-control access limited to Admin and Owner", () => {
    assert.deepEqual(fullAccessRoles, ["Admin", "Owner"]);
  });

  it("maps roles to useful assignment group labels", () => {
    assert.equal(getCrewAllocationType("Driver"), "Freight / Transport");
    assert.equal(getCrewAllocationType("Mechanic"), "Maintenance / Equipment");
    assert.equal(getCrewAllocationType("Contractor"), "Contractor / Vendor");
    assert.equal(getCrewAllocationType("Operations Coordinator"), "Operations Coordination");
    assert.equal(getCrewAllocationType("Crew Member"), "Field Crew");
  });
});
