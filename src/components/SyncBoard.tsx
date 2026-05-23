import React, { useState } from 'react';
import { Database, FolderSync, AlertOctagon, CheckCircle2, ChevronRight, Settings2, FileSpreadsheet, AlertTriangle, PlayCircle, Columns, GitMerge } from 'lucide-react';

export default function SyncBoard({ openModal, openDrawer }: { openModal: (type: string, data?: any) => void, openDrawer: (type: string, id: string) => void }) {
  const [activeView, setActiveView] = useState<'catalog' | 'mapping'>('catalog');
  const [selectedSource, setSelectedSource] = useState<any>(null);

  const sources = [
    { id: 'src_1', name: 'Boca West Tracker', type: 'Google Sheet', status: 'Active Sync', template: 'Legacy v2.1', alignment: 68, unmapped: 4, errors: 2, lastSync: '10 mins ago' },
    { id: 'src_2', name: 'Bellaire Master', type: 'Google Sheet', status: 'Active Sync', template: 'Legacy v1.8', alignment: 45, unmapped: 12, errors: 7, lastSync: '1 hour ago' },
    { id: 'src_3', name: 'Pine Tree Inventory', type: 'Excel Upload', status: 'Pending Review', template: 'Unknown', alignment: 15, unmapped: 24, errors: 15, lastSync: 'Never' },
    { id: 'src_4', name: 'JDT Future Standard', type: 'System Template', status: 'Template', template: 'Standard v3.0', alignment: 100, unmapped: 0, errors: 0, lastSync: '-' },
  ];

  const renderCatalog = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Tracker Sync & Mapping</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Connect chaotic field sheets into the Command Center standard</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => openModal('sync_all')} className="rounded-lg bg-jdt-panel border border-jdt-border px-4 py-2 text-sm font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel flex items-center gap-2"><FolderSync className="h-4 w-4" /> Sync All</button>
           <button onClick={() => openModal('connect_source')} className="rounded-lg bg-jdt-primary px-4 py-2 text-sm font-black uppercase text-white shadow-sm hover:bg-jdt-dark flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Connect Source</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-jdt-panel p-4 rounded-xl border border-jdt-border shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-zinc-500">
             <Database className="h-5 w-5" /> <p className="text-xs font-black uppercase">Sources</p>
           </div>
           <p className="text-3xl font-black">4</p>
        </div>
        <div className="bg-jdt-panel p-4 rounded-xl border border-jdt-border shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-amber-500">
             <AlertTriangle className="h-5 w-5" /> <p className="text-xs font-black uppercase">Unmapped Cols</p>
           </div>
           <p className="text-3xl font-black">40</p>
        </div>
        <div className="bg-jdt-panel p-4 rounded-xl border border-jdt-border shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-red-500">
             <AlertOctagon className="h-5 w-5" /> <p className="text-xs font-black uppercase">Sync Errors</p>
           </div>
           <p className="text-3xl font-black">24</p>
        </div>
        <div className="bg-jdt-panel p-4 rounded-xl border border-jdt-border shadow-sm bg-gradient-to-br from-zinc-900 to-zinc-950 text-white">
           <div className="flex items-center gap-3 mb-2 text-zinc-300">
             <CheckCircle2 className="h-5 w-5" /> <p className="text-xs font-black uppercase">Avg Alignment</p>
           </div>
           <p className="text-3xl font-black">57%</p>
        </div>
      </div>

      <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-hidden">
         <div className="p-4 border-b border-jdt-border bg-jdt-panel/50">
           <h3 className="text-lg font-black tracking-wide text-jdt-text">Source Catalog</h3>
         </div>
         <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-jdt-panel text-zinc-500 border-b border-jdt-border">
               <tr>
                  <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Source Name</th>
                  <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Template Profile</th>
                  <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Alignment Score</th>
                  <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Issues</th>
                  <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px] text-right">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
               {sources.map(src => (
                 <tr key={src.id} className="hover:bg-jdt-panel cursor-pointer group transition-colors" onClick={() => { setSelectedSource(src); setActiveView('mapping'); }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${src.status === 'Template' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           <FileSpreadsheet className="h-4 w-4" />
                         </div>
                         <div>
                           <p className="font-black text-jdt-text">{src.name}</p>
                           <p className="text-[11px] font-bold text-zinc-500 mt-0.5">{src.type} \u2022 {src.lastSync}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                       <span className="inline-flex rounded border border-jdt-border bg-jdt-sand px-2.5 py-1 text-[11px] font-black uppercase text-zinc-700">
                         {src.template}
                       </span>
                    </td>
                    <td className="px-5 py-4">
                       <div className="flex items-center gap-2">
                         <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div className={`h-full ${src.alignment > 80 ? 'bg-emerald-500' : src.alignment > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${src.alignment}%` }}></div>
                         </div>
                         <span className="font-bold text-xs">{src.alignment}%</span>
                       </div>
                    </td>
                    <td className="px-5 py-4">
                       <div className="flex items-center gap-3">
                          {src.unmapped > 0 && <span className="flex items-center gap-1 text-[11px] font-black text-amber-600"><Settings2 className="h-3 w-3" /> {src.unmapped} Unmapped</span>}
                          {src.errors > 0 && <span className="flex items-center gap-1 text-[11px] font-black text-red-600"><AlertOctagon className="h-3 w-3" /> {src.errors} Errors</span>}
                          {src.unmapped === 0 && src.errors === 0 && <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Clean</span>}
                       </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                       <button className="text-zinc-400 group-hover:text-jdt-text transition-colors"><ChevronRight className="h-5 w-5" /></button>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-jdt-border pb-4">
         <button onClick={() => setActiveView('catalog')} className="text-zinc-500 hover:text-jdt-text text-sm font-black uppercase">Catalog</button>
         <ChevronRight className="h-4 w-4 text-zinc-400" />
         <h2 className="text-xl font-black text-jdt-text flex items-center gap-2"><Settings2 className="h-5 w-5 text-zinc-400"/> {selectedSource?.name} Mapping Profile</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
           {/* Column Mapping */}
           <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-jdt-border flex items-center justify-between bg-jdt-panel/50">
                 <h3 className="font-black text-jdt-text flex items-center gap-2"><Columns className="h-4 w-4 text-blue-600"/> Column Mapping</h3>
                 <span className="text-xs font-bold text-zinc-500">Command Center Standard</span>
              </div>
              <div className="p-4 space-y-3">
                 {[
                   { cmd: 'Project Name', raw: 'Project/Site', status: 'mapped' },
                   { cmd: 'Tree ID', raw: 'Tag#', status: 'mapped' },
                   { cmd: 'Species', raw: 'Type', status: 'mapped' },
                   { cmd: 'Readiness Status', raw: 'Move Ready?', status: 'mapped' },
                   { cmd: 'Pruning Cut 1', raw: '1st Cut Date', status: 'mapped' },
                   { cmd: 'Pruning Cut 2', raw: '2nd Cut', status: 'mapped' },
                   { cmd: 'DBH Size', raw: 'Size', status: 'mapped' },
                   { cmd: 'Assigned Crew', raw: 'None', status: 'unmapped' },
                   { cmd: 'Freight Load', raw: 'Truck#', status: 'review' },
                 ].map((col, idx) => (
                   <div key={idx} className="flex items-center gap-4">
                      <div className="flex-1 bg-jdt-sand border border-jdt-border rounded-md px-3 py-2 text-sm font-bold text-zinc-600">
                        {col.raw === 'None' ? <span className="text-amber-500 placeholder">-- Select Sheet Column --</span> : col.raw}
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                      <div className="flex-1 bg-jdt-panel border border-bluzinc-200 rounded-md px-3 py-2 text-sm font-black text-jdt-text flex items-center justify-between">
                        {col.cmd}
                        {col.status === 'mapped' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {col.status === 'unmapped' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        {col.status === 'review' && <AlertOctagon className="h-4 w-4 text-red-500" />}
                      </div>
                   </div>
                 ))}
                 <button onClick={() => openModal('add_mapping')} className="w-full mt-2 border border-dashed border-jdt-border rounded-md py-2 text-sm font-black uppercase text-zinc-500 hover:text-jdt-text hover:border-zinc-400">
                   + Add Field Mapping
                 </button>
              </div>
           </div>

           {/* Value Normalization */}
           <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-jdt-border flex items-center justify-between bg-jdt-panel/50">
                 <h3 className="font-black text-jdt-text flex items-center gap-2"><GitMerge className="h-4 w-4 text-purple-600"/> Value Normalization (Dropdowns)</h3>
              </div>
              <div className="p-4 space-y-4">
                 <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Readiness Status Values</p>
                    <div className="p-3 bg-jdt-panel rounded-lg border border-jdt-border grid gap-2 text-sm">
                       <div className="flex items-center gap-3">
                         <span className="w-1/3 font-bold text-zinc-600">"Ready to Move"</span>
                         <ChevronRight className="h-3 w-3 text-zinc-400" />
                         <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Ready for Relocation</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="w-1/3 font-bold text-zinc-600">"Not Ready"</span>
                         <ChevronRight className="h-3 w-3 text-zinc-400" />
                         <span className="font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">In Prep</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm p-5 space-y-4">
              <h3 className="font-black text-jdt-text">Sync Controls</h3>
              <div className="space-y-2">
                 <button onClick={() => openModal('apply_sync')} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-black uppercase text-white shadow-sm hover:bg-emerald-700">
                   <PlayCircle className="h-4 w-4" /> Apply Import / Sync
                 </button>
                 <button onClick={() => openModal('save_profile')} className="w-full flex items-center justify-center gap-2 rounded-lg bg-jdt-sand border border-jdt-border py-3 text-sm font-black uppercase text-zinc-800 shadow-sm hover:bg-zinc-200">
                   Save Profile
                 </button>
              </div>
           </div>

           <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-5">
              <h3 className="font-black text-amber-900 flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4" /> Validation Mismatch</h3>
              <ul className="text-sm font-bold text-amber-800 space-y-2">
                 <li>• Row 42: Date format unrecognizable (1st Cut)</li>
                 <li>• Row 84: Equipment string matches multiple units</li>
              </ul>
              <button onClick={() => openModal('review_errors')} className="mt-4 text-xs font-black uppercase tracking-wide text-amber-700 hover:text-amber-900 underline">Review 4 Errors</button>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
       {activeView === 'catalog' ? renderCatalog() : renderMapping()}
    </div>
  );
}
