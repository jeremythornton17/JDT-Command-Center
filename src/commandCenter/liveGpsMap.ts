import type { EquipmentRecord, FleetTelematicsEventRecord, LoadRecord } from './records';
import { equipmentCategory, equipmentDisplayName } from './equipmentFreight';

export type LiveGpsCategory = 'vehicle' | 'equipment' | 'freight' | 'unmatched';
export type LiveGpsStatus = 'Moving' | 'Idle' | 'Stopped' | 'Stale' | 'No Signal' | 'Needs Match' | string;

export type LiveGpsAsset = {
  id: string;
  source: 'Reveal' | 'JDT';
  category: LiveGpsCategory;
  name: string;
  status: LiveGpsStatus;
  lat?: number;
  lng?: number;
  heading?: number;
  speedMph?: number;
  lastUpdatedAt?: string;
  address?: string;
  currentLocationName?: string;
  currentAddress?: string;
  assignedDriver?: string;
  assignedProjectId?: string;
  assignedProjectName?: string;
  equipmentId?: string;
  revealVehicleId?: string;
  revealVehicleNumber?: string;
  freightMoveId?: string;
  freightMoveTitle?: string;
  nextStopLabel?: string;
  serviceStatus?: string;
  needsAttention?: boolean;
  searchText: string;
};

export type BuildLiveGpsAssetsInput = {
  equipment?: EquipmentRecord[];
  events?: FleetTelematicsEventRecord[];
  loads?: LoadRecord[];
  now?: string | Date;
};

export type LiveGpsAssetFilter = {
  categories?: LiveGpsCategory[];
  statuses?: string[];
  search?: string;
};

const staleGpsHours = 12;

export function buildLiveGpsAssets(input: BuildLiveGpsAssetsInput): LiveGpsAsset[] {
  const equipment = input.equipment || [];
  const events = input.events || [];
  const loads = input.loads || [];
  const now = asDate(input.now) || new Date();
  const latestEvents = latestEventByRevealIdentity(events);
  const usedEventIds = new Set<string>();

  const equipmentAssets = equipment
    .map((item) => {
      const event = latestEventForEquipment(item, latestEvents, events);
      if (event?.id) usedEventIds.add(event.id);
      return buildEquipmentLiveGpsAsset(item, event, now);
    })
    .filter(Boolean) as LiveGpsAsset[];

  const freightAssets = loads
    .filter((load) => !isInactive(load))
    .map((load) => buildFreightLiveGpsAsset(load, equipmentAssets))
    .filter(Boolean) as LiveGpsAsset[];

  const unmatchedAssets = events
    .filter((event) => hasCoordinates(event))
    .filter((event) => event.id ? !usedEventIds.has(event.id) : !equipment.some((item) => equipmentMatchesEvent(item, event)))
    .map((event) => buildUnmatchedLiveGpsAsset(event, now));

  return [...equipmentAssets, ...freightAssets, ...unmatchedAssets];
}

export function filterLiveGpsAssets(assets: LiveGpsAsset[], filter: LiveGpsAssetFilter = {}): LiveGpsAsset[] {
  const categorySet = new Set((filter.categories || []).map((category) => category.toLowerCase()));
  const statusSet = new Set((filter.statuses || []).map((status) => status.toLowerCase()));
  const search = normalize(filter.search);

  return assets.filter((asset) => {
    if (categorySet.size > 0 && !categorySet.has(asset.category.toLowerCase())) return false;
    if (statusSet.size > 0 && !statusSet.has(String(asset.status || '').toLowerCase())) return false;
    if (search && !asset.searchText.includes(search)) return false;
    return true;
  });
}

export function isolateLiveGpsAsset(assets: LiveGpsAsset[], selectedAssetId?: string): LiveGpsAsset[] {
  const selected = String(selectedAssetId || '').trim();
  if (!selected) return assets;
  return assets.filter((asset) => asset.id === selected);
}

