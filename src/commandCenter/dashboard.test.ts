import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDashboardSummary } from "./dashboard";
import type { ClientRecord, EquipmentRecord, FieldUpdateRecord, InventoryItemRecord, JobRecord, LoadRecord, ScheduleTaskRecord } from "./records";

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
