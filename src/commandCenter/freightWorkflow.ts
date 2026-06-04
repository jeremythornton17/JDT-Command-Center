import type { ClientRecord, EquipmentRecord, LoadRecord, LocationRecord, WorkOrderRecord } from './records';

export const freightVehicleActivityOptions = ['Spot Location', 'Drop Trailer', 'Hook Trailer', 'Mark Empty', 'Mark Loaded'];

export type FreightVehicleActivityInput = {
  action: string;
  actorName?: string;
  occurredAt?: string;
  locationName?: string;
  locationAddress?: string;
  assignedCrewName?: string;
  assignedTruck?: string;
  notes?: string;
};

export type FreightStopProgressInput = {
  stopId?: string;
  nextStatus?: string;
  location?: string;
  locationName?: string;
  address?: string;
  locationAddress?: string;
  actualArrivalAt?: string;
  actualDepartureAt?: string;
  notes?: string;
  saveLocation?: boolean;
  saveContact?: boolean;
  siteContactName?: string;
  siteContactPhone?: string;
  actorName?: string;
  occurredAt?: string;
};

export type FreightPodInput = {
  receiverName?: string;
  completedAt?: string;
  signatureDataUrl?: string;
  bolPhotoDataUrl?: string;
  notes?: string;
  actorName?: string;
};

export type VehicleIssueInput = {
  assetId: string;
  assetName: string;
  assetType: string;
  severity: string;
  description: string;
  reportedBy: string;
  reportedAt?: string;
};

type FreightStopRecord = NonNullable<LoadRecord['stops']>[number] & Record<string, unknown>;
type FreightRouteStepRecord = NonNullable<LoadRecord['routeSteps']>[number];

export type FreightRouteStepProgressInput = {
  routeStepId?: string;
  routeStepStatus?: string;
  actualStart?: string;
  actualEnd?: string;
  notes?: string;
  actorName?: string;
  occurredAt?: string;
};

export function applyVehicleActivity(vehicle: EquipmentRecord, input: FreightVehicleActivityInput): EquipmentRecord {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const historyEntry = {
    action: input.action,
    actorName: input.actorName,
    occurredAt,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    assignedCrewName: input.assignedCrewName,
    assignedTruck: input.assignedTruck,
    notes: input.notes,
  };
  const updated: EquipmentRecord = {
    ...vehicle,
    lastSpottedBy: input.actorName || vehicle.lastSpottedBy,
    lastSpottedAt: occurredAt,
    vehicleActivityHistory: [historyEntry, ...(vehicle.vehicleActivityHistory || [])].slice(0, 25),
  };

  if (input.locationName) {
    updated.currentLocationName = input.locationName;
    updated.currentLocation = input.locationAddress || input.locationName;
    updated.currentLocationType = locationTypeFromName(input.locationName);
  }

  if (input.action === 'Spot Location') {
    updated.status = updated.status || 'Available';
    updated.vehicleLoadState = 'Empty';
  }

  if (input.action === 'Drop Trailer') {
    updated.assignedCrewName = '';
    updated.operator = '';
    updated.assignedTruck = '';
    updated.status = 'Available';
    updated.vehicleLoadState = 'Empty';
  }

  if (input.action === 'Hook Trailer') {
    updated.assignedCrewName = input.assignedCrewName || vehicle.assignedCrewName;
    updated.operator = input.assignedCrewName || vehicle.operator;
    updated.assignedTruck = input.assignedTruck || vehicle.assignedTruck;
    updated.status = 'Assigned';
  }

  if (input.action === 'Mark Empty') {
    updated.vehicleLoadState = 'Empty';
    updated.status = updated.status || 'Available';
  }

  if (input.action === 'Mark Loaded') {
    updated.vehicleLoadState = 'Loaded';
    updated.status = 'In Use';
  }

  return updated;
}

export function vehicleLocationHistory(vehicle: EquipmentRecord) {
  return vehicle.vehicleActivityHistory || [];
}

export function parseFreightRouteSteps(stepPlanText: unknown): NonNullable<LoadRecord['routeSteps']> {
  return String(stepPlanText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseFreightRouteStepLine(line, index + 1));
}

