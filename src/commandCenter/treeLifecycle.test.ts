import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTreeLifecycleAlerts,
  defaultRelocationStatus,
  formatRelocationCost,
  relocationStatusBadgeClass,
  relocationStatusOptions,
} from "./treeLifecycle";
import type { JobRecord, TreeRelocationRecord, WorkOrderRecord } from "./records";

describe("tree relocation lifecycle", () => {
  const bocaProject: JobRecord = {
    id: "job-boca-course-1",
    title: "Boca West Course 1 Renovation",
    projectId: "project-boca-course-1",
    projectName: "Boca West Course 1 Renovation",
    clientName: "Boca West Country Club",
    rootPruningPeriodMonths: 4,
  };

  it("keeps relocation status options explicit and defaults new trees to Not Started", () => {
    assert.equal(defaultRelocationStatus, "Not Started");
    assert.deepEqual(relocationStatusOptions, [
      "Not Started",
      "1st Cut Scheduled",
      "1st Cut Complete",
      "2nd Cut Scheduled",
      "2nd Cut Complete",
      "Ready For Relocation",
      "Relocated",
      "Moved To Holding Area",
      "Invoiced",
      "Paid",
      "In Nutrient Care Phase",
    ]);
  });

  it("formats relocation costs as currency for tree asset displays", () => {
    assert.equal(formatRelocationCost(12732.5), "$12,732.50");
    assert.equal(formatRelocationCost("12732.5"), "$12,732.50");
    assert.equal(formatRelocationCost(""), "-");
  });

  it("maps relocation statuses to earthy stoplight badge classes", () => {
    assert.match(relocationStatusBadgeClass("Not Started"), /bg-\[#F7E4DC\]/);
    assert.match(relocationStatusBadgeClass("1st Cut Scheduled"), /bg-\[#FFF1CC\]/);
    assert.match(relocationStatusBadgeClass("2nd Cut Complete"), /bg-\[#F7E9D6\]/);
    assert.match(relocationStatusBadgeClass("Ready For Relocation"), /bg-\[#EAF1E2\]/);
    assert.match(relocationStatusBadgeClass("Paid"), /bg-\[#DDEBD2\]/);
  });

  it("alerts the command board to schedule the first cut for a new tree", () => {
    const tree: TreeRelocationRecord = {
      id: "tree-1001",
      treeId: "1001",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
    };

    const alerts = buildTreeLifecycleAlerts({
      trees: [tree],
      jobs: [bocaProject],
      todayIso: "2026-06-04",
    });

    assert.deepEqual(alerts.map((alert) => [alert.action, alert.title, alert.treeId]), [
      ["schedule_first_cut", "Schedule 1st Cut", "1001"],
    ]);
  });

  it("alerts after a scheduled first cut date passes without completion", () => {
    const tree: TreeRelocationRecord = {
      id: "tree-1002",
      treeId: "1002",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "1st Cut Scheduled",
    };
    const firstCut: WorkOrderRecord = {
      id: "wo-first-cut-1002",
      title: "Root Pruning 1002",
      projectId: bocaProject.projectId,
      workOrderType: "tree_pruning",
      treeIds: ["1002"],
      scheduledDate: "2026-06-01",
      status: "Scheduled",
      assignedCrewNames: ["Carlos Reyes"],
    };

    const alerts = buildTreeLifecycleAlerts({
      trees: [tree],
      jobs: [bocaProject],
      workOrders: [firstCut],
      todayIso: "2026-06-04",
    });

    assert.deepEqual(alerts.map((alert) => [alert.action, alert.title]), [
      ["confirm_first_cut_complete", "Confirm 1st Cut Complete"],
    ]);
  });

  it("uses the project root-pruning period and tree overrides to time second cut and readiness alerts", () => {
    const standardTree: TreeRelocationRecord = {
      id: "tree-1003",
      treeId: "1003",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "1st Cut Complete",
      firstCutDate: "2026-02-01",
    };
    const longerTree: TreeRelocationRecord = {
      id: "tree-1004",
      treeId: "1004",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "2nd Cut Complete",
      firstCutDate: "2026-02-01",
      rootPruningPeriodMonths: 6,
    };

    const alerts = buildTreeLifecycleAlerts({
      trees: [standardTree, longerTree],
      jobs: [bocaProject],
      todayIso: "2026-06-04",
    });

    assert.deepEqual(alerts.map((alert) => [alert.treeId, alert.action]), [
      ["1003", "schedule_second_cut"],
      ["1003", "mark_ready_for_relocation"],
      ["1003", "schedule_nutrient_after_first_cut"],
      ["1004", "schedule_nutrient_after_first_cut"],
      ["1004", "schedule_nutrient_after_second_cut"],
    ]);
  });

  it("alerts for invoicing and nutrient care after relocation payment milestones", () => {
    const relocatedTree: TreeRelocationRecord = {
      id: "tree-1005",
      treeId: "1005",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "Relocated",
      relocationDate: "2026-06-01",
    };
    const paidTree: TreeRelocationRecord = {
      id: "tree-1006",
      treeId: "1006",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "Paid",
      relocationDate: "2026-06-01",
    };

    const alerts = buildTreeLifecycleAlerts({
      trees: [relocatedTree, paidTree],
      jobs: [bocaProject],
      todayIso: "2026-06-04",
    });

    assert.deepEqual(alerts.map((alert) => [alert.treeId, alert.action]), [
      ["1005", "invoice_relocated_tree"],
      ["1005", "schedule_nutrient_after_relocation"],
      ["1006", "start_nutrient_care_phase"],
      ["1006", "schedule_nutrient_after_relocation"],
    ]);
  });

  it("treats moved to holding area as temporary movement without automatic invoicing", () => {
    const holdingTree: TreeRelocationRecord = {
      id: "tree-1007",
      treeId: "1007",
      type: "Live Oak",
      projectId: bocaProject.projectId,
      projectName: bocaProject.projectName,
      relocationStatus: "Moved To Holding Area",
      relocationDate: "2026-06-01",
    };

    const alerts = buildTreeLifecycleAlerts({
      trees: [holdingTree],
      jobs: [bocaProject],
      todayIso: "2026-06-04",
    });

    assert.deepEqual(alerts.map((alert) => [alert.treeId, alert.action]), [
      ["1007", "schedule_nutrient_after_relocation"],
    ]);
  });
});
