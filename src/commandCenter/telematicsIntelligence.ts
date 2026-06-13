import type { AlertRecord, EquipmentRecord, FleetTelematicsEventRecord, LoadRecord, WorkOrderRecord } from './records';

export type TelematicsKpiMetric = {
  label: string;
  value: string;
  detail: string;
  tone: 'ready' | 'watch' | 'bad' | 'context';
};

export type RevealIntegrationStatus = {
  revealVehicles: number;
  vehiclesWithGps: number;
  staleVehicles: number;
  latestEventAt: string;
  healthLabel: string;
};

export type LiveVehicleMapMarker = {
  id: string;
  label: string;
  vehicleNumber?: string;
  lat: number;
  lng: number;
  status: string;
  driverName?: string;
  lastSeenAt?: string;
  address?: string;
  assignedProjectName?: string;
};

export type RevealFleetInspectionRecord = {
  inspectionId: string;
  vehicleId?: string;
  vehicleNumber?: string;
  vehicleName?: string;
  driverName?: string;
  inspectedAt?: string;
  defectCategory?: string;
  defectNotes?: string;
  status?: string;
  severity: string;
  safeToOperate?: boolean;
  raw?: unknown;
};

type TelematicsInput = {
  equipment?: EquipmentRecord[];
  events?: FleetTelematicsEventRecord[];
  loads?: LoadRecord[];
  now?: string | Date;
};

const staleGpsHours = 12;
const stopRadiusMeters = 250;

export function buildRevealIntegrationStatus(input: TelematicsInput): RevealIntegrationStatus {
  const equipment = input.equipment || [];
  const events = input.events || [];
  const latestEventAt = latestIso(events.map((event) => event.eventAt || event.receivedAt));
  const now = asDate(input.now) || asDate(latestEventAt) || new Date();
  const revealVehicleRecords = equipment.filter(isRevealVehicle);
  const revealVehicles = revealVehicleRecords.length;
  const vehiclesWithGps = revealVehicleRecords.filter((item) => {
    const latestEvent = latestEventForEquipment(item, events);
    return hasFreshGps(item, now, latestEvent);
  }).length;
  const staleVehicles = revealVehicles - vehiclesWithGps;
  const healthLabel = revealVehicles === 0
    ? 'No Reveal vehicles synced'
    : `${vehiclesWithGps} live, ${staleVehicles} stale`;

  return {
    revealVehicles,
    vehiclesWithGps,
    staleVehicles,
    latestEventAt,
    healthLabel,
  };
}

export function buildLiveVehicleMapMarkers(equipment: EquipmentRecord[], events: FleetTelematicsEventRecord[] = []): LiveVehicleMapMarker[] {
  const latestEventByEquipment = latestEventsByEquipment(equipment, events);

  return equipment
    .map((item) => {
      const event = latestEventByEquipment.get(item.id || '') || latestEventForEquipment(item, events);
      const lat = numberOrUndefined(event?.latitude) ?? numberOrUndefined(item.lastTelematicsLatitude);
      const lng = numberOrUndefined(event?.longitude) ?? numberOrUndefined(item.lastTelematicsLongitude);
      if (lat === undefined || lng === undefined) return null;

      const speed = numberOrUndefined(event?.speedMph) ?? numberOrUndefined(item.lastTelematicsSpeedMph) ?? 0;
      return {
        id: item.id || event?.id || item.name || 'vehicle',
        label: item.name || item.title || item.asset || event?.vehicleName || 'Reveal vehicle',
        vehicleNumber: item.vehicleNumber || item.revealVehicleNumber || event?.vehicleNumber,
        lat,
        lng,
        status: speed > 2 ? 'Moving' : 'Stopped',
        driverName: event?.driverName || item.lastTelematicsDriverName,
        lastSeenAt: event?.eventAt || item.lastTelematicsAt || event?.receivedAt,
        address: event?.address || item.lastTelematicsAddress || item.currentLocation,
        assignedProjectName: item.assignedProjectName,
      };
    })
    .filter(Boolean) as LiveVehicleMapMarker[];
}

