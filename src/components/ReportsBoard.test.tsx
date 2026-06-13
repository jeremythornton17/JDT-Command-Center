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

  it("shows workflow readiness issues for records missing dispatch details", () => {
    const html = renderToString(
      <ReportsBoard
        jobs={[]}
        projects={[]}
        workOrders={[]}
        loads={[{
          id: "load-waterford",
          title: "Waterford equipment move",
          projectId: "project-waterford",
          projectName: "Waterford Relocation",
          jobId: "job-waterford",
          jobName: "Waterford relocation",
          status: "Scheduled",
        }]}
        ranchOaks={[]}
        equipment={[]}
        alerts={[]}
        clients={[]}
        fieldUpdates={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        documents={[]}
        importBatches={[]}
      />,
    );

    assert.match(html, /Workflow Readiness/);
    assert.match(html, /Waterford equipment move/);
    assert.match(html, /Freight Move/);
    assert.match(html, /Driver/);
    assert.match(html, /Complete freight dispatch details before sending this move to a driver/);
  });

  it("shows Reveal telematics KPIs from GPS events", () => {
    const html = renderToString(
      <ReportsBoard
        jobs={[]}
        projects={[]}
        workOrders={[]}
        loads={[]}
        ranchOaks={[]}
        equipment={[{
          id: "equipment-semi-1",
          name: "Semi #1",
          category: "Truck",
          telematicsProvider: "Reveal",
          revealVehicleId: "veh-1",
          lastTelematicsAt: "2026-06-12T12:00:00.000Z",
        }]}
        fleetTelematicsEvents={[{
          id: "reveal-veh-1",
          provider: "Reveal",
          providerVehicleId: "veh-1",
          vehicleName: "Semi #1",
          vehicleNumber: "S1",
          latitude: 26.387315,
          longitude: -80.171258,
          eventAt: "2026-06-12T12:05:00.000Z",
        }]}
        alerts={[]}
        clients={[]}
        fieldUpdates={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        documents={[]}
        importBatches={[]}
      />,
    );

    assert.match(html, /Reveal Telematics/);
    assert.match(html, /Reveal Vehicles/);
    assert.match(html, /Live GPS/);
    assert.match(html, /GPS Events/);
  });
});
