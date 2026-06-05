import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EquipmentRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from "./records";
import { buildOperatingCalendar } from "./calendar";

describe("operating calendar planner", () => {
  const job: JobRecord = {
    id: "job-boca-course-1",
    title: "Boca West Course 1 Renovation",
    clientName: "Boca West Country Club",
    projectId: "BWCC-060426",
    projectName: "Boca West Course 1 Renovation",
    location: "20583 Boca West Dr",
    scheduledDate: "2026-06-05",
    status: "Active",
  };

  const freightMove: LoadRecord = {
    id: "load-semi-1",
    title: "Semi #1 equipment move",
    driver: "Christian Crespo",
    truck: "Semi #1",
    trailer: "Black Lowboy",
    pickupDate: "2026-06-05",
    status: "Scheduled",
  };

  const rootPrune: WorkOrderRecord = {
    id: "wo-root-prune",
    title: "Root prune Live Oak 1003",
    workOrderType: "tree_pruning",
    projectId: "BWCC-060426",
    projectName: "Boca West Course 1 Renovation",
    clientName: "Boca West Country Club",
    scheduledDate: "2026-06-05",
    assignedCrewNames: [],
    status: "Scheduled",
  };

  it("builds one schedule stream from jobs, freight, work orders, trees, equipment, and imported schedule tasks", () => {
    const tree: TreeRelocationRecord = {
      id: "tree-1003",
      treeId: "1003",
      type: "Live Oak",
      projectId: "WATERFORD-060526",
      projectName: "Waterford Relocation",
      relocationStatus: "Not Started",
    };
    const equipment: EquipmentRecord = {
      id: "equipment-komatsu-500-1",
      name: "Komatsu 500 - 1",
      category: "Machine",
      nextServiceDue: "2026-06-05",
      status: "Available",
    };
    const scheduleTask: ScheduleTaskRecord = {
      id: "schedule-task-freight",
      task: "Drop lowboy at 25 Acre",
      activityType: "Freight",
      startDate: "2026-06-05",
      assignee: "Christian Crespo",
      truck: "Semi #1",
    };

    const calendar = buildOperatingCalendar({
      jobs: [job],
      loads: [freightMove],
      workOrders: [rootPrune],
      treeRelocationRecords: [tree],
      equipment: [equipment],
      scheduleTasks: [scheduleTask],
      todayIso: "2026-06-04",
    });

    assert.equal(calendar.events.some((event) => event.category === "relocation" && event.title === "Boca West Course 1 Renovation"), true);
    assert.equal(calendar.events.some((event) => event.category === "freight" && event.title === "Semi #1 equipment move"), true);
    assert.equal(calendar.events.some((event) => event.category === "nursery" && event.title === "Root prune Live Oak 1003"), true);
    assert.equal(calendar.events.some((event) => event.category === "equipment" && event.title === "Service: Komatsu 500 - 1"), true);
    assert.equal(calendar.events.some((event) => event.title === "Schedule 1st Cut"), true);
    assert.deepEqual(calendar.events.map((event) => event.dateIso), [...calendar.events.map((event) => event.dateIso)].sort());
  });

  it("flags tomorrow readiness gaps and resource conflicts", () => {
    const secondFreightMove: LoadRecord = {
      id: "load-semi-2",
      title: "Semi #1 tree delivery",
      driver: "Christian Crespo",
      truck: "Semi #1",
      trailer: "Dropdeck",
      pickupDate: "2026-06-05",
      status: "Scheduled",
    };

    const calendar = buildOperatingCalendar({
      jobs: [job],
      loads: [freightMove, secondFreightMove],
      workOrders: [rootPrune],
      todayIso: "2026-06-04",
    });

    assert.equal(calendar.tomorrowReadiness.total, 4);
    assert.equal(calendar.tomorrowReadiness.missingCrew, 2);
    assert.equal(calendar.tomorrowReadiness.conflicts, 2);
    assert.equal(calendar.conflicts.some((conflict) => conflict.resourceLabel === "Christian Crespo"), true);
    assert.equal(calendar.conflicts.some((conflict) => conflict.resourceLabel === "Semi #1"), true);
    assert.equal(calendar.events.find((event) => event.id === "workOrder-wo-root-prune")?.readinessIssues.includes("Missing crew"), true);
  });
});
