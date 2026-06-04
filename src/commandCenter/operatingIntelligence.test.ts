import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDailyCommandBrief,
  buildOperatingKpis,
  buildProjectRiskScores,
  filterSeedRecords,
  findRelationshipIssues,
  isSeedRecord,
} from "./operatingIntelligence";
import type {
  ClientRecord,
  EquipmentRecord,
  FieldUpdateRecord,
  JobRecord,
  LoadRecord,
  ScheduleTaskRecord,
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
        ["dataQuality", [["Relationship Issues", "1"], ["Seed Records", "1"], ["Import Warnings", "1"]]],
      ],
    );
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
