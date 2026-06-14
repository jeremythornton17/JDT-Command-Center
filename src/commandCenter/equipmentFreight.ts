import type { EquipmentRecord, LocationRecord, WorkOrderRecord } from './records';

export const equipmentCategoryOptions = ['Machine', 'Truck', 'Trailer', 'Implement', 'Tool', 'Support'];

export const equipmentTypeOptions = [
  'Loader',
  'Track',
  'Front',
  'Excavator',
  'Telehandler',
  'Truck',
  'Trailer',
  'Skid Steer',
  'Tractor',
  'Water Truck',
  'Implement',
  'Tool',
  'Other',
];

export const truckTypeOptions = [
  'Semi',
  '2500',
  '550',
  '350',
  '150',
  '4500',
  '3500',
  'Pickup',
  'Van',
  'Other',
];

export const trailerTypeOptions = [
  'black ramp',
  'drop deck',
  'yellow lowboy',
  'black lowboy',
  'gooseneck',
  'yellow tagalong',
  'black tagalong',
  'yard',
  'yard w/ ramp',
  'Other',
];

export const trailerMaintenanceCategoryOptions = [
  'Trailer Tires',
  'Brake Lines / Hoses',
  'Electrical Lines / Light Wiring',
  'Wood Deck Repair',
  'Brake Adjustment / Repair',
  'Kingpin',
  'Ball Hitch Receiver',
  'Pintle Hitch Receiver',
  'Safety Chains',
  'Landing Gear',
  'Suspension',
  'Other',
];

export const implementTypeOptions = [
  'Boom',
  'Bucket',
  'Cutter Blade',
  'Plate',
  'Snout',
  'Forks',
  'Man Basket',
  'Other',
];

export const toolTypeOptions = [
  'Chainsaw',
  'Hand Tool',
  'Power Tool',
  'Pump',
  'Sprayer',
  'Hose / Watering Tool',
  'Measuring / Layout Tool',
  'Other',
];

export const supportTypeOptions = [
  'Fuel / Water Support',
  'Parts / Service Support',
  'Safety Support',
  'Office / Field Support',
  'Storage / Staging',
  'Other',
];

export const equipmentStatusOptions = ['Available', 'Assigned', 'In Use', 'Maintenance', 'Inspection', 'Needs Service', 'Down', 'Retired'];
export const equipmentLocationTypeOptions = ['Farm', 'Job Site', 'Shop', 'In Transit', 'Unknown'];
export const freightStatusOptions = ['Scheduled', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'At Delivery', 'Delivered', 'Completed', 'Delayed', 'Cancelled'];
export const revealTrackingStatusOptions = ['Not Tracked', 'Requested', 'Tracker Installed', 'Synced', 'Needs Review'];

export const jdtHomeBase = {
  name: 'JD Thornton Nurseries Home Base',
  address: '1010 E Sugarland Hwy, Clewiston, FL 33440',
  locationType: 'Farm',
  coordinates: {
    lat: 26.7539482,
    lng: -80.9166488,
  },
} as const;

