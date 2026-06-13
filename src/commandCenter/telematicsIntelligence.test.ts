import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTelematicsEventsToFreightLoads,
  buildEquipmentWorkOrderFromRevealInspection,
  buildLiveVehicleMapMarkers,
  buildRevealIntegrationStatus,
  buildRevealTelematicsKpis,
  buildTelematicsExceptionAlerts,
  normalizeRevealFleetInspectionRecords,
} from "./telematicsIntelligence";
import type { EquipmentRecord, FleetTelematicsEventRecord, LoadRecord } from "./records";

const semiOne: EquipmentRecord = {
  id: "equipment-semi-1",
  name: "Semi #1",
  category: "Truck",
  revealVehicleId: "veh-1",
  vehicleNumber: "S1",
  assignedProjectName: "Boca West Course 1 Renovation",
  currentLocationName: "Boca West Course 1 Renovation",
  currentLocation: "20583 Boca W Dr, Boca Raton, FL 33434",
  lastTelematicsLatitude: 26.387315,
  lastTelematicsLongitude: -80.171258,
  lastTelematicsAt: "2026-06-12T12:00:00.000Z",
  lastTelematicsSpeedMph: 0,
};

const semiEvent: FleetTelematicsEventRecord = {
  id: "reveal-veh-1",
  provider: "Reveal",
  providerVehicleId: "veh-1",
  vehicleName: "Semi #1",
  vehicleNumber: "S1",
  latitude: 26.387315,
  longitude: -80.171258,
  coordinateText: "26.387315, -80.171258",
  address: "Boca West Course 1 Renovation truck access",
  eventAt: "2026-06-12T12:05:00.000Z",
  receivedAt: "2026-06-12T12:05:20.000Z",
  speedMph: 0,
  driverName: "Christian Crespo",
};

test("buildRevealIntegrationStatus summarizes vehicle sync and GPS freshness", () => {
  const status = buildRevealIntegrationStatus({
    equipment: [
      semiOne,
      { id: "equipment-semi-2", name: "Semi #2", category: "Truck", telematicsProvider: "Reveal", lastTelematicsAt: "2026-06-10T06:00:00.000Z" },
      { id: "equipment-lowboy", name: "Black Lowboy", category: "Trailer" },
    ],
    events: [semiEvent],
    now: "2026-06-12T13:00:00.000Z",
  });

  assert.equal(status.revealVehicles, 2);
  assert.equal(status.vehiclesWithGps, 1);
  assert.equal(status.staleVehicles, 1);
  assert.equal(status.latestEventAt, "2026-06-12T12:05:00.000Z");
  assert.equal(status.healthLabel, "1 live, 1 stale");
});

test("buildLiveVehicleMapMarkers exposes live truck coordinates for the Maps board", () => {
  const markers = buildLiveVehicleMapMarkers([semiOne], [semiEvent]);

  assert.deepEqual(markers, [{
    id: "equipment-semi-1",
    label: "Semi #1",
    vehicleNumber: "S1",
    lat: 26.387315,
    lng: -80.171258,
    status: "Stopped",
    driverName: "Christian Crespo",
    lastSeenAt: "2026-06-12T12:05:00.000Z",
    address: "Boca West Course 1 Renovation truck access",
    assignedProjectName: "Boca West Course 1 Renovation",
  }]);
});

test("applyTelematicsEventsToFreightLoads marks arrival and departure from project stop pins", () => {
  const load: LoadRecord = {
    id: "load-boca-west",
    title: "Semi #1 Boca West delivery",
    driver: "Christian Crespo",
    truck: "Semi #1",
    truckId: "equipment-semi-1",
    status: "Scheduled",
    stops: [{
      id: "stop-boca-access",
      sequence: 1,
      label: "Pickup - Boca West truck access",
      type: "Pickup",
      location: "Boca West truck access",
      loadUnloadPin: "26.387315, -80.171258",
      status: "Pending",
      completed: false,
    }],
  };

  const arrived = applyTelematicsEventsToFreightLoads([load], [semiOne], [semiEvent])[0];
  assert.equal(arrived.status, "In Transit");
  assert.equal(arrived.stops?.[0]?.status, "InProgress");
  assert.equal(arrived.stops?.[0]?.actualArrivalAt, "2026-06-12T12:05:00.000Z");
  assert.match(arrived.freightEvents?.[0]?.summary || "", /Reveal GPS arrival/i);

  const departed = applyTelematicsEventsToFreightLoads([arrived], [semiOne], [{
    ...semiEvent,
    id: "reveal-veh-1-away",
    latitude: 26.392315,
    longitude: -80.181258,
    coordinateText: "26.392315, -80.181258",
    eventAt: "2026-06-12T12:22:00.000Z",
    speedMph: 22,
  }])[0];

  assert.equal(departed.stops?.[0]?.actualDepartureAt, "2026-06-12T12:22:00.000Z");
  assert.match(departed.freightEvents?.[0]?.summary || "", /Reveal GPS departure/i);
});