function buildEquipmentLiveGpsAsset(equipment: EquipmentRecord, event: FleetTelematicsEventRecord | undefined, now: Date): LiveGpsAsset | null {
  const lat = numberOrUndefined(event?.latitude) ?? numberOrUndefined(equipment.lastTelematicsLatitude);
  const lng = numberOrUndefined(event?.longitude) ?? numberOrUndefined(equipment.lastTelematicsLongitude);
  const lastUpdatedAt = event?.eventAt || event?.receivedAt || equipment.lastTelematicsAt || equipment.revealLastReceivedAt;
  const hasKnownGpsIdentity = Boolean(
    equipment.revealVehicleId
    || equipment.verizonVehicleId
    || equipment.vehicleNumber
    || equipment.revealVehicleNumber
    || equipment.telematicsProvider
    || lat !== undefined
    || lng !== undefined
  );

  if (!hasKnownGpsIdentity) return null;

  const category = liveCategoryForEquipment(equipment);
  const status = gpsStatus(event, equipment, now);
  const name = equipmentDisplayName(equipment);

  return withSearchText({
    id: equipment.id || equipment.assetId || slugify(name),
    source: 'Reveal',
    category,
    name,
    status,
    lat,
    lng,
    heading: numberOrUndefined(event?.heading) ?? numberOrUndefined(equipment.lastTelematicsHeading),
    speedMph: numberOrUndefined(event?.speedMph) ?? numberOrUndefined(equipment.lastTelematicsSpeedMph),
    lastUpdatedAt,
    address: event?.address || equipment.lastTelematicsAddress || equipment.currentLocation,
    currentLocationName: equipment.currentLocationName,
    currentAddress: equipment.currentLocation || equipment.location,
    assignedDriver: event?.driverName || equipment.lastTelematicsDriverName || equipment.assignedCrewName || equipment.operator,
    assignedProjectId: equipment.assignedProjectId,
    assignedProjectName: equipment.assignedProjectName,
    equipmentId: equipment.id,
    revealVehicleId: equipment.revealVehicleId || equipment.verizonVehicleId || event?.providerVehicleId,
    revealVehicleNumber: equipment.vehicleNumber || equipment.revealVehicleNumber || event?.vehicleNumber,
    serviceStatus: equipment.serviceStatus,
    needsAttention: status === 'Stale' || status === 'No Signal' || /down|repair|maintenance|needs service/i.test(String(equipment.status || equipment.serviceStatus || '')),
  });
}

function buildFreightLiveGpsAsset(load: LoadRecord, gpsAssets: LiveGpsAsset[]): LiveGpsAsset | null {
  const matchedVehicle = gpsAssets.find((asset) => asset.category === 'vehicle' && loadMatchesGpsAsset(load, asset));
  if (!matchedVehicle?.lat || !matchedVehicle?.lng) return null;
  const nextStop = [...(load.stops || [])]
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0))
    .find((stop) => !stop.completed && !/completed|skipped/i.test(String(stop.status || '')));
  const title = load.title || load.name || load.loadNumber || matchedVehicle.name || 'Freight Move';

  return withSearchText({
    id: `freight-${load.id || slugify(title)}`,
    source: 'JDT',
    category: 'freight',
    name: title,
    status: load.status || matchedVehicle.status || 'Scheduled',
    lat: matchedVehicle.lat,
    lng: matchedVehicle.lng,
    heading: matchedVehicle.heading,
    speedMph: matchedVehicle.speedMph,
    lastUpdatedAt: matchedVehicle.lastUpdatedAt,
    address: matchedVehicle.address,
    currentLocationName: matchedVehicle.currentLocationName,
    currentAddress: matchedVehicle.currentAddress,
    assignedDriver: load.driver || matchedVehicle.assignedDriver,
    assignedProjectId: load.projectId || matchedVehicle.assignedProjectId,
    assignedProjectName: load.projectName || matchedVehicle.assignedProjectName,
    equipmentId: matchedVehicle.equipmentId,
    revealVehicleId: matchedVehicle.revealVehicleId,
    revealVehicleNumber: matchedVehicle.revealVehicleNumber,
    freightMoveId: load.id,
    freightMoveTitle: title,
    nextStopLabel: nextStop?.label || nextStop?.location || nextStop?.mainAddress || nextStop?.type,
    needsAttention: /delayed|blocked|needs|missing|stale/i.test(`${load.status || ''} ${matchedVehicle.status || ''}`),
  });
}

function buildUnmatchedLiveGpsAsset(event: FleetTelematicsEventRecord, now: Date): LiveGpsAsset {
  const eventName = event.vehicleName || event.vehicleNumber || event.providerVehicleId || event.id || 'Unmatched Reveal tracker';
  const baseStatus = isStale(event.eventAt || event.receivedAt, now) ? 'Stale' : 'Needs Match';
  return withSearchText({
    id: `unmatched-${slugify(event.providerVehicleId || event.vehicleNumber || event.vehicleName || event.id || 'tracker')}`,
    source: 'Reveal',
    category: 'unmatched',
    name: eventName,
    status: baseStatus === 'Stale' ? 'Needs Match' : baseStatus,
    lat: numberOrUndefined(event.latitude),
    lng: numberOrUndefined(event.longitude),
    heading: numberOrUndefined(event.heading),
    speedMph: numberOrUndefined(event.speedMph),
    lastUpdatedAt: event.eventAt || event.receivedAt,
    address: event.address,
    assignedDriver: event.driverName,
    revealVehicleId: event.providerVehicleId,
    revealVehicleNumber: event.vehicleNumber,
    needsAttention: true,
  });
}

function latestEventByRevealIdentity(events: FleetTelematicsEventRecord[]): Map<string, FleetTelematicsEventRecord> {
  const latest = new Map<string, FleetTelematicsEventRecord>();
  events.forEach((event) => {
    eventIdentityKeys(event).forEach((key) => {
      const existing = latest.get(key);
      if (!existing || eventTime(event) > eventTime(existing)) latest.set(key, event);
    });
  });
  return latest;
}

