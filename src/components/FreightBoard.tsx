import React from 'react';
import { Truck, MapPin, Clock, CheckCircle2, UserCheck, AlertTriangle, QrCode, FileText } from 'lucide-react';

export function InfoTag({ icon: Icon, label, value, bg = "bg-jdt-sand/50" }: any) {
  return (
    <div className={`flex items-center gap-2 rounded-lg ${bg} p-2 border border-jdt-border`}>
      <Icon className="h-4 w-4 text-zinc-500 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase text-zinc-500">{label}</p>
        <p className="text-sm font-bold text-jdt-text">{value}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let colors = "bg-zinc-200 text-zinc-800";
  if (status === "Dispatched") colors = "bg-blue-600 text-white";
  else if (status === "At Pickup") colors = "bg-yellow-400 text-black";
  else if (status === "In Transit") colors = "bg-sky-500 text-white";
  else if (status === "At Delivery") colors = "bg-indigo-600 text-white";
  else if (status === "Completed") colors = "bg-emerald-600 text-white";
  else if (status === "Delayed") colors = "bg-red-600 text-white";

  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black uppercase ${colors}`}>
      {status}
    </span>
  );
}

export default function FreightBoard({ loads, openDrawer, openModal }: { loads: any[], openDrawer: (type: string, id: string) => void, openModal: (type: string, data?: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-jdt-primary">Freight Dispatch</h2>
            <p className="text-sm font-bold text-zinc-500 mt-1">Live transport tracking</p>
         </div>
      </div>
      
      <div className="grid gap-4 xl:grid-cols-2">
         {loads.map(load => (
           <article key={load.id} className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
             <div 
               className="flex items-center justify-between gap-3 border-b border-jdt-border p-4 bg-jdt-panel/50 cursor-pointer hover:bg-jdt-sand"
               onClick={() => openDrawer('freight', load.loadNumber)}
             >
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-zinc-400 group-hover:text-sky-600 transition-colors" />
                  <div>
                    <h2 className="text-lg font-black group-hover:text-blue-700 transition-colors">{load.title}</h2>
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-500 mt-0.5">{load.loadNumber}</p>
                  </div>
                </div>
                <StatusBadge status={load.status} />
             </div>
             
             <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 flex-1">
               <div className="p-4 space-y-4">
                 <div className="grid gap-2 grid-cols-2">
                    <InfoTag icon={UserCheck} label="Driver" value={load.driver} />
                    <InfoTag icon={Truck} label="Equipment" value={`${load.truck} / ${load.trailer}`} />
                    <InfoTag icon={Clock} label="Depart" value={load.departureTime} />
                    <InfoTag icon={Clock} label="ETA" value={load.eta} />
                 </div>
                 
                 <div>
                    <p className="text-xs font-black uppercase text-zinc-500 mb-2">Route Stops</p>
                    <div className="space-y-2 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
                      {load.stops?.map((stop: any, idx: number) => (
                        <div key={stop.id} className="relative flex items-center gap-3">
                           <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 z-10 ${stop.completed ? 'bg-emerald-500 border-emerald-600' : 'bg-jdt-panel border-jdt-border'}`} />
                           <div className={`flex-1 rounded-lg border p-2 ${stop.completed ? 'bg-jdt-panel border-jdt-border' : 'bg-jdt-panel border-jdt-border shadow-sm'}`}>
                             <div className="flex justify-between items-center">
                               <span className={`text-[11px] font-black uppercase ${stop.completed ? 'text-zinc-500' : 'text-jdt-text'}`}>{stop.label}</span>
                               <span className="text-[10px] font-bold text-zinc-500">{stop.window}</span>
                             </div>
                             <p className={`text-xs font-bold mt-0.5 ${stop.completed ? 'text-zinc-400' : 'text-zinc-700'}`}>{stop.location}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
               
               <div className="p-4 bg-jdt-panel/50 flex flex-col justify-between">
                 <div className="space-y-4">
                   <div>
                      <p className="text-xs font-black uppercase text-zinc-500 mb-2">Dispatch Notes</p>
                      {load.notes?.length > 0 ? (
                        <ul className="space-y-1">
                          {load.notes.map((note: string, i: number) => (
                            <li key={i} className="text-xs font-bold text-zinc-700 flex items-start gap-1.5 leading-tight"><div className="mt-1 h-1 w-1 rounded-full bg-zinc-400 flex-shrink-0" /> {note}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs font-bold text-zinc-400">No notes</p>
                      )}
                      {load.escortRequired && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 px-2 py-1 text-[10px] font-black uppercase">
                           <AlertTriangle className="h-3 w-3" />
                           Escort Required
                        </div>
                      )}
                      
                      {load.pod && (
                          <div className="mt-4 border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                             <div className="flex items-center gap-2 text-emerald-800 mb-1">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase">Proof of Delivery</span>
                             </div>
                             <p className="text-xs font-bold text-emerald-700">Signed by: {load.pod.receiverName}</p>
                             <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{load.pod.completedAt}</p>
                          </div>
                      )}
                   </div>
                 </div>
                 
                 <div className="mt-6 flex flex-wrap gap-2">
                   <button onClick={() => openModal('set_freight_status', load)} className="flex-1 rounded-md bg-jdt-primary py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark">Set Status</button>
                   <button onClick={() => openModal('edit_freight', load)} className="flex-1 rounded-md bg-jdt-panel border border-jdt-border py-2.5 text-xs font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel border-r-0">Edit Load</button>
                   <button onClick={() => openModal('delay', load)} className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 hover:bg-red-100 shadow-sm font-black uppercase text-[10px]" title="Mark Delayed">Delay</button>
                   <button onClick={() => openModal('complete', load)} className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 hover:bg-emerald-100 shadow-sm font-black uppercase text-[10px]" title="Mark Completed"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                   <button onClick={() => openModal('log_issue', load)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-zinc-600 hover:bg-jdt-panel shadow-sm" title="Add Issue Note"><FileText className="h-4 w-4" /></button>
                   <button onClick={() => openModal('qr', load)} className="rounded-md border border-jdt-border bg-jdt-panel px-3 py-2 text-zinc-600 hover:bg-jdt-panel shadow-sm" title="Driver QR"><QrCode className="h-4 w-4" /></button>
                 </div>
               </div>
             </div>
           </article>
         ))}
      </div>
    </div>
  );
}
