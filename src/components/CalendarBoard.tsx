import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar as CalendarIcon, CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, ListChecks, MapPin } from 'lucide-react';
import {
  buildCalendarGridDays,
  buildOperatingCalendar,
  type CalendarGridDay,
  type CalendarGridView,
  type OperatingCalendarEvent,
} from '../commandCenter/calendar';
import type { EquipmentRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import {
  categoryAccentBorderClass,
  categoryLabel,
  riskPillClass,
  riskSurfaceClass,
  statusPillClass,
  statusSurfaceClass,
  type OperatingCategory,
} from '../commandCenter/visualLanguage';
import { CategoryIcon, CategoryPill } from './CategoryIcon';

type CalendarBoardProps = {
  jobs: JobRecord[];
  loads: LoadRecord[];
  workOrders?: WorkOrderRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  equipment?: EquipmentRecord[];
  todayIso?: string;
  initialDisplayMode?: CalendarDisplayMode;
  initialRangeView?: CalendarGridView;
  initialFocusDateIso?: string;
  openDrawer: (type: string, id: string) => void;
};

type CalendarDisplayMode = 'Planner' | 'Calendar Grid';

const displayModes: CalendarDisplayMode[] = ['Planner', 'Calendar Grid'];
const rangeViews: CalendarGridView[] = ['Day', 'Week', 'Month'];
const categoryFilters: Array<'All' | OperatingCategory> = ['All', 'relocation', 'crew', 'freight', 'equipment', 'nursery'];
const statusFilters = ['All', 'Needs Review', 'Scheduled', 'Active', 'Complete'];

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayNumber(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('en-US', { day: 'numeric' });
}

function formatWeekday(value: string, style: 'short' | 'long' = 'short'): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString('en-US', { weekday: style });
}

function formatRangeLabel(event: OperatingCalendarEvent): string {
  if (event.durationDays <= 1) return formatShortDate(event.dateIso);
  return `${formatShortDate(event.dateIso)} - ${formatShortDate(event.endDateIso)}`;
}

