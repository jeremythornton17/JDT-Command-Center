import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EquipmentRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from "./records";
import { buildCalendarGridDays, buildOperatingCalendar, eventsForCalendarView, primaryCalendarGridEvents, rescheduledEventDateRange } from "./calendar";

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
    assert.equal(calendar.events.some((event) => event.category === "relocation" && event.title === "Root prune Live Oak 1003"), true);
    assert.equal(calendar.events.some((event) => event.category === "equipment" && event.title === "Service: Komatsu 500 - 1"), true);
    assert.equal(calendar.events.some((event) => event.title === "Schedule 1st Cut"), true);
    assert.deepEqual(calendar.events.map((event) => event.dateIso), [...calendar.events.map((event) => event.dateIso)].sort());
  });

  it("keeps tree lifecycle and equipment awareness out of the primary calendar grid", () => {
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

    const calendar = buildOperatingCalendar({
      jobs: [job],
      workOrders: [rootPrune],
      treeRelocationRecords: [tree],
      equipment: [equipment],
      todayIso: "2026-06-04",
    });
    const primaryGridEvents = primaryCalendarGridEvents(calendar.events);

    assert.equal(primaryGridEvents.some((event) => event.sourceType === "treeLifecycle"), false);
    assert.equal(primaryGridEvents.some((event) => event.sourceType === "equipment"), false);
    assert.equal(primaryGridEvents.some((event) => event.sourceType === "job"), true);
    assert.equal(primaryGridEvents.some((event) => event.sourceType === "workOrder"), true);
  });

  it("preserves the blocked span when a calendar event is moved to a new date", () => {
    const calendar = buildOperatingCalendar({
      jobs: [{
        id: "job-boca-root-pruning-window",
        title: "Boca West root pruning window",
        startDate: "2026-06-08",
        endDate: "2026-06-12",
        crew: "Carlos Reyes",
        status: "Scheduled",
        location: "Boca West",
      }],
      todayIso: "2026-06-07",
    });
    const event = calendar.events.find((item) => item.id === "job-job-boca-root-pruning-window");
    assert.ok(event);

    assert.deepEqual(rescheduledEventDateRange(event, "2026-06-15"), {
      dateIso: "2026-06-15",
      endDateIso: "2026-06-19",
    });
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

  it("keeps multi-day jobs and assignments visible across every blocked day", () => {
    const multiDayJob: JobRecord = {
      id: "job-boca-root-pruning-window",
      title: "Boca West root pruning window",
      clientName: "Boca West Country Club",
      projectName: "Boca West Course 1 Renovation",
      startDate: "2026-06-08",
      endDate: "2026-06-12",
      crew: "Carlos Reyes",
      location: "Boca West",
      status: "Scheduled",
    };
    const multiDayTask: ScheduleTaskRecord = {
      id: "schedule-task-waterford-nutrient",
      task: "Waterford nutrient care follow-up",
      activityType: "Nutrient Care",
      startDate: "2026-06-10",
      endDate: "2026-06-24",
      assignee: "Carlos Reyes",
      locationName: "Waterford",
      status: "Scheduled",
    };

    const calendar = buildOperatingCalendar({
      jobs: [multiDayJob],
      scheduleTasks: [multiDayTask],
      todayIso: "2026-06-07",
    });
    const jobEvent = calendar.events.find((event) => event.id === "job-job-boca-root-pruning-window");
    const taskEvent = calendar.events.find((event) => event.id === "scheduleTask-schedule-task-waterford-nutrient");

    assert.equal(jobEvent?.dateIso, "2026-06-08");
    assert.equal(jobEvent?.endDateIso, "2026-06-12");
    assert.equal(jobEvent?.durationDays, 5);
    assert.equal(taskEvent?.endDateIso, "2026-06-24");
    assert.equal(eventsForCalendarView(calendar.events, "Week", "2026-06-12").some((event) => event.id === jobEvent?.id), true);

    const monthDays = buildCalendarGridDays(calendar.events, "Month", "2026-06-10");
    const june12 = monthDays.find((day) => day.dateIso === "2026-06-12");
    const june24 = monthDays.find((day) => day.dateIso === "2026-06-24");
    assert.equal(june12?.events.some((event) => event.id === jobEvent?.id), true);
    assert.equal(june24?.events.some((event) => event.id === taskEvent?.id), true);
  });

  it("flags resource conflicts on every day covered by a multi-day assignment", () => {
    const multiDayJob: JobRecord = {
      id: "job-boca-root-pruning-window",
      title: "Boca West root pruning window",
      startDate: "2026-06-08",
      endDate: "2026-06-12",
      crew: "Carlos Reyes",
      status: "Scheduled",
      location: "Boca West",
    };
    const overlappingTask: ScheduleTaskRecord = {
      id: "schedule-task-carlos-nutrient",
      task: "Waterford nutrient care follow-up",
      activityType: "Nutrient Care",
      startDate: "2026-06-10",
      assignee: "Carlos Reyes",
      locationName: "Waterford",
      status: "Scheduled",
    };

    const calendar = buildOperatingCalendar({
      jobs: [multiDayJob],
      scheduleTasks: [overlappingTask],
      todayIso: "2026-06-07",
    });

    assert.equal(calendar.conflicts.some((conflict) => (
      conflict.dateIso === "2026-06-10"
      && conflict.resourceLabel === "Carlos Reyes"
      && conflict.eventTitles.includes("Boca West root pruning window")
      && conflict.eventTitles.includes("Waterford nutrient care follow-up")
    )), true);
  });

  it("includes ongoing multi-day work in tomorrow readiness", () => {
    const multiDayJob: JobRecord = {
      id: "job-boca-root-pruning-window",
      title: "Boca West root pruning window",
      startDate: "2026-06-08",
      endDate: "2026-06-12",
      crew: "Carlos Reyes",
      status: "Scheduled",
      location: "Boca West",
    };

    const calendar = buildOperatingCalendar({
      jobs: [multiDayJob],
      todayIso: "2026-06-09",
    });

    assert.equal(calendar.tomorrowReadiness.total, 1);
    assert.equal(calendar.tomorrowReadiness.ready, 1);
  });
});
