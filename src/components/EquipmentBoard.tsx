import React, { useState } from 'react';
import { Wrench, MapPin, UserCheck, AlertTriangle, Clock, Activity, QrCode, ClipboardList, PenTool } from 'lucide-react';
import { complianceBadgeClass, vehicleComplianceSummary, type ComplianceStatus } from '../commandCenter/compliance';
import { equipmentCategory, equipmentDisplayName } from '../commandCenter/equipmentFreight';
import { categoryAccentBorderClass, riskSurfaceClass, statusPillClass } from '../commandCenter/visualLanguage';
import { CategoryIcon } from './CategoryIcon';
import { IconButton } from './IconBadge';

function VehicleCompliancePill({ label, status }: { label: string; status: ComplianceStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-jdt-sand/50 px-2 py-1.5">
      <span className="text-[10px] font-black uppercase text-zinc-500">{label}</span>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${complianceBadgeClass(status)}`}>
        {status.label}
      </span>
    </div>
  );
}

function showVehicleCompliance(eq: any) {
  const category = equipmentCategory(eq);
  return category === 'Truck'
    || category === 'Trailer'
    || Boolean(eq.registrationDocumentUrl)
    || Boolean(eq.registrationExpirationDate)
    || Boolean(eq.insuranceDocumentUrl)
    || Boolean(eq.insuranceExpirationDate);
}

export default function EquipmentBoard({ starterEquipment, openDrawer, openModal }: { starterEquipment: any[], openDrawer: (type: string, id: string) => void, openModal: (type: string, data?: any) => void }) {

  const grouped = starterEquipment.reduce((acc: any, eq: any) => {
    const status = eq.status || 'Available';
    if (!acc[status]) acc[status] = [];
    acc[status].push(eq);
    return acc;
  }, {});

  const statusOrder = ['Down', 'Inspection', 'Maintenance', 'Assigned', 'Available'];
  const statusKeys = [...statusOrder, ...Object.keys(grouped).filter((status) => !statusOrder.includes(status))];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-start gap-3">
            <CategoryIcon category="equipment" size="md" />
            <div>
              <h2 className="text-2xl font-black text-jdt-primary">Maintenance & Equipment</h2>
              <p className="text-sm font-bold text-zinc-500 mt-1">Fleet, trailers, implements, location, and service readiness</p>
            </div>
         </div>
         <button onClick={() => openModal('equipment')} className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
           Add Equipment
         </button>
      </div>

      {starterEquipment.length === 0 && (
        <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
          <Wrench className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-black text-jdt-text">No equipment records yet</p>
          <p className="mx-auto mt-1 max-w-lg text-xs font-bold text-zinc-500">Import the Equipment Master List or add trucks, trailers, machines, and implements manually. Each card can be edited as details get refined.</p>
          <button onClick={() => openModal('equipment')} className="mt-4 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
            Create Equipment Card
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {statusKeys.map(status => {
           const items = grouped[status];
           if (!items || items.length === 0) return null;
           
           return (
             <section key={status}>
                <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-lg font-black tracking-wide text-zinc-800">{status}</h3>
                   <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-black text-zinc-700">{items.length}</span>
                </div>
                <div className="grid gap-4 xl:grid-cols-2 lg:grid-cols-2">
                   {items.map((eq: any) => {
                     const compliance = vehicleComplianceSummary(eq);
                     const currentLocationName = eq.currentLocationName || eq.location || eq.currentLocation || 'Location not set';
                     const currentLocationDetail = eq.currentLocation && eq.currentLocation !== currentLocationName ? eq.currentLocation : '';
                     return (
                     <article key={eq.id} className={`rounded-xl border border-jdt-border border-l-4 bg-jdt-panel shadow-sm overflow-hidden flex flex-col pt-1 group hover:border-zinc-400 transition-colors ${categoryAccentBorderClass('equipment')}`}>
                        {(eq.status === 'Down' || eq.status === 'Inspection' || Number(eq.serviceDueHours ?? Number.POSITIVE_INFINITY) < 100) && (
                          <div className={`px-4 py-2 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 ${eq.status === 'Down' ? 'bg-[#A6402D] text-white' : 'bg-[#B98138] text-white'}`}>
                            <AlertTriangle className="h-4 w-4" /> 
                            {eq.status === 'Down' ? 'Critical Action Required' : (eq.issue ? eq.issue : 'Service Due Soon')}
                          </div>
                        )}
                        <div 
                          className="p-4 bg-jdt-panel/50 border-b border-jdt-border flex justify-between items-start gap-4 cursor-pointer hover:bg-jdt-sand"
                          onClick={() => openDrawer('equipment', eq.id)}
                        >
                           <div>
                             <div className="flex items-center gap-3">
                               <CategoryIcon category="equipment" size="md" className="group-hover:scale-110 transition-transform" />
                               <div>
                                 <h4 className="text-xl font-black text-jdt-primary group-hover:text-blue-700 transition-colors">{equipmentDisplayName(eq)}</h4>
                                 <p className="text-xs font-black uppercase text-zinc-500 tracking-wider mt-1">{equipmentCategory(eq)} - {eq.assetId || eq.id}</p>
                               </div>
                             </div>
                           </div>
                           <span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusPillClass(eq.status || 'Available')}`}>
                             {eq.status || 'Available'}
                           </span>
                        </div>
                        
                        <div className="p-4 flex-1">
                           <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> Current Location</p>
                                  <p className="font-bold text-jdt-text">{currentLocationName}</p>
                                  {currentLocationDetail && <p className="mt-1 text-xs font-bold leading-snug text-zinc-600">{currentLocationDetail}</p>}
                                  <p className="text-[10px] font-black uppercase text-zinc-400">{eq.currentLocationType || 'Unknown'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5"/> Operator</p>
                                  <p className="font-bold text-jdt-text">{eq.assignedCrewName || eq.operator || 'Unassigned'}</p>
                                </div>
                                {(eq.assignedProjectName || eq.assignedTruck) && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Assigned To</p>
                                    <p className="font-bold text-jdt-text">{eq.assignedProjectName || eq.assignedTruck}</p>
                                  </div>
                                )}
                              </div>
                              <div className={`space-y-4 rounded-lg border p-3 ${Number(eq.serviceDueHours ?? Number.POSITIVE_INFINITY) < 100 ? riskSurfaceClass('watch') : 'border-[#D5AA6E] bg-[#FBF1E7] text-[#7A4A12]'}`}>
                                <div>
                                  <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5"/> Engine Hours</p>
                                  <p className="text-3xl font-black">{typeof eq.hours === 'number' ? eq.hours.toLocaleString() : (eq.hours || '-')}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Service Due In</p>
                                  <p className="text-xl font-black">{eq.serviceDueHours ?? eq.nextServiceDue ?? '-'}{eq.serviceDueHours ? ' hrs' : ''}</p>
                                </div>
                              </div>
                           </div>
                           {(eq.compatibleImplementTypes?.length || eq.attachedImplementNames?.length || eq.implementType) && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">Implements</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {eq.implementType && <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{eq.implementType}</span>}
                                  {(eq.attachedImplementNames || []).map((name: string) => <span key={`attached-${name}`} className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">Attached: {name}</span>)}
                                  {(eq.compatibleImplementTypes || []).map((name: string) => <span key={`compatible-${name}`} className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-700">{name}</span>)}
                                </div>
                              </div>
                           )}
                           {(equipmentCategory(eq) === 'Trailer' || eq.trailerMaintenanceCategories?.length || eq.trailerServiceNotes) && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">Trailer Service Areas</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {(eq.trailerMaintenanceCategories && eq.trailerMaintenanceCategories.length > 0 ? eq.trailerMaintenanceCategories : ['Trailer maintenance not categorized']).map((category: string) => (
                                    <span key={category} className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{category}</span>
                                  ))}
                                </div>
                                {eq.trailerServiceNotes && <p className="mt-2 text-xs font-bold text-zinc-600">{eq.trailerServiceNotes}</p>}
                              </div>
                           )}
                           {showVehicleCompliance(eq) && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">Vehicle Compliance</p>
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                  <VehicleCompliancePill label="Registration" status={compliance.registration} />
                                  <VehicleCompliancePill label="Insurance" status={compliance.insurance} />
                                </div>
                              </div>
                           )}
                           
                           {eq.issue && eq.status !== 'Down' && eq.status !== 'Inspection' && (
                              <div className={`mt-4 flex gap-2 rounded border p-2 text-sm font-bold ${riskSurfaceClass('watch')}`}>
                                 <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                 {eq.issue}
                              </div>
                           )}
                        </div>
                        
                        <div className="p-4 border-t border-jdt-border bg-jdt-panel/50 flex flex-wrap gap-2">
                           <button onClick={() => openModal('set_eq_status', eq)} className="flex-1 rounded-md bg-jdt-primary py-2 px-2 text-[10px] font-black uppercase text-white shadow-sm hover:bg-jdt-dark whitespace-nowrap text-center">Set Status</button>
                           <button onClick={() => openModal('report_vehicle_issue', eq)} className="flex-1 rounded-md bg-jdt-panel border border-jdt-border py-2 px-2 text-[10px] font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel whitespace-nowrap flex justify-center items-center gap-1.5"><PenTool className="h-3 w-3" /> Report Issue</button>
                           <button onClick={() => openModal('edit_equipment', eq)} className="flex-1 rounded-md bg-jdt-panel border border-jdt-border py-2 px-2 text-[10px] font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel whitespace-nowrap text-center">Edit</button>
                           <button onClick={() => openModal('delete_equipment', eq)} className="flex-1 rounded-md bg-red-50 border border-red-200 text-red-700 py-2 px-2 text-[10px] font-black uppercase shadow-sm hover:bg-red-100 whitespace-nowrap text-center">Delete</button>
                           <IconButton onClick={(e) => { e.stopPropagation(); openModal('print_card', eq); }} icon={ClipboardList} title="Print Service Card" />
                           <IconButton onClick={(e) => { e.stopPropagation(); openModal('qr', eq); }} icon={QrCode} title="Show QR" />
                        </div>
                     </article>
                     );
                   })}
                </div>
             </section>
           );
        })}
      </div>
    </div>
  );
}
