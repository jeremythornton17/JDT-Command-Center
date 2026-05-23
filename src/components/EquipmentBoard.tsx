import React, { useState } from 'react';
import { Wrench, MapPin, UserCheck, AlertTriangle, Clock, Activity, QrCode, ClipboardList, PenTool } from 'lucide-react';

export default function EquipmentBoard({ starterEquipment, openDrawer, openModal }: { starterEquipment: any[], openDrawer: (type: string, id: string) => void, openModal: (type: string, data?: any) => void }) {

  const StatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Down': return 'bg-red-100 text-red-800 border-red-200';
      case 'Inspection': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-jdt-sand text-zinc-800 border-jdt-border';
    }
  };

  const grouped = starterEquipment.reduce((acc: any, eq: any) => {
    if (!acc[eq.status]) acc[eq.status] = [];
    acc[eq.status].push(eq);
    return acc;
  }, {});

  const statusOrder = ['Down', 'Inspection', 'Maintenance', 'Assigned', 'Available'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-jdt-primary">Maintenance & Equipment</h2>
            <p className="text-sm font-bold text-zinc-500 mt-1">Fleet tracking and service due</p>
         </div>
      </div>

      <div className="grid gap-6">
        {statusOrder.map(status => {
           const items = grouped[status];
           if (!items || items.length === 0) return null;
           
           return (
             <section key={status}>
                <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-lg font-black tracking-wide text-zinc-800">{status}</h3>
                   <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-black text-zinc-700">{items.length}</span>
                </div>
                <div className="grid gap-4 xl:grid-cols-2 lg:grid-cols-2">
                   {items.map((eq: any) => (
                     <article key={eq.id} className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col pt-1 group hover:border-zinc-400 transition-colors">
                        {(eq.status === 'Down' || eq.status === 'Inspection' || eq.serviceDueHours < 100) && (
                          <div className={`px-4 py-2 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 ${eq.status === 'Down' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}`}>
                            <AlertTriangle className="h-4 w-4" /> 
                            {eq.status === 'Down' ? 'Critical Action Required' : (eq.issue ? eq.issue : 'Service Due Soon')}
                          </div>
                        )}
                        <div 
                          className="p-4 bg-jdt-panel/50 border-b border-jdt-border flex justify-between items-start gap-4 cursor-pointer hover:bg-jdt-sand"
                          onClick={() => openDrawer('equipment', eq.id)}
                        >
                           <div>
                             <div className="flex items-center gap-2">
                               <Wrench className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                               <h4 className="text-xl font-black text-jdt-primary group-hover:text-blue-700 transition-colors">{eq.name}</h4>
                             </div>
                             <p className="text-xs font-black uppercase text-zinc-500 tracking-wider mt-1">{eq.type} \u2022 {eq.id}</p>
                           </div>
                           <span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${StatusColor(eq.status)}`}>
                             {eq.status}
                           </span>
                        </div>
                        
                        <div className="p-4 flex-1">
                           <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> Location</p>
                                  <p className="font-bold text-jdt-text">{eq.location || 'Yard'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5"/> Operator</p>
                                  <p className="font-bold text-jdt-text">{eq.operator || 'Unassigned'}</p>
                                </div>
                              </div>
                              <div className="space-y-4 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                                <div>
                                  <p className="text-[10px] font-black uppercase text-orange-800 mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5"/> Engine Hours</p>
                                  <p className="text-3xl font-black text-orange-950">{eq.hours.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-orange-800 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Service Due In</p>
                                  <p className={`text-xl font-black ${eq.serviceDueHours < 100 ? 'text-red-600' : 'text-orange-900'}`}>{eq.serviceDueHours} hrs</p>
                                </div>
                              </div>
                           </div>
                           
                           {eq.issue && eq.status !== 'Down' && eq.status !== 'Inspection' && (
                              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm font-bold text-yellow-900 flex gap-2 items-start">
                                 <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-600" />
                                 {eq.issue}
                              </div>
                           )}
                        </div>
                        
                        <div className="p-4 border-t border-jdt-border bg-jdt-panel/50 grid grid-cols-2 md:flex md:flex-wrap gap-2">
                           <button onClick={() => openModal('set_eq_status', eq)} className="md:flex-1 rounded-md bg-jdt-primary py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark whitespace-nowrap text-center">Edit Status</button>
                           <button onClick={() => openModal('log_issue', eq)} className="md:flex-1 rounded-md bg-jdt-panel border border-jdt-border py-2 text-xs font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel whitespace-nowrap flex justify-center items-center gap-1.5"><PenTool className="h-3.5 w-3.5" /> Log Issue</button>
                           <button onClick={() => openModal('print_card', eq)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-zinc-600 hover:bg-jdt-panel shadow-sm flex items-center justify-center" title="Print Service Card"><ClipboardList className="h-4 w-4" /></button>
                           <button onClick={() => openModal('qr', eq)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-zinc-600 hover:bg-jdt-panel shadow-sm flex items-center justify-center" title="Show QR"><QrCode className="h-4 w-4" /></button>
                        </div>
                     </article>
                   ))}
                </div>
             </section>
           );
        })}
      </div>
    </div>
  );
}
