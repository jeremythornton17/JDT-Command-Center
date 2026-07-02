import type { ScheduleTaskRecord } from "./records";

export const googleCalendarReadonlyScope = "https://www.googleapis.com/auth/calendar.readonly";
export const defaultJdtGoogleCalendarName = "JD Thornton Work Schedule";

export type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
};

export type GoogleCalendarEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
  updated?: string;
  start?: GoogleCalendarEventDate;
  end?: GoogleCalendarEventDate;
};

export type GoogleCalendarSyncWindow = {
  startIso: string;
  endIso: string;
};

export type GoogleCalendarSyncResult = {
  calendar: GoogleCalendarListEntry;
  importedCount: number;
  removedCount: number;
  scheduleTasks: ScheduleTaskRecord[];
};

type FetchLike = typeof fetch;

function clean(value: unknown): string {
  return String(value || "").trim();
}

function slug(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function dateFromGoogleDate(value?: GoogleCalendarEventDate): string {
  const raw = clean(value?.date || value?.dateTime);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateIso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizedDateWindow(window: GoogleCalendarSyncWindow): GoogleCalendarSyncWindow {
  const startIso = dateFromGoogleDate({ date: window.startIso }) || new Date().toISOString().slice(0, 10);
  const endIso = dateFromGoogleDate({ date: window.endIso }) || startIso;
  return {
    startIso: startIso <= endIso ? startIso : endIso,
    endIso: endIso >= startIso ? endIso : startIso,
  };
}

function googleApiTimeMin(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toISOString();
}

function googleApiTimeMax(dateIso: string): string {
  return new Date(`${addDaysIso(dateIso, 1)}T00:00:00`).toISOString();
}

function exclusiveAllDayEndDate(event: GoogleCalendarEvent, startDate: string): string {
  const endDate = dateFromGoogleDate(event.end);
  if (!endDate) return startDate;
  if (event.end?.date && endDate > startDate) return addDaysIso(endDate, -1);
  return endDate;
}

function timeLabel(event: GoogleCalendarEvent): string {
  if (!event.start?.dateTime) return "All day";
  const start = new Date(event.start.dateTime);
  const end = event.end?.dateTime ? new Date(event.end.dateTime) : undefined;
  if (Number.isNaN(start.getTime())) return "Scheduled";
  const format = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!end || Number.isNaN(end.getTime())) return format(start);
  return `${format(start)} - ${format(end)}`;
}

function deriveActivityType(event: GoogleCalendarEvent): string {
  const text = [event.summary, event.description, event.location].map((value) => clean(value).toLowerCase()).join(" ");
  if (/freight|delivery|truck|trailer|load|dispatch/.test(text)) return "Freight";
  if (/equipment|implement|machine|service|maintenance|repair|inspection/.test(text)) return "Equipment";
  if (/relocation|install|root prune|root-prune|pruning|nutrient|care|treatment|aftercare|tree move/.test(text)) return "Relocation";
  if (/nursery|pickup|plant|irrigation|watering|farm/.test(text)) return "Nursery";
  return "Crew";
}

function tasksOverlapWindow(task: ScheduleTaskRecord, window: GoogleCalendarSyncWindow): boolean {
  const startDate = dateFromGoogleDate({ date: task.startDate || task.endDate });
  if (!startDate) return false;
  const endDate = dateFromGoogleDate({ date: task.endDate }) || startDate;
  return startDate <= window.endIso && endDate >= window.startIso;
}

async function fetchGoogleApiJson<T>(url: string, accessToken: string, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = clean((payload as { error?: { message?: string } }).error?.message) || `Google Calendar API request failed with ${response.status}.`;
    throw new Error(message);
  }
  return payload as T;
}

export function getConfiguredGoogleCalendarName(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return clean(env?.VITE_GOOGLE_CALENDAR_NAME) || defaultJdtGoogleCalendarName;
}

export function getConfiguredGoogleCalendarId(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return clean(env?.VITE_GOOGLE_CALENDAR_ID);
}

export function findGoogleCalendarId(calendars: GoogleCalendarListEntry[], preferredName = defaultJdtGoogleCalendarName): string {
  const preferred = clean(preferredName).toLowerCase();
  const exact = calendars.find((calendar) => clean(calendar.summary).toLowerCase() === preferred);
  if (exact?.id) return exact.id;

  const fallbackTerms = ["jd thornton", "work schedule"];
  const fuzzy = calendars.find((calendar) => {
    const summary = clean(calendar.summary).toLowerCase();
    return fallbackTerms.every((term) => summary.includes(term));
  });
  return clean(fuzzy?.id);
}