function latestEventForEquipment(
  equipment: EquipmentRecord,
  latestEvents: Map<string, FleetTelematicsEventRecord>,
  events: FleetTelematicsEventRecord[],
): FleetTelematicsEventRecord | undefined {
  for (const key of equipmentIdentityKeys(equipment)) {
    const event = latestEvents.get(key);
    if (event) return event;
  }
  return events
    .filter((event) => equipmentMatchesEvent(equipment, event))
    .sort((left, right) => eventTime(right) - eventTime(left))[0];
}

function equipmentMatchesEvent(equipment: EquipmentRecord, event: FleetTelematicsEventRecord): boolean {
  const equipmentKeys = new Set(equipmentIdentityKeys(equipment));
  return eventIdentityKeys(event).some((key) => equipmentKeys.has(key));
}

function loadMatchesGpsAsset(load: LoadRecord, asset: LiveGpsAsset): boolean {
  const loadKeys = [
    load.truckId,
    load.truck,
    load.trailerId,
    load.trailer,
    ...(load.equipmentIds || []),
    ...(load.equipmentNames || []),
  ].map(normalize).filter(Boolean);
  const assetKeys = [
    asset.id,
    asset.equipmentId,
    asset.name,
    asset.revealVehicleId,
    asset.revealVehicleNumber,
  ].map(normalize).filter(Boolean);
  return loadKeys.some((key) => assetKeys.includes(key));
}

function equipmentIdentityKeys(equipment: EquipmentRecord): string[] {
  return unique([
    equipment.id,
    equipment.assetId,
    equipment.name,
    equipment.title,
    equipment.asset,
    equipment.model,
    equipment.revealVehicleId,
    equipment.verizonVehicleId,
    equipment.vehicleNumber,
    equipment.revealVehicleNumber,
    equipmentDisplayName(equipment),
  ].map(normalize).filter(Boolean));
}

function eventIdentityKeys(event: FleetTelematicsEventRecord): string[] {
  return unique([
    event.providerVehicleId,
    event.vehicleNumber,
    event.vehicleName,
    event.registrationNumber,
    event.vin,
  ].map(normalize).filter(Boolean));
}

function liveCategoryForEquipment(equipment: EquipmentRecord): LiveGpsCategory {
  const category = equipmentCategory(equipment);
  if (category === 'Truck' || category === 'Trailer' || category === 'Support') return 'vehicle';
  return 'equipment';
}

function gpsStatus(event: FleetTelematicsEventRecord | undefined, equipment: EquipmentRecord, now: Date): LiveGpsStatus {
  const lastUpdatedAt = event?.eventAt || event?.receivedAt || equipment.lastTelematicsAt || equipment.revealLastReceivedAt;
  const lat = numberOrUndefined(event?.latitude) ?? numberOrUndefined(equipment.lastTelematicsLatitude);
  const lng = numberOrUndefined(event?.longitude) ?? numberOrUndefined(equipment.lastTelematicsLongitude);
  if (lat === undefined || lng === undefined) return 'No Signal';
  if (isStale(lastUpdatedAt, now)) return 'Stale';
  const explicitStatus = event?.status || equipment.lastTelematicsStatus;
  if (explicitStatus && !/unknown/i.test(explicitStatus)) return titleCase(explicitStatus);
  const speed = numberOrUndefined(event?.speedMph) ?? numberOrUndefined(equipment.lastTelematicsSpeedMph) ?? 0;
  if (speed > 2) return 'Moving';
  if (speed > 0) return 'Idle';
  return 'Stopped';
}

function hasCoordinates(event: FleetTelematicsEventRecord): boolean {
  return numberOrUndefined(event.latitude) !== undefined && numberOrUndefined(event.longitude) !== undefined;
}

function isInactive(load: LoadRecord): boolean {
  return /complete|completed|cancelled|canceled|delivered/i.test(String(load.status || ''));
}

function isStale(value: unknown, now: Date): boolean {
  const date = asDate(value);
  if (!date) return true;
  return Math.abs(now.getTime() - date.getTime()) > staleGpsHours * 60 * 60 * 1000;
}

function withSearchText(asset: Omit<LiveGpsAsset, 'searchText'>): LiveGpsAsset {
  return {
    ...asset,
    searchText: [
      asset.id,
      asset.name,
      asset.status,
      asset.category,
      asset.address,
      asset.currentLocationName,
      asset.currentAddress,
      asset.assignedDriver,
      asset.assignedProjectId,
      asset.assignedProjectName,
      asset.revealVehicleId,
      asset.revealVehicleNumber,
      asset.freightMoveId,
      asset.freightMoveTitle,
      asset.nextStopLabel,
    ].map(normalize).filter(Boolean).join(' '),
  };
}

function eventTime(event: FleetTelematicsEventRecord): number {
  return asDate(event.eventAt || event.receivedAt)?.getTime() || 0;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function titleCase(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}

function slugify(value: unknown): string {
  return String(value || 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'asset';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
