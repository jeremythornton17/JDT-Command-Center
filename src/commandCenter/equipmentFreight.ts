import type { EquipmentRecord, WorkOrderRecord } from './records';

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
  '550',
  '350',
  '150',
  '4500',
  '3500',
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

export const equipmentStatusOptions = ['Available', 'Assigned', 'In Use', 'Maintenance', 'Inspection', 'Needs Service', 'Down', 'Retired'];
export const equipmentLocationTypeOptions = ['Farm', 'Job Site', 'Shop', 'In Transit', 'Unknown'];
export const freightStatusOptions = ['Scheduled', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'At Delivery', 'Delivered', 'Completed', 'Delayed', 'Cancelled'];

export const jdtHomeBase = {
  name: 'JD Thornton Nurseries Home Base',
  address: '1010 E Sugarland Hwy, Clewiston, FL 33440',
  locationType: 'Farm',
  coordinates: {
    lat: 26.7544,
    lng: -80.9182,
  },
} as const;

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
  const signals = [
    equipment.category,
    equipment.eqType,
    equipment.type,
    equipment.truckType,
    equipment.trailerType,
    equipment.implementType,
    equipment.name,
  ].map((value) => String(value || '').toLowerCase());
  if (signals.some((value) => value.includes('trailer') || trailerTypeOptions.some((option) => value === option.toLowerCase()))) return 'Trailer';
  if (signals.some((value) => value.includes('truck') || truckTypeOptions.some((option) => value === option.toLowerCase()))) return 'Truck';
  if (signals.some((value) => value.includes('implement') || implementTypeOptions.some((option) => value === option.toLowerCase()))) return 'Implement';
  return equipment.category || 'Machine';
}

export function isFreightVehicle(equipment: EquipmentRecord): boolean {
  const category = equipmentCategory(equipment);
  return category === 'Truck' || category === 'Trailer' || Boolean(equipment.truckType || equipment.trailerType);
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
