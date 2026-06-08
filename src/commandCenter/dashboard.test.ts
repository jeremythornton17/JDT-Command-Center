import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDashboardSummary } from "./dashboard";
import type { ClientRecord, EquipmentRecord, FieldUpdateRecord, InventoryItemRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord } from "./records";

describe("command board dashboard summary", () => {
  it("builds actionable command strip counts for the hybrid board", () => {
    const jobs: JobRecord[] = [
      { id: "job-approved-open", title: "Approved Install", status: "Approved" },
      { id: "job-approved-scheduled", title: "Scheduled Approved Install", status: "Approved", scheduledDate: "2026-06-02" },
      { id: "job-hold", title: "Blocked Irrigation", status: "Hold" },
    ];
    const loads: LoadRecord[] = [
      { id: "load-driver-missing", title: "Naples Freight", status: "Ready", truck: "T-12" },
      { id: "load-permit", title: "Wide Load", status: "Permit Issue", driver: "Alex", truck: "F-750" },
    ];
    const equipment: EquipmentRecord[] = [
      { id: "eq-service", name: "Skid Steer", status: "Needs Service" },
      { id: "eq-ready", name: "Water Truck", status: "Ready" },
    ];
    const scheduleTasks: ScheduleTaskRecord[] = [
      { id: "task-dispatch-gap", title: "Lakewood Install", startDate: "2026-06-01", loadStatus: "Not Dispatched" },
    ];

    const summary = buildDashboardSummary({ jobs, loads, equipment, scheduleTasks });

    assert.deepEqual(
      summary.commandAlerts.map((alert) => [alert.id, alert.value]),
      [
        ["today", "4"],
        ["blocked", "3"],
        ["approved", "1"],
        ["trees", "0"],
        ["crew", "2"],
        ["freight", "2"],
        ["equipment", "1"],
      ],
    );
  });

  it("builds schedule, tomorrow, and owner review queues from operating records", () => {
    const jobs: JobRecord[] = [
      { id: "job-scheduled", title: "Lakewood Install", client: "Lakewood HOA", crew: "Jeff", status: "Scheduled", startDate: "2026-06-01" },
      { id: "job-approved", title: "Palm Ridge Move", client: "Palm Ridge", status: "Approved" },
      { id: "job-blocked", title: "Irrigation Repair", client: "Estate A", status: "Blocked" },
    ];
    const loads: LoadRecord[] = [
      { id: "load-live", title: "Naples Freight", status: "Ready", driver: "Alex", truck: "F-750", eta: "1:30 PM" },
    ];
    const scheduleTasks: ScheduleTaskRecord[] = [
      { id: "task-site", title: "Site walk", assignee: "Santiago", startDate: "2026-06-01", locationName: "Boca" },
    ];
    const equipment: EquipmentRecord[] = [
      { id: "eq-hold", name: "Lowboy", status: "Repair Hold" },
    ];

    const summary = buildDashboardSummary({ jobs, loads, scheduleTasks, equipment });

    assert.deepEqual(summary.todaySchedule.map((item) => [item.id, item.title, item.assignee]), [
      ["job-scheduled", "Lakewood Install", "Jeff"],
      ["load-live", "Naples Freight", "Alex"],
      ["task-site", "Site walk", "Santiago"],
    ]);
    assert.deepEqual(summary.tomorrowQueue.map((item) => [item.id, item.title, item.status]), [
      ["job-approved", "Palm Ridge Move", "Ready"],
    ]);
    assert.deepEqual(summary.ownerReviewQueue.map((item) => [item.id, item.title]), [
      ["job-blocked", "Irrigation Repair"],
      ["eq-hold", "Lowboy"],
    ]);
  });

  it("surfaces crew field updates in dashboard counts and review work", () => {
    const loads: LoadRecord[] = [
      { id: "load-semi-1", title: "Semi #1 dispatch", status: "Dispatched", driver: "Christian Crespo", truck: "Semi #1" },
    ];
    const fieldUpdates: FieldUpdateRecord[] = [
      {
        id: "field-update-christian-delay",
        title: "Delayed at 25 Acre Farm",
        crewName: "Christian Crespo",
        relatedRecordType: "load",
        relatedRecordId: "load-semi-1",
        relatedTitle: "Semi #1 dispatch",
        updateType: "Delayed",
        fieldStatus: "Delayed",
        notes: "Waiting for the loader to finish loading pine trees.",
        needsAdminReview: true,
      },
      {
        id: "field-update-carlos-arrived",
        title: "Arrived at Boca West",
        crewName: "Carlos Reyes",
        relatedRecordType: "workOrder",
        relatedTitle: "Root prune Hole 7",
        updateType: "Arrived",
        fieldStatus: "Arrived",
      },
    ];

    const summary = buildDashboardSummary({ loads, fieldUpdates });
    const crewAlert = summary.commandAlerts.find((alert) => alert.id === "crew");

    assert.equal(crewAlert?.value, "1");
    assert.equal(crewAlert?.targetTab, "crewView");
    assert.deepEqual(summary.ownerReviewQueue.map((item) => [item.id, item.title, item.assignee, item.targetTab]), [
      ["field-update-christian-delay", "Semi #1 dispatch", "Christian Crespo", "crewView"],
    ]);
  });

  it("surfaces submitted closeouts for admin review", () => {
    const fieldUpdates: FieldUpdateRecord[] = [
      {
        id: "closeout-waterford",
        relatedTitle: "Waterford root pruning",
        crewName: "Carlos Reyes",
        projectName: "Waterford Relocation",
        updateType: "Daily Closeout",
        fieldStatus: "Closeout Submitted",
      },
    ];

    const summary = buildDashboardSummary({ fieldUpdates });

    assert.deepEqual(summary.fieldCloseoutReviewQueue.map((item) => [item.id, item.title, item.reviewStatus, item.proofCount]), [
      ["closeout-waterford", "Waterford root pruning", "Needs Proof", 0],
    ]);
    assert.equal(summary.fieldCloseoutReviewQueue[0].targetTab, "crewView");
    assert.equal(summary.fieldCloseoutReviewQueue[0].drawerType, "fieldUpdate");
  });

  it("surfaces tree lifecycle reminders on the command board", () => {
    const jobs: JobRecord[] = [
      {
        id: "job-boca-course-1",
        title: "Boca West Course 1 Renovation",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        clientName: "Boca West Country Club",
        rootPruningPeriodMonths: 4,
      },
    ];
    const treeRelocationRecords: TreeRelocationRecord[] = [
      {
        id: "tree-boca-1001",
        treeId: "1001",
        type: "Live Oak",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        relocationStatus: "Not Started",
      },
      {
        id: "tree-boca-1002",
        treeId: "1002",
        type: "Live Oak",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        relocationStatus: "Relocated",
        relocationDate: "2026-06-01",
      },
    ];

    const summary = buildDashboardSummary({ jobs, treeRelocationRecords, todayIso: "2026-06-04" });
    const lifecycleAlert = summary.commandAlerts.find((alert) => alert.id === "trees");

    assert.equal(lifecycleAlert?.value, "3");
    assert.equal(lifecycleAlert?.targetTab, "tracker");
    assert.deepEqual(summary.ownerReviewQueue.slice(0, 3).map((item) => [item.title, item.recordId]), [
      ["Schedule 1st Cut", "job-boca-course-1"],
      ["Invoice Relocated Tree", "job-boca-course-1"],
      ["Schedule Nutrient Care After Relocation", "job-boca-course-1"],
    ]);
  });

  it("surfaces data quality relationship issues for command board review", () => {
    const clients: ClientRecord[] = [
      { id: "cli-2275", name: "Boca West Country Club" },
    ];
    const jobs: JobRecord[] = [
      {
        id: "job-boca-course-1",
        title: "Boca West Course 1 Renovation",
        clientId: "client-boca-west-country-club",
        clientName: "Boca West Country Club",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        status: "Active",
      },
    ];

    const summary = buildDashboardSummary({ clients, jobs });

    assert.deepEqual(summary.dataQualityQueue.map((item) => [item.severity, item.sourceType, item.title]), [
      ["High", "job", "Boca West Course 1 Renovation"],
    ]);
    assert.match(summary.dataQualityQueue[0].detail, /cli-2275/);
    assert.equal(summary.dataQualityQueue[0].targetTab, "tracker");
  });

  it("surfaces workflow readiness issues for dispatch review", () => {
    const summary = buildDashboardSummary({
      loads: [{
        id: "load-waterford",
        title: "Waterford equipment move",
        projectId: "project-waterford",
        projectName: "Waterford Relocation",
        jobId: "job-waterford",
        jobName: "Waterford relocation",
        status: "Scheduled",
      }],
    });

    assert.deepEqual(
      summary.workflowReadinessQueue.map((item) => [item.workflow, item.stage, item.title, item.missingFields.slice(0, 2)]),
      [["Freight Move", "Dispatch", "Waterford equipment move", ["Driver", "Truck"]]],
    );
    assert.equal(summary.workflowReadinessQueue[0].recommendedAction, "Complete freight dispatch details before sending this move to a driver.");
  });

  it("derives quote-to-job pipeline counts from real records", () => {
    const clients: ClientRecord[] = [
      { id: "client-1", name: "Oak Lead", status: "Inquiry" },
      { id: "client-2", name: "Palm Prospect", status: "Prospect" },
    ];
    const jobs: JobRecord[] = [
      { id: "job-visit", title: "Waterford Visit", phase: "Site Visit" },
      { id: "job-estimate", title: "Estate Quote", status: "Estimate Draft" },
      { id: "job-approved", title: "Approved Move", status: "Approved" },
      { id: "job-scheduled", title: "Scheduled Move", status: "onSchedule", startDate: "2026-06-02" },
      { id: "job-completed", title: "Completed Move", status: "completed" },
      { id: "job-invoiced", title: "Invoice Sent", status: "Invoiced" },
    ];
    const scheduleTasks: ScheduleTaskRecord[] = [
      { id: "task-1", title: "Client Site Walk", activityType: "site visit", startDate: "2026-06-01" },
    ];

    const summary = buildDashboardSummary({ jobs, clients, scheduleTasks });

    assert.deepEqual(
      summary.pipeline.map((stage) => [stage.id, stage.value]),
      [
        ["inquiries", 2],
        ["siteVisits", 2],
        ["estimates", 1],
        ["approved", 1],
        ["scheduled", 1],
        ["completed", 1],
        ["invoiced", 1],
      ],
    );
  });

  it("selects featured operating cards without mock records", () => {
    const jobs: JobRecord[] = [
      { id: "job-old", title: "Old Move", division: "relocation", status: "completed" },
      { id: "job-live", title: "Live Oak Move", division: "relocation", status: "onSchedule", location: "Boca", crew: "Santiago" },
    ];
    const loads: LoadRecord[] = [
      { id: "load-done", title: "Delivered Load", status: "completed" },
      { id: "load-live", title: "Palm Beach Freight", status: "Dispatched", driver: "Alex", truck: "T-12" },
    ];
    const trees: InventoryItemRecord[] = [
      { id: "tree-1", treeId: "RO-1", farm: "Farm 1", quantity: 3, status: "Available" },
      { id: "tree-2", treeId: "RO-2", farm: "Farm 2", quantity: 2, status: "Available" },
    ];
    const equipment: EquipmentRecord[] = [
      { id: "eq-ready", name: "Skid Steer", status: "Ready" },
      { id: "eq-service", name: "Lowboy Trailer", status: "Needs Service", hours: 450 },
    ];

    const summary = buildDashboardSummary({ jobs, loads, trees, equipment });

    assert.equal(summary.operations.relocation.title, "Live Oak Move");
    assert.equal(summary.operations.freight.title, "Palm Beach Freight");
    assert.equal(summary.operations.nursery.value, "2");
    assert.equal(summary.operations.equipment.title, "Lowboy Trailer");
  });
});
