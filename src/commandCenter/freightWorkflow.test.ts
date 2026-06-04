import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceFreightStop,
  applyCompletedRouteStepToEquipment,
  applyVehicleActivity,
  clientContactFromFreightStop,
  completeFreightRouteStep,
  completeFreightWithPod,
  createEquipmentWorkOrderFromIssue,
  freightEventHistory,
  freightVehicleActivityOptions,
  generateFreightLoadNumber,
  generateFreightLoadTitle,
  locationRecordFromFreightStop,
  normalizeFreightLoadForSave,
  parseFreightRouteSteps,
  vehicleLocationHistory,
} from "./freightWorkflow";

describe("freight vehicle workflow helpers", () => {
  it("generates readable freight titles and load numbers from dispatcher details", () => {
    assert.equal(
      generateFreightLoadTitle({
        driver: "Christian Crespo",
        truck: "Semi #1",
        clientName: "Boca West Country Club",
        equipmentNames: ["Komatsu 500 - 1"],
      }),
      "Christian Crespo - Semi #1 - Boca West Country Club - Equipment Move",
    );

    assert.equal(
      generateFreightLoadNumber({
        date: "2026-06-01",
        driver: "Christian Crespo",
        truck: "Semi #1",
      }, [
        { id: "old-load", loadNumber: "FM-20260601-CC-S1-01" },
      ]),
      "FM-20260601-CC-S1-02",
    );
  });

  it("fills missing freight title and load number while preserving dispatcher overrides", () => {
    const generated = normalizeFreightLoadForSave({
      id: "load-new",
      date: "2026-06-01",
      driver: "Christian Crespo",
      truck: "Semi #1",
      clientName: "Boca West Country Club",
      equipmentNames: ["Komatsu 500 - 1"],
    });

    assert.equal(generated.title, "Christian Crespo - Semi #1 - Boca West Country Club - Equipment Move");
    assert.equal(generated.loadNumber, "FM-20260601-CC-S1-01");

    const custom = normalizeFreightLoadForSave({
      id: "load-custom",
      title: "Custom dispatcher title",
      loadNumber: "BW-EQ-1",
      date: "2026-06-01",
      driver: "Christian Crespo",
      truck: "Semi #1",
    });

    assert.equal(custom.title, "Custom dispatcher title");
    assert.equal(custom.loadNumber, "BW-EQ-1");
  });

  it("spots a trailer at a named location and records history", () => {
    const updated = applyVehicleActivity({
      id: "equipment-lowboy",
      name: "Black Lowboy",
      category: "Trailer",
      status: "Available",
    }, {
      action: "Spot Location",
      locationName: "Boca West staging area",
      locationAddress: "Boca West Country Club",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T12:00:00.000Z",
      notes: "Dropped empty near maintenance gate",
    });

    assert.equal(updated.currentLocationName, "Boca West staging area");
    assert.equal(updated.currentLocation, "Boca West Country Club");
    assert.equal(updated.currentLocationType, "Job Site");
    assert.equal(updated.status, "Available");
    assert.equal(updated.vehicleLoadState, "Empty");
    assert.equal(updated.vehicleActivityHistory?.[0].action, "Spot Location");
  });

  it("drops and hooks trailers between drivers", () => {
    const dropped = applyVehicleActivity({
      id: "trailer-1",
      name: "black lowboy",
      category: "Trailer",
      assignedCrewName: "Alex Bueno",
      assignedTruck: "Semi 1",
    }, {
      action: "Drop Trailer",
      locationName: "25 Acre Farm",
      actorName: "Alex Bueno",
      occurredAt: "2026-06-01T13:00:00.000Z",
    });

    assert.equal(dropped.assignedCrewName, "");
    assert.equal(dropped.assignedTruck, "");
    assert.equal(dropped.vehicleLoadState, "Empty");

    const hooked = applyVehicleActivity(dropped, {
      action: "Hook Trailer",
      assignedCrewName: "Vince Carreno",
      assignedTruck: "Semi 2",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T14:00:00.000Z",
    });

    assert.equal(hooked.assignedCrewName, "Vince Carreno");
    assert.equal(hooked.assignedTruck, "Semi 2");
    assert.equal(hooked.status, "Assigned");
  });

  it("returns newest vehicle activity history first", () => {
    const vehicle = applyVehicleActivity({
      id: "truck-1",
      name: "Semi 1",
      category: "Truck",
    }, {
      action: "Mark Loaded",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T15:00:00.000Z",
    });

    assert.deepEqual(freightVehicleActivityOptions, [
      "Spot Location",
      "Drop Trailer",
      "Hook Trailer",
      "Mark Empty",
      "Mark Loaded",
    ]);
    assert.equal(vehicleLocationHistory(vehicle)[0].action, "Mark Loaded");
  });

  it("advances freight stops with actual timestamps and freight events", () => {
    const updated = advanceFreightStop({
      id: "load-1",
      title: "Boca West delivery",
      status: "Dispatched",
      stops: [
        { id: "pickup", label: "Pickup", type: "Pickup", location: "JDT Home Base", status: "Pending", saveLocation: true, siteContactName: "Jennifer", siteContactPhone: "239-800-1736" },
        { id: "delivery", label: "Delivery", type: "Delivery", location: "Boca West", status: "Pending", saveLocation: true },
      ],
    }, {
      stopId: "pickup",
      nextStatus: "Completed",
      actualArrivalAt: "2026-06-01T08:00:00.000Z",
      actualDepartureAt: "2026-06-01T08:30:00.000Z",
      notes: "Loaded two live oaks",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T08:31:00.000Z",
    });

    assert.equal(updated.stops?.[0].status, "Completed");
    assert.equal(updated.stops?.[0].actualDepartureAt, "2026-06-01T08:30:00.000Z");
    assert.equal(updated.status, "In Transit");
    assert.equal(updated.freightRevision, 1);
    assert.equal(freightEventHistory(updated)[0].type, "STOP_UPDATED");
  });

  it("stores proof of delivery details on completed freight", () => {
    const updated = completeFreightWithPod({
      id: "load-1",
      title: "Boca West delivery",
      status: "At Delivery",
    }, {
      receiverName: "Boca West Superintendent",
      completedAt: "2026-06-01T10:00:00.000Z",
      signatureDataUrl: "data:image/png;base64,abc",
      bolPhotoDataUrl: "data:image/png;base64,def",
      notes: "Accepted at gate",
      actorName: "Jennifer Bermudez",
    });

    assert.equal(updated.status, "Completed");
    assert.equal(updated.pod?.receiverName, "Boca West Superintendent");
    assert.equal(updated.requiredDocuments?.some((doc) => doc.type === "BOL" && doc.status === "Received"), true);
    assert.equal(updated.freightEvents?.[0].type, "POD_COMPLETED");
  });

  it("turns freight stops into saved locations and site contacts when requested", () => {
    const stop = {
      id: "delivery",
      location: "Boca West staging area",
      address: "Boca West Country Club",
      type: "Delivery",
      saveLocation: true,
      saveContact: true,
      siteContactName: "Course Superintendent",
      siteContactPhone: "555-0100",
    };

    assert.equal(locationRecordFromFreightStop(stop)?.name, "Boca West staging area");
    assert.equal(locationRecordFromFreightStop({ ...stop, saveLocation: false }), null);
    assert.equal(clientContactFromFreightStop(stop)?.name, "Course Superintendent");
    assert.equal(clientContactFromFreightStop({ ...stop, saveContact: false }), null);
  });

  it("turns a reported vehicle issue into an equipment work order", () => {
    const workOrder = createEquipmentWorkOrderFromIssue({
      assetId: "equipment-semi-1",
      assetName: "Semi 1",
      assetType: "Truck",
      severity: "High",
      description: "Brake warning light came on",
      reportedBy: "Alex Bueno",
      reportedAt: "2026-06-01T11:00:00.000Z",
    });

    assert.equal(workOrder.workOrderType, "equipment");
    assert.equal(workOrder.division, "Maintenance / Equipment");
    assert.equal(workOrder.equipmentIds?.[0], "equipment-semi-1");
    assert.equal(workOrder.priority, "High");
    assert.match(workOrder.notes || "", /Brake warning light/);
  });

  it("parses a driver dispatch run into ordered freight route steps", () => {
    const steps = parseFreightRouteSteps(`
      Hook Trailer | Black Lowboy | Main Office | Connect Christian to black lowboy
      Load Equipment | Komatsu 500-1 | Main Office | Load on black lowboy
      Unload Equipment | Komatsu 500-1 | 25 Acre Farm | Unload Komatsu
      Move Equipment | John Deere 744 | 25 Acre Farm -> 40 Acre Farm | Move loader
      Spot Trailer | Black Lowboy | Main Office | Return empty
      Hook Trailer | Dropdeck | Main Office | Hook dropdeck
      Load Trees | Pine Trees | 10 Acre Farm | Load and tarp
      Hold Loaded Overnight | Dropdeck | Main Office | Stay hooked for early McArthur delivery
      Deliver Trees | Pine Trees | Main Office -> McArthur Golf Course | Deliver tomorrow morning
    `);

    assert.equal(steps.length, 9);
    assert.equal(steps[0].sequence, 1);
    assert.equal(steps[0].actionType, "Hook Trailer");
    assert.equal(steps[0].trailerName, "Black Lowboy");
    assert.equal(steps[1].equipmentName, "Komatsu 500-1");
    assert.equal(steps[3].origin, "25 Acre Farm");
    assert.equal(steps[3].destination, "40 Acre Farm");
    assert.equal(steps[6].actionType, "Load Trees");
    assert.equal(steps[8].destination, "McArthur Golf Course");
  });

  it("turns dispatcher stop planner fields into structured freight stops", () => {
    const load = normalizeFreightLoadForSave({
      id: "load-christian-semi-1",
      title: "Christian Crespo - Semi #1 Dispatch",
      driver: "Christian Crespo",
      truck: "Semi #1",
      requiredTrailerType: "black lowboy",
      driverNotes: "Leave the loaded pine trailer hooked overnight.",
      rateUsd: "750",
      stop1Type: "Pickup",
      stop1LoadCategory: "Equipment",
      stop1EquipmentName: "Komatsu 500-1",
      stop1TrailerName: "Black Lowboy",
      stop1MainAddress: "1010 E Sugarland Hwy, Clewiston, FL 33440",
      stop1ConstructionAccessPin: "26.7544,-80.9182",
      stop1LoadUnloadPin: "26.7550,-80.9190",
      stop1RequestedTime: "7:00 AM",
      stop1SiteContactName: "Jennifer Bermudez",
      stop1SiteContactPhone: "239-800-1736",
      stop1SaveLocation: false,
      stop1SaveContact: true,
      stop1Notes: "Load Komatsu on the lowboy.",
      stop2Type: "Drop Off",
      stop2LoadCategory: "Equipment",
      stop2EquipmentName: "Komatsu 500-1",
      stop2MainAddress: "25 Acre Farm",
      stop2RequestedTime: "8:00 AM",
      stop2Notes: "Unload Komatsu.",
    });

    assert.equal(load.stops?.length, 2);
    assert.equal(load.stops?.[0].type, "Pickup");
    assert.equal(load.stops?.[0].loadCategory, "Equipment");
    assert.equal(load.stops?.[0].equipmentName, "Komatsu 500-1");
    assert.equal(load.stops?.[0].trailerName, "Black Lowboy");
    assert.equal(load.stops?.[0].mainAddress, "1010 E Sugarland Hwy, Clewiston, FL 33440");
    assert.equal(load.stops?.[0].constructionAccessPin, "26.7544,-80.9182");
    assert.equal(load.stops?.[0].loadUnloadPin, "26.7550,-80.9190");
    assert.equal(load.stops?.[0].location, "26.7550,-80.9190");
    assert.equal(load.stops?.[0].address, "1010 E Sugarland Hwy, Clewiston, FL 33440");
    assert.equal(load.stops?.[0].window, "7:00 AM");
    assert.equal(load.stops?.[0].siteContactName, "Jennifer Bermudez");
    assert.equal(load.stops?.[0].saveLocation, true);
    assert.equal(load.stops?.[1].type, "Drop Off");
    assert.equal(load.delivery, "25 Acre Farm");
    assert.equal("stop1Location" in load, false);
  });

  it("completes route steps and records dispatch revision history", () => {
    const load = {
      id: "dispatch-christian-semi-1",
      title: "Christian Crespo - Semi #1 - Monday Dispatch",
      status: "Scheduled",
      routeSteps: parseFreightRouteSteps("Hook Trailer | Black Lowboy | Main Office | Connect to lowboy"),
    };

    const updated = completeFreightRouteStep(load, {
      routeStepId: "route-step-1-hook-trailer",
      routeStepStatus: "Complete",
      actualStart: "2026-06-01T07:00:00.000Z",
      actualEnd: "2026-06-01T07:15:00.000Z",
      actorName: "Jennifer Bermudez",
      notes: "Christian hooked black lowboy",
      occurredAt: "2026-06-01T07:16:00.000Z",
    });

    assert.equal(updated.routeSteps?.[0].status, "Complete");
    assert.equal(updated.routeSteps?.[0].completed, true);
    assert.equal(updated.routeSteps?.[0].actualEnd, "2026-06-01T07:15:00.000Z");
    assert.equal(updated.freightRevision, 1);
    assert.equal(updated.freightEvents?.[0].type, "ROUTE_STEP_UPDATED");
    assert.match(updated.freightEvents?.[0].summary || "", /Hook Trailer/);
  });

  it("applies completed freight route steps to trailer and equipment location state", () => {
    const routeSteps = parseFreightRouteSteps(`
      Hook Trailer | Black Lowboy | Main Office | Connect Christian to black lowboy
      Unload Equipment | Komatsu 500-1 | 25 Acre Farm | Unload Komatsu
      Hold Loaded Overnight | Dropdeck | Main Office | Stay hooked for early McArthur delivery
    `);
    const load = {
      driver: "Christian Crespo",
      truck: "Semi #1",
    };

    const lowboy = applyCompletedRouteStepToEquipment({
      id: "equipment-black-lowboy",
      name: "Black Lowboy",
      category: "Trailer",
    }, load, { ...routeSteps[0], status: "Complete", completed: true });

    assert.equal(lowboy.assignedCrewName, "Christian Crespo");
    assert.equal(lowboy.assignedTruck, "Semi #1");
    assert.equal(lowboy.status, "Assigned");
    assert.equal(lowboy.currentLocationName, "Main Office");

    const komatsu = applyCompletedRouteStepToEquipment({
      id: "equipment-komatsu-500-1",
      name: "Komatsu 500-1",
      category: "Machine",
    }, load, { ...routeSteps[1], status: "Complete", completed: true });

    assert.equal(komatsu.currentLocationName, "25 Acre Farm");
    assert.equal(komatsu.status, "Available");

    const dropdeck = applyCompletedRouteStepToEquipment({
      id: "equipment-dropdeck",
      name: "Dropdeck",
      category: "Trailer",
    }, load, { ...routeSteps[2], status: "Complete", completed: true });

    assert.equal(dropdeck.currentLocationName, "Main Office");
    assert.equal(dropdeck.vehicleLoadState, "Loaded");
    assert.equal(dropdeck.assignedCrewName, "Christian Crespo");
  });
});
