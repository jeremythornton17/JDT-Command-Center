import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CrewRecord, FieldUpdateRecord, LoadRecord, WorkOrderRecord } from "./records";
import { buildCrewCloseoutPrompts, buildDailyCloseoutUpdate } from "./fieldCloseout";

describe("crew field closeout workflow", () => {
  const christian: CrewRecord = {
    id: "personnel-christian-crespo",
    name: "Christian Crespo",
    role: "Driver",
    email: "christian@jdtnurseries.com",
  };

  const freightMove: LoadRecord = {
    id: "load-semi-1",
    title: "Christian Crespo - Semi #1 - Boca West equipment moves",
    driver: "Christian Crespo",
    truck: "Semi #1",
    trailer: "Black Lowboy",
    projectId: "project-boca-west-course-1-renovation",
    projectName: "Boca West Course 1 Renovation",
    jobId: "job-boca-equipment-move",
    jobName: "Equipment move",
    date: "2026-06-08",
    origin: "JD Thornton Nurseries Home Base",
    delivery: "25 Acre Farm",
    status: "Scheduled",
  };

  const workOrder: WorkOrderRecord = {
    id: "workorder-root-prune-1003",
    title: "Root prune Live Oak 1003",
    workOrderType: "Root Pruning",
    taskType: "1st root prune",
    crewLeadName: "Christian Crespo",
    projectId: "project-waterford-relocation",
    projectName: "Waterford Relocation",
    jobId: "job-waterford-root-pruning",
    jobName: "Root pruning",
    scheduledDate: "2026-06-08",
    siteArea: "North course",
    treeIds: ["1003"],
    treeNames: ["Live Oak 1003"],
    status: "Scheduled",
  };

  it("builds closeout prompts from assigned freight and work order records", () => {
    const fieldUpdates: FieldUpdateRecord[] = [
      {
        id: "field-update-closeout",
        crewName: "Christian Crespo",
        relatedRecordType: "load",
        relatedRecordId: "load-semi-1",
        relatedTitle: "Christian Crespo - Semi #1 - Boca West equipment moves",
        updateType: "Daily Closeout",
        fieldStatus: "Closeout Submitted",
        closeoutDate: "2026-06-08",
      },
    ];

    const prompts = buildCrewCloseoutPrompts({
      crew: christian,
      loads: [freightMove],
      workOrders: [workOrder],
      fieldUpdates,
      dateIso: "2026-06-08",
    });

    assert.deepEqual(prompts.map((prompt) => [prompt.type, prompt.title, prompt.closeoutStatus]), [
      ["load", "Christian Crespo - Semi #1 - Boca West equipment moves", "Submitted"],
      ["workOrder", "Root prune Live Oak 1003", "Needs Closeout"],
    ]);
    assert.equal(prompts[0].scheduleLabel, "2026-06-08");
    assert.equal(prompts[0].locationLabel, "JD Thornton Nurseries Home Base -> 25 Acre Farm");
    assert.deepEqual(prompts[1].treeOrMaterialLabels, ["Live Oak 1003"]);
    assert.equal(prompts[1].recommendedAction, "Submit daily closeout before the office reviews tomorrow readiness.");
  });

  it("builds a structured closeout update with review routing when issues are reported", () => {
    const update = buildDailyCloseoutUpdate({
      crew: christian,
      assignment: {
        id: workOrder.id!,
        type: "workOrder",
        title: workOrder.title!,
        source: workOrder,
      },
      closeoutDate: "2026-06-08",
      workCompleted: "Completed first root prune on tags 1003 and 1004.",
      treeTagText: "1003, 1004",
      locationDetail: "North course by pump station, 26.8570,-80.0579",
      issueSummary: "Irrigation line was exposed near 1004.",
      tomorrowPlan: "Return for nutrient care and photo check.",
      proofAttachmentText: "Photos: https://drive.google.com/file/d/root-prune-photo and BOL https://drive.google.com/file/d/bol-proof",
      userEmail: "christian@jdtnurseries.com",
    });

    assert.equal(update.updateType, "Daily Closeout");
    assert.equal(update.fieldStatus, "Closeout Submitted");
    assert.equal(update.status, "Needs Review");
    assert.equal(update.needsAdminReview, true);
    assert.equal(update.relatedRecordType, "workOrder");
    assert.equal(update.relatedRecordId, "workorder-root-prune-1003");
    assert.equal(update.relatedTitle, "Root prune Live Oak 1003");
    assert.equal(update.closeoutDate, "2026-06-08");
    assert.equal(update.treeTagText, "1003, 1004");
    assert.equal(update.locationDetail, "North course by pump station, 26.8570,-80.0579");
    assert.equal(update.proofAttachmentText, "Photos: https://drive.google.com/file/d/root-prune-photo and BOL https://drive.google.com/file/d/bol-proof");
    assert.deepEqual(update.proofLinks, [
      { label: "Proof 1", url: "https://drive.google.com/file/d/root-prune-photo" },
      { label: "Proof 2", url: "https://drive.google.com/file/d/bol-proof" },
    ]);
    assert.match(update.notes || "", /Completed first root prune/);
    assert.match(update.notes || "", /Tomorrow: Return for nutrient care/);
    assert.match(update.notes || "", /Proof links: https:\/\/drive.google.com\/file\/d\/root-prune-photo/);
  });
});
