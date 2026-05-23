import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Users, Wrench, Leaf, Truck, Camera, CheckSquare, FileText, History, AlertTriangle, UserCheck, Heart, FilePlus, DollarSign, ListChecks, QrCode, CheckCircle, ShieldAlert, Edit2, ClipboardList, FolderClosed } from 'lucide-react';

const TABS: any = {
  job: [
    { id: 'overview', icon: FileText, label: 'Overview' },
    { id: 'trees', icon: Leaf, label: 'Assigned Trees' },
    { id: 'documents', icon: FolderClosed, label: 'Documents' },
    { id: 'imported_tracker', icon: ClipboardList, label: 'Imported Tracker' },
    { id: 'move_readiness', icon: AlertTriangle, label: 'Move Readiness' },
    { id: 'photos', icon: Camera, label: 'Site Photos' },
    { id: 'change_orders', icon: FilePlus, label: 'Change Orders' },
    { id: 'history', icon: History, label: 'History Logs' }
  ],
  tree: [
    { id: 'overview', icon: Leaf, label: 'Tree Profile' },
    { id: 'health', icon: Heart, label: 'Care / Health' },
    { id: 'assignment', icon: Users, label: 'Job Assignment' },
    { id: 'history', icon: History, label: 'Pruning Logs' },
  ],
  freight: [
    { id: 'overview', icon: Truck, label: 'Dispatch Details' },
    { id: 'route', icon: MapPin, label: 'Stops & GPS' },
    { id: 'issues', icon: AlertTriangle, label: 'Delays / Issues' },
  ],
  equipment: [
    { id: 'overview', icon: Wrench, label: 'Overview' },
    { id: 'maintenance', icon: AlertTriangle, label: 'Diagnostics' },
    { id: 'qr', icon: QrCode, label: 'Operations Barcode' },
  ]
};