export function applyTelematicsEventsToFreightLoads(
  loads: LoadRecord[],
  equipment: EquipmentRecord[],
  events: FleetTelematicsEventRecord[],
): LoadRecord[] {
  const sortedEvents = [...events].sort((left, right) => cleanDate(left.eventAt || left.receivedAt).getTime() - cleanDate(right.eventAt || right.receivedAt).getTime());
  return loads.map((load) => sortedEvents.reduce((nextLoad, event) => applyTelematicsEventToFreightLoad(nextLoad, equipment, event), load));
}

export function buildTelematicsExceptionAlerts(input: TelematicsInput): AlertRecord[] {
  const equipment = input.equipment || [];
  const loads = input.loads || [];
  const now = asDate(input.now) || new Date();
  const alerts: AlertRecord[] = [];

  equipment.filter(isRevealVehicle).forEach((item) => {
    const itemName = equipmentName(item);
    const assignedProject = clean(item.assignedProjectName);
    const currentLocation = clean(item.lastTelematicsAddress || item.currentLocationName || item.currentLocation);
    const activeLoad = loads.find((load) => !isInactive(load) && loadMatchesEquipment(load, item));

    if (assignedProject && currentLocation && !sameLocationText(assignedProject, currentLocation) && (activeLoad || item.status === 'Assigned' || item.status === 'In Use')) {
      alerts.push({
        id: `telematics-away-${slugify(item.id || itemName)}`,
        title: `${itemName} away from assigned project`,
        name: `${itemName} away from assigned project`,
        body: `${itemName} is assigned to ${assignedProject}, but Reveal last placed it at ${currentLocation}.`,
        severity: 'High',
        status: 'Needs Review',
        time: item.lastTelematicsAt || 'Reveal GPS',
        targetTab: 'equipment',
        relatedEntityType: 'equipment',
        relatedEntityId: item.id,
      } as AlertRecord);
    }

    const lastSeen = asDate(item.lastTelematicsAt || item.revealLastReceivedAt);
    if (!lastSeen || hoursBetween(lastSeen, now) > staleGpsHours) {
      alerts.push({
        id: `telematics-stale-${slugify(item.id || itemName)}`,
        title: `${itemName} stale GPS`,
        name: `${itemName} stale GPS`,
        body: `${itemName} has not sent a fresh Reveal GPS update in more than ${staleGpsHours} hours.`,
        severity: activeLoad ? 'High' : 'Medium',
        status: 'Watch',
        time: item.lastTelematicsAt || 'No GPS timestamp',
        targetTab: 'equipment',
        relatedEntityType: 'equipment',
        relatedEntityId: item.id,
      } as AlertRecord);
    }
  });

  return alerts;
}

export function normalizeRevealFleetInspectionRecords(payload: unknown): RevealFleetInspectionRecord[] {
  return inspectionItems(payload)
    .map((item) => {
      const safeToOperateValue = firstValue(item, ['SafeToOperate', 'safeToOperate', 'CanOperate', 'canOperate', 'Passed', 'passed']);
      const safeToOperate = safeToOperateValue === undefined ? undefined : truthy(safeToOperateValue);
      const defectNotes = clean(firstValue(item, ['DefectNotes', 'defectNotes', 'Notes', 'notes', 'Description', 'description']));
      const status = clean(firstValue(item, ['Status', 'status', 'InspectionStatus', 'inspectionStatus']));
      const severity = !safeToOperate
        ? 'Critical'
        : /fail|defect|repair|unsafe|critical/i.test(`${status} ${defectNotes}`)
          ? 'High'
          : 'High';

      return stripUndefined({
        inspectionId: clean(firstValue(item, ['InspectionId', 'inspectionId', 'Id', 'id'])),
        vehicleId: clean(firstValue(item, ['VehicleId', 'vehicleId', 'VehicleID', 'vehicleID'])),
        vehicleNumber: clean(firstValue(item, ['VehicleNumber', 'vehicleNumber', 'UnitNumber', 'unitNumber'])),
        vehicleName: clean(firstValue(item, ['VehicleName', 'vehicleName', 'Name', 'name'])),
        driverName: clean(firstValue(item, ['DriverName', 'driverName', 'driver.name'])),
        inspectedAt: normalizeTimestamp(firstValue(item, ['InspectionDateTime', 'inspectionDateTime', 'InspectedAt', 'inspectedAt', 'DateTime', 'dateTime'])),
        defectCategory: clean(firstValue(item, ['DefectCategory', 'defectCategory', 'Category', 'category', 'Part', 'part'])),
        defectNotes,
        status,
        severity,
        safeToOperate,
        raw: item,
      }) as RevealFleetInspectionRecord;
    })
    .filter((item) => item.inspectionId || item.vehicleId || item.vehicleName || item.defectNotes);
}

