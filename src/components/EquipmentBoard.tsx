import React, { useState } from 'react';
import { Wrench, MapPin, UserCheck, AlertTriangle, Clock, Activity, QrCode, ClipboardList, PenTool, RefreshCw, LocateFixed } from 'lucide-react';
import { complianceBadgeClass, vehicleComplianceSummary, type ComplianceStatus } from '../commandCenter/compliance';
import type { FleetTelematicsEventRecord } from '../commandCenter/records';
import { equipmentCategory, equipmentCategoryOptions, equipmentDisplayName } from '../commandCenter/equipmentFreight';
import { buildRevealIntegrationStatus } from '../commandCenter/telematicsIntelligence';
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

function listValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function equipmentResponsibleLabel(category: string) {
  if (category === 'Truck') return 'Driver / Operator';
  if (category === 'Trailer') return 'Driver / Truck';
  if (category === 'Implement') return 'Attached / Assigned To';
  if (category === 'Tool' || category === 'Support') return 'Responsible Crew';
  return 'Operator';
}

function equipmentResponsibleValue(eq: any, category: string) {
  if (category === 'Trailer') {
    return [eq.assignedCrewName, eq.assignedTruck].filter(Boolean).join(' / ') || 'Unassigned';
  }
  if (category === 'Implement') {
    return eq.attachedMachineName || eq.assignedTruck || eq.assignedCrewName || 'Unassigned';
  }
  if (category === 'Tool' || category === 'Support') {
    return eq.assignedCrewName || eq.operator || 'Unassigned';
  }
  return eq.assignedCrewName || eq.operator || 'Unassigned';
}

function equipmentDetailLabel(category: string) {
  if (category === 'Trailer') return 'Load State';
  if (category === 'Truck') return 'Truck Details';
  if (category === 'Implement') return 'Implement Details';
  if (category === 'Tool') return 'Tool Details';
  if (category === 'Support') return 'Asset Support';
  return 'Machine Details';
}

function equipmentDetailValue(eq: any, category: string) {
  if (category === 'Trailer') return eq.vehicleLoadState || eq.trailerType || 'Trailer details not set';
  if (category === 'Truck') return eq.truckType || 'Truck type not set';
  if (category === 'Implement') return eq.implementType || 'Implement type not set';
  if (category === 'Tool') return eq.toolType || 'Tool type not set';
  if (category === 'Support') return eq.supportType || 'Support type not set';
  return eq.eqType || eq.type || 'Machine type not set';
}

function showRuntimePanel(eq: any, category: string) {
  return category === 'Machine' || category === 'Truck' || Boolean(eq.hours) || Boolean(eq.serviceDueHours);
}

function hasGpsTracking(eq: any) {
  return Boolean(
    eq.revealVehicleId
    || eq.verizonVehicleId
    || eq.vehicleNumber
    || eq.revealVehicleNumber
    || eq.telematicsProvider
    || eq.lastTelematicsLatitude
    || eq.lastTelematicsLongitude
  );
}

function compatibilityGroups(eq: any, category: string) {
  const groups = [
    ...(category === 'Machine' || category === 'Trailer'
      ? [{ label: 'Compatible Trucks', values: listValues(eq.compatibleTruckTypes) }]
      : []),
    ...(category === 'Machine' || category === 'Truck'
      ? [{ label: 'Compatible Trailers', values: listValues(eq.compatibleTrailerTypes) }]
      : []),
    ...(category === 'Machine'
      ? [{ label: 'Compatible Implements', values: listValues(eq.compatibleImplementTypes) }]
      : []),
    ...(category === 'Implement'
      ? [{ label: 'Compatible Machines', values: listValues(eq.compatibleMachineTypes) }]
      : []),
  ];

  return groups.filter((group) => group.values.length > 0);
}

type EquipmentBoardProps = {
  starterEquipment: any[];
  fleetTelematicsEvents?: FleetTelematicsEventRecord[];
  openDrawer: (type: string, id: string) => void;
  openModal: (type: string, data?: any) => void;
  canSyncRevealVehicles?: boolean;
  isSyncingRevealVehicles?: boolean;
  revealVehicleSyncStatus?: string;
  onSyncRevealVehicles?: () => void | Promise<void>;
  isSyncingRevealRecommendedApis?: boolean;
  revealRecommendedSyncStatus?: string;
  onSyncRevealRecommendedApis?: () => void | Promise<void>;
  isSyncingRevealLiveLocations?: boolean;
  revealLiveLocationSyncStatus?: string;
  onSyncRevealLiveLocations?: () => void | Promise<void>;
  isPreviewingRevealMatches?: boolean;
  revealMatchReviewStatus?: string;
  onPreviewRevealMatches?: () => void | Promise<void>;
  isApprovingRevealMatches?: boolean;
  onApproveRevealMatches?: (candidates: RevealVehicleMatchCandidate[]) => void | Promise<void>;
  revealMatchCandidates?: RevealVehicleMatchCandidate[];
  onOpenLiveMap?: (assetId?: string) => void;
};