function addDaysIso(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonthsIso(value: string, months: number): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function rangeLabel(view: CalendarGridView, focusIso: string): string {
  if (view === 'Day') return new Date(`${focusIso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  if (view === 'Month') return new Date(`${focusIso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = buildCalendarGridDays([], 'Week', focusIso, focusIso);
  const first = days[0]?.dateIso || focusIso;
  const last = days[6]?.dateIso || focusIso;
  return `${formatShortDate(first)} - ${formatShortDate(last)}`;
}

function shiftFocusDate(value: string, view: CalendarGridView, direction: -1 | 1): string {
  if (view === 'Month') return addMonthsIso(value, direction);
  return addDaysIso(value, direction * (view === 'Week' ? 7 : 1));
}

function statusClass(event: OperatingCalendarEvent): string {
  if (event.conflicts.length || event.readinessIssues.length) return riskSurfaceClass('watch');
  return statusSurfaceClass(event.status);
}

function matchesStatusFilter(event: OperatingCalendarEvent, filter: string): boolean {
  const status = String(event.status || '').toLowerCase();
  if (filter === 'All') return true;
  if (filter === 'Needs Review') return event.readinessIssues.length > 0 || event.conflicts.length > 0 || status.includes('blocked') || status.includes('delayed');
  if (filter === 'Scheduled') return status.includes('scheduled') || status.includes('ready') || status.includes('draft');
  if (filter === 'Active') return status.includes('active') || status.includes('progress') || status.includes('dispatched') || status.includes('transit');
  if (filter === 'Complete') return status.includes('complete') || status.includes('delivered');
  return true;
}

function eventDrawerType(event: OperatingCalendarEvent): string | null {
  if (!event.recordId || event.drawerType === 'schedule') return null;
  return event.drawerType;
}

function readinessMetricTone(value: number): string {
  return value > 0 ? riskSurfaceClass('watch') : riskSurfaceClass('low');
}

function eventClientProjectLabel(event: OperatingCalendarEvent) {
  return {
    clientName: event.clientName || 'Internal Operations',
    projectName: event.projectName || event.detail || categoryLabel(event.category),
  };
}

function groupEventsByClientProject(events: OperatingCalendarEvent[]) {
  return events.reduce<Array<{ key: string; clientName: string; projectName: string; events: OperatingCalendarEvent[] }>>((groups, event) => {
    const labels = eventClientProjectLabel(event);
    const key = `${labels.clientName}::${labels.projectName}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.events.push(event);
      return groups;
    }
    groups.push({ key, ...labels, events: [event] });
    return groups;
  }, []);
}

function VisualLegend() {
  const categories: OperatingCategory[] = ['relocation', 'crew', 'freight', 'equipment', 'nursery'];
  const statuses = [
    ['Stop / Blocked', 'Blocked'],
    ['Caution / Scheduled', 'Scheduled'],
    ['Active Work', 'In Progress'],
    ['Ready / Complete', 'Ready'],
  ];

  return (
    <section className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase text-jdt-text">Visual Legend</h3>
          <p className="mt-1 text-[11px] font-bold text-zinc-500">Icons and category colors show what it is. Status colors show what condition it is in.</p>
        </div>
        <CategoryPill category="schedule" label="Calendar" compact />
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase text-zinc-400">Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => <CategoryPill key={category} category={category} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase text-zinc-400">Status / Risk</p>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map(([label, status]) => (
              <span key={label} className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(status)}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EventCard({ event, openDrawer }: { event: OperatingCalendarEvent; openDrawer: CalendarBoardProps['openDrawer'] }) {
  const drawerType = eventDrawerType(event);
  const actionable = Boolean(drawerType && event.recordId);
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CategoryIcon category={event.category} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-black text-jdt-text">{event.title}</p>
              <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${statusPillClass(event.status)}`}>{event.status}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{event.detail || event.projectName || event.clientName || categoryLabel(event.category)}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-black uppercase text-zinc-400">{formatRangeLabel(event)}</p>
          {event.durationDays > 1 && <p className="mt-1 text-[9px] font-black uppercase text-jdt-olive">Blocks {event.durationDays} days</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-zinc-500">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {event.timeLabel}</span>
        {event.assignee && <span>{event.assignee}</span>}
        {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
        {event.projectName && <span>{event.projectName}</span>}
      </div>

      {(event.readinessIssues.length > 0 || event.conflicts.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.conflicts.map((issue) => (
            <span key={issue} className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-black uppercase ${riskPillClass('watch')}`}>
              <AlertTriangle className="h-3 w-3" /> {issue}
            </span>
          ))}
          {event.readinessIssues.map((issue) => (
            <span key={issue} className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{issue}</span>
          ))}
        </div>
      )}
    </>
  );

  if (!actionable) {
    return <article className={`rounded-lg border border-jdt-border border-l-4 bg-white p-4 shadow-sm ${categoryAccentBorderClass(event.category)}`}>{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={() => openDrawer(drawerType!, event.recordId!)}
      className={`w-full rounded-lg border border-jdt-border border-l-4 bg-white p-4 text-left shadow-sm transition-colors hover:border-jdt-olive ${categoryAccentBorderClass(event.category)}`}
    >
      {content}
    </button>
  );
}

function CalendarGridEvent({ event, openDrawer }: { event: OperatingCalendarEvent; openDrawer: CalendarBoardProps['openDrawer'] }) {
  const drawerType = eventDrawerType(event);
  const actionable = Boolean(drawerType && event.recordId);
  const rangeSummary = event.durationDays > 1 ? `${formatRangeLabel(event)} - Blocks ${event.durationDays} days` : formatRangeLabel(event);
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <CategoryIcon category={event.category} size="xs" />
        <span className="truncate text-[11px] font-black text-jdt-text">{event.title}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-[9px] font-bold uppercase text-zinc-500">{event.assignee || event.timeLabel}</span>
        {event.durationDays > 1 && <span title={`Blocks ${event.durationDays} days`} className="shrink-0 rounded bg-jdt-sand px-1.5 py-0.5 text-[8px] font-black uppercase text-jdt-olive">{event.durationDays}d</span>}
      </div>
    </>
  );

  if (!actionable) {
    return <article title={rangeSummary} aria-label={`${event.title} ${rangeSummary}`} className={`rounded-md border border-l-4 px-2 py-1.5 ${statusClass(event)} ${categoryAccentBorderClass(event.category)}`}>{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={() => openDrawer(drawerType!, event.recordId!)}
      title={rangeSummary}
      aria-label={`${event.title} ${rangeSummary}`}
      className={`w-full rounded-md border border-l-4 px-2 py-1.5 text-left transition-colors hover:border-jdt-olive ${statusClass(event)} ${categoryAccentBorderClass(event.category)}`}
    >
      {content}
    </button>
  );
}

function CalendarGrid({ days, view, openDrawer }: { days: CalendarGridDay[]; view: CalendarGridView; openDrawer: CalendarBoardProps['openDrawer'] }) {
  if (view === 'Day') {
    const day = days[0];
    return (
      <section className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-jdt-olive">{formatWeekday(day.dateIso, 'long')}</p>
            <h3 className="mt-1 text-xl font-black text-jdt-primary">{formatShortDate(day.dateIso)}</h3>
          </div>
          <span className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-[10px] font-black uppercase text-zinc-500">{day.events.length} items</span>
        </div>
        {day.events.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {day.events.map((event) => <EventCard key={`${day.dateIso}-${event.id}`} event={event} openDrawer={openDrawer} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-jdt-border bg-jdt-panel p-8 text-center">
            <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
            <p className="text-sm font-black text-jdt-text">No scheduled work on this date</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-jdt-border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-jdt-border bg-jdt-panel">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
          <div key={weekday} className="border-r border-jdt-border px-3 py-2 text-center text-[10px] font-black uppercase text-zinc-500 last:border-r-0">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const visibleEvents = day.events.slice(0, view === 'Month' ? 4 : 7);
          const overflow = Math.max(0, day.events.length - visibleEvents.length);
          return (
            <div
              key={day.dateIso}
              className={`min-h-[160px] border-r border-b border-jdt-border p-2 last:border-r-0 ${day.isCurrentMonth ? 'bg-white' : 'bg-zinc-50/80'} ${day.isToday ? 'ring-2 ring-inset ring-jdt-olive' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className={`text-sm font-black ${day.isCurrentMonth ? 'text-jdt-primary' : 'text-zinc-400'}`}>{formatDayNumber(day.dateIso)}</p>
                  <p className="text-[9px] font-bold uppercase text-zinc-400">{formatShortDate(day.dateIso)}</p>
                </div>
                {day.events.length > 0 && <span className="rounded bg-jdt-panel px-1.5 py-0.5 text-[8px] font-black uppercase text-zinc-500">{day.events.length}</span>}
              </div>
              <div className="space-y-1.5">
                {visibleEvents.map((event) => <CalendarGridEvent key={`${day.dateIso}-${event.id}`} event={event} openDrawer={openDrawer} />)}
                {overflow > 0 && <div className="rounded-md border border-dashed border-jdt-border bg-jdt-panel px-2 py-1.5 text-center text-[9px] font-black uppercase text-zinc-500">+{overflow} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function CalendarBoard({
  jobs,
  loads,
  workOrders = [],
  scheduleTasks = [],
  treeRelocationRecords = [],
  equipment = [],
  todayIso,
  initialDisplayMode = 'Planner',
  initialRangeView = 'Week',
  initialFocusDateIso,
  openDrawer,
}: CalendarBoardProps) {
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>(initialDisplayMode);
  const [rangeView, setRangeView] = useState<CalendarGridView>(initialRangeView);
  const [focusDateIso, setFocusDateIso] = useState(initialFocusDateIso || todayIso || new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState<'All' | OperatingCategory>('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const calendar = useMemo(() => buildOperatingCalendar({
    jobs,
    loads,
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    equipment,
    todayIso,
  }), [jobs, loads, workOrders, scheduleTasks, treeRelocationRecords, equipment, todayIso]);

  const filteredEvents = useMemo(() => (
    calendar.events
      .filter((event) => categoryFilter === 'All' || event.category === categoryFilter)
      .filter((event) => matchesStatusFilter(event, statusFilter))
  ), [calendar.events, categoryFilter, statusFilter]);

  const gridDays = useMemo(() => (
    buildCalendarGridDays(filteredEvents, rangeView, focusDateIso, calendar.todayIso)
  ), [filteredEvents, rangeView, focusDateIso, calendar.todayIso]);

  const groupedEvents = gridDays
    .filter((day) => day.events.length > 0)
    .map((day) => ({ dateIso: day.dateIso, events: day.events }));

  const monthLabel = new Date(`${calendar.todayIso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const readiness = calendar.tomorrowReadiness;
  const activeCategoryFilters = categoryFilters.filter((category) => category === 'All' || calendar.events.some((event) => event.category === category));
  const todayCount = buildCalendarGridDays(calendar.events, 'Day', calendar.todayIso, calendar.todayIso)[0]?.events.length || 0;
  const selectedRangeCount = gridDays.reduce((total, day) => total + day.events.length, 0);

  const readinessPanel = (
    <section className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase text-jdt-text">Tomorrow Readiness</h3>
          <p className="mt-1 text-[11px] font-bold text-zinc-500">{formatShortDate(calendar.tomorrowIso)}</p>
        </div>
        <CategoryPill category="schedule" compact />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['Ready', readiness.ready, riskSurfaceClass('low')],
          ['Needs Review', readiness.needsReview, readinessMetricTone(readiness.needsReview)],
          ['Missing Crew', readiness.missingCrew, readinessMetricTone(readiness.missingCrew)],
          ['Missing Equipment', readiness.missingEquipment, readinessMetricTone(readiness.missingEquipment)],
          ['Missing Freight', readiness.missingFreight, readinessMetricTone(readiness.missingFreight)],
          ['Missing Location', readiness.missingLocation, readinessMetricTone(readiness.missingLocation)],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className={`rounded-lg border p-3 ${tone}`}>
            <p className="text-[9px] font-black uppercase opacity-75">{label}</p>
            <p className="mt-1 text-xl font-black">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );

  const conflictPanel = (
    <section className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <h3 className="text-sm font-black uppercase text-jdt-text">Conflict Watch</h3>
      </div>
      {calendar.conflicts.length > 0 ? (
              <div className="space-y-2">
                {calendar.conflicts.slice(0, 8).map((conflict) => (
            <div key={conflict.id} className={`rounded-lg border p-3 ${riskSurfaceClass('watch')}`}>
              <p className="text-xs font-black uppercase">{conflict.resourceLabel}</p>
              <p className="mt-1 text-[10px] font-bold uppercase opacity-80">{formatShortDate(conflict.dateIso)} - {conflict.resourceKind}</p>
              <p className="mt-2 line-clamp-2 text-[11px] font-bold opacity-90">{conflict.eventTitles.join(' / ')}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-jdt-border bg-jdt-panel p-4 text-xs font-bold text-zinc-500">No double-booked crew, drivers, trucks, trailers, or equipment in this range.</p>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-jdt-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <CategoryIcon category="schedule" size="md" />
          <div>
            <p className="text-xs font-black uppercase text-jdt-olive">Operations Calendar</p>
            <h2 className="mt-1 text-2xl font-black text-jdt-primary">{rangeView} Operations {displayMode === 'Planner' ? 'Planner' : 'Calendar'}</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">Crew work, freight, equipment, project dates, tree-care timing, and multi-day blocked-out assignments from the live workspace.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-jdt-border bg-jdt-panel px-4 py-2 shadow-sm">
          <CalendarIcon className="h-4 w-4 text-jdt-olive" />
          <span className="text-xs font-black uppercase text-zinc-800">{monthLabel}</span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          { label: 'Today', value: todayCount, tone: 'border-jdt-border bg-white text-jdt-primary' },
          { label: 'Tomorrow', value: readiness.total, tone: 'border-jdt-border bg-white text-jdt-primary' },
          { label: `${rangeView} Items`, value: selectedRangeCount, tone: 'border-jdt-border bg-white text-jdt-primary' },
          { label: 'Ready', value: readiness.ready, tone: riskSurfaceClass('low') },
          { label: 'Conflicts', value: readiness.conflicts, tone: readinessMetricTone(readiness.conflicts) },
        ].map((metric) => (
          <div key={metric.label} className={`rounded-lg border p-4 shadow-sm ${metric.tone}`}>
            <p className="text-[10px] font-black uppercase tracking-wide opacity-75">{metric.label}</p>
            <p className="mt-2 text-3xl font-black leading-none">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
        <div className="flex flex-col gap-3 border-b border-jdt-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {displayModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${displayMode === mode ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-600 hover:border-jdt-olive'}`}
                >
                  {mode === 'Planner' ? <ListChecks className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {rangeViews.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setRangeView(view)}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${rangeView === view ? 'border-jdt-olive bg-jdt-olive text-white' : 'border-jdt-border bg-white text-zinc-600 hover:border-jdt-olive'}`}
                >
                  {view}
                </button>
              ))}
              <div className="ml-0 flex items-center gap-1 rounded-lg border border-jdt-border bg-white p-1 lg:ml-2">
                <button type="button" onClick={() => setFocusDateIso((value) => shiftFocusDate(value, rangeView, -1))} className="rounded-md p-1.5 text-zinc-600 hover:bg-jdt-sand" aria-label="Previous calendar range">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setFocusDateIso(calendar.todayIso)} className="rounded-md px-2 py-1.5 text-[10px] font-black uppercase text-jdt-text hover:bg-jdt-sand">
                  Today
                </button>
                <button type="button" onClick={() => setFocusDateIso((value) => shiftFocusDate(value, rangeView, 1))} className="rounded-md p-1.5 text-zinc-600 hover:bg-jdt-sand" aria-label="Next calendar range">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <span className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-zinc-600">{rangeLabel(rangeView, focusDateIso)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              {activeCategoryFilters.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase ${categoryFilter === category ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-600 hover:border-jdt-olive'}`}
                >
                  {category === 'All' ? 'All' : <span className="inline-flex items-center gap-1.5"><CategoryIcon category={category} size="xs" className={categoryFilter === category ? 'border-white/20 bg-white/10 text-white' : ''} /> {categoryLabel(category)}</span>}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-black uppercase text-jdt-text"
            >
              {statusFilters.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
            </select>
          </div>
        </div>

        <div className={`grid gap-4 p-4 ${displayMode === 'Planner' ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
          <div className="space-y-4">
            {displayMode === 'Calendar Grid' ? (
              <CalendarGrid days={gridDays} view={rangeView} openDrawer={openDrawer} />
            ) : groupedEvents.length > 0 ? (
              groupedEvents.map((group) => (
                <section key={group.dateIso} className="rounded-xl border border-jdt-border bg-jdt-sand/30 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase text-jdt-primary">{formatDate(group.dateIso)}</h3>
                    <span className="rounded bg-white px-2 py-1 text-[9px] font-black uppercase text-zinc-500">{group.events.length} items</span>
                  </div>
                  <div className="space-y-3">
                    {groupEventsByClientProject(group.events).map((projectGroup) => (
                      <div key={`${group.dateIso}-${projectGroup.key}`} className="rounded-lg border border-jdt-border bg-white/70 p-3">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Client / Project</p>
                            <h4 className="text-xs font-black uppercase text-jdt-primary">{projectGroup.clientName}</h4>
                            <p className="text-[10px] font-bold uppercase text-zinc-500">{projectGroup.projectName}</p>
                          </div>
                          <span className="rounded-md border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-zinc-500">{projectGroup.events.length} assignments</span>
                        </div>
                        <div className="grid gap-3 2xl:grid-cols-2">
                          {projectGroup.events.map((event) => <EventCard key={event.id} event={event} openDrawer={openDrawer} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-jdt-border bg-white p-10 text-center">
                <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                <p className="text-sm font-black text-jdt-text">No calendar items match this view</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">Scheduled jobs, work orders, freight moves, service dates, and tree timing will appear here.</p>
              </div>
            )}
          </div>

          {displayMode === 'Planner' ? (
            <aside className="space-y-4">
              <VisualLegend />
              {readinessPanel}
              {conflictPanel}
            </aside>
          ) : (
            <details className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-black uppercase text-jdt-text">Readiness & Conflict Check</summary>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <VisualLegend />
                {readinessPanel}
                {conflictPanel}
              </div>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
