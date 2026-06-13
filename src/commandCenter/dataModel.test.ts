import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appCollections,
  collectionNamesForClear,
  permissionsForEmail,
  roleForEmail,
} from "./dataModel";

describe("command center data model", () => {
  it("keeps every real operating collection in the canonical model", () => {
    assert.deepEqual(
      Object.keys(appCollections).sort(),
      [
        "alerts",
        "clients",
        "crews",
        "documents",
        "equipment",
        "fieldUpdates",
        "fleetTelematicsEvents",
        "importBatches",
        "inventoryItems",
        "jobs",
        "loads",
        "locations",
        "projectMaterialItems",
        "projects",
        "ranchOaks",
        "scheduleTasks",
        "species",
        "staff",
        "syncMappings",
        "syncSources",
        "treeRelocationRecords",
        "workOrders",
      ].sort(),
    );

    assert.equal(appCollections.inventoryItems.primaryBoard, "Nursery");
    assert.equal(appCollections.projects.primaryBoard, "Clients");
    assert.equal(appCollections.scheduleTasks.primaryBoard, "Calendar");
    assert.equal(appCollections.importBatches.primaryBoard, "Import / Backup");
    assert.equal(appCollections.workOrders.label, "Work Orders");
    assert.equal(appCollections.workOrders.primaryBoard, "Command Board");
    assert.equal(appCollections.workOrders.resetGroup, "projects");
    assert.equal(appCollections.projectMaterialItems.label, "Project Material Items");
    assert.equal(appCollections.projectMaterialItems.primaryBoard, "Nursery");
    assert.equal(appCollections.projectMaterialItems.resetGroup, "projects");
    assert.equal(appCollections.fieldUpdates.label, "Crew Field Updates");
    assert.equal(appCollections.fieldUpdates.primaryBoard, "Crew View");
    assert.equal(appCollections.fieldUpdates.resetGroup, "field_updates");
    assert.equal(appCollections.fleetTelematicsEvents.label, "Fleet Telematics Events");
    assert.equal(appCollections.fleetTelematicsEvents.primaryBoard, "Maps");
    assert.equal(appCollections.fleetTelematicsEvents.resetGroup, "equipment");
    assert.equal(appCollections.documents.importable, true);
  });

  it("clears all app-owned collections when the owner resets everything", () => {
    const collections = collectionNamesForClear("all");

    assert.equal(collections.includes("inventoryItems"), true);
    assert.equal(collections.includes("staff"), true);
    assert.equal(collections.includes("locations"), true);
    assert.equal(collections.includes("species"), true);
    assert.equal(collections.includes("scheduleTasks"), true);
    assert.equal(collections.includes("treeRelocationRecords"), true);
    assert.equal(collections.includes("importBatches"), true);
    assert.equal(collections.includes("projects"), true);
    assert.equal(collections.includes("workOrders"), true);
    assert.equal(collections.includes("projectMaterialItems"), true);
    assert.equal(collections.includes("fieldUpdates"), true);
    assert.equal(collections.includes("fleetTelematicsEvents"), true);
    assert.deepEqual(collectionNamesForClear("projects"), ["projects", "jobs", "workOrders", "projectMaterialItems"]);
    assert.deepEqual(collectionNamesForClear("work_orders"), ["workOrders"]);
    assert.deepEqual(collectionNamesForClear("project_material_items"), ["projectMaterialItems"]);
    assert.deepEqual(collectionNamesForClear("field_updates"), ["fieldUpdates"]);
  });

  it("assigns practical operating roles from known JDT emails", () => {
    assert.equal(roleForEmail("jeremy@jdtnurseries.com"), "owner_admin");
    assert.equal(roleForEmail("buck@jdtnurseries.com"), "owner_admin");
    assert.equal(roleForEmail("Jennifer@jdtnurseries.com"), "operations_coordinator");
    assert.equal(roleForEmail("regina@jdtnurseries.com"), "office_admin");
    assert.equal(roleForEmail("max@jdtnurseries.com"), "operations_coordinator");
    assert.equal(roleForEmail("fieldlead@jdtnurseries.com"), "field_user");
    assert.equal(roleForEmail("jdtn2155@gmail.com"), "unauthorized");
  });

  it("limits destructive controls to the owner admin while allowing office imports", () => {
    assert.deepEqual(permissionsForEmail("jeremy@jdtnurseries.com"), {
      canRead: true,
      canWrite: true,
      canImport: true,
      canDelete: true,
      canReset: true,
      canManageSources: true,
      canManageUsers: true,
      canSubmitFieldUpdates: true,
    });

    assert.equal(permissionsForEmail("regina@jdtnurseries.com").canImport, true);
    assert.equal(permissionsForEmail("regina@jdtnurseries.com").canReset, false);
    assert.equal(permissionsForEmail("fieldlead@jdtnurseries.com").canWrite, false);
    assert.equal(permissionsForEmail("fieldlead@jdtnurseries.com").canSubmitFieldUpdates, true);
    assert.equal(permissionsForEmail("jdtn2155@gmail.com").canSubmitFieldUpdates, false);
    assert.equal(permissionsForEmail("buck@jdtnurseries.com").canManageUsers, true);
    assert.equal(permissionsForEmail("jdtn2155@gmail.com").canRead, false);
  });
});