export function generateFreightLoadTitle(load: Partial<LoadRecord>): string {
  const driver = cleanText(load.driver) || cleanText(load.name) || 'Unassigned Driver';
  const truck = cleanText(load.truck) || 'Truck TBD';
  const client = cleanText(load.clientName) || cleanText((load as LoadRecord & { client?: string }).client) || cleanText(load.projectName) || 'Client TBD';
  const equipmentNames = Array.isArray(load.equipmentNames) ? load.equipmentNames : [];
  const freightType = equipmentNames.length > 0 || cleanText(load.requiredTrailerType).toLowerCase().includes('lowboy')
    ? 'Equipment Move'
    : cleanText(load.trailer) || cleanText(load.requiredTrailerType)
      ? 'Trailer Move'
      : 'Freight Move';

  return [driver, truck, client, freightType].filter(Boolean).join(' - ');
}

export function generateFreightLoadNumber(load: Partial<LoadRecord>, existingLoads: Partial<LoadRecord>[] = []): string {
  const dateCode = dateCodeForLoad(load.date || load.pickupDate || load.deliveryDate);
  const driverCode = initialsCode(load.driver || load.name || 'Unassigned');
  const truckCode = truckCodeForLoad(load.truck || load.truckId || 'Truck');
  const prefix = `FM-${dateCode}-${driverCode}-${truckCode}`;
  const nextSequence = existingLoads
    .map((existing) => cleanText(existing.loadNumber))
    .filter((loadNumber) => loadNumber.startsWith(`${prefix}-`))
    .map((loadNumber) => Number(loadNumber.split('-').pop()))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `${prefix}-${String(nextSequence).padStart(2, '0')}`;
}

export function normalizeFreightLoadForSave(load: LoadRecord, existingLoads: Partial<LoadRecord>[] = []): LoadRecord {
  const source = load as LoadRecord & Record<string, unknown>;
  const plannedStops = stopSequencesFromFormFields(source)
    .map((sequence) => plannedStopFromFormFields(source, sequence))
    .filter(Boolean) as NonNullable<LoadRecord['stops']>;

  const cleaned = { ...source } as Record<string, unknown>;
  Object.keys(cleaned).forEach((key) => {
    if (/^stop\d+(Type|LoadCategory|EquipmentName|TrailerName|Location|Address|MainAddress|ConstructionAccessPin|LoadUnloadPin|Notes|RequestedTime|SiteContactName|SiteContactPhone|SaveLocation|SaveContact)$/.test(key)) {
      delete cleaned[key];
    }
  });

  const stops = plannedStops.length ? plannedStops : load.stops;
  const firstStop = plannedStops[0];
  const finalStop = plannedStops[plannedStops.length - 1];

  return {
    ...(cleaned as LoadRecord),
    title: cleanText(cleaned.title) || generateFreightLoadTitle(cleaned as LoadRecord),
    loadNumber: cleanText(cleaned.loadNumber) || generateFreightLoadNumber(cleaned as LoadRecord, existingLoads),
    stops,
    origin: cleanText(load.origin) || firstStop?.location || firstStop?.address || load.origin,
    delivery: cleanText(load.delivery) || finalStop?.location || finalStop?.address || load.delivery,
    destination: cleanText(load.destination) || finalStop?.location || finalStop?.address || load.destination,
  };
}

export function completeFreightRouteStep(load: LoadRecord, input: FreightRouteStepProgressInput): LoadRecord {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const routeStepId = input.routeStepId || load.routeSteps?.[0]?.id || String(load.routeSteps?.[0]?.sequence || '');
  const routeSteps = (load.routeSteps || []).map((step) => {
    const matches = step.id === routeStepId || step.label === routeStepId || String(step.sequence) === String(routeStepId);
    if (!matches) return step;
    const nextStatus = input.routeStepStatus || 'Complete';
    return {
      ...step,
      status: nextStatus,
      completed: nextStatus === 'Complete',
      actualStart: input.actualStart || step.actualStart,
      actualEnd: input.actualEnd || step.actualEnd || occurredAt,
      notes: input.notes || step.notes,
    };
  });
  const changedStep = routeSteps.find((step) => step.id === routeStepId || step.label === routeStepId || String(step.sequence) === String(routeStepId));
  const everyStepComplete = routeSteps.length > 0 && routeSteps.every((step) => step.completed || step.status === 'Complete' || step.status === 'Skipped');

  return withFreightEvent({
    ...load,
    routeSteps,
    status: everyStepComplete ? 'Completed' : 'In Transit',
  }, {
    type: 'ROUTE_STEP_UPDATED',
    actorName: input.actorName,
    createdAt: occurredAt,
    summary: `Updated route step ${changedStep?.actionType || changedStep?.label || routeStepId || 'freight route step'} to ${input.routeStepStatus || 'Complete'}`,
  });
}

