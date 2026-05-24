import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Truck } from 'lucide-react';

type CalendarBoardProps = {
  jobs: any[];
  loads: any[];
  openDrawer: (type: string, id: string) => void;
};

function parseScheduleDate(value: any): Date | null {
  if (!value || value === 'TBD') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function CalendarBoard({ jobs, loads, openDrawer }: CalendarBoardProps) {
  const today = new Date();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const events = useMemo(() => {
    const scheduledJobs = jobs.flatMap((job) => {
      const date = parseScheduleDate(job.date || job.startDate || job.scheduledDate);
      if (!date) return [];
      return [{
        id: job.id || job.title,
        type: 'job',
        date,
        title: job.title || job.client || 'Scheduled job',
        detail: job.location || job.client || 'Job site',
        time: job.time || 'Scheduled',
      }];
    });

    const scheduledLoads = loads.flatMap((load) => {
      const date = parseScheduleDate(load.date || load.pickupDate || load.deliveryDate);
      if (!date) return [];
      return [{
        id: load.id || load.title,
        type: 'freight',
        date,
        title: load.title || load.id || 'Scheduled load',
        detail: load.driver || load.truck || 'Dispatch',
        time: load.time || load.eta || 'Scheduled',
      }];
    });

    return [...scheduledJobs, ...scheduledLoads].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [jobs, loads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Schedule Calendar</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Scheduled jobs and freight loads from your live workspace</p>
        </div>
        <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg px-4 py-2 shadow-sm">
          <CalendarIcon className="h-4 w-4 text-jdt-olive" />
          <span className="text-xs font-black uppercase text-zinc-800">{monthLabel}</span>
        </div>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-4">
        {events.length > 0 ? (
          <ul className="divide-y divide-jdt-border">
            {events.map((event) => (
              <li key={`${event.type}-${event.id}-${event.date.toISOString()}`} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                <div className="h-12 w-12 rounded-lg bg-jdt-sand border border-jdt-border flex items-center justify-center text-jdt-primary shrink-0">
                  {event.type === 'freight' ? <Truck className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => event.id && openDrawer(event.type === 'freight' ? 'freight' : 'job', event.id)}
                    className="text-left text-sm font-black text-jdt-text hover:underline truncate max-w-full"
                  >
                    {event.title}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
                    <span>{event.date.toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {event.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.detail}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-jdt-border p-10 text-center">
            <CalendarIcon className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-black text-jdt-text">No scheduled work yet</p>
            <p className="text-xs font-bold text-zinc-500 mt-1">Add real job or freight dates and they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
