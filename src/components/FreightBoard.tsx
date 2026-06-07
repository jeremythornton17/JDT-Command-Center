import React from 'react';
import { Truck, MapPin, Clock, CheckCircle2, UserCheck, AlertTriangle, QrCode, FileText, Wrench, Route } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { IconButton } from './IconBadge';
import { complianceBadgeClass, vehicleComplianceSummary, type ComplianceStatus } from '../commandCenter/compliance';
import type { EquipmentRecord, WorkOrderRecord } from '../commandCenter/records';
import { equipmentCategory, equipmentDisplayName, isFreightVehicle, withHomeBaseEquipmentDefaults } from '../commandCenter/equipmentFreight';
import { vehicleLocationHistory } from '../commandCenter/freightWorkflow';
import { categoryAccentBorderClass, riskPillClass, riskSurfaceClass, statusDotClass, statusPillClass } from '../commandCenter/visualLanguage';

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
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-black uppercase ${statusPillClass(status)}`}>
      {status}
    </span>
  );
}

function VehicleCompliancePill({ label, status }: { label: string; status: ComplianceStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
      <span className="text-[10px] font-black uppercase text-zinc-500">{label}</span>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${complianceBadgeClass(status)}`}>
        {status.label}
      </span>
    </div>
  );
}

function workOrdersForLoad(load: any, workOrders: WorkOrderRecord[]) {
  const loadId = String(load.id || load.loadNumber || load.title || '');
  const loadTitle = String(load.title || load.loadNumber || '');
  return workOrders.filter((workOrder) => (
    (workOrder.loadIds || []).includes(loadId)
    || (workOrder.loadNames || []).includes(loadTitle)
    || workOrder.title === loadTitle
    || workOrder.jobId === load.jobId
    || workOrder.projectId === load.projectId
  ));
}

