import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDashboardSummary } from "./dashboard";
import type { ClientRecord, CrewRecord, EquipmentRecord, FieldUpdateRecord, FleetTelematicsEventRecord, InventoryItemRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from "./records";

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
        ["todayWork", "4"],
        ["blockedDecision", "3"],
        ["treesReady", "0"],
        ["rootPruneDue", "0"],
        ["careFollowUps", "0"],
        ["equipmentConflicts", "1"],
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
    const crewAlert = summary.commandAlerts.find((alert) => alert.id === "blockedDecision");

    assert.equal(crewAlert?.value, "1");
    assert.equal(crewAlert?.targetTab, "alerts");
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

  it("surfaces driver and vehicle compliance documents for office review", () => {
    const crew: CrewRecord[] = [
      { id: "crew-christian", name: "Christian Crespo", role: "Driver" },
    ];
    const equipment: EquipmentRecord[] = [
      {
        id: "truck-semi-1",
        name: "Semi #1",
        category: "Truck",
        registrationDocumentUrl: "https://drive/registration.pdf",
        registrationExpirationDate: "2026-06-20",
        insuranceDocumentUrl: "https://drive/insurance.pdf",
        insuranceExpirationDate: "2026-08-15",
      },
    ];

    const summary = buildDashboardSummary({ crew, equipment, todayIso: "2026-06-03" });

    assert.deepEqual(summary.complianceReviewQueue.map((item) => [item.recordId, item.documentType, item.status, item.targetTab]), [
      ["crew-christian", "Driver License", "Missing", "crews"],
      ["truck-semi-1", "Vehicle Registration", "Expiring Soon", "freight"],
    ]);
  });

  it("surfaces schedule resource conflicts for command board planning", () => {
    const loads: LoadRecord[] = [
      {
        id: "load-boca-equipment",
        title: "Boca West equipment move",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Black Lowboy",
        pickupDate: "2026-06-05",
        status: "Scheduled",
      },
      {
        id: "load-waterford-trees",
        title: "Waterford tree delivery",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Dropdeck",
        pickupDate: "2026-06-05",
        status: "Scheduled",
      },
    ];

    const summary = buildDashboardSummary({ loads, todayIso: "2026-06-04" });

    assert.deepEqual(summary.resourceConflictQueue.map((item) => [item.resourceLabel, item.resourceKind, item.dateIso, item.eventTitles]), [
      ["Christian Crespo", "driver", "2026-06-05", ["Boca West equipment move", "Waterford tree delivery"]],
      ["Semi #1", "truck", "2026-06-05", ["Boca West equipment move", "Waterford tree delivery"]],
    ]);
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
    const rootPruneAlert = summary.commandAlerts.find((alert) => alert.id === "rootPruneDue");
    const careFollowUpAlert = summary.commandAlerts.find((alert) => alert.id === "careFollowUps");

    assert.equal(rootPruneAlert?.value, "1");
    assert.equal(rootPruneAlert?.targetTab, "tracker");
    assert.equal(careFollowUpAlert?.value, "1");
    assert.equal(careFollowUpAlert?.targetTab, "tracker");
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

  it("prioritizes daily field command metrics and tree pipeline buckets", () => {
    const jobs: JobRecord[] = [
      { id: "job-boca", title: "Boca West Course 1", status: "Scheduled", startDate: "2026-06-15", crew: "Carlos Reyes" },
    ];
    const workOrders: WorkOrderRecord[] = [
      {
        id: "wo-root-prune",
        title: "Root prune Boca trees",
        projectName: "Boca West Course 1",
        workOrderType: "tree_pruning",
        crewLeadName: "Carlos Reyes",
        scheduledDate: "2026-06-15",
        status: "Scheduled",
        treeIds: ["1001", "1002"],
        equipmentNames: ["544 Loader", "Mini Excavator"],
      },
    ];
    const treeRelocationRecords: TreeRelocationRecord[] = [
      { id: "tree-1", treeId: "1001", type: "Live Oak", relocationStatus: "Not Started", projectName: "Boca West Course 1" },
      { id: "tree-2", treeId: "1002", type: "Live Oak", relocationStatus: "25% Cut", projectName: "Boca West Course 1" },
      { id: "tree-3", treeId: "1003", type: "Live Oak", relocationStatus: "50% Cut", projectName: "Boca West Course 1" },
      { id: "tree-4", treeId: "1004", type: "Live Oak", relocationStatus: "75% Cut", projectName: "Boca West Course 1" },
      { id: "tree-5", treeId: "1005", type: "Live Oak", relocationStatus: "100% Cut", projectName: "Boca West Course 1" },
      { id: "tree-6", treeId: "1006", type: "Live Oak", relocationStatus: "Ready for Relocation", projectName: "Boca West Course 1" },
      { id: "tree-7", treeId: "1007", type: "Live Oak", relocationStatus: "Moved to Holding", projectName: "Boca West Course 1" },
      { id: "tree-8", treeId: "1008", type: "Live Oak", relocationStatus: "Relocated", projectName: "Boca West Course 1" },
    ];

    const summary = buildDashboardSummary({ jobs, workOrders, treeRelocationRecords, todayIso: "2026-06-15" });

    assert.deepEqual(summary.commandAlerts.map((alert) => alert.label), [
      "Today's Work",
      "Blocked / Needs Decision",
      "Trees Ready to Move",
      "Root Prune Due",
      "Care Follow-Ups",
      "Equipment Conflicts",
    ]);
    assert.deepEqual(summary.treePipeline.map((bucket) => [bucket.status, bucket.count]), [
      ["Not Started", 1],
      ["25% Cut", 1],
      ["50% Cut", 1],
      ["75% Cut", 1],
      ["100% Cut", 1],
      ["Ready for Relocation", 1],
      ["Moved to Holding", 1],
      ["Relocated", 1],
    ]);
    assert.equal(summary.todaySchedule[0].crewLeader, "Carlos Reyes");
    assert.equal(summary.todaySchedule[0].workType, "Root Pruning");
    assert.equal(summary.todaySchedule[0].treeCount, 2);
    assert.deepEqual(summary.todaySchedule[0].treeTags, ["1001", "1002"]);
    assert.deepEqual(summary.todaySchedule[0].equipmentAssigned, ["544 Loader", "Mini Excavator"]);
  });

  it("builds the overview dashboard with exact relocated tree counts", () => {
    const jobs: JobRecord[] = [
      {
        id: "job-boca-course-1",
        title: "Boca West Course 1 Renovation",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        status: "Active",
        location: "Boca Raton, FL",
        crew: "Christian",
      },
    ];
    const treeRelocationRecords: TreeRelocationRecord[] = [
      { id: "tree-1", treeId: "1001", type: "Live Oak", projectId: "project-boca-course-1", relocationStatus: "Relocated" },
      { id: "tree-2", treeId: "1002", type: "Live Oak", projectId: "project-boca-course-1", relocationStatus: "Ready for Relocation" },
      { id: "tree-3", treeId: "1003", type: "Live Oak", projectId: "project-boca-course-1", relocationStatus: "Moved to Holding Area" },
      { id: "tree-4", treeId: "1004", type: "Live Oak", projectId: "project-boca-course-1", relocationStatus: "Invoiced" },
    ];

    const summary = buildDashboardSummary({ jobs, treeRelocationRecords, todayIso: "2026-06-17" });
    const relocatedKpi = summary.overview.kpis.find((kpi) => kpi.id === "relocatedTrees");
    const snapshot = summary.overview.projectSnapshots[0];

    assert.equal(relocatedKpi?.label, "Relocated Trees");
    assert.equal(relocatedKpi?.value, "1 of 4");
    assert.equal(relocatedKpi?.detail, "Across active projects");
    assert.equal(snapshot.name, "Boca West Course 1 Renovation");
    assert.equal(snapshot.treesRelocatedCount, 1);
    assert.equal(snapshot.treesTotalCount, 4);
    assert.equal(snapshot.progressPercent, 25);
  });

  it("builds fleet GPS quick-glance metrics for the overview dashboard", () => {
    const loads: LoadRecord[] = [
      { id: "load-mcarthur", title: "McArthur delivery", driver: "Alex", truck: "2024 Silverado 3500", status: "En Route", delivery: "McArthur Golf Club" },
    ];
    const equipment: EquipmentRecord[] = [
      {
        id: "truck-2024",
        name: "2024 Silverado 3500",
        category: "Truck",
        telematicsProvider: "Reveal",
        lastTelematicsLatitude: 26.75,
        lastTelematicsLongitude: -81.04,
        lastTelematicsStatus: "Moving",
        lastTelematicsSpeedMph: 48,
        lastTelematicsAt: "2026-06-17T21:47:00.000Z",
      },
      {
        id: "water-truck",
        name: "Water Truck",
        category: "Truck",
        status: "Down",
        currentLocationName: "Boca West",
      },
    ];
    const fleetTelematicsEvents: FleetTelematicsEventRecord[] = [
      {
        id: "event-2024",
        providerVehicleId: "truck-2024",
        vehicleName: "2024 Silverado 3500",
        status: "Moving",
        speedMph: 48,
        latitude: 26.75,
        longitude: -81.04,
        address: "US 27",
        eventAt: "2026-06-17T21:47:00.000Z",
      },
    ];

    const summary = buildDashboardSummary({ loads, equipment, fleetTelematicsEvents, todayIso: "2026-06-17" });

    assert.equal(summary.overview.fleetGps.visibleAssets, 1);
    assert.equal(summary.overview.fleetGps.vehiclesOnRoad, 2);
    assert.equal(summary.overview.fleetGps.equipmentOffsite, 1);
    assert.equal(summary.overview.fleetGps.lastSyncAt, "2026-06-17T21:47:00.000Z");
    assert.equal(summary.overview.fleetGps.movements.some((item) => item.label === "Alex"), true);
  });

  it("groups owner review items by operational decision bucket", () => {
    const jobs: JobRecord[] = [
      { id: "job-blocked", title: "Waterford Hold", status: "Blocked", client: "Waterford" },
    ];
    const treeRelocationRecords: TreeRelocationRecord[] = [
      { id: "tree-invoice", treeId: "1008", type: "Live Oak", relocationStatus: "Relocated", relocationDate: "2026-06-12", projectName: "Waterford" },
    ];

    const summary = buildDashboardSummary({ jobs, treeRelocationRecords, todayIso: "2026-06-15" });

    assert.equal(summary.ownerReviewGroups.some((group) => group.label === "Needs Jeremy Decision"), true);
    assert.equal(summary.ownerReviewGroups.some((group) => group.label === "Needs Scheduling"), true);
    assert.equal(summary.ownerReviewGroups.some((group) => group.label === "Needs Billing"), true);
    assert.equal(summary.ownerReviewGroups.flatMap((group) => group.items).some((item) => item.suggestedNextAction), true);
  });
});