export const defaultJdtFarmLocations: LocationRecord[] = [
  {
    id: 'location-jdt-farm-main-office',
    name: 'Main Office',
    title: 'Main Office',
    locationType: 'Farm',
    locationId: 'main-office',
    accessType: 'Farm',
    mainAddress: '1010 E Sugarland Hwy, Clewiston, FL 33440',
    sourceText: '1010 E Sugarland Hwy, Clewiston, FL 33440',
    googleMapsUrl: 'https://www.google.com/maps/@26.7539482,-80.9166488,19z',
    latitude: 26.7539482,
    longitude: -80.9166488,
    coordinateText: '26.753948, -80.916649',
    divisionUse: ['Relocation & Installation', 'Crew', 'Freight', 'Equipment', 'Nursery'],
    status: 'Available',
    notes: 'Imported from Jeremy Thornton Google Maps list: JD Thornton Nurseries.',
    sourceSheet: 'Google Maps: JD Thornton Nurseries',
  },
  {
    id: 'location-jdt-farm-25-acre',
    name: '25 Acre',
    title: '25 Acre',
    locationType: 'Farm',
    locationId: '25-acre',
    accessType: 'Farm',
    mainAddress: '3040 US-27, Clewiston, FL 33440',
    sourceText: '3040 US-27, Clewiston, FL 33440',
    googleMapsUrl: 'https://www.google.com/maps/@26.755196,-80.983372,19z',
    latitude: 26.755196,
    longitude: -80.983372,
    coordinateText: '26.755196, -80.983372',
    divisionUse: ['Relocation & Installation', 'Crew', 'Freight', 'Equipment', 'Nursery'],
    status: 'Available',
    notes: 'Imported from Jeremy Thornton Google Maps list: JD Thornton Nurseries.',
    sourceSheet: 'Google Maps: JD Thornton Nurseries',
  },
  {
    id: 'location-jdt-farm-10-acre',
    name: '10 Acre',
    title: '10 Acre',
    locationType: 'Farm',
    locationId: '10-acre',
    accessType: 'Farm',
    mainAddress: '1866 Baker Hwy, Moore Haven, FL 33471',
    sourceText: '1866 Baker Hwy, Moore Haven, FL 33471',
    googleMapsUrl: 'https://www.google.com/maps/@26.8170514,-81.0927008,19z',
    latitude: 26.8170514,
    longitude: -81.0927008,
    coordinateText: '26.817051, -81.092701',
    divisionUse: ['Relocation & Installation', 'Crew', 'Freight', 'Equipment', 'Nursery'],
    status: 'Available',
    notes: 'Imported from Jeremy Thornton Google Maps list: JD Thornton Nurseries.',
    sourceSheet: 'Google Maps: JD Thornton Nurseries',
  },
  {
    id: 'location-jdt-farm-40-acre',
    name: '40 Acre',
    title: '40 Acre',
    locationType: 'Farm',
    locationId: '40-acre',
    accessType: 'Farm',
    mainAddress: '26.757913, -81.037562',
    sourceText: '26.757913, -81.037562',
    googleMapsUrl: 'https://www.google.com/maps/@26.757913,-81.037562,19z',
    latitude: 26.757913,
    longitude: -81.037562,
    coordinateText: '26.757913, -81.037562',
    divisionUse: ['Relocation & Installation', 'Crew', 'Freight', 'Equipment', 'Nursery'],
    status: 'Available',
    notes: 'Imported from Jeremy Thornton Google Maps list: JD Thornton Nurseries. Coordinate-only farm pin.',
    sourceSheet: 'Google Maps: JD Thornton Nurseries',
  },
];

export function mergeLocationLibrary(defaultLocations: LocationRecord[], savedLocations: LocationRecord[] = []): LocationRecord[] {
  const merged = new Map<string, LocationRecord>();
  [...defaultLocations, ...savedLocations].forEach((location) => {
    const key = String(location.id || location.locationId || location.name || '').trim().toLowerCase();
    if (!key) return;
    merged.set(key, { ...merged.get(key), ...location });
  });
  return [...merged.values()];
}

export function normalizeDelimitedList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueNames(values: unknown[]): string[] {
  const names = values.flatMap(normalizeDelimitedList);
  return Array.from(new Set(names));
}

export function equipmentDisplayName(equipment: EquipmentRecord): string {
  return equipment.name
    || equipment.asset
    || [equipment.make, equipment.model].filter(Boolean).join(' ')
    || equipment.assetId
    || equipment.id
    || 'Equipment';
}

export function equipmentCategory(equipment: EquipmentRecord): string {
  const explicitCategory = String(equipment.category || '').trim();
  const knownCategory = equipmentCategoryOptions.find((option) => option.toLowerCase() === explicitCategory.toLowerCase());
  if (knownCategory) return knownCategory;

  const signals = [
    equipment.category,
    equipment.eqType,
    equipment.type,
    equipment.truckType,
    equipment.trailerType,
    equipment.implementType,
    equipment.toolType,
    equipment.supportType,
    equipment.name,
  ].map((value) => String(value || '').toLowerCase());
  if (signals.some((value) => value.includes('trailer') || trailerTypeOptions.some((option) => value === option.toLowerCase()))) return 'Trailer';
  if (signals.some((value) => value.includes('truck') || truckTypeOptions.some((option) => value === option.toLowerCase()))) return 'Truck';
  if (signals.some((value) => value.includes('implement') || implementTypeOptions.some((option) => value === option.toLowerCase()))) return 'Implement';
  if (signals.some((value) => value.includes('tool') || toolTypeOptions.some((option) => value === option.toLowerCase()))) return 'Tool';
  if (signals.some((value) => value.includes('support') || supportTypeOptions.some((option) => value === option.toLowerCase()))) return 'Support';
  return equipment.category || 'Machine';
}

export function isFreightVehicle(equipment: EquipmentRecord): boolean {
  const category = equipmentCategory(equipment);
  return category === 'Truck' || category === 'Trailer';
}

export function revealTableIdForEquipment(equipment: EquipmentRecord): string {
  const explicitTable = String(equipment.revealTableId || '').trim();
  if (explicitTable) return explicitTable;

  const category = equipmentCategory(equipment);
  if (category === 'Trailer' || category === 'Implement' || category === 'Tool' || category === 'Support') return 'NonPoweredAsset-1.0';
  return 'Unit-1.0';
}

