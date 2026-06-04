import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDataSyncDraft,
  serializeDataSyncDraft,
} from "./syncDraft";

describe("data sync draft persistence", () => {
  it("preserves pasted spreadsheet rows and the selected import template across refresh", () => {
    const pastedRows = "Farm ID\tZone\tSpecies\tQuantity\n25 Acre\t1 Back\tPodocarpus Weeping\t4";
    const serialized = serializeDataSyncDraft({
      templateId: "inventory",
      pastedRows,
      savedAtIso: "2026-05-31T15:30:00.000Z",
    });

    assert.deepEqual(parseDataSyncDraft(serialized), {
      templateId: "inventory",
      pastedRows,
      savedAtIso: "2026-05-31T15:30:00.000Z",
    });
  });

  it("preserves project import context when Data Sync is opened from a project", () => {
    const serialized = serializeDataSyncDraft({
      templateId: "jdt_project_flow_tree_assets",
      pastedRows: "Tree_Assets_ID\tProjects_ID\tTree Type\n1001\t\tLive Oak",
      projectContext: {
        clientId: "cli-waterford",
        clientName: "Waterford",
        projectId: "project-waterford",
        projectName: "Waterford Relocation",
        jobId: "job-waterford-relocation",
        jobName: "Tree relocation",
      },
      savedAtIso: "2026-06-04T12:00:00.000Z",
    });

    assert.deepEqual(parseDataSyncDraft(serialized)?.projectContext, {
      clientId: "cli-waterford",
      clientName: "Waterford",
      projectId: "project-waterford",
      projectsId: "project-waterford",
      projectName: "Waterford Relocation",
      jobId: "job-waterford-relocation",
      jobName: "Tree relocation",
    });
  });

  it("rejects stale draft payloads with an unknown import template", () => {
    const serialized = JSON.stringify({
      templateId: "old-inventory-template",
      pastedRows: "Tree\tQty\nOak\t2",
    });

    assert.equal(parseDataSyncDraft(serialized), null);
  });
});