type RevealVehicleMatchCandidate = {
  revealVehicleId?: string;
  revealVehicleName: string;
  revealVehicleNumber?: string;
  registrationNumber?: string;
  vin?: string;
  jdtEquipmentId?: string;
  jdtEquipmentName?: string;
  confidence: string;
  status: 'matched' | 'needsReview' | 'newVehicle' | string;
  matchField?: string;
  matchValue?: string;
  recommendedAction: string;
};

export default function EquipmentBoard({
  starterEquipment,
  fleetTelematicsEvents = [],
  openDrawer,
  openModal,
  canSyncRevealVehicles = false,
  isSyncingRevealVehicles = false,
  revealVehicleSyncStatus = '',
  onSyncRevealVehicles,
  isSyncingRevealRecommendedApis = false,
  revealRecommendedSyncStatus = '',
  onSyncRevealRecommendedApis,
  isSyncingRevealLiveLocations = false,
  revealLiveLocationSyncStatus = '',
  onSyncRevealLiveLocations,
  isPreviewingRevealMatches = false,
  revealMatchReviewStatus = '',
  onPreviewRevealMatches,
  isApprovingRevealMatches = false,
  onApproveRevealMatches,
  revealMatchCandidates = [],
  onOpenLiveMap,
}: EquipmentBoardProps) {
  const standardCategories = ['Machine', 'Truck', 'Trailer', 'Implement', 'Tool'];
  const discoveredCategories = starterEquipment
    .map((equipment) => equipmentCategory(equipment))
    .filter((category) => category && !standardCategories.includes(category));
  const categoryOrder = [...standardCategories, ...equipmentCategoryOptions.filter((category) => !standardCategories.includes(category)), ...discoveredCategories]
    .filter((category, index, values) => values.indexOf(category) === index);
  const categoryCounts = starterEquipment.reduce((acc: Record<string, number>, equipment: any) => {
    const category = equipmentCategory(equipment);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const [activeCategory, setActiveCategory] = useState('All');

  const grouped = starterEquipment.reduce((acc: any, eq: any) => {
    const category = equipmentCategory(eq);
    if (!acc[category]) acc[category] = [];
    acc[category].push(eq);
    return acc;
  }, {});

  const visibleCategoryKeys = activeCategory === 'All'
    ? categoryOrder.filter((category) => grouped[category]?.length)
    : [activeCategory];
  const revealStatus = buildRevealIntegrationStatus({
    equipment: starterEquipment,
    events: fleetTelematicsEvents,
  });
  const revealMatchSummary = revealMatchCandidates.reduce((acc: Record<string, number>, candidate) => {
    acc[candidate.status] = (acc[candidate.status] || 0) + 1;
    return acc;
  }, {});
  const approvableRevealMatches = revealMatchCandidates.filter((candidate) => (
    Boolean(candidate.revealVehicleId)
    && Boolean(candidate.jdtEquipmentId)
    && candidate.status !== 'newVehicle'
    && candidate.confidence !== 'Approved'
  ));

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
         <div className="flex flex-wrap items-center gap-2">
           {onOpenLiveMap && (
             <button
               type="button"
               onClick={() => onOpenLiveMap()}
               className="inline-flex items-center gap-2 rounded-lg border border-sky-600 bg-sky-50 px-4 py-2.5 text-xs font-black uppercase text-sky-800 hover:border-sky-700 hover:bg-sky-100"
             >
               <LocateFixed className="h-4 w-4" />
               Open Live Map
             </button>
           )}
           {canSyncRevealVehicles && onSyncRevealVehicles && (
             <button
               type="button"
               onClick={() => void onSyncRevealVehicles()}
               disabled={isSyncingRevealVehicles}
               className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive disabled:cursor-not-allowed disabled:opacity-60"
             >
               <RefreshCw className={`h-4 w-4 ${isSyncingRevealVehicles ? 'animate-spin' : ''}`} />
               {isSyncingRevealVehicles ? 'Syncing Verizon' : 'Sync Verizon Vehicles'}
             </button>
           )}
           {canSyncRevealVehicles && onSyncRevealRecommendedApis && (
             <button
               type="button"
               onClick={() => void onSyncRevealRecommendedApis()}
               disabled={isSyncingRevealRecommendedApis}
               className="inline-flex items-center gap-2 rounded-lg border border-[#7C3AED] bg-[#F3E8FF] px-4 py-2.5 text-xs font-black uppercase text-[#4C1D95] hover:border-[#5B21B6] disabled:cursor-not-allowed disabled:opacity-60"
             >
               <RefreshCw className={`h-4 w-4 ${isSyncingRevealRecommendedApis ? 'animate-spin' : ''}`} />
               {isSyncingRevealRecommendedApis ? 'Syncing Reveal APIs' : 'Sync Reveal APIs'}
             </button>
           )}
           {canSyncRevealVehicles && onSyncRevealLiveLocations && (
             <button
               type="button"
               onClick={() => void onSyncRevealLiveLocations()}
               disabled={isSyncingRevealLiveLocations}
               className="inline-flex items-center gap-2 rounded-lg border border-sky-700 bg-sky-50 px-4 py-2.5 text-xs font-black uppercase text-sky-900 hover:border-sky-900 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
             >
               <LocateFixed className={`h-4 w-4 ${isSyncingRevealLiveLocations ? 'animate-pulse' : ''}`} />
               {isSyncingRevealLiveLocations ? 'Syncing Live GPS' : 'Sync Live Locations'}
             </button>
           )}
           {canSyncRevealVehicles && onPreviewRevealMatches && (
             <button
               type="button"
               onClick={() => void onPreviewRevealMatches()}
               disabled={isPreviewingRevealMatches}
               className="inline-flex items-center gap-2 rounded-lg border border-[#0E7490] bg-[#E0F7FA] px-4 py-2.5 text-xs font-black uppercase text-[#155E75] hover:border-[#155E75] disabled:cursor-not-allowed disabled:opacity-60"
             >
               <RefreshCw className={`h-4 w-4 ${isPreviewingRevealMatches ? 'animate-spin' : ''}`} />
               {isPreviewingRevealMatches ? 'Reviewing Matches' : 'Review Reveal Matches'}
             </button>
           )}
           <button onClick={() => openModal('equipment')} className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
             Add Equipment
           </button>
         </div>
      </div>

      {canSyncRevealVehicles && onSyncRevealVehicles && (
        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Reveal Vehicle Sync</p>
              <p className="mt-1 text-sm font-bold text-jdt-text">{revealVehicleSyncStatus || 'Ready to sync Verizon Reveal vehicles'}</p>
              {onSyncRevealRecommendedApis && (
                <p className="mt-1 text-xs font-bold text-zinc-500">{revealRecommendedSyncStatus || 'Ready to sync Reveal driver, asset, geofence, inspection, GPS history, and segment APIs'}</p>
              )}
              {onSyncRevealLiveLocations && (
                <p className="mt-1 text-xs font-bold text-sky-800">{revealLiveLocationSyncStatus || 'Ready to sync Reveal live locations'}</p>
              )}
              {onPreviewRevealMatches && (
                <p className="mt-1 text-xs font-black text-[#155E75]">{revealMatchReviewStatus || 'Review Reveal vehicle matches before trusting live GPS updates.'}</p>
              )}
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[#7C3AED] bg-[#F3E8FF] px-2.5 py-1 text-[10px] font-black uppercase text-[#4C1D95]">
              <RefreshCw className="h-3.5 w-3.5" />
              Reveal
            </span>
          </div>
        </div>
      )}

      {canSyncRevealVehicles && revealMatchCandidates.length > 0 && (
        <div className="rounded-xl border border-[#0E7490] bg-[#ECFEFF] p-4 text-[#155E75]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">Reveal Match Review</p>
              <p className="mt-1 text-sm font-black">
                {`${revealMatchCandidates.length} Reveal vehicle${revealMatchCandidates.length === 1 ? '' : 's'} reviewed`}
              </p>
              <p className="mt-1 text-xs font-bold opacity-80">Approve high-confidence matches before letting Reveal update JDT equipment records automatically.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-md border border-[#99F6E4] bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">Matched {revealMatchSummary.matched || 0}</span>
              <span className="rounded-md border border-[#FDE68A] bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">Needs Review {revealMatchSummary.needsReview || 0}</span>
              <span className="rounded-md border border-[#CBD5E1] bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase">New {revealMatchSummary.newVehicle || 0}</span>
              {onApproveRevealMatches && approvableRevealMatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => void onApproveRevealMatches(approvableRevealMatches)}
                  disabled={isApprovingRevealMatches}
                  className="rounded-md border border-[#155E75] bg-[#155E75] px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-[#164E63] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApprovingRevealMatches ? 'Approving Matches' : 'Approve All Safe Matches'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {revealMatchCandidates.map((candidate) => (
              <article key={`${candidate.revealVehicleId || candidate.revealVehicleName}-${candidate.jdtEquipmentId || 'new'}`} className="rounded-lg border border-[#BAE6FD] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-jdt-text">{candidate.revealVehicleName}</p>
                    <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">
                      Reveal {candidate.revealVehicleNumber || candidate.revealVehicleId || 'No unit number'}
                    </p>
                  </div>
                  <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${candidate.status === 'matched' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : candidate.status === 'needsReview' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
                    {candidate.confidence}
                  </span>
                </div>
                <div className="mt-3 rounded-md border border-jdt-border bg-jdt-panel px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-zinc-400">JDT Equipment Match</p>
                  <p className="text-xs font-black text-jdt-text">{candidate.jdtEquipmentName || 'No JDT equipment match yet'}</p>
                  {candidate.matchField && <p className="mt-1 text-[10px] font-bold text-zinc-500">{candidate.matchField}: {candidate.matchValue || '-'}</p>}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold leading-snug text-[#155E75]">{candidate.recommendedAction}</p>
                  {onApproveRevealMatches && candidate.revealVehicleId && candidate.jdtEquipmentId && candidate.status !== 'newVehicle' && candidate.confidence !== 'Approved' && (
                    <button
                      type="button"
                      onClick={() => void onApproveRevealMatches([candidate])}
                      disabled={isApprovingRevealMatches}
                      className="shrink-0 rounded-md border border-[#155E75] bg-[#E0F7FA] px-2.5 py-1.5 text-[9px] font-black uppercase text-[#155E75] hover:bg-[#BAE6FD] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve Match
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {revealStatus.revealVehicles > 0 && (
        <div className="rounded-xl border border-[#7C3AED] bg-[#F3E8FF] p-4 text-[#4C1D95]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">Reveal Telematics Status</p>
              <p className="mt-1 text-sm font-black">{revealStatus.healthLabel}</p>
              <p className="mt-1 text-[11px] font-bold opacity-80">Latest GPS: {revealStatus.latestEventAt || 'No GPS event received yet'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#C4B5FD] bg-white/70 px-3 py-2">
                <p className="text-lg font-black">{revealStatus.revealVehicles}</p>
                <p className="text-[9px] font-black uppercase opacity-70">Reveal</p>
              </div>
              <div className="rounded-lg border border-[#C4B5FD] bg-white/70 px-3 py-2">
                <p className="text-lg font-black">{revealStatus.vehiclesWithGps}</p>
                <p className="text-[9px] font-black uppercase opacity-70">Live GPS</p>
              </div>
              <div className="rounded-lg border border-[#C4B5FD] bg-white/70 px-3 py-2">
                <p className="text-lg font-black">{revealStatus.staleVehicles}</p>
                <p className="text-[9px] font-black uppercase opacity-70">Stale</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Equipment Categories</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('All')}
            className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${activeCategory === 'All' ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-jdt-text hover:border-jdt-olive'}`}
            aria-label={`Show all ${starterEquipment.length} equipment assets`}
          >
            All
          </button>
          {categoryOrder.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${activeCategory === category ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-jdt-text hover:border-jdt-olive'}`}
              aria-label={`Show ${categoryCounts[category] || 0} ${category} assets`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {visibleCategoryKeys.map(category => {
           const items = grouped[category];
           if (!items || items.length === 0) return null;
           
           return (
             <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-lg font-black tracking-wide text-zinc-800">{category} assets</h3>
                   <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-black text-zinc-700">{items.length}</span>
                </div>
                <div className="grid gap-4 xl:grid-cols-2 lg:grid-cols-2">
                   {items.map((eq: any) => {
                     const compliance = vehicleComplianceSummary(eq);
                     const assetCategory = equipmentCategory(eq);
                     const currentLocationName = eq.currentLocationName || eq.location || eq.currentLocation || 'Location not set';
                     const currentLocationDetail = eq.currentLocation && eq.currentLocation !== currentLocationName ? eq.currentLocation : '';
                     const responsibleLabel = equipmentResponsibleLabel(assetCategory);
                     const responsibleValue = equipmentResponsibleValue(eq, assetCategory);
                     const detailLabel = equipmentDetailLabel(assetCategory);
                     const detailValue = equipmentDetailValue(eq, assetCategory);
                     const showRuntime = showRuntimePanel(eq, assetCategory);
                     const dispatchCompatibility = compatibilityGroups(eq, assetCategory);
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
                                 <p className="text-xs font-black uppercase text-zinc-500 tracking-wider mt-1">{assetCategory} - {eq.assetId || eq.id}</p>
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
                                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5"/> {responsibleLabel}</p>
                                  <p className="font-bold text-jdt-text">{responsibleValue}</p>
                                </div>
                                {(eq.assignedProjectName || eq.assignedTruck) && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Assigned To</p>
                                    <p className="font-bold text-jdt-text">{eq.assignedProjectName || eq.assignedTruck}</p>
                                  </div>
                                )}
                              </div>
                              <div className={`space-y-4 rounded-lg border p-3 ${Number(eq.serviceDueHours ?? Number.POSITIVE_INFINITY) < 100 ? riskSurfaceClass('watch') : 'border-[#D5AA6E] bg-[#FBF1E7] text-[#7A4A12]'}`}>
                                {showRuntime ? (
                                  <>
                                    <div>
                                      <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5"/> {assetCategory === 'Truck' ? 'Mileage / Hours' : 'Engine Hours'}</p>
                                      <p className="text-3xl font-black">{typeof eq.hours === 'number' ? eq.hours.toLocaleString() : (eq.hours || '-')}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Service Due In</p>
                                      <p className="text-xl font-black">{eq.serviceDueHours ?? eq.nextServiceDue ?? '-'}{eq.serviceDueHours ? ' hrs' : ''}</p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Activity className="h-3.5 w-3.5"/> {detailLabel}</p>
                                      <p className="text-xl font-black leading-snug">{detailValue}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black uppercase opacity-75 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Readiness</p>
                                      <p className="text-xl font-black">{eq.status || 'Available'}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                           </div>
                           {dispatchCompatibility.length > 0 && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">Dispatch Compatibility</p>
                                <div className="mt-2 grid gap-2">
                                  {dispatchCompatibility.map((group) => (
                                    <div key={group.label}>
                                      <p className="mb-1 text-[9px] font-black uppercase text-zinc-400">{group.label}</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {group.values.map((name) => <span key={`${group.label}-${name}`} className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-700">{name}</span>)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           )}
                           {(assetCategory === 'Machine' && eq.attachedImplementNames?.length) && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">Attached Implements</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {(eq.attachedImplementNames || []).map((name: string) => <span key={`attached-${name}`} className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">Attached: {name}</span>)}
                                </div>
                              </div>
                           )}
                           {(['Implement', 'Tool', 'Support'].includes(assetCategory)) && (
                              <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                                <p className="text-[10px] font-black uppercase text-zinc-500">{assetCategory === 'Support' ? 'Support Details' : detailLabel}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{detailValue}</span>
                                  {eq.assignedTruck && <span className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-700">Truck: {eq.assignedTruck}</span>}
                                  {eq.assignedProjectName && <span className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-700">Project: {eq.assignedProjectName}</span>}
                                </div>
                              </div>
                           )}
                           {(assetCategory === 'Trailer' || eq.trailerMaintenanceCategories?.length || eq.trailerServiceNotes) && (
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
                           {onOpenLiveMap && hasGpsTracking(eq) && (
                             <button
                               type="button"
                               onClick={() => onOpenLiveMap(eq.id || eq.assetId || equipmentDisplayName(eq))}
                               className="flex-1 rounded-md border border-sky-600 bg-sky-50 py-2 px-2 text-[10px] font-black uppercase text-sky-800 shadow-sm hover:bg-sky-100 whitespace-nowrap flex justify-center items-center gap-1.5"
                             >
                               <LocateFixed className="h-3 w-3" />
                               Track Asset
                             </button>
                           )}
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