export default function CommandDrawer({ 
  isOpen, 
  onClose, 
  type, 
  itemId, 
  defaultTab = 'overview', 
  openModal,
  jobsList = [],
  ranchOaksList = [],
  equipmentList = [],
  crewsList = [],
  clientsList = [],
  loadsList = [],
  changelog = []
}: any) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab || 'overview');
  }, [isOpen, type, defaultTab]);

  if (!isOpen || !type) return null;

  const tabs = TABS[type] || TABS.job;
  const activeLabel = tabs.find((t: any) => t.id === activeTab)?.label || 'Overview';

  // Find the actual record if it is in our lists
  const matchedJob = type === 'job' ? jobsList.find((j: any) => j.title === itemId || j.id === itemId) : null;
  const matchedTree = type === 'tree' ? ranchOaksList.find((t: any) => t.treeId === itemId || t.id === itemId) : null;
  const matchedFreight = type === 'freight' ? loadsList.find((l: any) => l.title === itemId || l.id === itemId) : null;
  const matchedEquipment = type === 'equipment' ? equipmentList.find((e: any) => e.name === itemId || e.id === itemId) : null;

  // Render contents according to types and tabs
  const renderContent = () => {
    if (type === 'job') {
      const job = matchedJob || {
        title: itemId,
        client: 'Bellaire HOA',
        location: '120 Bellaire Blvd',
        date: '2026-05-28',
        pm: 'Unassigned',
        status: 'onSchedule',
        notes: 'Stage spade near north lake entrance'
      };

      if (activeTab === 'overview') {
        return (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-jdt-sand border border-jdt-border rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">CLIENT ACCOUNT</p>
                <p className="text-lg font-black text-jdt-text">{job.client}</p>
              </div>
              <div className="bg-jdt-sand border border-jdt-border rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">PROJECT COORDINATOR</p>
                <p className="text-lg font-black text-jdt-text">{job.pm || 'Unassigned'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wide">Worksite Characteristics</h4>
              <div className="p-4 bg-jdt-panel border border-jdt-border rounded-xl space-y-3.5 text-sm text-zinc-700">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Location:</span> {job.location}</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Target Deadline:</span> {job.date}</p>
                <p className="flex items-center gap-2"><History className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Operational Status:</span> <span className="font-extrabold text-jdt-primary">{job.status}</span></p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <h5 className="text-xs font-black text-amber-900 uppercase">Field Access Guidelines</h5>
              <p className="text-xs font-bold text-amber-800 leading-relaxed mt-1">{job.notes || 'Confirm utility lines with County before spade dispatch. Track vehicles must remain on plywood mats.'}</p>
            </div>
          </div>
        );
      }

      if (activeTab === 'trees') {
        const assignedTrees = ranchOaksList.filter((t: any) => t.status === 'Assigned' || t.selected);
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-zinc-400 mb-2">Specimens Assigned to Project</h4>
            {assignedTrees.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {assignedTrees.slice(0, 4).map((tree: any) => (
                  <div key={tree.id} className="p-3 bg-jdt-panel border border-jdt-border rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-black text-jdt-text text-sm">{tree.treeId}</p>
                      <p className="text-[11px] text-zinc-500 font-bold">{tree.ranchOakType || 'Live Oak'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-lime-50 border border-lime-200 px-2 py-0.5 rounded text-lime-800">
                      {tree.farm || 'Office'} Farm
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-xl border border-dashed border-jdt-border text-zinc-400 font-bold">
                No active trees linked to this relocation job. Assign trees from the Nursery Board.
              </div>
            )}
          </div>
        );
      }

      if (activeTab === 'documents') {
        const docs = job.jobDocuments || [
          { name: 'Contract_Agreement_Signed.pdf', type: 'PDF', size: '2.4 MB', date: '2026-05-18' },
          { name: 'Nursery_Selection_Spreadsheet.xlsx', type: 'Spreadsheet', size: '1.2 MB', date: '2026-05-19' },
          { name: 'Site_Staging_Map_Draft_V2.pdf', type: 'PDF', size: '5.8 MB', date: '2026-05-20' },
        ];
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-black uppercase text-jdt-text">Job Documents & Drive Links</h4>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal('edit_project', job)} className="px-2.5 py-1 text-xs font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark">Add File / Link Tracker</button>
              </div>
            </div>

            <div className="p-4 bg-jdt-sand border border-jdt-border rounded-xl space-y-3">
              <p className="text-xs font-bold text-zinc-600">
                <span className="font-extrabold text-jdt-primary">Connected Tracker:</span> {job.sourceTrackerTitle || 'Legacy Relocation Spreadsheet'}
              </p>
              {job.sourceTrackerUrl && (
                <p className="text-xs font-bold text-blue-700 truncate">
                  <span className="font-extrabold text-zinc-600">Tracker URL:</span> <a href={job.sourceTrackerUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{job.sourceTrackerUrl}</a>
                </p>
              )}
              {job.sourceFolderUrl && (
                <p className="text-xs font-bold text-blue-700 truncate">
                  <span className="font-extrabold text-zinc-600">Drive Folder:</span> <a href={job.sourceFolderUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{job.sourceFolderUrl}</a>
                </p>
              )}
              {job.sourceNotes && (
                <p className="text-xs font-bold text-zinc-600">
                  <span className="font-extrabold text-zinc-700">Source Notes:</span> {job.sourceNotes}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {docs.map((doc: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-jdt-panel border border-jdt-border rounded-xl hover:border-zinc-400 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${doc.type === 'PDF' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{doc.type}</span>
                    <div>
                      <p className="font-bold text-xs text-jdt-text truncate max-w-xs sm:max-w-md">{doc.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{doc.size} &bull; Uploaded {doc.date}</p>
                    </div>
                  </div>
                  <button className="text-xs font-black text-blue-800 hover:underline">Open Link</button>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (activeTab === 'imported_tracker') {
        const rows = job.importedTrackerRows || [
          { tag: 'RO-1001', caliber: '18 in', height: '30 ft', status: 'Ready', farm: 'Office', lastPruned: '2026-04-10' },
          { tag: 'RO-1005', caliber: '24 in', height: '32 ft', status: 'Ready', farm: 'Office', lastPruned: '2026-03-15' },
          { tag: 'RO-1011', caliber: '24 in', height: '32 ft', status: 'Ready', farm: 'Office', lastPruned: '2026-03-15' },
        ];
        return (
          <div className="space-y-4">
            <div className="bg-jdt-sand border border-jdt-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-jdt-text uppercase">Imported Spreadsheet Tracker</h4>
                <p className="text-xs text-zinc-500 font-bold mt-1">Source: {job.sourceTrackerTitle || 'Legacy Spreadsheet'} &bull; Status: Active sync</p>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded">Approved ({rows.length} rows)</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-jdt-border">
              <table className="w-full text-left border-collapse bg-jdt-panel text-xs">
                <thead>
                  <tr className="bg-jdt-sand text-jdt-primary border-b border-jdt-border font-black text-[10px] uppercase">
                    <th className="p-3">Tree Tag</th>
                    <th className="p-3">Caliber (DBH)</th>
                    <th className="p-3">Height</th>
                    <th className="p-3">Nursery Origin</th>
                    <th className="p-3">Last Pruned</th>
                    <th className="p-3">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-jdt-border font-bold text-zinc-600">
                  {rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50/50">
                      <td className="p-3 font-extrabold text-jdt-text">{row.tag || row.treeId}</td>
                      <td className="p-3">{row.caliber || row.dbh || '18"'}</td>
                      <td className="p-3">{row.height || '30ft'}</td>
                      <td className="p-3">{row.farm || 'Office'}</td>
                      <td className="p-3">{row.lastPruned || row.lastFertilized || 'Completed'}</td>
                      <td className="p-3 text-emerald-700">✔ Ready</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      if (activeTab === 'move_readiness') {
        return (
          <div className="space-y-5">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-1">Pre-Rigging Operational Checklist</h4>
            <div className="divide-y divide-zinc-200">
              {[
                { task: 'Right-Of-Way Transit Permit issued by Council', done: true },
                { task: 'Underground gas and drainage water lines marked (811 ticket)', done: true },
                { task: 'HOA gates clearance height verified for Spade #3 (14.5ft)', done: false },
                { task: 'Client deposit confirmation received by billing', done: true },
                { task: 'Subsoil irrigation point pre-drilled', done: false },
              ].map((chk, i) => (
                <div key={i} className="py-3 flex items-start gap-3.5">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${chk.done ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                    {chk.done ? <CheckCircle className="h-4 w-4" /> : '○'}
                  </span>
                  <p className="text-sm font-bold text-zinc-700 leading-normal">{chk.task}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (activeTab === 'photos') {
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-1">Field Crew Snapshots</h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="h-36 bg-zinc-900 rounded-lg overflow-hidden relative group">
                <img src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=400&fit=crop" alt="Tree Prep" className="w-full h-full object-cover opacity-75" />
                <span className="absolute bottom-2 left-2 bg-zinc-950/80 text-white rounded text-[9px] font-black px-1.5 py-0.5 uppercase">Root prune phase</span>
              </div>
              <div className="h-36 bg-zinc-900 rounded-lg overflow-hidden relative group">
                <img src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=400&fit=crop" alt="Spade prep" className="w-full h-full object-cover opacity-75" />
                <span className="absolute bottom-2 left-2 bg-zinc-950/80 text-white rounded text-[9px] font-black px-1.5 py-0.5 uppercase">Spade setup</span>
              </div>
            </div>
          </div>
        );
      }

      if (activeTab === 'change_orders') {
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text">Approved Change Impact Requests</h4>
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-inner flex items-center justify-between">
              <div>
                <p className="font-black text-sm text-jdt-text">CCO-1102 Soft Soil Stabilizer mats</p>
                <p className="text-xs text-zinc-400 font-bold mt-0.5">Needed 12 additional plywood mats due to excessive rain.</p>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-1 rounded">$1,450</span>
            </div>
          </div>
        );
      }

      if (activeTab === 'history') {
        const historyList = job.history || [
          { date: '2026-05-22 08:30 AM', user: 'System', event: 'Job Initialized', notes: 'Setup site coordinates and access rules.' },
          { date: '2026-05-22 10:15 AM', user: 'System', event: 'Utility Inspection Passed', notes: '811 markings verified on north fence.' }
        ];
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-2">History & Operations Logs</h4>
            <div className="space-y-3">
              {historyList.map((h: any, i: number) => (
                <div key={i} className="p-3.5 bg-jdt-panel border border-jdt-border rounded-xl flex items-start gap-3 shadow-sm">
                  <Clock className="h-4 w-4 text-jdt-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-xs text-jdt-text">{h.event || 'System Update'}</p>
                      <span className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-1.5 py-0.5 rounded text-zinc-500 font-mono">{h.user || 'JDT'}</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-400 mt-1">{h.date || 'Just Now'}</p>
                    {h.notes && <p className="text-xs font-bold text-zinc-600 mt-1 leading-relaxed">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    if (type === 'tree') {
      const tree = matchedTree || {
        treeId: itemId,
        ranchOakType: 'Live Oak Specimen',
        dbh: 14,
        height: 24,
        spread: 16,
        status: 'Available',
        farm: '40 Acre',
        zone: 'Block C6'
      };

      if (activeTab === 'overview') {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-jdt-sand border border-jdt-border p-3.5 rounded-xl text-center">
                <p className="text-[10px] font-black uppercase text-zinc-400">CALIPER / DBH</p>
                <p className="text-xl font-black text-jdt-text mt-1">{tree.dbh || 12}"</p>
              </div>
              <div className="bg-jdt-sand border border-jdt-border p-3.5 rounded-xl text-center">
                <p className="text-[10px] font-black uppercase text-zinc-400">EST HEIGHT</p>
                <p className="text-xl font-black text-jdt-text mt-1">{tree.height || 22}ft</p>
              </div>
              <div className="bg-jdt-sand border border-jdt-border p-3.5 rounded-xl text-center">
                <p className="text-[10px] font-black uppercase text-zinc-400">CROWN SPREAD</p>
                <p className="text-xl font-black text-jdt-text mt-1">{tree.spread || 14}ft</p>
              </div>
            </div>

            <div className="p-4 bg-jdt-panel border border-jdt-border rounded-xl space-y-3.5 text-sm text-zinc-700">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Agricultural Plot:</span> Zone {tree.zone || 'B1'} &bull; {tree.farm || 'Office'} Farm</p>
              <p className="flex items-center gap-2"><Leaf className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Curing Stage:</span> Root prune completed Oct 2025</p>
              <p className="flex items-center gap-2"><Users className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Inventory Status:</span> <span className="font-extrabold text-lime-800">{tree.status}</span></p>
            </div>
          </div>
        );
      }

      if (activeTab === 'health') {
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-zinc-400 mb-2">Treatments & Soil Wellness Logs</h4>
            <div className="space-y-3">
              <div className="p-3.5 bg-jdt-panel border border-jdt-border rounded-xl flex items-start gap-3">
                <span className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>
                <div>
                  <p className="font-black text-xs text-jdt-text">Mycorrhizae Root Stimulator Injected</p>
                  <p className="text-[11px] font-bold text-zinc-400 mt-0.5">May 10, 2026 &bull; System</p>
                </div>
              </div>
              <div className="p-3.5 bg-jdt-panel border border-jdt-border rounded-xl flex items-start gap-3">
                <span className="h-2 w-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>
                <div>
                  <p className="font-black text-xs text-jdt-text">Water Ring Clean & Reset</p>
                  <p className="text-[11px] font-bold text-zinc-400 mt-0.5">Apr 24, 2026 &bull; System</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      if (activeTab === 'assignment') {
        return (
          <div className="p-8 text-center bg-jdt-sand/30 border border-jdt-border rounded-2xl flex flex-col items-center justify-center">
            <MapPin className="h-9 w-9 text-zinc-400 mb-3" />
            <h5 className="font-black uppercase text-jdt-text text-sm">Target Assignment</h5>
            <p className="text-xs font-bold text-zinc-500 mt-1 max-w-sm">This tree is currently available for allocation. To specify sales bindings, click "Assign" in the footer dock.</p>
          </div>
        );
      }

      if (activeTab === 'history') {
        const historyList = tree.history || [
          { date: '2025-10-14', user: 'System', event: 'Root Pruned Stage 1', notes: 'North arc root prune using Spade #3. Hand-poured multivitamin stimulus.' },
          { date: '2026-03-12', user: 'System', event: 'Annual Canopy Thinning', notes: 'Cleared dead center limbs. Health rating: Excellent.' }
        ];
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-2">Historic Pruning & Cut Records</h4>
            <div className="space-y-3">
              {historyList.map((h: any, i: number) => (
                <div key={i} className="p-3.5 bg-jdt-panel border border-jdt-border rounded-xl flex items-start gap-3 shadow-sm">
                  <CheckSquare className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-xs text-jdt-text">{h.event || 'Prune/Cut Logged'}</p>
                      <span className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-1.5 py-0.5 rounded text-zinc-500">{h.user || 'System'}</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-400 mt-1">{h.date || 'Just Now'}</p>
                    {h.notes && <p className="text-xs font-bold text-zinc-600 mt-1 leading-relaxed">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    if (type === 'freight') {
      const load = matchedFreight || {
        title: itemId,
        driver: 'Unassigned',
        truck: 'Truck #2',
        origin: 'Office Block A',
        delivery: 'Waterford Golf Club',
        status: 'Dispatched',
        eta: '11:45 AM'
      };

      if (activeTab === 'overview') {
        return (
          <div className="space-y-6">
            <div className="p-4 bg-jdt-panel border border-jdt-border rounded-xl space-y-4 text-sm text-zinc-700">
              <p className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Heavy Driver:</span> {load.driver}</p>
              <p className="flex items-center gap-2"><Wrench className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Truck Rigging:</span> {load.truck || 'Tractor #4 / Flatbed'}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Transit Stops:</span> {load.origin} &rarr; {load.delivery}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Departure ETA:</span> {load.eta || 'Within 1 Hour'}</p>
            </div>

            <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3 text-sky-900">
              <AlertTriangle className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase">Escort Clearance Requirement</p>
                <p className="text-xs font-bold mt-0.5 opacity-90">Wide truck load. Coordinate route bypasses along I-75 with dispatch escort pilot team before moving.</p>
              </div>
            </div>
          </div>
        );
      }

      if (activeTab === 'route') {
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-2">Logistics Routing Waypoints</h4>
            <div className="relative border-l-2 border-zinc-300 pl-6 space-y-6 ml-3 py-1">
              <div className="relative">
                <span className="absolute -left-8.5 top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200"></span>
                <p className="font-black text-xs text-jdt-text">JDT Nursery Yard Origin</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-0.5">Departed 7:00 AM</p>
              </div>
              <div className="relative">
                <span className="absolute -left-8.5 top-0.5 h-4 w-4 rounded-full bg-orange-400 border-2 border-white ring-2 ring-orange-100 animate-pulse"></span>
                <p className="font-black text-xs text-jdt-text">County Agricultural Inspection Point</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-0.5">Current Site Check &bull; Transit Clearance Approved</p>
              </div>
              <div className="relative">
                <span className="absolute -left-8.5 top-0.5 h-4 w-4 rounded-full bg-zinc-300 border-2 border-white"></span>
                <p className="font-black text-xs text-zinc-400">Arrive Waterford Site Entrance</p>
                <p className="text-[10px] font-bold text-zinc-400 mt-0.5">Est arrival at 11:45 AM</p>
              </div>
            </div>
          </div>
        );
      }
    }

    if (type === 'equipment') {
      const eq = matchedEquipment || {
        name: itemId,
        id: 'EQ-loader',
        status: 'Available',
        operator: 'Unassigned',
        hours: 380,
        serviceDueHours: 400
      };

      if (activeTab === 'overview') {
        const percentLeft = Math.max(0, Math.floor(((eq.serviceDueHours - eq.hours) / eq.serviceDueHours) * 100));
        return (
          <div className="space-y-6">
            <div className="p-4 bg-jdt-panel border border-jdt-border rounded-xl space-y-4 text-sm text-zinc-700">
              <p className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Operator:</span> {eq.operator || 'Not Assigned'}</p>
              <p className="flex items-center gap-2"><Wrench className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Meter Engine Hours:</span> {eq.hours || 120} hrs</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-zinc-400" /> <span className="font-bold">Next Maintenance Due:</span> at {eq.serviceDueHours || 250} hrs</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-zinc-500">
                <span>HYDRAULIC & LIQUID CHECKUP INTEGRITY:</span>
                <span>{percentLeft}% Lifespan Remaining</span>
              </div>
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <div className={`h-full rounded-full ${percentLeft < 15 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${percentLeft}%` }}></div>
              </div>
            </div>
          </div>
        );
      }

      if (activeTab === 'maintenance') {
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase text-jdt-text mb-2">Diagnostics Summary</h4>
            <div className="p-4 bg-lime-50 rounded-xl border border-lime-200 text-lime-900 text-xs font-bold leading-normal">
              No outstanding trouble diagnostics or active hydraulic leaks flagged. Rig test completed on May 20, 2026.
            </div>
          </div>
        );
      }

      if (activeTab === 'qr') {
        return (
          <div className="flex flex-col items-center py-6 text-center space-y-4">
            <QrCode className="h-28 w-28 text-jdt-primary bg-jdt-sand p-2 rounded-xl border border-jdt-border shadow-inner" />
            <div>
              <p className="text-sm font-black text-jdt-text uppercase">JDT-ASSET-{eq.id || 'FLEET'}</p>
              <p className="text-xs text-zinc-400 font-bold mt-1 max-w-sm">Scan to launch pre-trip checklists and fleet compliance spreadsheets instantly from operators mobile screens.</p>
            </div>
          </div>
        );
      }
    }

    // fallback
    return (
      <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm p-8 min-h-full flex flex-col items-center justify-center text-center">
         <div className="h-20 w-20 rounded-2xl bg-jdt-sand flex items-center justify-center mb-6">
            <FileText className="h-10 w-10 text-zinc-400" />
         </div>
         <h3 className="text-2xl font-black text-jdt-text">{activeLabel} Module</h3>
         <p className="text-base font-bold text-zinc-500 mt-2 max-w-md">
           Universal connector holds data schemas for {itemId}. Detailed options displayed inside {activeLabel}.
         </p>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-jdt-primary/40 backdrop-blur-sm z-40 pointer-events-auto" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-jdt-panel shadow-2xl z-50 flex flex-col transform transition-transform pointer-events-auto overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-jdt-border bg-jdt-primary text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{type.toUpperCase()} PROFILE</p>
            <h2 className="text-2xl font-black mt-0.5">{itemId || "Detail View"}</h2>
          </div>
          <button onClick={onClose} aria-label="Close drawer" className="p-2 bg-jdt-panel/10 hover:bg-jdt-panel/20 rounded-lg text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex bg-jdt-sand border-b border-jdt-border overflow-x-auto">
          {tabs.map((t: any) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-wide whitespace-nowrap transition-colors border-b-2 ${activeTab === t.id ? 'border-zinc-950 text-jdt-primary bg-jdt-panel' : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-jdt-panel">
          {renderContent()}
        </div>
               <footer className="p-4 border-t border-jdt-border bg-jdt-panel flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
           <button onClick={onClose} className="px-4 py-2 text-xs font-black uppercase rounded-lg border border-jdt-border text-zinc-600 hover:bg-jdt-panel shadow-sm w-full md:w-auto text-center font-sans">Close</button>
           
           <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 sm:gap-2">
             {type === 'job' && (
                <>
                  <button onClick={() => openModal('assign_crew', matchedJob)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Assign Crew</button>
                  <button onClick={() => openModal('add_tree', matchedJob)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><Leaf className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Add Tree</button>
                  <button onClick={() => openModal('create_move', matchedJob)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><Truck className="h-3 w-3 sm:h-3.5 sm:w-3.5 font-bold" /> Create Move</button>
                  <button onClick={() => openModal('change_order', matchedJob)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><FilePlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Change Order</button>
                  <button onClick={() => openModal('edit_project', matchedJob)} className="px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase rounded-lg bg-jdt-primary text-white shadow-sm hover:bg-jdt-dark font-sans text-center">Edit Project</button>
                </>
             )}
             {type === 'tree' && (
                <>
                  <button onClick={() => openModal('log_prune', matchedTree)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><CheckSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Log Prune</button>
                  <button onClick={() => openModal('treatment', matchedTree)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Treatment</button>
                  <button onClick={() => openModal('move_check', matchedTree)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Move Check</button>
                  <button onClick={() => openModal('assign_tree', matchedTree)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 flex items-center justify-center gap-1"><MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Assign</button>
                  <button onClick={() => openModal('qr')} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center" aria-label="Show QR"><QrCode className="h-3.5 w-3.5" /></button>
                </>
             )}
             {type === 'freight' && (
                <>
                  <button onClick={() => openModal('set_freight_status', matchedFreight)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><ListChecks className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Set Status</button>
                  <button onClick={() => openModal('delay', matchedFreight)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-amber-200 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Delay</button>
                  <button onClick={() => openModal('complete', matchedFreight)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 flex items-center justify-center gap-1"><CheckSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Complete</button>
                  <button onClick={() => openModal('edit_freight', matchedFreight)} className="px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase rounded-lg bg-jdt-primary text-white shadow-sm hover:bg-jdt-dark font-sans text-center">Edit Freight</button>
                </>
             )}
             {type === 'equipment' && (
                <>
                  <button onClick={() => openModal('log_issue', matchedEquipment)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-amber-200 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Log Issue</button>
                  <button onClick={() => openModal('set_eq_status', matchedEquipment)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><ListChecks className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Set Status</button>
                  <button onClick={() => openModal('edit_equipment', matchedEquipment)} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel font-sans flex items-center justify-center gap-1"><Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Edit Profile</button>
                  <button onClick={() => openModal('print_card')} className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-panel flex items-center justify-center gap-1"><FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Print</button>
                </>
             )}
           </div>
        </footer>
       </div>
     </>
   );
}
