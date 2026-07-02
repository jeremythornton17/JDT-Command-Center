import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { EquipmentRecord, JobRecord, LoadRecord, WorkOrderRecord } from "../commandCenter/records";
import CalendarBoard from "./CalendarBoard";

describe("CalendarBoard operations planner", () => {
  it("defaults to a clean calendar grid and keeps planner-only noise out of the first view", () => {
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

    assert.match(html, /Operations Calendar/);
    assert.match(html, /Week.*Grid/);
    assert.match(html, /Planner/);
    assert.match(html, /Grid/);
    assert.match(html, /Day/);
    assert.match(html, /Week/);
    assert.match(html, /Month/);
    assert.doesNotMatch(html, /Tomorrow Readiness/);
    assert.doesNotMatch(html, /Conflict Watch/);
    assert.doesNotMatch(html, /Visual Legend/);
    assert.doesNotMatch(html, /Client \/ Project/);
    assert.doesNotMatch(html, /Missing crew/);
    assert.match(html, /Christian Crespo/);
    assert.match(html, /Boca West Country Club/);
    assert.match(html, /Boca West/);
    assert.match(html, /Semi #1/);
    assert.match(html, /Root prune Live Oak 1003/);
    assert.doesNotMatch(html, /Service: Komatsu 500 - 1/);
    assert.match(html, /data-category="freight"/);
    assert.doesNotMatch(html, /data-category="nursery"/);
    assert.doesNotMatch(html, /data-category="equipment"/);
    assert.match(html, /data-category="relocation"/);
  });

  it("keeps planner details available when the planner mode is explicitly selected", () => {
    const jobs: JobRecord[] = [{
      id: "job-boca-course-1",
      title: "Boca West Course 1 Renovation",
      clientName: "Boca West Country Club",
      projectName: "Boca West Course 1 Renovation",
      scheduledDate: "2026-06-05",
      location: "Boca West",
      status: "Active",
    }];

    const html = renderToString(
      <CalendarBoard
        jobs={jobs}
        loads={[]}
        workOrders={[]}
        equipment={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        todayIso="2026-06-04"
        initialDisplayMode="Planner"
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Operations Calendar/);
    assert.match(html, /Week.*Planner/);
    assert.match(html, /Tomorrow Readiness/);
    assert.match(html, /Conflict Watch/);
    assert.match(html, /Visual Legend/);
    assert.match(html, /Client \/ Project/);
    assert.match(html, /calendar-planner-kpi-strip/);
    assert.match(html, /calendar-planner-kpi-card/);
    assert.doesNotMatch(html, /text-3xl font-black leading-none/);
  });

  it("renders multi-day schedule context and calendar grid controls", () => {
    const jobs: JobRecord[] = [{
      id: "job-week-window",
      title: "Boca West root pruning window",
      clientName: "Boca West Country Club",
      projectName: "Boca West Course 1 Renovation",
      startDate: "2026-06-08",
      endDate: "2026-06-12",
      crew: "Carlos Reyes",
      location: "Boca West",
      status: "Scheduled",
    }];

    const html = renderToString(
      <CalendarBoard
        jobs={jobs}
        loads={[]}
        workOrders={[]}
        equipment={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        todayIso="2026-06-07"
        initialDisplayMode="Calendar Grid"
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Blocks 5 days/);
    assert.match(html, /Jun 8 - Jun 12/);
    assert.match(html, /Grid/);
    assert.match(html, /Sun/);
    assert.match(html, /Mon/);
    assert.match(html, /Sat/);
  });

  it("renders the JD Thornton Work Schedule sync action when enabled", () => {
    const html = renderToString(
      <CalendarBoard
        jobs={[]}
        loads={[]}
        workOrders={[]}
        equipment={[]}
        scheduleTasks={[]}
        treeRelocationRecords={[]}
        todayIso="2026-06-26"
        initialDisplayMode="Calendar Grid"
        googleCalendarSyncStatus="Ready to sync JD Thornton Work Schedule"
        canSyncGoogleCalendar={true}
        onSyncGoogleCalendar={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Sync Google Calendar/);
    assert.match(html, /Ready to sync JD Thornton Work Schedule/);
  });
});
