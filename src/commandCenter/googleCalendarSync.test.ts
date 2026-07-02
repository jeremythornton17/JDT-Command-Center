import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ScheduleTaskRecord } from "./records";
import {
  defaultJdtGoogleCalendarName,
  findGoogleCalendarId,
  googleCalendarEventToScheduleTask,
  googleCalendarReadonlyScope,
  mergeGoogleCalendarScheduleTasks,
} from "./googleCalendarSync";

describe("Google Calendar schedule sync", () => {
  const calendar = { id: "jd-work-schedule", summary: defaultJdtGoogleCalendarName };

  it("uses a readonly Google Calendar scope separate from normal sign-in", () => {
    assert.equal(googleCalendarReadonlyScope, "https://www.googleapis.com/auth/calendar.readonly");
  });

  it("finds the JD Thornton Work Schedule calendar by name", () => {
    const calendars = [
      { id: "personal", summary: "Jeremy" },
      { id: "work", summary: "JD Thornton Work Schedule" },
    ];

    assert.equal(findGoogleCalendarId(calendars), "work");
    assert.equal(findGoogleCalendarId(calendars, "jd thornton work schedule"), "work");
  });

  it("maps timed Google events into JDT schedule tasks", () => {
    const task = googleCalendarEventToScheduleTask({
      id: "event-1",
      summary: "Boca West root prune",
      description: "Crew: Carlos. Confirm access.",
      location: "20583 Boca West Dr, Boca Raton, FL 33434",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event",
      updated: "2026-06-25T16:00:00.000Z",
      start: { dateTime: "2026-06-26T07:30:00-04:00" },
      end: { dateTime: "2026-06-26T09:00:00-04:00" },
    }, calendar, "2026-06-26T12:00:00.000Z");

    assert.equal(task.id, "google-calendar-jd-work-schedule-event-1");
    assert.equal(task.task, "Boca West root prune");
    assert.equal(task.startDate, "2026-06-26");
    assert.equal(task.endDate, "2026-06-26");
    assert.equal(task.time, "7:30 AM - 9:00 AM");
    assert.equal(task.locationName, "20583 Boca West Dr, Boca Raton, FL 33434");
    assert.equal(task.mainAddress, "20583 Boca West Dr, Boca Raton, FL 33434");
    assert.equal(task.googleCalendarId, "jd-work-schedule");
    assert.equal(task.googleCalendarEventId, "event-1");
    assert.equal(task.googleCalendarSyncedAt, "2026-06-26T12:00:00.000Z");
    assert.equal(task.sourceType, "google_calendar");
    assert.match(task.notes || "", /Confirm access/);
  });

  it("treats all-day Google end dates as exclusive", () => {
    const task = googleCalendarEventToScheduleTask({
      id: "event-all-day",
      summary: "Office schedule block",
      start: { date: "2026-06-26" },
      end: { date: "2026-06-27" },
    }, calendar, "2026-06-26T12:00:00.000Z");

    assert.equal(task.startDate, "2026-06-26");
    assert.equal(task.endDate, "2026-06-26");
    assert.equal(task.time, "All day");
  });

  it("merges synced Google events without deleting manual JDT tasks", () => {
    const manualTask: ScheduleTaskRecord = {
      id: "manual-1",
      task: "Manual nursery loading task",
      startDate: "2026-06-26",
    };
    const oldGoogleTask: ScheduleTaskRecord = {
      id: "google-calendar-jd-work-schedule-old",
      task: "Removed Google event",
      startDate: "2026-06-26",
      sourceType: "google_calendar",
      googleCalendarId: "jd-work-schedule",
    };
    const outsideWindowGoogleTask: ScheduleTaskRecord = {
      id: "google-calendar-jd-work-schedule-future",
      task: "Future Google event",
      startDate: "2026-08-10",
      sourceType: "google_calendar",
      googleCalendarId: "jd-work-schedule",
    };
    const incoming: ScheduleTaskRecord = {
      id: "google-calendar-jd-work-schedule-event-1",
      task: "Boca West root prune",
      startDate: "2026-06-26",
      sourceType: "google_calendar",
      googleCalendarId: "jd-work-schedule",
    };

    const merged = mergeGoogleCalendarScheduleTasks(
      [manualTask, oldGoogleTask, outsideWindowGoogleTask],
      [incoming],
      { calendarId: "jd-work-schedule", windowStartIso: "2026-06-24", windowEndIso: "2026-06-30" },
    );

    assert.equal(merged.some((task) => task.id === manualTask.id), true);
    assert.equal(merged.some((task) => task.id === oldGoogleTask.id), false);
    assert.equal(merged.some((task) => task.id === outsideWindowGoogleTask.id), true);
    assert.equal(merged.some((task) => task.id === incoming.id), true);
  });
});