export function applyCompletedRouteStepToEquipment(equipment: EquipmentRecord, load: Pick<LoadRecord, 'driver' | 'truck' | 'truckId' | 'trailer' | 'trailerId'>, step: FreightRouteStepRecord): EquipmentRecord {
  if (!(step.completed || step.status === 'Complete')) return equipment;
  if (!routeStepMatchesEquipment(equipment, load, step)) return equipment;

  const actionType = String(step.actionType || '');
  const locationName = step.destination || step.origin || equipment.currentLocationName || equipment.currentLocation || equipment.location;
  const occurredAt = new Date().toISOString();
  const updated: EquipmentRecord = {
    ...equipment,
    lastSpottedAt: occurredAt,
  };

  if (locationName) {
    updated.currentLocationName = locationName;
    updated.currentLocation = locationName;
    updated.currentLocationType = locationTypeFromName(locationName);
  }

  if (/hook trailer/i.test(actionType)) {
    updated.assignedCrewName = load.driver || equipment.assignedCrewName;
    updated.operator = load.driver || equipment.operator;
    updated.assignedTruck = load.truck || equipment.assignedTruck;
    updated.assignedTruckId = load.truckId || equipment.assignedTruckId;
    updated.status = 'Assigned';
  } else if (/drop trailer|spot trailer|return empty/i.test(actionType)) {
    updated.assignedCrewName = '';
    updated.operator = '';
    updated.assignedTruck = '';
    updated.assignedTruckId = '';
    updated.status = 'Available';
    updated.vehicleLoadState = 'Empty';
  } else if (/hold loaded|load trees|tarp load|deliver trees/i.test(actionType)) {
    updated.assignedCrewName = load.driver || equipment.assignedCrewName;
    updated.operator = load.driver || equipment.operator;
    updated.assignedTruck = load.truck || equipment.assignedTruck;
    updated.assignedTruckId = load.truckId || equipment.assignedTruckId;
    updated.status = 'In Use';
    updated.vehicleLoadState = 'Loaded';
  } else if (/unload equipment|move equipment/i.test(actionType)) {
    updated.status = 'Available';
    if (equipment.category === 'Trailer') updated.vehicleLoadState = 'Empty';
  } else if (/^load equipment$/i.test(actionType)) {
    updated.status = 'In Transit';
    updated.vehicleLoadState = equipment.category === 'Trailer' ? 'Loaded' : equipment.vehicleLoadState;
  }

  updated.vehicleActivityHistory = [{
    action: actionType || 'Freight Step Complete',
    actorName: load.driver || 'Command Center',
    occurredAt,
    locationName,
    assignedCrewName: updated.assignedCrewName,
    assignedTruck: updated.assignedTruck,
    notes: step.notes,
  }, ...(equipment.vehicleActivityHistory || [])].slice(0, 25);

  return updated;
}

export function advanceFreightStop(load: LoadRecord, input: FreightStopProgressInput): LoadRecord {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const stopId = input.stopId || load.stops?.[0]?.id || load.stops?.[0]?.label;
  const stops = (load.stops || []).map((stop) => {
    const matches = stop.id === stopId || stop.label === stopId || stop.location === stopId;
    if (!matches) return stop;

    return {
      ...stop,
      location: input.locationName || input.location || stop.location,
      address: input.locationAddress || input.address || stop.address,
      status: input.nextStatus || 'Completed',
      completed: (input.nextStatus || 'Completed') === 'Completed',
      actualArrivalAt: input.actualArrivalAt || stop.actualArrivalAt,
      actualDepartureAt: input.actualDepartureAt || stop.actualDepartureAt,
      notes: input.notes || stop.notes,
      saveLocation: input.saveLocation ?? stop.saveLocation,
      saveContact: input.saveContact ?? stop.saveContact,
      siteContactName: input.siteContactName || stop.siteContactName,
      siteContactPhone: input.siteContactPhone || stop.siteContactPhone,
    };
  });

  const changedStopIndex = stops.findIndex((stop) => stop.id === stopId || stop.label === stopId || stop.location === stopId);
  const nextStatus = freightStatusFromStops(load.status || 'Scheduled', stops, changedStopIndex);

  return withFreightEvent({
    ...load,
    stops,
    status: nextStatus,
  }, {
    type: 'STOP_UPDATED',
    actorName: input.actorName,
    createdAt: occurredAt,
    summary: `Updated stop ${stopId || 'freight stop'} to ${input.nextStatus || 'Completed'}`,
  });
}

