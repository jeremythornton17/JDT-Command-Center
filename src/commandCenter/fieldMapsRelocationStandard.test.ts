import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFieldMapsLoaderOptions,
  canViewRelocationCost,
  fieldMapsBillingStatusValues,
  fieldMapsCrewHiddenTreeFields,
  fieldMapsCrewVisibleTreeFields,
  fieldMapsEquipmentAccessValues,
  fieldMapsIssueAlertValues,
  fieldMapsRequiresPhoto,
  fieldMapsTreeRelocationStatusValues,
} from "./fieldMapsRelocationStandard";

describe("Field Maps relocation standard", () => {
  it("defines the crew-facing tree relocation form fields and hides sync/admin fields", () => {
    assert.deepEqual(fieldMapsTreeRelocationStatusValues, [
      "Not Started",
      "25% Cut",
      "50% Cut",
      "75% Cut",
      "100% Cut",
      "Ready for Relocation",
      "Moved to Holding Area",
      "Relocated",
      "Removed",
      "Remaining in Place",
    ]);
    assert.deepEqual(fieldMapsBillingStatusValues, [
      "Not Invoiced",
      "Invoiced",
      "Paid",
      "Hold / Dispute",
      "Not Billable",
    ]);
    assert.deepEqual(fieldMapsEquipmentAccessValues, ["Good", "Blocked", "Requires Review"]);
    assert.deepEqual(fieldMapsIssueAlertValues, [
      "None",
      "Stressed",
      "Damaged",
      "Dead",
      "Irrigation",
      "Blocked Access",
      "Needs Replanting",
      "Leaning",
      "Needs Jeremy Review",
    ]);
    assert.deepEqual(fieldMapsCrewVisibleTreeFields, [
      "Tree_Tag",
      "Tree_Type",
      "DBH_IN",
      "Tree_Relocation_Status",
      "Loaders_Needed",
      "Additional_Equipment_Required",
      "Equipment_Access",
      "Equipment_Access_Notes",
      "Crew_Notes",
      "Issue_Alert",
      "Attachments",
    ]);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Project_ID"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Tree_Asset_ID"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Existing_Latitude"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Source_Easting"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("ArcGIS_Feature_ID"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Last_Updated_Source"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Last_Sync_Direction"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Sync_Transaction_ID"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("ArcGIS_Last_Sync_At"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("JDT_Last_Sync_At"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Estimated_Relocation_Cost"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Contract_Relocation_Cost"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Billing_Status"), true);
    assert.equal(fieldMapsCrewHiddenTreeFields.includes("Relocation_Cost"), true);
  });

  it("requires photos for field states that need proof or review", () => {
    assert.equal(fieldMapsRequiresPhoto({ issueAlert: "None", equipmentAccess: "Good", relocationStatus: "25% Cut" }), false);
    assert.equal(fieldMapsRequiresPhoto({ issueAlert: "Stressed" }), true);
    assert.equal(fieldMapsRequiresPhoto({ equipmentAccess: "Blocked" }), true);
    assert.equal(fieldMapsRequiresPhoto({ equipmentAccess: "Requires Review" }), true);
    assert.equal(fieldMapsRequiresPhoto({ relocationStatus: "Relocated" }), true);
    assert.equal(fieldMapsRequiresPhoto({ relocationStatus: "Moved to Holding Area" }), true);
    assert.equal(fieldMapsRequiresPhoto({ relocationStatus: "Removed" }), true);
  });

  it("allows relocation cost only for owners, admins, office roles, and approved JDT emails", () => {
    assert.equal(canViewRelocationCost({ email: "jeremy@jdtnurseries.com" }), true);
    assert.equal(canViewRelocationCost({ email: "jennifer@jdtnurseries.com" }), true);
    assert.equal(canViewRelocationCost({ email: "regina@jdtnurseries.com" }), true);
    assert.equal(canViewRelocationCost({ role: "Operations Coordinator" }), true);
    assert.equal(canViewRelocationCost({ roles: ["Crew Leader", "Project Manager"] }), true);
    assert.equal(canViewRelocationCost({ role: "Crew Leader", email: "carlos@jdtnurseries.com" }), false);
  });

  it("builds loader choices from the live JDT equipment list and excludes non-loader records", () => {
    const options = buildFieldMapsLoaderOptions([
      { id: "eq-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine", eqType: "Loader", status: "Available" },
      { id: "eq-cat-988g", name: "Caterpillar 988G", category: "Machine", type: "Loader", status: "Assigned" },
      { id: "eq-mini-x", name: "Kubota Mini X", category: "Machine", eqType: "Excavator", status: "Available" },
      { id: "eq-truck", name: "Dodge Ram 2500", category: "Truck", eqType: "Truck", status: "Available" },
      { id: "eq-retired-loader", name: "Retired Loader", category: "Machine", eqType: "Loader", status: "Retired" },
    ]);

    assert.deepEqual(options.map((option) => option.label), ["Caterpillar 988G", "Komatsu 500 - 1"]);
    assert.deepEqual(options.map((option) => option.value), ["eq-cat-988g", "eq-komatsu-500-1"]);
  });
});