function normalized(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function matchesAny(values: unknown[], candidates: unknown[]): boolean {
  const candidateSet = new Set(candidates.map(normalized).filter(Boolean));
  return values.map(normalized).filter(Boolean).some((value) => candidateSet.has(value));
}

function workOrdersForVehicle(vehicle: EquipmentRecord, workOrders: WorkOrderRecord[]) {
  const category = equipmentCategory(vehicle);
  const idCandidates = [vehicle.id, vehicle.assetId, vehicle.asset];
  const nameCandidates = [
    vehicle.name,
    vehicle.title,
    vehicle.asset,
    equipmentDisplayName(vehicle),
    vehicle.truckType,
    vehicle.trailerType,
  ];

  return workOrders.filter((workOrder) => {
    const generalMatch = matchesAny(workOrder.equipmentIds || [], idCandidates)
      || matchesAny(workOrder.equipmentNames || [], nameCandidates);

    if (category === 'Truck') {
      return generalMatch
        || matchesAny(workOrder.truckIds || [], idCandidates)
        || matchesAny(workOrder.truckNames || [], nameCandidates);
    }

    if (category === 'Trailer') {
      return generalMatch
        || matchesAny(workOrder.trailerIds || [], idCandidates)
        || matchesAny(workOrder.trailerNames || [], nameCandidates);
    }

    return generalMatch;
  });
}

function notesForLoad(load: any): string[] {
  if (Array.isArray(load.notes)) return load.notes.filter(Boolean);
  return String(load.notes || '')
    .split(/\n/)
    .map((note) => note.trim())
    .filter(Boolean);
}

function displayDateTime(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function sortedRouteSteps(load: any) {
  return [...(load.routeSteps || [])].sort((left: any, right: any) => Number(left.sequence || 0) - Number(right.sequence || 0));
}

function routeStepTone(status: string) {
  return statusPillClass(status);
}

export default function FreightBoard({
  loads,
  equipment = [],
  workOrders = [],
  openDrawer,
  openModal,
}: {
  loads: any[];
  equipment?: EquipmentRecord[];
  workOrders?: WorkOrderRecord[];
  openDrawer: (type: string, id: string) => void;
  openModal: (type: string, data?: any) => void;
}) {
  const fleetVehicles = equipment.map(withHomeBaseEquipmentDefaults).filter(isFreightVehicle);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-start gap-3">
            <CategoryIcon category="freight" size="md" />
            <div>
              <h2 className="text-2xl font-black text-jdt-primary">Freight Dispatch</h2>
              <p className="text-sm font-bold text-zinc-500 mt-1">Truck, trailer, equipment move, and delivery tracking</p>
            </div>
         </div>
         <button onClick={() => openModal('load')} className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
           Create Freight Move
         </button>
      </div>

      <section className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-black text-jdt-text">Fleet Vehicles &amp; Trailers</h3>
              <p className="text-xs font-bold text-zinc-500">Vehicle cards track location, assignment, service state, and linked work like a crew roster.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-zinc-400">{fleetVehicles.length} active cards</span>
              {fleetVehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal('equipment', { category: 'Truck', status: 'Available' })}
                  className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive"
                >
                  Add Truck / Trailer
                </button>
              )}
            </div>
          </div>
          {fleetVehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-jdt-text">No trucks or trailers saved yet</p>
                  <p className="mt-1 max-w-2xl text-xs font-bold text-zinc-500">Import the Equipment Master List with truck/trailer rows or create freight vehicle cards here. Once vehicles exist, this section will show where each truck or trailer is, who has it, and what it is connected to.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('equipment', { category: 'Truck', status: 'Available' })}
                  className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Add Truck / Trailer
                </button>
              </div>
            </div>
          ) : (
          <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
            {fleetVehicles.map((vehicle) => {
              const category = equipmentCategory(vehicle);
              const linkedWorkOrders = workOrdersForVehicle(vehicle, workOrders);
              const assignment = vehicle.assignedProjectName || vehicle.assignedJobName || vehicle.assignedCrewName || vehicle.operator || 'Unassigned';
              const currentLocationName = vehicle.currentLocationName || vehicle.currentLocation || vehicle.location || 'Location not set';
              const currentLocationDetail = vehicle.currentLocation && vehicle.currentLocation !== currentLocationName ? vehicle.currentLocation : '';
              const typeLabel = [category, vehicle.truckType || vehicle.trailerType || vehicle.type || vehicle.eqType].filter(Boolean).join(' - ');
              const moveTitle = `${equipmentDisplayName(vehicle)} move`;
              const history = vehicleLocationHistory(vehicle).slice(0, 3);
              const compliance = vehicleComplianceSummary(vehicle);

              return (
                <article key={vehicle.id || equipmentDisplayName(vehicle)} className={`rounded-xl border border-jdt-border border-l-4 bg-jdt-panel shadow-sm overflow-hidden ${categoryAccentBorderClass('freight')}`}>
                  <div
                    className="border-b border-jdt-border bg-jdt-panel/60 p-4 cursor-pointer hover:bg-jdt-sand"
                    onClick={() => openDrawer('equipment', vehicle.id || vehicle.assetId || equipmentDisplayName(vehicle))}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category="freight" size="xs" />
                          <p className="text-[10px] font-black uppercase text-zinc-400">{typeLabel || 'Vehicle'}</p>
                        </div>
                        <h4 className="mt-1 text-lg font-black text-jdt-primary truncate">{equipmentDisplayName(vehicle)}</h4>
                      </div>
                      <StatusBadge status={vehicle.status || 'Available'} />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <InfoTag icon={MapPin} label="Current Location" value={currentLocationName} />
                    {currentLocationDetail && <p className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-zinc-600">{currentLocationDetail}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <InfoTag icon={UserCheck} label="Assigned To" value={assignment} />
                      <InfoTag icon={Wrench} label="Service" value={vehicle.serviceStatus || vehicle.nextServiceDue || 'Service not set'} />
                      <InfoTag icon={Truck} label="Load State" value={vehicle.vehicleLoadState || 'Not set'} />
                      <InfoTag icon={Clock} label="Last Seen" value={displayDateTime(vehicle.lastSpottedAt)} />
                    </div>
                    <div className="rounded-lg border border-jdt-border bg-jdt-sand/30 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-jdt-primary">
                        <FileText className="h-3.5 w-3.5" /> Vehicle Compliance
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        <VehicleCompliancePill label="Registration" status={compliance.registration} />
                        <VehicleCompliancePill label="Insurance" status={compliance.insurance} />
                      </div>
                    </div>
                    {linkedWorkOrders.length > 0 ? (
                      <div className="rounded-lg border border-jdt-border bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-500">Linked Work</p>
                        <div className="mt-2 space-y-1">
                          {linkedWorkOrders.slice(0, 3).map((workOrder) => (
                            <button
                              key={workOrder.id || workOrder.title}
                              type="button"
                              onClick={() => openDrawer('job', workOrder.jobId || workOrder.projectId || workOrder.projectName || '')}
                              className="block w-full rounded border border-jdt-border bg-jdt-sand/40 px-2 py-1.5 text-left text-[10px] font-black text-jdt-primary hover:border-jdt-olive"
                            >
                              {workOrder.title || 'Untitled work order'}
                              <span className="block text-[9px] font-bold uppercase text-zinc-400">{workOrder.status || 'Draft'} - {workOrder.projectName || workOrder.jobName || 'No project'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-jdt-border bg-white p-3 text-xs font-bold text-zinc-500">No linked work orders yet.</p>
                    )}
                    <div className="rounded-lg border border-jdt-border bg-white p-3">
                      <p className="text-[10px] font-black uppercase text-zinc-500">Location History</p>
                      {history.length > 0 ? (
                        <div className="mt-2 space-y-1.5">
                          {history.map((event, index) => (
                            <div key={`${event.action}-${event.occurredAt}-${index}`} className="rounded bg-jdt-sand/40 px-2 py-1.5">
                              <p className="text-[10px] font-black uppercase text-jdt-primary">{event.action} - {event.locationName || 'No location'}</p>
                              <p className="text-[10px] font-bold text-zinc-500">{event.actorName || 'Command Center'} - {displayDateTime(event.occurredAt)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs font-bold text-zinc-400">No trailer spotting or vehicle activity yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-jdt-border bg-jdt-panel/50 p-4">
                    <button
                      type="button"
                      onClick={() => openModal('spot_vehicle', vehicle)}
                      className="rounded-md border border-jdt-border bg-white py-2 px-2 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive whitespace-nowrap"
                    >
                      Spot Location
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('drop_trailer', vehicle)}
                      className="rounded-md border border-jdt-border bg-white py-2 px-2 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive whitespace-nowrap"
                    >
                      Drop Trailer
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('hook_trailer', vehicle)}
                      className="rounded-md border border-jdt-border bg-white py-2 px-2 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive whitespace-nowrap"
                    >
                      Hook Trailer
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(vehicle.vehicleLoadState === 'Loaded' ? 'mark_vehicle_empty' : 'mark_vehicle_loaded', vehicle)}
                      className="rounded-md border border-jdt-border bg-white py-2 px-2 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive whitespace-nowrap"
                    >
                      {vehicle.vehicleLoadState === 'Loaded' ? 'Mark Empty' : 'Mark Loaded'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('create_move', {
                        title: moveTitle,
                        equipmentIds: [vehicle.id].filter(Boolean),
                        equipmentNames: [equipmentDisplayName(vehicle)],
                        truck: category === 'Truck' ? equipmentDisplayName(vehicle) : '',
                        truckId: category === 'Truck' ? vehicle.id : '',
                        trailer: category === 'Trailer' ? equipmentDisplayName(vehicle) : '',
                        trailerId: category === 'Trailer' ? vehicle.id : '',
                        origin: currentLocationName,
                        status: 'Scheduled',
                      })}
                      className="flex-1 rounded-md bg-jdt-primary py-2 px-2 text-[10px] font-black uppercase text-white shadow-sm hover:bg-jdt-dark whitespace-nowrap"
                    >
                      Create Dispatch Move
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('edit_equipment', vehicle)}
                      className="flex-1 rounded-md border border-jdt-border bg-white py-2 px-2 text-[10px] font-black uppercase text-zinc-800 shadow-sm hover:border-jdt-olive whitespace-nowrap"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('report_vehicle_issue', vehicle)}
                      className="rounded-md border border-red-200 bg-red-50 py-2 px-2 text-[10px] font-black uppercase text-red-700 shadow-sm hover:bg-red-100 whitespace-nowrap"
                    >
                      Report Issue
                    </button>
                    <IconButton onClick={() => openModal('set_eq_status', vehicle)} icon={Route} title="Set Vehicle Status" />
                  </div>
                </article>
              );
            })}
          </div>
          )}
        </section>

      {loads.length === 0 && (
        <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
          <Truck className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-black text-jdt-text">No freight moves yet</p>
          <p className="mx-auto mt-1 max-w-lg text-xs font-bold text-zinc-500">Create moves for equipment transfers, tree deliveries, trailer drops, and relocation or install support runs.</p>
          <button onClick={() => openModal('load')} className="mt-4 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
            Create Freight Move
          </button>
        </div>
      )}
      
      <div className="grid gap-4 xl:grid-cols-2">
         {loads.map(load => {
           const linkedWorkOrders = workOrdersForLoad(load, workOrders);
           const notes = notesForLoad(load);
           const routeSteps = sortedRouteSteps(load);
           return (
           <article key={load.id} className={`rounded-xl border border-jdt-border border-l-4 bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow ${categoryAccentBorderClass('freight')}`}>
             <div 
               className="flex items-center justify-between gap-3 border-b border-jdt-border p-4 bg-jdt-panel/50 cursor-pointer hover:bg-jdt-sand"
               onClick={() => openDrawer('freight', load.id || load.loadNumber || load.title)}
             >
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-zinc-400 group-hover:text-sky-600 transition-colors" />
                  <div>
                    <h2 className="text-lg font-black group-hover:text-blue-700 transition-colors">{load.title}</h2>
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-500 mt-0.5">{load.loadNumber}</p>
                  </div>
                </div>
                <StatusBadge status={load.status || 'Scheduled'} />
             </div>
             
             <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 flex-1">
               <div className="p-4 space-y-4">
                 <div className="grid gap-2 grid-cols-2">
                    <InfoTag icon={UserCheck} label="Driver" value={load.driver || 'Unassigned'} />
                    <InfoTag icon={Truck} label="Truck" value={load.truck || 'Truck not set'} />
                    <InfoTag icon={Truck} label="Trailer" value={load.trailer || 'Trailer not set'} />
                    <InfoTag icon={Clock} label="ETA" value={load.eta || load.deliveryDate || 'TBD'} />
                 </div>
                 
                 <div>
                    <p className="text-xs font-black uppercase text-zinc-500 mb-2">Route Stops</p>
                    <p className="text-xs font-black uppercase text-zinc-500 mb-2">Stop Progress</p>
                    <div className="space-y-2 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
                      {load.stops?.map((stop: any, idx: number) => (
                        <div key={stop.id} className="relative flex items-center gap-3">
                           <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-white z-10 ${statusDotClass(stop.completed || stop.status === 'Completed' ? 'Complete' : stop.status === 'InProgress' ? 'In Progress' : stop.status || 'Pending')}`} />
                           <div className={`flex-1 rounded-lg border p-2 ${stop.completed ? 'bg-jdt-panel border-jdt-border' : 'bg-jdt-panel border-jdt-border shadow-sm'}`}>
                             <div className="flex justify-between items-center">
                               <span className={`text-[11px] font-black uppercase ${stop.completed ? 'text-zinc-500' : 'text-jdt-text'}`}>{stop.label}</span>
                               <span className="text-[10px] font-bold text-zinc-500">{stop.status || stop.window || 'Pending'}</span>
                             </div>
                             <p className={`text-xs font-bold mt-0.5 ${stop.completed ? 'text-zinc-400' : 'text-zinc-700'}`}>{stop.location}</p>
                             {(stop.actualArrivalAt || stop.actualDepartureAt) && (
                               <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500">
                                 <p><span className="font-black uppercase text-zinc-400">Actual Arrival:</span> {displayDateTime(stop.actualArrivalAt)}</p>
                                 <p><span className="font-black uppercase text-zinc-400">Actual Departure:</span> {displayDateTime(stop.actualDepartureAt)}</p>
                               </div>
                             )}
                             {(stop.requiredPhotos || stop.requiredSignature) && (
                               <div className="mt-2 flex flex-wrap gap-1.5">
                                 {stop.requiredPhotos && <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${riskPillClass('watch')}`}>Photo Required</span>}
                                 {stop.requiredSignature && <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${riskPillClass('watch')}`}>Signature Required</span>}
                               </div>
                             )}
                             <button
                               type="button"
                               onClick={() => openModal('advance_freight_stop', {
                                 ...load,
                                 stopId: stop.id || stop.label,
                                 stopLabel: stop.label,
                                 locationName: stop.location,
                                 locationAddress: stop.address,
                                 nextStatus: stop.status === 'Completed' ? 'Completed' : 'Completed',
                                 saveLocation: Boolean(stop.saveLocation),
                                 saveContact: Boolean(stop.saveContact),
                                 siteContactName: stop.siteContactName || '',
                                 siteContactPhone: stop.siteContactPhone || '',
                               })}
                               className="mt-2 rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                             >
                               Update Stop
                             </button>
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>

                 {routeSteps.length > 0 && (
                   <div>
                     <div className="mb-2 flex items-center justify-between gap-2">
                       <p className="text-xs font-black uppercase text-zinc-500">Dispatch Run Steps</p>
                       <span className="text-[10px] font-black uppercase text-zinc-400">{routeSteps.filter((step: any) => step.completed || step.status === 'Complete').length}/{routeSteps.length} complete</span>
                     </div>
                     <div className="space-y-2">
                       {routeSteps.map((step: any) => (
                         <div key={step.id || `${load.id}-${step.sequence}`} className="rounded-lg border border-jdt-border bg-white p-3 shadow-sm">
                           <div className="flex items-start justify-between gap-3">
                             <div className="min-w-0">
                               <div className="flex items-center gap-2">
                                 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jdt-primary text-[10px] font-black text-white">{step.sequence || '-'}</span>
                                 <p className="text-xs font-black text-jdt-text">{step.actionType || step.label || 'Dispatch step'}</p>
                               </div>
                               <p className="mt-1 text-[11px] font-bold text-zinc-600">{step.label || step.notes || 'Driver instruction'}</p>
                             </div>
                             <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${routeStepTone(step.status || 'Pending')}`}>{step.status || 'Pending'}</span>
                           </div>
                           <div className="mt-2 grid gap-2 text-[10px] font-bold text-zinc-500 sm:grid-cols-2">
                             {(step.origin || step.destination) && (
                               <p><span className="font-black uppercase text-zinc-400">Route:</span> {step.origin || 'Start TBD'}{step.destination && step.destination !== step.origin ? ` -> ${step.destination}` : ''}</p>
                             )}
                             {(step.trailerName || step.equipmentName || step.materialName) && (
                               <p><span className="font-black uppercase text-zinc-400">Asset:</span> {[step.trailerName, step.equipmentName, step.materialName].filter(Boolean).join(', ')}</p>
                             )}
                           </div>
                           {step.notes && <p className="mt-2 rounded bg-jdt-sand/50 px-2 py-1.5 text-[10px] font-bold text-zinc-600">{step.notes}</p>}
                           {!(step.completed || step.status === 'Complete') && (
                             <button
                               type="button"
                               onClick={() => openModal('complete_freight_route_step', {
                                 ...load,
                                 routeStepId: step.id || String(step.sequence || ''),
                                 routeStepStatus: 'Complete',
                                 actualStart: step.actualStart || '',
                                 actualEnd: step.actualEnd || '',
                                 notes: step.notes || '',
                               })}
                               className="mt-2 rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                             >
                               Complete Step
                             </button>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
               
               <div className="p-4 bg-jdt-panel/50 flex flex-col justify-between">
                 <div className="space-y-4">
                   <div>
                      <p className="text-xs font-black uppercase text-zinc-500 mb-2">Dispatch Notes</p>
                      {notes.length > 0 ? (
                        <ul className="space-y-1">
                          {notes.map((note: string, i: number) => (
                            <li key={i} className="text-xs font-bold text-zinc-700 flex items-start gap-1.5 leading-tight"><div className="mt-1 h-1 w-1 rounded-full bg-zinc-400 flex-shrink-0" /> {note}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs font-bold text-zinc-400">No notes</p>
                      )}
                      {load.escortRequired && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-black uppercase ${riskPillClass('watch')}`}>
                           <AlertTriangle className="h-3 w-3" />
                           Escort Required
                        </div>
                      )}
                      {load.requiredDocuments?.length > 0 && (
                        <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Required Documents</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {load.requiredDocuments.map((document: any, index: number) => (
                              <span key={`${document.type}-${index}`} className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{document.type}: {document.status || 'Needed'}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {load.freightRevision && (
                        <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Dispatch History</p>
                          <p className="mt-1 text-xs font-black text-jdt-primary">{`Revision ${load.freightRevision}`}</p>
                          {load.freightEvents?.[0] && <p className="mt-1 text-[10px] font-bold text-zinc-500">{load.freightEvents[0].summary}</p>}
                        </div>
                      )}
                      {linkedWorkOrders.length > 0 && (
                        <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Linked Work</p>
                          <div className="mt-2 space-y-1">
                            {linkedWorkOrders.slice(0, 3).map((workOrder) => (
                              <button
                                key={workOrder.id || workOrder.title}
                                type="button"
                                onClick={() => openDrawer('job', workOrder.jobId || workOrder.projectId || workOrder.projectName || '')}
                                className="block w-full rounded border border-jdt-border bg-jdt-sand/40 px-2 py-1.5 text-left text-[10px] font-black text-jdt-primary hover:border-jdt-olive"
                              >
                                {workOrder.title || 'Untitled work order'}
                                <span className="block text-[9px] font-bold uppercase text-zinc-400">{workOrder.status || 'Draft'} - {workOrder.projectName || workOrder.jobName || 'No project'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {load.pod && (
                          <div className={`mt-4 rounded-lg border p-3 ${riskSurfaceClass('low')}`}>
                             <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase">Proof of Delivery</span>
                             </div>
                             <p className="text-xs font-bold">Signed by: {load.pod.receiverName}</p>
                             <p className="text-[10px] font-bold mt-0.5 opacity-75">{load.pod.completedAt}</p>
                          </div>
                      )}
                   </div>
                 </div>
                 
                 <div className="mt-6 flex flex-wrap gap-2">
                   <button onClick={() => openModal('set_freight_status', load)} className="flex-1 rounded-md bg-jdt-primary py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark">Set Status</button>
                   <button onClick={() => openModal('complete_freight_pod', load)} className="flex-1 rounded-md bg-emerald-700 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-emerald-800">e-POD</button>
                   <button onClick={() => openModal('edit_freight', load)} className="flex-1 rounded-md bg-jdt-panel border border-jdt-border py-2.5 text-xs font-black uppercase text-zinc-800 shadow-sm hover:bg-jdt-panel">Edit</button>
                   <button onClick={() => openModal('delete_freight', load)} className="flex-1 rounded-md bg-red-50 border border-red-200 text-red-700 py-2.5 text-xs font-black uppercase shadow-sm hover:bg-red-100">Delete</button>
                   <button onClick={() => openModal('delay', load)} className="rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 hover:bg-red-100 shadow-sm font-black uppercase text-[10px]" title="Mark Delayed">Delay</button>
                   <button onClick={() => openModal('complete', load)} className="flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 hover:bg-emerald-100 shadow-sm font-black uppercase text-[10px]" title="Mark Completed"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                   <IconButton onClick={() => openModal('log_issue', load)} icon={FileText} title="Add Issue Note" />
                   <IconButton onClick={() => openModal('qr', load)} icon={QrCode} title="Driver QR" />
                 </div>
               </div>
             </div>
           </article>
         );})}
      </div>
    </div>
  );
}