export function completeFreightWithPod(load: LoadRecord, input: FreightPodInput): LoadRecord {
  const completedAt = input.completedAt || new Date().toISOString();
  const requiredDocuments = [
    ...(load.requiredDocuments || []),
    input.bolPhotoDataUrl ? { type: 'BOL', status: 'Received', url: input.bolPhotoDataUrl } : { type: 'BOL', status: 'Needed' },
    input.signatureDataUrl ? { type: 'Signature', status: 'Received', url: input.signatureDataUrl } : { type: 'Signature', status: 'Needed' },
  ];

  return withFreightEvent({
    ...load,
    status: 'Completed',
    pod: {
      receiverName: input.receiverName,
      completedAt,
      signatureDataUrl: input.signatureDataUrl,
      bolPhotoDataUrl: input.bolPhotoDataUrl,
      notes: input.notes,
    },
    requiredDocuments: dedupeDocuments(requiredDocuments),
  }, {
    type: 'POD_COMPLETED',
    actorName: input.actorName,
    createdAt: completedAt,
    summary: `Proof of delivery completed by ${input.receiverName || 'receiver'}`,
  });
}

export function freightEventHistory(load: LoadRecord) {
  return load.freightEvents || [];
}

export function locationRecordFromFreightStop(stop: FreightStopRecord | Record<string, unknown>): LocationRecord | null {
  if (!Boolean(stop.saveLocation)) return null;
  const name = String(stop.location || stop.loadUnloadPin || stop.constructionAccessPin || stop.locationName || stop.mainAddress || '').trim();
  const mainAddress = String(stop.mainAddress || stop.address || stop.locationAddress || stop.location || '').trim();
  if (!name) return null;

  return {
    id: `location-${slugify(name)}`,
    name,
    title: name,
    locationType: locationTypeFromName(name),
    mainAddress,
  };
}

export function clientContactFromFreightStop(stop: FreightStopRecord | Record<string, unknown>): NonNullable<ClientRecord['members']>[number] | null {
  if (!Boolean(stop.saveContact)) return null;
  const name = String(stop.siteContactName || '').trim();
  const phone = String(stop.siteContactPhone || '').trim();
  if (!name && !phone) return null;

  return {
    name: name || 'Site Contact',
    role: 'Site Contact',
    phone,
  };
}

export function createEquipmentWorkOrderFromIssue(input: VehicleIssueInput): WorkOrderRecord {
  const reportedAt = input.reportedAt || new Date().toISOString();
  const title = `${input.assetName} ${input.severity} issue`;

  return {
    id: `work-order-${slugify([input.assetId, input.severity, reportedAt].join('-'))}`,
    title,
    name: title,
    workOrderType: 'equipment',
    division: 'Maintenance / Equipment',
    taskType: `${input.assetType} issue`,
    status: 'Ready',
    priority: input.severity,
    equipmentIds: [input.assetId],
    equipmentNames: [input.assetName],
    notes: [
      `Reported by: ${input.reportedBy}`,
      `Reported at: ${reportedAt}`,
      `Severity: ${input.severity}`,
      input.description,
    ].filter(Boolean).join('\n'),
  };
}

function withFreightEvent(load: LoadRecord, event: NonNullable<LoadRecord['freightEvents']>[number]): LoadRecord {
  return {
    ...load,
    freightRevision: Number(load.freightRevision || 0) + 1,
    freightEvents: [event, ...(load.freightEvents || [])].slice(0, 50),
  };
}

