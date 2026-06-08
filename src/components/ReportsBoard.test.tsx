import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ClientRecord, ImportBatchRecord, JobRecord } from "../commandCenter/records";
import ReportsBoard from "./ReportsBoard";

describe("ReportsBoard operating reports", () => {
  it("shows data quality relationship issues and import warnings", () => {
    const clients: ClientRecord[] = [{
      id: "cli-2275",
      title: "Boca West Country Club",
      name: "Boca West Country Club",
    }];
    const jobs: JobRecord[] = [{
      id: "job-boca-course-1",
      title: "Boca West Course 1 Renovation",
      clientName: "Boca West Country Club",
      clientId: "client-boca-west-country-club",
      projectName: "Boca West Course 1 Renovation",
      status: "Active",
    }];
    const importBatches: ImportBatchRecord[] = [{
      id: "batch-tree-import",
      title: "Waterford tree import",
      name: "Waterford tree import",
      recordCount: 12,
      createdCount: 10,
      updatedCount: 2,
      warningCount: 1,
      warnings: ["Row 7 missing Project_ID"],
      targets: [],
      status: "Applied",
    }];

    const html = renderToString(
      <ReportsBoard
        jobs={jobs}
        projects={[]}
        workOrders={[]}
        loads={[]}
        ranchOaks={[]}
        equipment={[]}
        alerts={[]}
        clients={clients}
        fieldUpdates={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        documents={[]}
        importBatches={importBatches}
      />,
    );

    assert.match(html, /Data Quality Action Queue/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Fix the saved client\/project\/job link/);
    assert.match(html, /Row 7 missing Project_ID/);
  });
});
