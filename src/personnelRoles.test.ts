import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADD_NEW_PERSONNEL_ROLE_VALUE,
  authorizedWorkspaceUsers,
  buildPersonnelRoleFilters,
  fullAccessRoles,
  getAuthorizedWorkspaceUser,
  getCrewAllocationType,
  getRoleAuthorization,
  personnelRoleFilters,
  personnelRoleSelectOptions,
  personnelRoles,
  roleAuthorizations,
  roleMatchesFilter,
} from "./personnelRoles";

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

  it("keeps role authorizations aligned with the role list", () => {
    assert.deepEqual(Object.keys(roleAuthorizations), [...personnelRoles]);
    assert.equal(getRoleAuthorization("Admin"), "full");
    assert.equal(getRoleAuthorization("Owner"), "full");
    assert.equal(getRoleAuthorization("Project Manager"), "manager");
    assert.equal(getRoleAuthorization("Operations Coordinator"), "manager");
    assert.equal(getRoleAuthorization("Contractor"), "external");
  });

  it("keeps Buck Thornton and Jeremy Thornton as full-access Owners", () => {
    assert.deepEqual(authorizedWorkspaceUsers, [
      { name: "Buck Thornton", email: "Office@jdtnurseries.com", role: "Owner" },
      { name: "Jeremy Thornton", email: "jeremy@jdtnurseries.com", role: "Owner" },
    ]);

    assert.equal(getAuthorizedWorkspaceUser("office@jdtnurseries.com")?.role, "Owner");
    assert.equal(getAuthorizedWorkspaceUser("jeremy@jdtnurseries.com")?.role, "Owner");
    assert.equal(getRoleAuthorization(getAuthorizedWorkspaceUser("Office@jdtnurseries.com")?.role), "full");
  });

  it("maps roles to useful assignment group labels", () => {
    assert.equal(getCrewAllocationType("Driver"), "Freight / Transport");
    assert.equal(getCrewAllocationType("Mechanic"), "Maintenance / Equipment");
    assert.equal(getCrewAllocationType("Contractor"), "Contractor / Vendor");
    assert.equal(getCrewAllocationType("Operations Coordinator"), "Operations Coordination");
    assert.equal(getCrewAllocationType("Crew Member"), "Field Crew");
  });

  it("offers an add-new role item without granting custom roles full access", () => {
    assert.equal(
      personnelRoleSelectOptions[personnelRoleSelectOptions.length - 1].value,
      ADD_NEW_PERSONNEL_ROLE_VALUE,
    );
    assert.equal(getRoleAuthorization("Crane Operator", "external"), "external");
    assert.equal(getRoleAuthorization("Crane Operator", "full"), "field");
  });

  it("adds custom saved roles to filters while keeping built-in filters stable", () => {
    const filters = buildPersonnelRoleFilters([
      { role: "Crane Operator" },
      { role: "Driver" },
      { role: "crane operator" },
    ]);

    assert.deepEqual(filters.map((filter) => filter.value), ["All", ...personnelRoles, "Crane Operator"]);
    assert.equal(roleMatchesFilter("Crane Operator", "Crane Operator"), true);
    assert.equal(roleMatchesFilter("Driver", "Driver"), true);
  });
});