export function buildEquipmentWorkOrderFromRevealInspection(inspection: RevealFleetInspectionRecord, equipment: EquipmentRecord[] = []): WorkOrderRecord {
  const matched = equipment.find((item) => equipmentMatchesInspection(item, inspection));
  const assetName = matched ? equipmentName(matched) : inspection.vehicleName || inspection.vehicleNumber || inspection.vehicleId || 'Reveal vehicle';
  const inspectedAt = inspection.inspectedAt || new Date().toISOString();
  const title = `${assetName} Reveal inspection issue`;

  return {
    id: `work-order-reveal-inspection-${slugify(inspection.inspectionId || `${assetName}-${inspectedAt}`)}`,
    title,
    name: title,
    workOrderType: 'equipment',
    division: 'Maintenance / Equipment',
    taskType: 'Reveal Fleet Inspection / DVIR',
    status: 'Ready',
    priority: inspection.safeToOperate === false ? 'Critical' : inspection.severity,
    equipmentIds: matched?.id ? [matched.id] : [],
    equipmentNames: [assetName],
    sourceSheetName: 'Reveal Fleet Inspection API',
    sourceRowId: inspection.inspectionId,
    notes: [
      `Reveal inspection ID: ${inspection.inspectionId || '-'}`,
      `Vehicle: ${assetName}`,
      `Driver: ${inspection.driverName || '-'}`,
      `Inspected at: ${inspectedAt}`,
      `Safe to operate: ${inspection.safeToOperate === undefined ? 'Unknown' : inspection.safeToOperate ? 'Yes' : 'No'}`,
      `Category: ${inspection.defectCategory || '-'}`,
      inspection.defectNotes,
    ].filter(Boolean).join('\n'),
  };
}

export function buildRevealTelematicsKpis(input: TelematicsInput): TelematicsKpiMetric[] {
  const status = buildRevealIntegrationStatus(input);
  const eventCount = input.events?.length || 0;

  return [
    metric('Reveal Vehicles', status.revealVehicles, 'Vehicles synced from Verizon Reveal', status.revealVehicles ? 'context' : 'watch'),
    metric('Live GPS', status.vehiclesWithGps, 'Vehicles with fresh GPS in the last 12 hours', status.vehiclesWithGps ? 'ready' : 'watch'),
    metric('Stale GPS', status.staleVehicles, 'Vehicles needing telematics review', status.staleVehicles ? 'watch' : 'ready'),
    metric('GPS Events', eventCount, 'Webhook events received from Reveal', eventCount ? 'context' : 'watch'),
  ];
}

function applyTelematicsEventToFreightLoad(load: LoadRecord, equipment: EquipmentRecord[], event: FleetTelematicsEventRecord): LoadRecord {
  const matchedEquipment = equipment.find((item) => equipmentMatchesEvent(item, event));
  if (!matchedEquipment || !loadMatchesEquipment(load, matchedEquipment)) return load;
  if (!load.stops?.length) return load;

  let changed = false;
  const eventAt = event.eventAt || event.receivedAt || new Date().toISOString();
  const stops = load.stops.map((stop) => {
    const nearStop = eventMatchesStop(event, stop);

    if (nearStop && !stop.actualArrivalAt && !stop.completed) {
      changed = true;
      return {
        ...stop,
        status: 'InProgress',
        actualArrivalAt: eventAt,
      };
    }

    if (!nearStop && stop.actualArrivalAt && !stop.actualDepartureAt && !stop.completed) {
      changed = true;
      return {
        ...stop,
        status: stop.status || 'InProgress',
        actualDepartureAt: eventAt,
      };
    }

    return stop;
  });

  if (!changed) return load;

  const changedStop = stops.find((stop, index) => stop !== load.stops?.[index]);
  const departure = Boolean(changedStop?.actualDepartureAt && !load.stops?.find((stop) => stop.id === changedStop.id)?.actualDepartureAt);
  return withTelematicsFreightEvent({
    ...load,
    stops,
    status: 'In Transit',
  }, {
    type: departure ? 'REVEAL_STOP_DEPARTURE' : 'REVEAL_STOP_ARRIVAL',
    actorName: 'Reveal GPS',
    createdAt: eventAt,
    summary: `${departure ? 'Reveal GPS departure' : 'Reveal GPS arrival'}: ${equipmentName(matchedEquipment)} ${departure ? 'left' : 'arrived at'} ${changedStop?.label || changedStop?.location || 'freight stop'}`,
  });
}

