import React, { useState } from 'react';
import { Settings, Shield, Key, Database, RefreshCw, FileSpreadsheet, Check, Download, ArrowUpRight } from 'lucide-react';

export default function SettingsBoard({ openModal }: { openModal: (type: string) => void }) {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [safetyLog, setSafetyLog] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  return (
    <div className="space-y-6">
      <div className="border-b border-jdt-border pb-5">
        <h2 className="text-2xl font-black text-jdt-primary">Command Center System Control</h2>
        <p className="text-sm font-bold text-zinc-500 mt-1">Configure drop-down attributes, database mappings, and cloud worksheet sync frequencies</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Navigation Sidebar */}
        <div className="bg-jdt-panel rounded-xl border border-jdt-border p-3 space-y-2 h-fit shadow-sm">
          {[
            { id: 'general', label: 'General Configuration', icon: Settings },
            { id: 'sync', label: 'Cloud Sheet Connectors', icon: FileSpreadsheet },
            { id: 'security', label: 'Access Control / Keys', icon: Shield },
            { id: 'database', label: 'Database Backup', icon: Database },
          ].map(sb => (
            <button
              key={sb.id}
              onClick={() => setActiveSubTab(sb.id)}
              className={`w-full text-left px-3 py-2 text-xs font-black uppercase rounded-lg transition-colors flex items-center gap-2 ${activeSubTab === sb.id ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-jdt-sand'}`}
            >
              <sb.icon className="h-4 w-4 shrink-0" /> {sb.label}
            </button>
          ))}
        </div>

        {/* Form panel container */}
        <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm p-6 space-y-6">
          {activeSubTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">General Operations Config</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Configure active farm inventory loops and weather alert safeguards</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Primary Farm Loops</label>
                  <input type="text" className="w-full rounded-lg border border-jdt-border bg-jdt-panel/50 px-3 py-2 text-sm font-bold text-jdt-text focus:outline-none" defaultValue="Office, 25 Acre, 40 Acre, 10 Acre, Janets" readOnly disabled />
                  <span className="text-[10px] text-zinc-400 font-bold block mt-1">Assigned locations for nursery trees</span>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Weather Delay Threshold</label>
                  <select className="w-full bg-jdt-panel border border-jdt-border rounded-lg px-2.5 py-2 text-xs font-bold text-zinc-700">
                    <option>Wind &gt; 30mph (Immediate Stop)</option>
                    <option>Precipitation &gt; 1 inch/hr (Delay scheduled digs)</option>
                    <option>Temperatures &gt; 98°F (Enforced water schedules)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-jdt-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-jdt-text uppercase">Enforce Mechanical Pre-Checks</h4>
                    <p className="text-xs text-zinc-400 font-bold">Require operators to checklist vehicles every shift</p>
                  </div>
                  <input type="checkbox" checked={safetyLog} onChange={e => setSafetyLog(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-jdt-primary focus:ring-jdt-primary" />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-black text-jdt-text uppercase">SmartSheet & Sheet Connectors</h3>
                  <p className="text-xs font-bold text-zinc-500 mt-1">Configure source web sheets to feed direct relocation jobs into the system</p>
                </div>
                <button onClick={() => openModal('connect_source')} className="flex items-center gap-1 bg-jdt-primary text-white text-[10px] font-black uppercase tracking-wider rounded px-3 py-2 hover:bg-jdt-dark transition-colors">
                  Add Source Connection <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-jdt-sand border border-jdt-border rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-jdt-text uppercase">Active Syncing Sources</h4>
                      <p className="text-xs font-bold text-zinc-500 mt-0.5">2 Sheets (Boca West Template, Bellaire Master) synced every 10 mins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-black uppercase text-emerald-800">Connected</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="text-sm font-black text-jdt-text uppercase">Background Refresh Frequency (minutes)</h4>
                    <p className="text-xs text-zinc-400 font-bold">Auto-check sheets in background without requiring refresh clicks</p>
                  </div>
                  <input type="number" className="w-20 rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-extrabold text-jdt-text" defaultValue={10} />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">User Authority & Keys</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Manage tokens, Google Maps integration secrets, and user access lists</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex justify-between items-center text-xs font-bold text-zinc-600">
                  <span>Current Authorized User:</span>
                  <span className="font-extrabold text-jdt-text">jeremy@jdtnurseries.com</span>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex justify-between items-center text-xs font-bold text-zinc-600">
                  <span>Workspace ID:</span>
                  <span className="font-mono text-zinc-500 select-all">jdt-cmd-b195</span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'database' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">Local DB Backup Status & Control</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Export active jobs, client details, fleet assets, and alerts as offline files, or reset environments.</p>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-12 border border-dashed border-jdt-border rounded-xl flex flex-col items-center justify-center hover:bg-jdt-sand/50 transition-all text-zinc-500 hover:text-jdt-text font-black uppercase text-xs">
                  <Download className="h-8 w-8 text-zinc-400 mb-3" />
                  Download Complete DB (JSON)
                </button>
              </div>

              <div className="border-t border-jdt-border pt-6 mt-6">
                <div className="bg-red-50/50 border border-red-200 rounded-xl p-6">
                   <h4 className="text-sm font-black text-red-900 uppercase mb-1">Danger Zone</h4>
                   <p className="text-xs text-red-700/80 font-bold mb-4">Clearing database tables will permanently delete these records for all connected users.</p>
                   
                   <div className="flex flex-wrap gap-3">
                     <button 
                       onClick={() => openModal('clear_clients')}
                       className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 shadow-sm px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                     >
                       Clear All Clients
                     </button>
                     <button 
                       onClick={() => openModal('clear_jobs')}
                       className="bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 shadow-sm px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                     >
                       Clear All Jobs
                     </button>
                     <button 
                       onClick={() => openModal('clear_all')}
                       className="bg-red-600 hover:bg-red-700 text-white shadow-sm px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                     >
                       Wipe Factory Reset
                     </button>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
