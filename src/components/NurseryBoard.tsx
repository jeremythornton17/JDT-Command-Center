import React, { useState } from 'react';
import { Search, Plus, Edit2, QrCode, ClipboardList, MapPin } from 'lucide-react';

export default function NurseryBoard({ starterRanchOaks, openDrawer, openModal }: { starterRanchOaks: any[], openDrawer: (type: string, id: string) => void, openModal: (type: string, data?: any) => void }) {
  const [inventoryFarm, setInventoryFarm] = useState('Office');
  const [inventoryZone, setInventoryZone] = useState('All');
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filteredTrees = starterRanchOaks.filter(t => 
    t.farm === inventoryFarm && 
    (inventoryZone === 'All' || t.zone === inventoryZone) && 
    (t.treeId.toLowerCase().includes(inventoryQuery.toLowerCase()) || 
     t.zone?.toLowerCase().includes(inventoryQuery.toLowerCase()) || 
     (t.ranchOakType || t.species || '').toLowerCase().includes(inventoryQuery.toLowerCase()))
  );

  const StatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800';
      case 'Sold': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Dig Queue': return 'bg-orange-100 text-orange-800';
      case 'Harvested': return 'bg-zinc-200 text-zinc-800';
      case 'Assigned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-jdt-sand text-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-jdt-primary">Nursery & Inventory</h2>
            <p className="text-sm font-bold text-zinc-500 mt-1">Production board and stock tracking</p>
         </div>
      </div>
      
      <div className="space-y-5">
        <nav className="flex flex-wrap gap-2 print:hidden justify-between items-end">
          <div className="flex flex-wrap gap-2">
			  {["Office", "25 Acre", "40 Acre", "10 Acre", "Janets"].map(f => (
				<button 
				  key={f}
				  onClick={() => { setInventoryFarm(f); setInventoryZone('All'); }}
				  className={`px-4 py-2 rounded-t-lg font-black uppercase text-sm ${inventoryFarm === f ? 'bg-jdt-primary text-white' : 'bg-jdt-panel text-zinc-500 hover:bg-jdt-sand'}`}
				>
				  {f}
				</button>
			  ))}
          </div>
          <div className="bg-zinc-200 p-1 rounded-lg flex items-center gap-1 mb-1">
             <button onClick={() => setViewMode('cards')} className={`px-3 py-1 text-xs font-black uppercase rounded-md ${viewMode === 'cards' ? 'bg-jdt-panel shadow-sm text-jdt-text' : 'text-zinc-500 hover:text-zinc-700'}`}>Cards</button>
             <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-xs font-black uppercase rounded-md ${viewMode === 'table' ? 'bg-jdt-panel shadow-sm text-jdt-text' : 'text-zinc-500 hover:text-zinc-700'}`}>Table</button>
          </div>
        </nav>

        <section className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-jdt-border gap-4 bg-jdt-panel/50">
             <div>
               <p className="text-xs font-black uppercase tracking-wide text-lime-700">Ranch Oaks - {inventoryFarm}</p>
               <h2 className="text-2xl font-black">Tree Inventory</h2>
             </div>
             <div className="flex flex-wrap items-center gap-3">
               <select 
                 value={inventoryZone} 
                 onChange={e => setInventoryZone(e.target.value)}
                 className="bg-jdt-panel border border-jdt-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 font-bold"
               >
                 <option value="All">All Zones</option>
                 {Array.from(new Set(starterRanchOaks.filter(t => t.farm === inventoryFarm && t.zone).map(t => t.zone))).sort().map((z: any) => (
                   <option key={z} value={z}>{z}</option>
                 ))}
               </select>
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Search trees..."
                    className="bg-jdt-panel border border-jdt-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-500 w-48 font-bold"
                    value={inventoryQuery}
                    onChange={e => setInventoryQuery(e.target.value)}
                  />
               </div>
               <button onClick={() => openModal('tree')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black uppercase bg-jdt-primary text-white"><Plus className="h-4 w-4"/> Add Tree</button>
             </div>
          </div>
          
          <div className="p-4 bg-jdt-sand/50">
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {filteredTrees.map((oak: any) => (
                    <article key={oak.id} className="bg-jdt-panel rounded-lg border border-jdt-border shadow-sm overflow-hidden p-4 flex flex-col group hover:border-zinc-400 transition-colors">
                       <div 
                         className="flex items-start justify-between mb-3 border-b border-zinc-100 pb-3 cursor-pointer"
                         onClick={() => openDrawer('tree', oak.treeId)}
                       >
                          <div>
                            <h3 className="text-2xl font-black text-jdt-primary tracking-tight group-hover:text-blue-700 transition-colors">{oak.treeId}</h3>
                            <p className="text-[11px] font-black uppercase text-zinc-500 tracking-wider mt-0.5">{oak.ranchOakType}</p>
                          </div>
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${StatusColor(oak.status)}`}>
                            {oak.status}
                          </span>
                       </div>
                       
                       <div className="space-y-3 flex-1">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                             <div>
                               <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Dimensions</p>
                               <p className="font-bold text-zinc-800">D: {oak.dbh}"</p>
                               <p className="font-bold text-zinc-800">H: {oak.height}' / S: {oak.spread}'</p>
                             </div>
                             <div>
                               <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Location</p>
                               <p className="font-bold text-zinc-800 flex items-center gap-1"><MapPin className="h-3 w-3 text-zinc-400"/> {oak.farm}</p>
                               <p className="font-bold text-zinc-800 ml-4">{oak.zone}</p>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm border-t border-zinc-100 pt-3">
                            <div>
                               <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Plant/Harv</p>
                               <p className="font-bold text-zinc-700 text-xs">P: {oak.datePlanted || '-'}</p>
                               <p className="font-bold text-zinc-700 text-xs">H: {oak.dateHarvested || '-'}</p>
                             </div>
                             <div>
                               <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Phase</p>
                               <p className="font-bold text-zinc-700 text-xs">{oak.growthCyclePhase || '-'}</p>
                              </div>
                           </div>

                           {(oak.rootPruneDate1 || oak.rootPruneDate2 || oak.rootPruneDate3 || oak.rootPruneDate4 || oak.flaggingTape) && (
                             <div className="space-y-1.5 border-t border-zinc-100 pt-3 text-xs">
                               {(oak.rootPruneDate1 || oak.rootPruneDate2 || oak.rootPruneDate3 || oak.rootPruneDate4) && (
                                 <div>
                                   <p className="text-[10px] font-black uppercase text-zinc-500 mb-0.5">Entered Root Prunings</p>
                                   <div className="flex flex-wrap gap-1 text-[10px] font-bold text-zinc-750">
                                     {oak.rootPruneDate1 && (
                                       <span className="bg-orange-50 text-orange-900 px-1.5 py-0.5 rounded border border-orange-150">1st: {oak.rootPruneDate1}</span>
                                     )}
                                     {oak.rootPruneDate2 && (
                                       <span className="bg-orange-50 text-orange-900 px-1.5 py-0.5 rounded border border-orange-150">2nd: {oak.rootPruneDate2}</span>
                                     )}
                                     {oak.rootPruneDate3 && (
                                       <span className="bg-orange-50 text-orange-900 px-1.5 py-0.5 rounded border border-orange-150">3rd: {oak.rootPruneDate3}</span>
                                     )}
                                     {oak.rootPruneDate4 && (
                                       <span className="bg-orange-50 text-orange-900 px-1.5 py-0.5 rounded border border-orange-150">4th: {oak.rootPruneDate4}</span>
                                     )}
                                   </div>
                                 </div>
                               )}
                               {oak.flaggingTape && (
                                 <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded p-1.5 text-[10px] font-bold leading-normal">
                                   <span className="font-black text-amber-800">🎗 Tagged Flagging:</span> {oak.flaggingTape}
                                 </div>
                               )}
                             </div>
                           )}
                       </div>
                       
                       <div className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); openModal('assign_tree', oak); }} className="flex-1 bg-jdt-sand hover:bg-zinc-200 text-zinc-700 font-black uppercase text-[10px] rounded py-1.5 transition-colors z-10 relative">Assign</button>
                          <button onClick={(e) => { e.stopPropagation(); openModal('qr', oak); }} className="bg-jdt-sand hover:bg-zinc-200 text-zinc-700 font-black uppercase text-[10px] rounded px-3 py-1.5 transition-colors flex items-center gap-1 z-10 relative"><QrCode className="h-3 w-3"/></button>
                       </div>
                    </article>
                 ))}
                 {filteredTrees.length === 0 && (
                   <div className="col-span-full py-12 text-center">
                     <p className="text-zinc-400 font-bold">No trees found matching criteria.</p>
                   </div>
                 )}
              </div>
            ) : (
              <div className="overflow-x-auto bg-jdt-panel rounded-lg border border-jdt-border">
                <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-jdt-sand text-zinc-500 border-b border-jdt-border">
                      <tr>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Tree ID / Type</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Status / Phase</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Dimensions (in/ft)</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Location</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Dates (Planted / Harv)</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px]">Nutrient Care</th>
                         <th className="px-4 py-3 font-black uppercase tracking-wide text-[10px] text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-200">
                      {filteredTrees.map((oak: any) => (
                        <tr key={oak.id} className="hover:bg-jdt-panel transition-colors group align-top">
                          <td className="px-4 py-3">
                            <p className="font-black text-jdt-text">{oak.treeId}</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-1">{oak.ranchOakType}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${StatusColor(oak.status)}`}>
                              {oak.status}
                            </span>
                            <p className="mt-1 text-[11px] font-bold text-zinc-500">{oak.growthCyclePhase || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-700">DBH: {oak.dbh}"</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-1">H: {oak.height}' / S: {oak.spread}' / RB: {oak.rootballSize}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-700">{oak.farm}</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-1">{oak.zone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-700"><span className="text-zinc-400">P:</span> {oak.datePlanted || '-'}</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-1"><span className="text-zinc-400">H:</span> {oak.dateHarvested || '-'}</p>
                             {(oak.rootPruneDate1 || oak.rootPruneDate2 || oak.rootPruneDate3 || oak.rootPruneDate4) && (
                               <div className="mt-1 text-[10px] text-orange-950 font-bold max-w-[150px] leading-tight bg-orange-50/50 p-1 rounded border border-orange-100">
                                 Prunings: {[oak.rootPruneDate1, oak.rootPruneDate2, oak.rootPruneDate3, oak.rootPruneDate4].filter(Boolean).join(', ')}
                               </div>
                             )}
                             {oak.flaggingTape && (
                               <div className="mt-1 text-[10px] text-amber-900 font-bold max-w-[150px] leading-tight bg-amber-50/50 p-1 rounded border border-amber-100">
                                 Tagging: {oak.flaggingTape}
                               </div>
                             )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-700 text-xs"><span className="text-zinc-400">Fert:</span> {oak.lastFertilized || '-'} <span className="text-zinc-400">({oak.fertilizerType || '-'})</span></p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-1"><span className="text-zinc-400">Spray:</span> {oak.lastSprayed || '-'} <span className="text-zinc-400">({oak.sprayType || '-'})</span></p>
                          </td>
                          <td className="px-4 py-3 text-right group-hover/row:bg-jdt-panel transition-colors">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openModal('edit_tree', oak); }} className="p-1.5 hover:text-jdt-text text-zinc-400 bg-jdt-panel border border-jdt-border shadow-sm rounded-md z-10 relative"><Edit2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
