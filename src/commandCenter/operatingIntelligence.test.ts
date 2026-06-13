import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDailyCommandBrief,
  buildDataQualityActionQueue,
  buildOperatingKpis,
  buildProjectRiskScores,
  buildWorkflowReadinessQueue,
  filterSeedRecords,
  findRelationshipIssues,
  isSeedRecord,
} from "./operatingIntelligence";
import type {
  ClientRecord,
  DocumentRecord,
  EquipmentRecord,
  FieldUpdateRecord,
  ImportBatchRecord,
  JobRecord,
  LoadRecord,
  ProjectRecord,
  RanchOakRecord,
  ScheduleTaskRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from "./records";

describe("operating intelligence", () => {
  const clients: ClientRecord[] = [
    { id: "cli-2275", name: "Boca West Country Club" },
    { id: "client-bellaire", name: "Bellaire Country Club" },
  ];
  const jobs: JobRecord[] = [
    {
      id: "job-boca",
      title: "Boca West Course 1 Renovation",
      clientId: "client-boca-west-country-club",
      clientName: "Boca West Country Club",
      projectId: "project-boca",
      projectName: "Boca West Course 1 Renovation",
      status: "Active",
      scheduledDate: "2026-06-02",
    },
    {
      id: "job-risk",
      title: "Bellaire install",
      clientId: "client-bellaire",
      clientName: "Bellaire Country Club",
      projectId: "project-bellaire",
      projectName: "Bellaire install",
      status: "Blocked",
    },
  ];
  const workOrders: WorkOrderRecord[] = [
    {
      id: "wo-bellaire-crew",
      title: "Root prune Bellaire",
      projectId: "project-bellaire",
      projectName: "Bellaire install",
      jobId: "job-risk",
      jobName: "Bellaire install",
      status: "Ready",
      priority: "Urgent",
      assignedCrewNames: [],
      equipmentNames: [],
      documentNames: [],
    },
  ];
  const loads: LoadRecord[] = [
    {
      id: "load-bellaire",
      title: "Bellaire freight",
      projectId: "project-bellaire",
      projectName: "Bellaire install",
      jobId: "job-risk",
      jobName: "Bellaire install",
      status: "Ready",
      truck: "Semi #1",
      date: "2026-06-02",
      requiredDocuments: [{ type: "BOL", status: "Needed" }],
    },
  ];
  const equipment: EquipmentRecord[] = [
    { id: "eq-lowboy", name: "Lowboy", status: "Repair Hold", serviceStatus: "Needs Service" },
  ];
  const fieldUpdates: FieldUpdateRecord[] = [
    {
      id: "fu-help",
      relatedRecordType: "workOrder",
      relatedRecordId: "wo-bellaire-crew",
      relatedTitle: "Root prune Bellaire",
      crewName: "Carlos Reyes",
      fieldStatus: "Need Help",
      needsAdminReview: true,
    },
  ];
  const scheduleTasks: ScheduleTaskRecord[] = [
    {
      id: "task-root-prune",
      title: "Root prune Tree 301",
      projectId: "project-bellaire",
      jobId: "job-risk",
      startDate: "2026-06-02",
      assignee: "",
      loadStatus: "Not Dispatched",
    },
    {
      id: "task-tomorrow",
      title: "Tomorrow preload",
      startDate: "2026-06-03",
      assignee: "Christian Crespo",
      status: "Ready",
    },
  ];

  it("finds stable relationship mismatches and missing project context", () => {
    const issues = findRelationshipIssues({
      clients,
      jobs,
      loads: [{ ...loads[0], projectId: "", jobId: "" }],
      workOrders,
      scheduleTasks,
    });

    assert.deepEqual(
      issues.map((issue) => [issue.recordType, issue.recordId, issue.field, issue.expectedValue]),
      [
        ["job", "job-boca", "clientId", "cli-2275"],
        ["load", "load-bellaire", "projectId", "project-bellaire"],
        ["load", "load-bellaire", "jobId", "job-risk"],
      ],
    );
  });

  it("scores project risk from blocked work, missing resources, field issues, and proof gaps", () => {
    const risks = buildProjectRiskScores({ jobs, workOrders, loads, equipment, fieldUpdates, scheduleTasks });
    const topRisk = risks[0];

    assert.equal(topRisk.jobId, "job-risk");
    assert.equal(topRisk.level, "Critical");
    assert.ok(topRisk.score >= 80);
    assert.deepEqual(topRisk.reasons.slice(0, 5), [
      "Project status is blocked or on hold",
      "Crew assignment is missing",
      "Freight load is missing driver or truck",
      "Equipment is down, on hold, or needs service",
      "Crew field update needs admin review",
    ]);
  });

  it("builds a daily command brief for today, tomorrow, and decisions", () => {
    const brief = buildDailyCommandBrief({
      todayIso: "2026-06-02",
      jobs,
      loads,
      equipment,
      fieldUpdates,
      scheduleTasks,
      workOrders,
    });

    assert.equal(brief.today.length, 3);
    assert.equal(brief.tomorrow.length, 1);
    assert.equal(brief.decisions.length, 4);
    assert.match(brief.summary, /3 today/);
    assert.match(brief.summary, /4 owner decisions/);
  });

  it("builds KPI groups beyond simple record counts", () => {
    const kpis = buildOperatingKpis({
      clients,
      jobs,
      workOrders,
      loads,
      equipment,
      fieldUpdates,
      scheduleTasks,
      treeRelocationRecords: [
        { id: "tree-ready", title: "Tree Ready", status: "Ready for Relocation" },
        { id: "tree-prune", title: "Tree Prune", status: "Root Pruning" },
      ],
      importBatches: [{ id: "import-seed", recordCount: 4, createdCount: 4, updatedCount: 0, warningCount: 1, warnings: [], targets: [], seedBatchId: "seed-1" }],
    });

    assert.deepEqual(
      kpis.map((group) => [group.id, group.metrics.map((metric) => [metric.label, metric.value])]),
      [
        ["projectHealth", [["Active Projects", "2"], ["At Risk", "1"], ["Blocked", "1"], ["Missing Crew", "1"]]],
        ["crewCommunication", [["Field Updates", "1"], ["Needs Review", "1"], ["Unassigned Tasks", "1"]]],
        ["freightReadiness", [["Active Loads", "1"], ["Dispatch Gaps", "1"], ["Proof Needed", "1"]]],
        ["equipmentReadiness", [["Fleet Records", "1"], ["Service Holds", "1"], ["Down / Repair", "1"]]],
        ["treeLifecycle", [["Relocation Trees", "2"], ["Ready", "1"], ["Root Pruning", "1"], ["Installed", "0"]]],
        ["revealTelematics", [["Reveal Vehicles", "0"], ["Live GPS", "0"], ["Stale GPS", "0"], ["GPS Events", "0"]]],
        ["dataQuality", [["Relationship Issues", "1"], ["Seed Records", "1"], ["Import Warnings", "1"]]],
      ],
    );
  });

  it("builds a prioritized data quality action queue for relationship and import cleanup", () => {
    const projects: ProjectRecord[] = [
      {
        id: "project-no-client",
        title: "Unlinked project",
        projectName: "Unlinked project",
        status: "Active",
      },
    ];
    const dirtyWorkOrders: WorkOrderRecord[] = [
      {
        id: "wo-missing-project",
        title: "Root prune with no project",
        status: "Scheduled",
        clientName: "Boca West Country Club",
      },
    ];
    const dirtyTrees: TreeRelocationRecord[] = [
      {
        id: "tree-1003",
        treeId: "1003",
        title: "Live Oak 1003",
        status: "Not Started",
      },
    ];
    const dirtyDocuments: DocumentRecord[] = [
      {
        id: "doc-floating-photo",
        title: "Floating field photo",
        category: "Tree Photo",
      },
    ];
    const warningImports: ImportBatchRecord[] = [
      {
        id: "import-project-tree-assets",
        name: "Project tree import",
        recordCount: 5,
        createdCount: 4,
        updatedCount: 1,
        warningCount: 2,
        warnings: ["Row 3 missing Project_ID", "Row 5 has unknown Tree_Assets_ID"],
        targets: [{
          collectionName: "treeRelocationRecords",
          label: "Tree records",
          recordIds: ["tree-1003"],
          createdIds: ["tree-1003"],
          updatedIds: [],
          previousRecords: [],
        }],
        status: "Applied",
      },
    ];

    const queue = buildDataQualityActionQueue({
      clients,
      projects,
      jobs,
      workOrders: dirtyWorkOrders,
      loads: [{ ...loads[0], projectId: "", jobId: "" }],
      treeRelocationRecords: dirtyTrees,
      documents: dirtyDocuments,
      importBatches: warningImports,
    });

    assert.deepEqual(
      queue.slice(0, 6).map((item) => [item.severity, item.sourceType, item.title, item.recommendedAction]),
      [
        ["High", "job", "Boca West Course 1 Renovation", "Fix the saved client/project/job link before using this record for scheduling or reports."],
        ["High", "project", "Unlinked project", "Select the saved client before this project is used for work orders, maps, imports, or reports."],
        ["High", "workOrder", "Root prune with no project", "Attach this work order to a saved project so crew, equipment, freight, field updates, and reports stay connected."],
        ["High", "tree", "Live Oak 1003", "Attach this tree to the correct project before using it in maps, root pruning, nutrient care, photos, or status reports."],
        ["Medium", "load", "Bellaire freight", "Fix the saved client/project/job link before using this record for scheduling or reports."],
        ["Medium", "document", "Floating field photo", "Link this file or photo to a client, project, work order, tree, equipment, personnel record, or freight move."],
      ],
    );
    assert.equal(queue.at(-1)?.sourceType, "importBatch");
    assert.match(queue.at(-1)?.detail || "", /Row 3 missing Project_ID/);
  });

  it("builds workflow readiness issues by dispatch and closeout stage", () => {
    const incompleteProject: ProjectRecord = {
      id: "project-waterford",
      title: "Waterford Relocation",
      clientId: "cli-waterford",
      clientName: "Waterford",
      division: "Relocation & Installation",
      status: "Active",
    };
    const incompleteWorkOrder: WorkOrderRecord = {
      id: "wo-waterford-root-prune",
      title: "Root prune Waterford trees",
      projectId: "project-waterford",
      projectName: "Waterford Relocation",
      workOrderType: "tree_pruning",
      status: "Ready",
    };
    const incompleteLoad: LoadRecord = {
      id: "load-waterford",
      title: "Waterford equipment move",
      projectId: "project-waterford",
      projectName: "Waterford Relocation",
      jobId: "job-waterford",
      jobName: "Waterford relocation",
      status: "Scheduled",
    };
    const incompleteEquipment: EquipmentRecord = {
      id: "equipment-loader-1",
      name: "Komatsu 500 - 1",
      status: "Down",
    };
    const incompleteFieldUpdate: FieldUpdateRecord = {
      id: "field-update-closeout",
      title: "Waterford closeout",
      updateType: "Complete",
      crewName: "Carlos Reyes",
    };
    const incompleteTree: TreeRelocationRecord = {
      id: "tree-waterford-1003",
      title: "Live Oak 1003",
      treeId: "1003",
      type: "Live Oak",
      status: "Ready for Relocation",
    };
    const incompleteInventory: RanchOakRecord = {
      id: "inventory-live-oak-batch",
      title: "Live Oak starter batch",
      inventoryClass: "Propagation",
      species: "Live Oak",
      quantity: "",
    };

    const queue = buildWorkflowReadinessQueue({
      projects: [incompleteProject],
      workOrders: [incompleteWorkOrder],
      loads: [incompleteLoad],
      equipment: [incompleteEquipment],
      fieldUpdates: [incompleteFieldUpdate],
      treeRelocationRecords: [incompleteTree],
      ranchOaks: [incompleteInventory],
    });

    assert.deepEqual(
      queue.slice(0, 7).map((item) => [item.workflow, item.stage, item.title, item.missingFields]),
      [
        ["Project", "Dispatch", "Waterford Relocation", ["Main location"]],
        ["Crew Work Order", "Dispatch", "Root prune Waterford trees", ["Scheduled date or date range", "Crew lead or assigned crew", "Work location"]],
        ["Freight Move", "Dispatch", "Waterford equipment move", ["Driver", "Truck", "Move date", "Route stops or origin/delivery"]],
        ["Equipment / Maintenance", "Review", "Komatsu 500 - 1", ["Current location", "Service status"]],
        ["Field Closeout", "Closeout", "Waterford closeout", ["Related record", "Closeout notes or location detail"]],
        ["Project Tree", "Dispatch", "Live Oak 1003", ["Project", "Source pin", "Destination pin"]],
        ["Nursery Inventory", "Review", "Live Oak starter batch", ["Farm, location, or zone", "Quantity"]],
      ],
    );
    assert.equal(queue[2].recommendedAction, "Complete freight dispatch details before sending this move to a driver.");
    assert.equal(queue[2].targetTab, "freight");
  });

  it("filters seed records by batch id without removing live records", () => {
    const records = [
      { id: "seed-a", seedBatchId: "seed-1", isSeedData: true },
      { id: "seed-b", isSeedData: true },
      { id: "live-a", title: "Live" },
    ];

    assert.equal(isSeedRecord(records[0], "seed-1"), true);
    assert.equal(isSeedRecord(records[1], "seed-1"), false);
    assert.deepEqual(filterSeedRecords(records, "seed-1").map((record) => record.id), ["seed-b", "live-a"]);
    assert.deepEqual(filterSeedRecords(records).map((record) => record.id), ["live-a"]);
  });
});