function latestEventsByEquipment(equipment: EquipmentRecord[], events: FleetTelematicsEventRecord[]): Map<string, FleetTelematicsEventRecord> {
  const map = new Map<string, FleetTelematicsEventRecord>();
  equipment.forEach((item) => {
    const event = latestEventForEquipment(item, events);
    if (item.id && event) map.set(item.id, event);
  });
  return map;
}

function latestEventForEquipment(item: EquipmentRecord, events: FleetTelematicsEventRecord[]): FleetTelematicsEventRecord | undefined {
  return events
    .filter((event) => equipmentMatchesEvent(item, event))
    .sort((left, right) => cleanDate(right.eventAt || right.receivedAt).getTime() - cleanDate(left.eventAt || left.receivedAt).getTime())[0];
}

function eventMatchesStop(event: FleetTelematicsEventRecord, stop: NonNullable<LoadRecord['stops']>[number]): boolean {
  const eventPoint = pointFromEvent(event);
  const stopPoint = pointFromStop(stop);
  if (eventPoint && stopPoint && distanceMeters(eventPoint, stopPoint) <= stopRadiusMeters) return true;

  const addressText = normalized([event.address, event.coordinateText].filter(Boolean).join(' '));
  const stopText = normalized([stop.location, stop.address, stop.mainAddress, stop.constructionAccessPin, stop.loadUnloadPin].filter(Boolean).join(' '));
  return Boolean(addressText && stopText && (addressText.includes(stopText) || stopText.includes(addressText)));
}

function pointFromEvent(event: FleetTelematicsEventRecord): { lat: number; lng: number } | null {
  const lat = numberOrUndefined(event.latitude);
  const lng = numberOrUndefined(event.longitude);
  if (lat === undefined || lng === undefined) return null;
  return { lat, lng };
}

function pointFromStop(stop: NonNullable<LoadRecord['stops']>[number]): { lat: number; lng: number } | null {
  return parseCoordinate(stop.loadUnloadPin)
    || parseCoordinate(stop.constructionAccessPin)
    || parseCoordinate(stop.location)
    || parseCoordinate(stop.address)
    || parseCoordinate(stop.mainAddress);
}

