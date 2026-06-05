import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { EquipmentRecord, JobRecord, LoadRecord, WorkOrderRecord } from "../commandCenter/records";
import CalendarBoard from "./CalendarBoard";

describe("CalendarBoard operations planner", () => {
  it("renders planner views, category filters, readiness, and conflict warnings", () => {
    const jobs: JobRecord[] = [{
      id: "job-boca-course-1",
      title: "Boca West Course 1 Renovation",
      clientName: "Boca West Country Club",
      projectName: "Boca West Course 1 Renovation",
      scheduledDate: "2026-06-05",
      location: "Boca West",
      status: "Active",
    }];
    const loads: LoadRecord[] = [
      { id: "load-1", title: "Semi #1 equipment move", driver: "Christian Crespo", truck: "Semi #1", trailer: "Black Lowboy", pickupDate: "2026-06-05", status: "Scheduled" },
      { id: "load-2", title: "Semi #1 tree delivery", driver: "Christian Crespo", truck: "Semi #1", trailer: "Dropdeck", pickupDate: "2026-06-05", status: "Scheduled" },
    ];
    const workOrders: WorkOrderRecord[] = [{
      id: "wo-root-prune",
      title: "Root prune Live Oak 1003",
      workOrderType: "tree_pruning",
      scheduledDate: "2026-06-05",
      status: "Scheduled",
      assignedCrewNames: [],
    }];
    const equipment: EquipmentRecord[] = [{
      id: "equipment-komatsu-500-1",
      name: "Komatsu 500 - 1",
      category: "Machine",
      nextServiceDue: "2026-06-05",
    }];

    const html = renderToString(
      <CalendarBoard
        jobs={jobs}
        loads={loads}
        workOrders={workOrders}
        equipment={equipment}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        todayIso="2026-06-04"
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Week Operations Planner/);
    assert.match(html, /Today/);
    assert.match(html, /Tomorrow/);
    assert.match(html, /Week/);
    assert.match(html, /Month/);
    assert.match(html, /Tomorrow Readiness/);
    assert.match(html, /Conflict Watch/);
    assert.match(html, /Missing crew/);
    assert.match(html, /Christian Crespo/);
    assert.match(html, /Semi #1/);
    assert.match(html, /Root prune Live Oak 1003/);
    assert.match(html, /Service: Komatsu 500 - 1/);
    assert.match(html, /data-category="freight"/);
    assert.match(html, /data-category="nursery"/);
    assert.match(html, /data-category="equipment"/);
    assert.match(html, /data-category="relocation"/);
  });
});
