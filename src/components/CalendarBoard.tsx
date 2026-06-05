import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar as CalendarIcon, Clock, Filter, MapPin } from 'lucide-react';
import {
  buildOperatingCalendar,
  eventsForCalendarView,
  type CalendarView,
  type OperatingCalendarEvent,
} from '../commandCenter/calendar';
import type { EquipmentRecord, JobRecord, LoadRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import { categoryLabel, type OperatingCategory } from '../commandCenter/visualLanguage';
import { CategoryIcon, CategoryPill } from './CategoryIcon';

type CalendarBoardProps = {
  jobs: JobRecord[];
  loads: LoadRecord[];
  workOrders?: WorkOrderRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  equipment?: EquipmentRecord[];
  todayIso?: string;
  openDrawer: (type: string, id: string) => void;
};

const calendarViews: CalendarView[] = ['Today', 'Tomorrow', 'Week', 'Month'];
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

function statusClass(event: OperatingCalendarEvent): string {
  const status = String(event.status || '').toLowerCase();
  if (event.conflicts.length || event.readinessIssues.length || status.includes('blocked') || status.includes('delayed')) return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status.includes('complete') || status.includes('delivered')) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status.includes('active') || status.includes('progress') || status.includes('dispatched')) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-jdt-border bg-jdt-sand text-jdt-text';
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
  return value > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
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
              <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${statusClass(event)}`}>{event.status}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{event.detail || event.projectName || event.clientName || categoryLabel(event.category)}</p>
          </div>
        </div>
        <p className="shrink-0 text-right text-[10px] font-black uppercase text-zinc-400">{formatShortDate(event.dateIso)}</p>
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
            <span key={issue} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-900">
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
    return <article className="rounded-lg border border-jdt-border bg-white p-4 shadow-sm">{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={() => openDrawer(drawerType!, event.recordId!)}
      className="w-full rounded-lg border border-jdt-border bg-white p-4 text-left shadow-sm transition-colors hover:border-jdt-olive"
    >
      {content}
    </button>
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
  openDrawer,
}: CalendarBoardProps) {
  const [activeView, setActiveView] = useState<CalendarView>('Week');
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

  const visibleEvents = useMemo(() => (
    eventsForCalendarView(calendar.events, activeView, calendar.todayIso)
      .filter((event) => categoryFilter === 'All' || event.category === categoryFilter)
      .filter((event) => matchesStatusFilter(event, statusFilter))
  ), [activeView, calendar.events, calendar.todayIso, categoryFilter, statusFilter]);

  const groupedEvents = visibleEvents.reduce<Array<{ dateIso: string; events: OperatingCalendarEvent[] }>>((groups, event) => {
    const existing = groups.find((group) => group.dateIso === event.dateIso);
    if (existing) {
      existing.events.push(event);
      return groups;
    }
    groups.push({ dateIso: event.dateIso, events: [event] });
    return groups;
  }, []);

  const monthLabel = new Date(`${calendar.todayIso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const readiness = calendar.tomorrowReadiness;
  const activeCategoryFilters = categoryFilters.filter((category) => category === 'All' || calendar.events.some((event) => event.category === category));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-jdt-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <CategoryIcon category="schedule" size="md" />
          <div>
            <p className="text-xs font-black uppercase text-jdt-olive">Operations Calendar</p>
            <h2 className="mt-1 text-2xl font-black text-jdt-primary">Week Operations Planner</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">Crew work, freight, equipment, project dates, and tree-care timing from the live workspace.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-jdt-border bg-jdt-panel px-4 py-2 shadow-sm">
          <CalendarIcon className="h-4 w-4 text-jdt-olive" />
          <span className="text-xs font-black uppercase text-zinc-800">{monthLabel}</span>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Today', value: calendar.events.filter((event) => event.dateIso === calendar.todayIso).length, tone: 'border-jdt-border bg-white text-jdt-primary' },
          { label: 'Tomorrow', value: readiness.total, tone: 'border-jdt-border bg-white text-jdt-primary' },
          { label: 'Ready', value: readiness.ready, tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
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
          <div className="flex flex-wrap gap-2">
            {calendarViews.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${activeView === view ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-600 hover:border-jdt-olive'}`}
              >
                {view}
              </button>
            ))}
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

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {groupedEvents.length > 0 ? (
              groupedEvents.map((group) => (
                <section key={group.dateIso} className="rounded-xl border border-jdt-border bg-jdt-sand/30 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase text-jdt-primary">{formatDate(group.dateIso)}</h3>
                    <span className="rounded bg-white px-2 py-1 text-[9px] font-black uppercase text-zinc-500">{group.events.length} items</span>
                  </div>
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {group.events.map((event) => <EventCard key={event.id} event={event} openDrawer={openDrawer} />)}
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

          <aside className="space-y-4">
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
                  ['Ready', readiness.ready, 'border-emerald-200 bg-emerald-50 text-emerald-800'],
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

            <section className="rounded-xl border border-jdt-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-black uppercase text-jdt-text">Conflict Watch</h3>
              </div>
              {calendar.conflicts.length > 0 ? (
                <div className="space-y-2">
                  {calendar.conflicts.slice(0, 8).map((conflict) => (
                    <div key={conflict.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-black uppercase text-amber-900">{conflict.resourceLabel}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase text-amber-800">{formatShortDate(conflict.dateIso)} - {conflict.resourceKind}</p>
                      <p className="mt-2 line-clamp-2 text-[11px] font-bold text-amber-950">{conflict.eventTitles.join(' / ')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-jdt-border bg-jdt-panel p-4 text-xs font-bold text-zinc-500">No double-booked crew, drivers, trucks, trailers, or equipment in this range.</p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