function plannedStopFromFormFields(source: Record<string, unknown>, sequence: number): FreightStopRecord | null {
  const prefix = `stop${sequence}`;
  const type = cleanText(source[`${prefix}Type`]) || (sequence === 1 ? 'Pickup' : 'Drop Off');
  const loadCategory = cleanText(source[`${prefix}LoadCategory`]);
  const equipmentName = cleanText(source[`${prefix}EquipmentName`]);
  const trailerName = cleanText(source[`${prefix}TrailerName`]);
  const legacyLocation = cleanText(source[`${prefix}Location`]);
  const legacyAddress = cleanText(source[`${prefix}Address`]);
  const mainAddress = cleanText(source[`${prefix}MainAddress`]) || legacyAddress;
  const constructionAccessPin = cleanText(source[`${prefix}ConstructionAccessPin`]);
  const loadUnloadPin = cleanText(source[`${prefix}LoadUnloadPin`]);
  const location = loadUnloadPin || constructionAccessPin || legacyLocation || mainAddress;
  const address = mainAddress || legacyAddress || location;
  const notes = cleanText(source[`${prefix}Notes`]);
  const requestedTime = cleanText(source[`${prefix}RequestedTime`]);
  const siteContactName = cleanText(source[`${prefix}SiteContactName`]);
  const siteContactPhone = cleanText(source[`${prefix}SiteContactPhone`]);
  const saveLocation = truthy(source[`${prefix}SaveLocation`]) || Boolean(constructionAccessPin || loadUnloadPin);
  const saveContact = truthy(source[`${prefix}SaveContact`]);
  const hasDetails = [
    loadCategory,
    equipmentName,
    trailerName,
    mainAddress,
    constructionAccessPin,
    loadUnloadPin,
    location,
    address,
    notes,
    requestedTime,
    siteContactName,
    siteContactPhone,
  ].some(Boolean) || saveLocation || saveContact;

  if (!hasDetails) return null;

  const labelDetail = equipmentName || trailerName || mainAddress || location || address || loadCategory;
  const label = [type, labelDetail].filter(Boolean).join(' - ');

  return {
    id: `stop-${sequence}-${slugSegment(type)}-${slugSegment(labelDetail || 'site')}`,
    sequence,
    label,
    type,
    loadCategory,
    equipmentName,
    trailerName,
    mainAddress,
    constructionAccessPin,
    loadUnloadPin,
    location: location || address,
    address: address || location,
    window: requestedTime,
    requestedTime,
    status: 'Pending',
    completed: false,
    notes,
    saveLocation,
    saveContact,
    siteContactName,
    siteContactPhone,
  };
}