export function revealAssetTypeForEquipment(equipment: EquipmentRecord): string {
  const explicitType = String(equipment.revealAssetType || '').trim();
  if (explicitType) return explicitType;
  return revealTableIdForEquipment(equipment) === 'NonPoweredAsset-1.0' ? 'NonPoweredAsset' : 'Unit';
}

export function revealTrackingStatusForEquipment(equipment: EquipmentRecord): string {
  const hasRevealIdentity = Boolean(
    equipment.revealVehicleId
    || equipment.verizonVehicleId
    || equipment.revealUnitId
    || equipment.revealAssetId
    || equipment.revealSyncedAt
    || equipment.telematicsProvider === 'Reveal'
    || equipment.lastTelematicsLatitude
    || equipment.lastTelematicsLongitude
  );
  if (hasRevealIdentity) return 'Synced';

  const explicitStatus = String(equipment.revealTrackingStatus || '').trim();
  const knownStatus = revealTrackingStatusOptions.find((status) => status.toLowerCase() === explicitStatus.toLowerCase());
  return knownStatus || explicitStatus || 'Not Tracked';
}

function revealReadyDisplayName(equipment: EquipmentRecord): string {
  return equipment.name
    || equipment.asset
    || [equipment.make, equipment.model].filter(Boolean).join(' ')
    || '';
}

function revealProposedTag(equipment: EquipmentRecord): string {
  const tag = revealReadyDisplayName(equipment) || equipmentDisplayName(equipment);
  return String(tag).trim().slice(0, 30) || 'JDT asset';
}

function revealIdentityValue(equipment: EquipmentRecord): string {
  return String(
    equipment.revealUnitId
    || equipment.revealAssetId
    || equipment.revealVehicleId
    || equipment.verizonVehicleId
    || equipment.revealVehicleNumber
    || equipment.vehicleNumber
    || '',
  ).trim();
}

export function revealTrackerReadiness(equipment: EquipmentRecord) {
  const missing: string[] = [];
  const name = revealReadyDisplayName(equipment);
  const location = String(equipment.currentLocationName || equipment.currentLocation || equipment.location || '').trim();
  const trackingStatus = revealTrackingStatusForEquipment(equipment);

  if (!name) missing.push('Equipment name');
  if (!location) missing.push('Current location');

  let action = 'Ready For Tracker Request';
  if (trackingStatus === 'Synced') action = 'Matched To Reveal';
  else if (trackingStatus === 'Tracker Installed') action = 'Tracker Installed';
  else if (trackingStatus === 'Requested') action = 'Tracker Requested';
  else if (missing.length > 0 || trackingStatus === 'Needs Review') action = 'Needs JDT Details';

  return {
    ready: missing.length === 0 && action !== 'Needs JDT Details',
    action,
    missing,
    revealTableId: revealTableIdForEquipment(equipment),
    revealAssetType: revealAssetTypeForEquipment(equipment),
    trackingStatus,
    proposedRevealTag: revealProposedTag(equipment),
    revealIdentity: revealIdentityValue(equipment),
  };
}

export function buildRevealSyncPreviewRows(equipmentList: EquipmentRecord[]) {
  return equipmentList.map((equipment) => {
    const readiness = revealTrackerReadiness(equipment);
    return {
      equipmentId: equipment.id || equipment.assetId || equipmentDisplayName(equipment),
      equipmentName: equipmentDisplayName(equipment),
      category: equipmentCategory(equipment),
      revealTableId: readiness.revealTableId,
      revealAssetType: readiness.revealAssetType,
      trackingStatus: readiness.trackingStatus,
      action: readiness.action,
      ready: readiness.ready,
      missing: readiness.missing,
      proposedRevealTag: readiness.proposedRevealTag,
      revealIdentity: readiness.revealIdentity,
      duplicateProtectionKey: readiness.revealIdentity || equipment.id || equipment.assetId || readiness.proposedRevealTag,
    };
  });
}

export function withHomeBaseEquipmentDefaults<T extends EquipmentRecord>(equipment: T): T & EquipmentRecord {
  const hasKnownLocation = Boolean(
    String(equipment.currentLocationName || '').trim()
    || String(equipment.currentLocation || '').trim()
    || String(equipment.location || '').trim()
  );

  if (hasKnownLocation) return equipment as T & EquipmentRecord;

  return {
    ...equipment,
    currentLocationName: jdtHomeBase.name,
    currentLocation: jdtHomeBase.address,
    currentLocationType: jdtHomeBase.locationType,
  } as T & EquipmentRecord;
}

export function workOrderResourceNames(workOrders: WorkOrderRecord[], key: keyof Pick<WorkOrderRecord, 'equipmentNames' | 'implementNames' | 'loadNames' | 'truckNames' | 'trailerNames'>): string[] {
  return uniqueNames(workOrders.flatMap((workOrder) => workOrder[key] || []));
}
