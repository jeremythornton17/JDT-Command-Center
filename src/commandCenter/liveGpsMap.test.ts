import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveGpsAssets,
  filterLiveGpsAssets,
  isolateLiveGpsAsset,
} from "./liveGpsMap";
import type { EquipmentRecord, FleetTelematicsEventRecord, LoadRecord } from "./records";

const semiOne: EquipmentRecord = {
  id: "equipment-semi-1",
  name: "Semi #1",
  category: "Truck",
  revealVehicleId: "veh-1",
  vehicleNumber: "S1",
  assignedProjectId: "project-boca-west",
  assignedProjectName: "Boca West Course 1 Renovation",
  currentLocationName: "Boca West Course 1 Renovation",
  currentLocation: "20583 Boca W Dr, Boca Raton, FL 33434",
};

const komatsu: EquipmentRecord = {
  id: "equipment-komatsu-500-1",
  name: "Komatsu 500 - 1",
  category: "Machine",
  revealVehicleId: "asset-komatsu-1",
  currentLocationName: "25 Acre",
  currentLocation: "3040 US-27, Clewiston, FL 33440",
  serviceStatus: "Ready",
};

const semiEvent: FleetTelematicsEventRecord = {
  id: "evt-semi-1",
  provider: "Reveal",
  providerVehicleId: "veh-1",
  vehicleName: "Semi #1",
  latitude: 26.387315,
  longitude: -80.171258,
  speedMph: 32,
  heading: 120,
  driverName: "Christian Crespo",
  address: "Boca West truck access",
  eventAt: "2026-06-13T14:00:00.000Z",
};

const equipmentEvent: FleetTelematicsEventRecord = {
  id: "evt-komatsu-1",
  provider: "Reveal",
  providerVehicleId: "asset-komatsu-1",
  vehicleName: "Komatsu 500 - 1",
  latitude: 26.755196,
  longitude: -80.983372,
  speedMph: 0,
  address: "25 Acre Farm",
  eventAt: "2026-06-13T13:40:00.000Z",
};

const freightMove: LoadRecord = {
  id: "load-boca-equipment",
  title: "Christian Crespo - Semi #1 - Boca West equipment moves",
  loadNumber: "FM-20260613-CC-S1-01",
  driver: "Christian Crespo",
  truckId: "equipment-semi-1",
  truck: "Semi #1",
  status: "In Transit",
  projectId: "project-boca-west",
  projectName: "Boca West Course 1 Renovation",
  stops: [{ id: "stop-1", sequence: 1, label: "Boca West truck access", type: "Delivery", status: "InProgress" }],
};

test("buildLiveGpsAssets groups Reveal GPS into vehicles, equipment, freight, and unmatched assets", () => {
  const assets = buildLiveGpsAssets({
    equipment: [semiOne, komatsu],
    events: [
      semiEvent,
      equipmentEvent,
      {
        id: "evt-unmatched",
        provider: "Reveal",
        providerVehicleId: "unknown-9",
        vehicleName: "Unknown Reveal tracker",
        latitude: 26.7539,
        longitude: -80.9166,
        eventAt: "2026-06-13T13:55:00.000Z",
      },
    ],
    loads: [freightMove],
    now: "2026-06-13T14:10:00.000Z",
  });

  assert.deepEqual(assets.map((asset) => [asset.id, asset.category, asset.status]), [
    ["equipment-semi-1", "vehicle", "Moving"],
    ["equipment-komatsu-500-1", "equipment", "Stopped"],
    ["freight-load-boca-equipment", "freight", "In Transit"],
    ["unmatched-unknown-9", "unmatched", "Needs Match"],
  ]);
  assert.equal(assets[0].assignedDriver, "Christian Crespo");
  assert.equal(assets[2].freightMoveId, "load-boca-equipment");
  assert.equal(assets[3].needsAttention, true);
});

test("filterLiveGpsAssets applies category, status, search, and stale filtering", () => {
  const assets = buildLiveGpsAssets({
    equipment: [semiOne, komatsu],
    events: [semiEvent, { ...equipmentEvent, eventAt: "2026-06-12T00:00:00.000Z" }],
    loads: [freightMove],
    now: "2026-06-13T14:10:00.000Z",
  });

  assert.deepEqual(filterLiveGpsAssets(assets, { categories: ["equipment"] }).map((item) => item.name), ["Komatsu 500 - 1"]);
  assert.deepEqual(filterLiveGpsAssets(assets, { statuses: ["Stale"] }).map((item) => item.name), ["Komatsu 500 - 1"]);
  assert.deepEqual(filterLiveGpsAssets(assets, { search: "christian" }).map((item) => item.name), ["Semi #1", "Christian Crespo - Semi #1 - Boca West equipment moves"]);
});

test("isolateLiveGpsAsset returns only the selected asset when an asset is selected", () => {
  const assets = buildLiveGpsAssets({ equipment: [semiOne, komatsu], events: [semiEvent, equipmentEvent], loads: [freightMove] });
  assert.deepEqual(isolateLiveGpsAsset(assets, "equipment-komatsu-500-1").map((item) => item.id), ["equipment-komatsu-500-1"]);
  assert.equal(isolateLiveGpsAsset(assets, "").length, assets.length);
});