function parseCoordinate(value: unknown): { lat: number; lng: number } | null {
  const match = String(value || '').match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function distanceMeters(left: { lat: number; lng: number }, right: { lat: number; lng: number }): number {
  const radius = 6371000;
  const dLat = toRadians(right.lat - left.lat);
  const dLng = toRadians(right.lng - left.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(left.lat)) * Math.cos(toRadians(right.lat)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function withTelematicsFreightEvent(load: LoadRecord, event: NonNullable<LoadRecord['freightEvents']>[number]): LoadRecord {
  return {
    ...load,
    freightRevision: Number(load.freightRevision || 0) + 1,
    freightEvents: [event, ...(load.freightEvents || [])].slice(0, 50),
  };
}

function equipmentMatchesEvent(item: EquipmentRecord, event: FleetTelematicsEventRecord): boolean {
  const itemProviderId = normalized(item.revealVehicleId || item.verizonVehicleId);
  const eventProviderId = normalized(event.providerVehicleId);
  if (itemProviderId && eventProviderId) return itemProviderId === eventProviderId;

  const itemVehicleNumber = normalized(item.vehicleNumber || item.revealVehicleNumber);
  const eventVehicleNumber = normalized(event.vehicleNumber);
  if (itemVehicleNumber && eventVehicleNumber) return itemVehicleNumber === eventVehicleNumber;

  return valuesIntersect([
    item.registrationNumber,
    item.vin,
    item.name,
    item.asset,
  ], [
    event.registrationNumber,
    event.vin,
    event.vehicleName,
  ]);
}

function equipmentMatchesInspection(item: EquipmentRecord, inspection: RevealFleetInspectionRecord): boolean {
  return valuesIntersect([
    item.revealVehicleId,
    item.verizonVehicleId,
    item.vehicleNumber,
    item.revealVehicleNumber,
    item.name,
    item.asset,
  ], [
    inspection.vehicleId,
    inspection.vehicleNumber,
    inspection.vehicleName,
  ]);
}

function loadMatchesEquipment(load: LoadRecord, equipment: EquipmentRecord): boolean {
  return valuesIntersect([
    load.truckId,
    load.truck,
    load.trailerId,
    load.trailer,
    ...(load.equipmentIds || []),
    ...(load.equipmentNames || []),
  ], [
    equipment.id,
    equipment.assetId,
    equipment.name,
    equipment.asset,
    equipment.vehicleNumber,
    equipment.revealVehicleNumber,
  ]);
}

function valuesIntersect(left: unknown[], right: unknown[]): boolean {
  const leftSet = new Set(left.map(normalized).filter(Boolean));
  return right.map(normalized).filter(Boolean).some((value) => leftSet.has(value));
}

function isRevealVehicle(item: EquipmentRecord): boolean {
  return Boolean(item.telematicsProvider === 'Reveal' || item.revealVehicleId || item.verizonVehicleId || item.revealVehicleNumber || item.lastTelematicsAt);
}

function hasFreshGps(item: EquipmentRecord, now: Date, event?: FleetTelematicsEventRecord): boolean {
  const lastSeen = asDate(event?.eventAt || event?.receivedAt || item.lastTelematicsAt || item.revealLastReceivedAt);
  return Boolean(lastSeen && hoursBetween(lastSeen, now) <= staleGpsHours);
}

function hoursBetween(left: Date, right: Date): number {
  return Math.abs(right.getTime() - left.getTime()) / 36e5;
}

function latestIso(values: unknown[]): string {
  return values
    .map(asDate)
    .filter(Boolean)
    .sort((left, right) => (right as Date).getTime() - (left as Date).getTime())[0]
    ?.toISOString() || '';
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanDate(value: unknown): Date {
  return asDate(value) || new Date(0);
}

function normalizeTimestamp(value: unknown): string | undefined {
  const date = asDate(value);
  return date?.toISOString();
}

function inspectionItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ['Inspections', 'inspections', 'FleetInspections', 'fleetInspections', 'Items', 'items', 'Data', 'data']) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [payload];
}

function firstValue(item: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((current, part) => (isRecord(current) ? current[part] : undefined), item);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'passed', 'pass', 'safe'].includes(String(value || '').trim().toLowerCase());
}

function metric(label: string, value: number, detail: string, tone: TelematicsKpiMetric['tone'] = 'context'): TelematicsKpiMetric {
  return { label, value: String(value), detail, tone };
}

function isInactive(record: Record<string, unknown>): boolean {
  const text = Object.values(record).map((value) => Array.isArray(value) ? value.join(' ') : String(value || '')).join(' ').toLowerCase();
  return /complete|completed|cancelled|canceled|closed|delivered/.test(text);
}

function sameLocationText(left: string, right: string): boolean {
  const normalizedLeft = normalized(left);
  const normalizedRight = normalized(right);
  return Boolean(normalizedLeft && normalizedRight && (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)));
}

function equipmentName(item: EquipmentRecord): string {
  return clean(item.name || item.title || item.asset || item.vehicleNumber || item.id) || 'Reveal vehicle';
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalized(value: unknown): string {
  return clean(value).toLowerCase();
}

function clean(value: unknown): string {
  return String(value || '').trim();
}

function slugify(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'record';
}

function stripUndefined<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== '')) as Partial<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
