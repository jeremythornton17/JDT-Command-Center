import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultJdtFarmLocations,
  buildRevealSyncPreviewRows,
  equipmentCategory,
  equipmentDisplayName,
  isFreightVehicle,
  jdtHomeBase,
  revealTrackingStatusOptions,
  revealTrackingStatusForEquipment,
  revealTableIdForEquipment,
  revealTrackerReadiness,
  trailerMaintenanceCategoryOptions,
  truckTypeOptions,
  withHomeBaseEquipmentDefaults,
} from "./equipmentFreight";

describe("equipment and freight helpers", () => {
  it("uses JD Thornton Nurseries as the shared home base", () => {
    assert.equal(jdtHomeBase.name, "JD Thornton Nurseries Home Base");
    assert.equal(jdtHomeBase.address, "1010 E Sugarland Hwy, Clewiston, FL 33440");
    assert.equal(jdtHomeBase.locationType, "Farm");
    assert.equal(typeof jdtHomeBase.coordinates.lat, "number");
    assert.equal(typeof jdtHomeBase.coordinates.lng, "number");
  });

  it("keeps the Google Maps JD Thornton farm list as default saved farm pins", () => {
    const farmNames = defaultJdtFarmLocations.map((location) => location.name);
    assert.deepEqual(farmNames, ["Main Office", "25 Acre", "10 Acre", "40 Acre"]);

    const fortyAcre = defaultJdtFarmLocations.find((location) => location.name === "40 Acre");
    assert.equal(fortyAcre?.locationType, "Farm");
    assert.equal(fortyAcre?.accessType, "Farm");
    assert.equal(fortyAcre?.coordinateText, "26.757913, -81.037562");
    assert.equal(fortyAcre?.latitude, 26.757913);
    assert.equal(fortyAcre?.longitude, -81.037562);

    const tenAcre = defaultJdtFarmLocations.find((location) => location.name === "10 Acre");
    assert.equal(tenAcre?.mainAddress, "1866 Baker Hwy, Moore Haven, FL 33471");
    assert.equal(tenAcre?.latitude, 26.8170514);
    assert.equal(tenAcre?.longitude, -81.0927008);
  });

  it("defaults equipment with no location to the home base", () => {
    const equipment = withHomeBaseEquipmentDefaults({
      id: "equipment-loader-komatsu-500-1",
      name: "Komatsu 500 - 1",
      type: "Loader",
      status: "Available",
    });

    assert.equal(equipment.currentLocationName, jdtHomeBase.name);
    assert.equal(equipment.currentLocation, jdtHomeBase.address);
    assert.equal(equipment.currentLocationType, "Farm");
  });

  it("does not overwrite an updated equipment location", () => {
    const equipment = withHomeBaseEquipmentDefaults({
      id: "equipment-lowboy",
      name: "black lowboy",
      category: "Trailer",
      currentLocationName: "Boca West",
      currentLocation: "Boca West loading area",
      currentLocationType: "Job Site",
    });

    assert.equal(equipment.currentLocationName, "Boca West");
    assert.equal(equipment.currentLocation, "Boca West loading area");
    assert.equal(equipment.currentLocationType, "Job Site");
  });

  it("classifies trucks and trailers as freight vehicles", () => {
    assert.equal(isFreightVehicle({ id: "truck-1", name: "Semi 1", truckType: "Semi" }), true);
    assert.equal(isFreightVehicle({ id: "trailer-1", name: "black lowboy", trailerType: "black lowboy" }), true);
    assert.equal(isFreightVehicle({ id: "loader-1", name: "Komatsu 500 - 1", type: "Loader" }), false);
    assert.equal(equipmentDisplayName({ id: "truck-1", make: "Ford", model: "F-550" }), "Ford F-550");
    assert.equal(equipmentCategory({ id: "truck-1", truckType: "550" }), "Truck");
  });

  it("lets explicit equipment category override stale imported type fields", () => {
    const dodge = {
      id: "equipment-dodge-ram-2500",
      name: "Dodge Ram 2500",
      category: "Truck",
      trailerType: "black lowboy",
    };

    assert.equal(equipmentCategory(dodge), "Truck");
    assert.equal(isFreightVehicle(dodge), true);
    assert.equal(truckTypeOptions.includes("2500"), true);
  });

  it("keeps trailer service categories available to equipment maintenance", () => {
    assert.deepEqual(
      trailerMaintenanceCategoryOptions.filter((category) => [
        "Trailer Tires",
        "Brake Lines / Hoses",
        "Electrical Lines / Light Wiring",
        "Wood Deck Repair",
        "Brake Adjustment / Repair",
        "Kingpin",
        "Ball Hitch Receiver",
        "Pintle Hitch Receiver",
      ].includes(category)),
      [
        "Trailer Tires",
        "Brake Lines / Hoses",
        "Electrical Lines / Light Wiring",
        "Wood Deck Repair",
        "Brake Adjustment / Repair",
        "Kingpin",
        "Ball Hitch Receiver",
        "Pintle Hitch Receiver",
      ],
    );
  });

  it("adds Reveal-compatible tracking identity across vehicles, machines, and trailers", () => {
    assert.deepEqual(revealTrackingStatusOptions, [
      "Not Tracked",
      "Requested",
      "Tracker Installed",
      "Synced",
      "Needs Review",
    ]);

    assert.equal(revealTableIdForEquipment({ id: "truck-1", name: "Semi #1", category: "Truck" }), "Unit-1.0");
    assert.equal(revealTableIdForEquipment({ id: "loader-1", name: "Komatsu 500 - 1", category: "Machine" }), "Unit-1.0");
    assert.equal(revealTableIdForEquipment({ id: "trailer-1", name: "Black Lowboy", category: "Trailer" }), "NonPoweredAsset-1.0");

    assert.equal(revealTrackingStatusForEquipment({ id: "truck-1", revealVehicleId: "6358051" }), "Synced");
    assert.equal(revealTrackingStatusForEquipment({ id: "loader-1", revealTrackingStatus: "Requested" }), "Requested");
    assert.equal(revealTrackingStatusForEquipment({ id: "loader-1" }), "Not Tracked");
  });

  it("identifies assets ready for Verizon tracker requests before trackers are installed", () => {
    const ready = revealTrackerReadiness({
      id: "equipment-komatsu-500-1",
      name: "Komatsu 500 - 1",
      category: "Machine",
      currentLocationName: "Main Office",
      currentLocation: "1010 E Sugarland Hwy, Clewiston, FL 33440",
    });

    assert.equal(ready.ready, true);
    assert.equal(ready.action, "Ready For Tracker Request");
    assert.equal(ready.revealTableId, "Unit-1.0");

    const needsReview = revealTrackerReadiness({
      id: "equipment-unknown",
      category: "Machine",
    });

    assert.equal(needsReview.ready, false);
    assert.equal(needsReview.action, "Needs JDT Details");
    assert.deepEqual(needsReview.missing, ["Equipment name", "Current location"]);
  });

  it("builds a Reveal sync preview without creating duplicate future tracker records", () => {
    const rows = buildRevealSyncPreviewRows([
      {
        id: "equipment-chevy-colorado",
        name: "Chevy Colorado",
        category: "Truck",
        revealVehicleId: "6358051",
        vehicleNumber: "4",
      },
      {
        id: "equipment-black-lowboy",
        name: "Black Lowboy",
        category: "Trailer",
        currentLocationName: "Main Office",
        currentLocation: "1010 E Sugarland Hwy, Clewiston, FL 33440",
      },
      {
        id: "equipment-loader",
        name: "Komatsu 500 - 1",
        category: "Machine",
        revealTrackingStatus: "Requested",
        currentLocationName: "25 Acre",
        currentLocation: "25 Acre Farm",
      },
    ]);

    assert.deepEqual(rows.map((row) => [row.equipmentId, row.revealTableId, row.trackingStatus, row.action]), [
      ["equipment-chevy-colorado", "Unit-1.0", "Synced", "Matched To Reveal"],
      ["equipment-black-lowboy", "NonPoweredAsset-1.0", "Not Tracked", "Ready For Tracker Request"],
      ["equipment-loader", "Unit-1.0", "Requested", "Tracker Requested"],
    ]);
    assert.equal(rows[1].proposedRevealTag, "Black Lowboy");
    assert.equal(rows[2].duplicateProtectionKey, "equipment-loader");
  });
});