export function googleCalendarEventToScheduleTask(
  event: GoogleCalendarEvent,
  calendar: GoogleCalendarListEntry,
  syncedAtIso = new Date().toISOString(),
): ScheduleTaskRecord {
  const startDate = dateFromGoogleDate(event.start) || syncedAtIso.slice(0, 10);
  const endDate = exclusiveAllDayEndDate(event, startDate);
  const title = clean(event.summary) || "Google Calendar event";
  const location = clean(event.location);
  const calendarId = clean(calendar.id) || "calendar";
  const eventId = clean(event.id) || `${slug(title)}-${startDate}`;

  return {
    id: `google-calendar-${slug(calendarId)}-${slug(eventId)}`,
    jobScheduleId: eventId,
    title,
    task: title,
    activityType: deriveActivityType(event),
    startDate,
    endDate,
    time: timeLabel(event),
    status: event.status === "cancelled" ? "Cancelled" : "Scheduled",
    locationName: location,
    mainAddress: location,
    notes: clean(event.description),
    sourceSheet: `Google Calendar: ${clean(calendar.summary) || calendarId}`,
    sourceType: "google_calendar",
    googleCalendarId: calendarId,
    googleCalendarName: clean(calendar.summary),
    googleCalendarEventId: eventId,
    googleCalendarHtmlLink: clean(event.htmlLink),
    googleCalendarUpdatedAt: clean(event.updated),
    googleCalendarSyncedAt: syncedAtIso,
    googleCalendarEventStatus: clean(event.status) || "confirmed",
  };
}

export function mergeGoogleCalendarScheduleTasks(
  existingScheduleTasks: ScheduleTaskRecord[],
  incomingScheduleTasks: ScheduleTaskRecord[],
  options: { calendarId: string; windowStartIso: string; windowEndIso: string },
): ScheduleTaskRecord[] {
  const calendarId = clean(options.calendarId);
  const window = normalizedDateWindow({ startIso: options.windowStartIso, endIso: options.windowEndIso });
  const incomingById = new Map(incomingScheduleTasks.map((task) => [task.id, task]));
  const mergedById = new Map<string, ScheduleTaskRecord>();

  existingScheduleTasks.forEach((task) => {
    const sameGoogleCalendar = task.sourceType === "google_calendar" && clean(task.googleCalendarId) === calendarId;
    if (sameGoogleCalendar && tasksOverlapWindow(task, window) && !incomingById.has(task.id)) return;
    mergedById.set(task.id, task);
  });

  incomingScheduleTasks.forEach((task) => mergedById.set(task.id, task));

  return Array.from(mergedById.values()).sort((left, right) => (
    clean(left.startDate).localeCompare(clean(right.startDate))
    || clean(left.time).localeCompare(clean(right.time))
    || clean(left.task || left.title).localeCompare(clean(right.task || right.title))
  ));
}

export async function fetchGoogleCalendars(accessToken: string, fetchImpl: FetchLike = fetch): Promise<GoogleCalendarListEntry[]> {
  const payload = await fetchGoogleApiJson<{ items?: GoogleCalendarListEntry[] }>(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    accessToken,
    fetchImpl,
  );
  return payload.items || [];
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  window: GoogleCalendarSyncWindow,
  fetchImpl: FetchLike = fetch,
): Promise<GoogleCalendarEvent[]> {
  const cleanWindow = normalizedDateWindow(window);
  const events: GoogleCalendarEvent[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: googleApiTimeMin(cleanWindow.startIso),
      timeMax: googleApiTimeMax(cleanWindow.endIso),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const payload = await fetchGoogleApiJson<{ items?: GoogleCalendarEvent[]; nextPageToken?: string }>(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      accessToken,
      fetchImpl,
    );
    events.push(...(payload.items || []));
    pageToken = clean(payload.nextPageToken);
  } while (pageToken);

  return events;
}

export async function syncGoogleCalendarToScheduleTasks({
  accessToken,
  existingScheduleTasks,
  preferredCalendarName = getConfiguredGoogleCalendarName(),
  calendarId = getConfiguredGoogleCalendarId(),
  window,
  fetchImpl = fetch,
}: {
  accessToken: string;
  existingScheduleTasks: ScheduleTaskRecord[];
  preferredCalendarName?: string;
  calendarId?: string;
  window: GoogleCalendarSyncWindow;
  fetchImpl?: FetchLike;
}): Promise<GoogleCalendarSyncResult> {
  const calendars = calendarId ? [] : await fetchGoogleCalendars(accessToken, fetchImpl);
  const resolvedCalendarId = calendarId || findGoogleCalendarId(calendars, preferredCalendarName);
  if (!resolvedCalendarId) throw new Error(`Could not find Google Calendar named "${preferredCalendarName}".`);

  const calendar = calendars.find((item) => item.id === resolvedCalendarId) || { id: resolvedCalendarId, summary: preferredCalendarName };
  const events = await fetchGoogleCalendarEvents(accessToken, resolvedCalendarId, window, fetchImpl);
  const syncedAtIso = new Date().toISOString();
  const incomingScheduleTasks = events
    .filter((event) => event.status !== "cancelled")
    .map((event) => googleCalendarEventToScheduleTask(event, calendar, syncedAtIso));
  const beforeIds = new Set(existingScheduleTasks.map((task) => task.id));
  const nextScheduleTasks = mergeGoogleCalendarScheduleTasks(existingScheduleTasks, incomingScheduleTasks, {
    calendarId: resolvedCalendarId,
    windowStartIso: window.startIso,
    windowEndIso: window.endIso,
  });
  const afterIds = new Set(nextScheduleTasks.map((task) => task.id));
  const removedCount = Array.from(beforeIds).filter((id) => !afterIds.has(id)).length;

  return {
    calendar,
    importedCount: incomingScheduleTasks.length,
    removedCount,
    scheduleTasks: nextScheduleTasks,
  };
}
