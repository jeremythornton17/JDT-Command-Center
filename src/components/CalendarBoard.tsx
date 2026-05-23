import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Truck, Leaf, Wrench, Shield } from 'lucide-react';

export default function CalendarBoard({ jobs, loads, openDrawer }: { jobs: any[], loads: any[], openDrawer: (type: string, id: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState('May 2026');
  
  // Create a structured schedule index
  const events = [
    { day: 20, type: 'nursery', title: 'Harvest 15 Live Oaks', site: '40 Acre Farm Block C', time: '8:00 AM' },
    { day: 21, type: 'freight', title: 'Load FRT-0522-04 Dispatch', driver: 'Alex', time: '1:00 PM', linkId: 'FRT-0522-04' },
    { day: 22, type: 'relocation', title: 'Bellaire Club Root Prune', site: 'Site B Entrance', time: '7:30 AM', linkId: 'Bellaire Club' },
    { day: 23, type: 'relocation', title: 'Boca West CC Relocate', site: 'Secondary Gate', time: '7:00 AM', linkId: 'Boca West Country Club' },
    { day: 24, type: 'freight', title: 'Dispatch Load FRT-0522-01', driver: 'Christian', time: '6:30 AM', linkId: 'FRT-0522-01' },
    { day: 25, type: 'equipment', title: 'CAT 988G Hydraulic Check', site: 'Yard Service Shop', time: '9:00 AM' },
    { day: 26, type: 'nursery', title: 'Block D Fertilizer Loop', site: 'Farm 2 Block D', time: '4:00 PM' },
    { day: 27, type: 'relocation', title: 'Waterford Site Inspection', site: 'Waterford Gate 3', time: '9:00 AM', linkId: 'Waterford Golf Club' },
  ];

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'relocation': return 'bg-emerald-800 text-white';
      case 'freight': return 'bg-sky-800 text-white';
      case 'nursery': return 'bg-lime-700 text-white';
      case 'equipment': return 'bg-orange-700 text-white';
      default: return 'bg-zinc-700 text-white';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'relocation': return <MapPin className="h-3 w-3 shrink-0" />;
      case 'freight': return <Truck className="h-3 w-3 shrink-0" />;
      case 'nursery': return <Leaf className="h-3 w-3 shrink-0" />;
      case 'equipment': return <Wrench className="h-3 w-3 shrink-0" />;
      default: return <Shield className="h-3 w-3 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Schedule Calendar</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Grid view of active dispatches, maintenance windows, and nursery digs</p>
        </div>
        <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg p-1.5 shadow-sm">
          <button className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-black uppercase text-zinc-800 px-3">{currentMonth}</span>
          <button className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar Grid */}
        <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden p-4">
          <div className="grid grid-cols-7 gap-1 text-center font-black uppercase text-[10px] text-zinc-400 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2 min-h-[480px]">
            {/* Empty boxes for offset */}
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`offset-${idx}`} className="bg-zinc-50 border border-zinc-100 rounded-lg p-2 min-h-[80px] opacity-40"></div>
            ))}
            
            {daysInMonth.map(day => {
              const dayEvents = events.filter(e => e.day === day);
              const isToday = day === 23; // anchor on local constant date

              return (
                <div 
                  key={day} 
                  className={`border rounded-lg p-2 min-h-[80px] flex flex-col justify-between group hover:border-zinc-400 transition-colors ${isToday ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-200' : 'bg-jdt-panel border-jdt-border'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-black h-5 w-5 rounded-full flex items-center justify-center ${isToday ? 'bg-amber-500 text-white font-black' : 'text-zinc-500 group-hover:text-jdt-text'}`}>{day}</span>
                    {dayEvents.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-jdt-primary"></span>}
                  </div>
                  
                  <div className="space-y-1 flex-1 overflow-hidden mt-1 text-[9px] font-black">
                    {dayEvents.map((ev, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (ev.linkId) {
                            openDrawer(ev.type === 'freight' ? 'freight' : 'job', ev.linkId);
                          }
                        }}
                        className={`px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-pointer hover:brightness-95 hover:underline transition-all ${getEventBadgeClass(ev.type)}`}
                      >
                        {getEventIcon(ev.type)}
                        <span>{ev.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Sidebar List */}
        <div className="space-y-4">
          <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm p-4">
            <h3 className="text-sm font-black text-jdt-text uppercase flex items-center gap-2 mb-4"><CalendarIcon className="h-4 w-4 text-jdt-olive" /> Agenda Overview</h3>
            <ul className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {events.map((ev, idx) => (
                <li 
                  key={idx} 
                  className="flex items-start gap-3 border-b border-jdt-zinc-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-jdt-primary">
                    {getEventIcon(ev.type)}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-black truncate text-jdt-text cursor-pointer hover:underline" onClick={() => ev.linkId && openDrawer(ev.type === 'freight' ? 'freight' : 'job', ev.linkId)}>
                      {ev.title}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {ev.time}</span>
                      <span className="truncate flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {ev.site || ev.driver}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 shrink-0">May {ev.day}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-4">
            <h4 className="text-xs font-black text-orange-950 uppercase mb-2 flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Maintenance Days</h4>
            <p className="text-xs font-bold text-orange-800 leading-snug">Every Saturday is Safety Inspection & Fluids check at JDT main yard. Out-of-service trucks must report at 6:00 AM.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