function stopSequencesFromFormFields(source: Record<string, unknown>): number[] {
  const sequences = Object.keys(source)
    .map((key) => key.match(/^stop(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  return Array.from(new Set(sequences)).sort((left, right) => left - right);
}

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

function dateCodeForLoad(value: unknown): string {
  const clean = cleanText(value);
  const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;
  const slash = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) return `${slash[3]}${slash[1].padStart(2, '0')}${slash[2].padStart(2, '0')}`;
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function initialsCode(value: unknown): string {
  const initials = cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (initials || 'NA').slice(0, 4);
}

function truckCodeForLoad(value: unknown): string {
  const clean = cleanText(value);
  const semiNumber = clean.match(/semi\s*#?\s*(\d+)/i);
  if (semiNumber) return `S${semiNumber[1]}`;
  const compact = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (compact || 'TRUCK').slice(0, 8);
}

function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'on'].includes(String(value || '').trim().toLowerCase());
}

function slugSegment(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'stop';
}

function freightStatusFromStops(currentStatus: string, stops: NonNullable<LoadRecord['stops']>, changedStopIndex: number): string {
  const changedStop = stops[changedStopIndex];
  if (!changedStop || changedStop.status !== 'Completed') return currentStatus;
  if (/delivery/i.test(String(changedStop.type || changedStop.label || '')) && changedStopIndex === stops.length - 1) return 'Delivered';
  if (/pickup/i.test(String(changedStop.type || changedStop.label || ''))) return 'In Transit';
  return currentStatus;
}

function dedupeDocuments(documents: NonNullable<LoadRecord['requiredDocuments']>) {
  const byType = new Map<string, NonNullable<LoadRecord['requiredDocuments']>[number]>();
  documents.forEach((document) => {
    const key = document.type;
    const existing = byType.get(key);
    if (!existing || document.status === 'Received') byType.set(key, document);
  });
  return Array.from(byType.values());
}

function locationTypeFromName(name: string): LocationRecord['locationType'] {
  if (/shop|repair/i.test(name)) return 'Shop';
  if (/farm|acre|nursery|home base/i.test(name)) return 'Farm';
  return 'Job Site';
}

function parseFreightRouteStepLine(line: string, sequence: number): FreightRouteStepRecord {
  const cleanLine = line.replace(/^\s*\d+[\).\-\s]+/, '').trim();
  const parts = cleanLine.split('|').map((part) => part.trim()).filter(Boolean);
  const actionType = classifyRouteStepAction(parts[0] || cleanLine);
  const assetName = parts[1] || inferAssetName(cleanLine, actionType);
  const locationPart = parts[2] || '';
  const { origin, destination } = parseRouteLocation(locationPart);
  const notes = parts.slice(3).join(' | ') || (parts.length < 3 ? cleanLine : '');
  const step: FreightRouteStepRecord = {
    id: `route-step-${sequence}-${slugify(actionType || 'step')}`,
    sequence,
    actionType,
    label: [actionType, assetName].filter(Boolean).join(': ') || cleanLine,
    status: 'Pending',
    origin,
    destination,
    notes,
    completed: false,
  };

  if (/equipment/i.test(actionType)) {
    step.equipmentName = assetName;
  } else if (/trees/i.test(actionType)) {
    step.materialName = assetName;
  } else if (/trailer|loaded|dropdeck|lowboy|tag along/i.test(`${actionType} ${assetName}`)) {
    step.trailerName = assetName;
  } else {
    step.equipmentName = assetName;
  }

  return step;
}

function classifyRouteStepAction(value: string): string {
  const text = String(value || '').toLowerCase();
  if (/hook/.test(text)) return 'Hook Trailer';
  if (/drop/.test(text)) return 'Drop Trailer';
  if (/spot/.test(text)) return 'Spot Trailer';
  if (/return.*empty/.test(text)) return 'Return Empty';
  if (/hold|overnight|stay hooked/.test(text)) return 'Hold Loaded Overnight';
  if (/tarp/.test(text)) return 'Tarp Load';
  if (/deliver.*tree|tree.*deliver/.test(text)) return 'Deliver Trees';
  if (/load.*tree|tree.*load/.test(text)) return 'Load Trees';
  if (/unload/.test(text)) return 'Unload Equipment';
  if (/move|deliver/.test(text)) return 'Move Equipment';
  if (/load/.test(text)) return 'Load Equipment';
  return titleCase(value || 'Other');
}

function parseRouteLocation(value: string) {
  const [originRaw, destinationRaw] = String(value || '').split(/\s*(?:->| to )\s*/i);
  const origin = originRaw?.trim() || '';
  const destination = destinationRaw?.trim() || origin;
  return { origin, destination };
}

function inferAssetName(line: string, actionType: string): string {
  const text = line.replace(new RegExp(actionType, 'i'), '').replace(/\bat\b.*$/i, '').trim();
  return text || '';
}

function routeStepMatchesEquipment(equipment: EquipmentRecord, load: Pick<LoadRecord, 'truck' | 'truckId' | 'trailer' | 'trailerId'>, step: FreightRouteStepRecord): boolean {
  const candidates = [
    step.equipmentName,
    step.trailerName,
    step.truckName,
    load.trailer,
    load.trailerId,
    load.truck,
    load.truckId,
  ];
  const equipmentValues = [
    equipment.id,
    equipment.assetId,
    equipment.name,
    equipment.title,
    equipment.asset,
    equipment.model,
  ];
  return equipmentValues.some((value) => candidates.some((candidate) => normalizedEquals(value, candidate)));
}

function normalizedEquals(left: unknown, right: unknown): boolean {
  const normalize = (value: unknown) => String(value || '').trim().toLowerCase();
  return Boolean(normalize(left) && normalize(left) === normalize(right));
}

function titleCase(value: string): string {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ') || 'Other';
}

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}
