import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, Check, Plus, AlertCircle, RefreshCw } from 'lucide-react';

export default function AlertsBoard({ alerts, setAlerts, openModal }: { alerts: any[], setAlerts: React.Dispatch<React.SetStateAction<any[]>>, openModal: (type: string, data?: any) => void }) {
  const [filter, setFilter] = useState<'All' | 'High' | 'Warning' | 'Notice'>('All');

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(al => al.id !== id));
  };

  const filteredAlerts = alerts.filter(al => {
    if (filter === 'All') return true;
    return al.severity === filter;
  });

  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case 'High': return 'border-red-300 bg-red-50 text-red-900 shadow-sm';
      case 'Warning': return 'border-amber-200 bg-amber-50 text-amber-900 shadow-sm';
      case 'Notice': return 'border-blue-200 bg-blue-50 text-blue-900 shadow-sm';
      default: return 'border-zinc-200 bg-zinc-50 text-zinc-900 shadow-sm';
    }
  };

  const getUrgentDot = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-600 animate-pulse';
      case 'Warning': return 'bg-amber-500';
      case 'Notice': return 'bg-blue-500';
      default: return 'bg-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Alerts Drawer</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1 font-sans">Real-time weather blockages, driver safety notices, and mechanical blockades</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setAlerts([
              { id: `al-${Date.now()}`, title: 'High Wind Warning', body: 'Spade lift disabled in Zone 2 on 25 Acre site due to gusts over 35mph.', time: 'Just Now', severity: 'High', location: '25 Acre Farm' },
              ...alerts
            ])}
            className="flex items-center gap-1.5 rounded-lg border border-jdt-border bg-jdt-panel px-3.5 py-2 text-xs font-black uppercase text-zinc-700 shadow-sm hover:bg-jdt-sand transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Simulate Alert
          </button>
          <button 
            onClick={() => openModal('schedule_disruption')} 
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black uppercase bg-jdt-primary text-white hover:bg-jdt-dark transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4"/> Log Disruption
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl max-w-sm">
        {(['All', 'High', 'Warning', 'Notice'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setFilter(tab)}
            className={`flex-1 py-1.5 text-xs font-black uppercase rounded-lg transition-colors ${filter === tab ? 'bg-jdt-panel shadow-sm text-jdt-text' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredAlerts.map(al => (
          <article 
            key={al.id} 
            className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${getAlertStyle(al.severity)}`}
          >
            <div className="flex gap-3">
              <div className={`h-2.5 w-2.5 mt-1.5 rounded-full shrink-0 ${getUrgentDot(al.severity)}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-black leading-snug">{al.title}</h4>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${al.severity === 'High' ? 'bg-red-100 border-red-200 text-red-800' : al.severity === 'Warning' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'}`}>
                    {al.severity}
                  </span>
                </div>
                <p className="text-sm font-semibold opacity-95 text-zinc-800 leading-relaxed max-w-2xl">{al.body}</p>
                <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-500 pt-1.5">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {al.time}</span>
                  {al.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {al.location}</span>}
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleDismiss(al.id)}
              className="self-start md:self-center flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded border border-zinc-300 hover:bg-zinc-200/50 bg-jdt-panel text-zinc-700 transition-colors shadow-sm shrink-0"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Acknowledge
            </button>
          </article>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="py-20 rounded-xl bg-jdt-panel border border-jdt-border flex flex-col justify-center items-center text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <Check className="h-7 w-7" />
            </div>
            <h3 className="font-black text-lg text-zinc-700 uppercase">Clear Skies / All Quiet</h3>
            <p className="text-zinc-400 font-bold max-w-sm mt-1 text-sm">No active operations alerts or mechanical red flags reported currently.</p>
          </div>
        )}
      </div>
    </div>
  );
}