test("buildTelematicsExceptionAlerts flags stale GPS and vehicles away from expected assignments", () => {
  const alerts = buildTelematicsExceptionAlerts({
    equipment: [{
      ...semiOne,
      currentLocationName: "25 Acre Farm",
      currentLocation: "25 Acre Farm",
      lastTelematicsAddress: "25 Acre Farm",
      lastTelematicsAt: "2026-06-12T06:00:00.000Z",
    }],
    loads: [{
      id: "load-boca-west",
      title: "Boca West delivery",
      truck: "Semi #1",
      truckId: "equipment-semi-1",
      status: "In Transit",
      delivery: "Boca West Course 1 Renovation",
    }],
    events: [],
    now: "2026-06-12T20:30:00.000Z",
  });

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].title, "Semi #1 away from assigned project");
  assert.equal(alerts[0].severity, "High");
  assert.equal(alerts[1].title, "Semi #1 stale GPS");
});

test("normalizeRevealFleetInspectionRecords turns DVIR style payloads into maintenance issues", () => {
  const inspections = normalizeRevealFleetInspectionRecords({
    Inspections: [{
      InspectionId: "insp-100",
      VehicleId: "veh-1",
      VehicleName: "Semi #1",
      DriverName: "Christian Crespo",
      InspectionDateTime: "2026-06-12T14:15:00.000Z",
      DefectCategory: "Brakes",
      DefectNotes: "Air leak at trailer brake line",
      SafeToOperate: false,
    }],
  });

  assert.equal(inspections.length, 1);
  assert.equal(inspections[0].inspectionId, "insp-100");
  assert.equal(inspections[0].severity, "Critical");
  assert.equal(inspections[0].defectNotes, "Air leak at trailer brake line");
});

test("buildEquipmentWorkOrderFromRevealInspection creates an equipment maintenance work order", () => {
  const inspection = normalizeRevealFleetInspectionRecords([{
    id: "insp-200",
    vehicleId: "veh-1",
    vehicleName: "Semi #1",
    driverName: "Christian Crespo",
    inspectedAt: "2026-06-12T14:15:00.000Z",
    defectCategory: "Tires",
    notes: "Right steer tire low tread",
    safeToOperate: true,
  }])[0];

  const workOrder = buildEquipmentWorkOrderFromRevealInspection(inspection, [semiOne]);

  assert.equal(workOrder.id, "work-order-reveal-inspection-insp-200");
  assert.equal(workOrder.workOrderType, "equipment");
  assert.equal(workOrder.status, "Ready");
  assert.equal(workOrder.priority, "High");
  assert.deepEqual(workOrder.equipmentIds, ["equipment-semi-1"]);
  assert.match(workOrder.notes || "", /Right steer tire low tread/);
});

test("buildRevealTelematicsKpis reports live fleet and exception metrics", () => {
  const metrics = buildRevealTelematicsKpis({
    equipment: [semiOne, { ...semiOne, id: "equipment-semi-2", name: "Semi #2", revealVehicleId: "veh-2", lastTelematicsAt: "2026-06-10T06:00:00.000Z" }],
    events: [semiEvent],
    loads: [{ id: "load-boca", title: "Boca freight", truckId: "equipment-semi-1", truck: "Semi #1", status: "In Transit" }],
    now: "2026-06-12T13:00:00.000Z",
  });

  assert.deepEqual(metrics.map((item) => [item.label, item.value]), [
    ["Reveal Vehicles", "2"],
    ["Live GPS", "1"],
    ["Stale GPS", "1"],
    ["GPS Events", "1"],
  ]);
});
