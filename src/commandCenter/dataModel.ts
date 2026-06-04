export type AppRole =
  | 'owner_admin'
  | 'operations_coordinator'
  | 'office_admin'
  | 'field_user'
  | 'contact_only'
  | 'unauthorized';

export type AppPermissions = {
  canRead: boolean;
  canWrite: boolean;
  canImport: boolean;
  canDelete: boolean;
  canReset: boolean;
  canManageSources: boolean;
  canManageUsers: boolean;
  canSubmitFieldUpdates: boolean;
};

type AppCollectionDefinition = {
  label: string;
  primaryBoard: string;
  importable?: boolean;
  resetGroup: string;
};

export const appCollections = {
  jobs: { label: 'Projects', primaryBoard: 'Command Board', resetGroup: 'projects' },
  projects: { label: 'Projects', primaryBoard: 'Clients', resetGroup: 'projects' },
  workOrders: { label: 'Work Orders', primaryBoard: 'Command Board', importable: true, resetGroup: 'projects' },
  projectMaterialItems: { label: 'Project Material Items', primaryBoard: 'Nursery', importable: true, resetGroup: 'projects' },
  loads: { label: 'Freight', primaryBoard: 'Freight', resetGroup: 'freight' },
  ranchOaks: { label: 'Tree Records', primaryBoard: 'Nursery', resetGroup: 'trees' },
  inventoryItems: { label: 'Inventory Items', primaryBoard: 'Nursery', importable: true, resetGroup: 'trees' },
  treeRelocationRecords: { label: 'Relocation Trees', primaryBoard: 'Maps', importable: true, resetGroup: 'trees' },
  equipment: { label: 'Equipment', primaryBoard: 'Equipment', importable: true, resetGroup: 'equipment' },
  fieldUpdates: { label: 'Crew Field Updates', primaryBoard: 'Crew View', resetGroup: 'field_updates' },
  crews: { label: 'Crews', primaryBoard: 'Crews', resetGroup: 'people' },
  staff: { label: 'Staff Directory', primaryBoard: 'Crews', importable: true, resetGroup: 'people' },
  clients: { label: 'Clients', primaryBoard: 'Clients', importable: true, resetGroup: 'clients' },
  locations: { label: 'Locations', primaryBoard: 'Clients', importable: true, resetGroup: 'reference' },
  species: { label: 'Species', primaryBoard: 'Nursery', importable: true, resetGroup: 'reference' },
  scheduleTasks: { label: 'Schedule Tasks', primaryBoard: 'Calendar', importable: true, resetGroup: 'schedule' },
  alerts: { label: 'Alerts', primaryBoard: 'Alerts', resetGroup: 'alerts' },
  documents: { label: 'Documents', primaryBoard: 'Documents', importable: true, resetGroup: 'documents' },
  syncSources: { label: 'Sync Sources', primaryBoard: 'Data Sync', resetGroup: 'sources' },
  syncMappings: { label: 'Sync Mappings', primaryBoard: 'Data Sync', resetGroup: 'sources' },
  importBatches: { label: 'Import Batches', primaryBoard: 'Data Sync', resetGroup: 'sources' },
} as const satisfies Record<string, AppCollectionDefinition>;

export type AppCollectionName = keyof typeof appCollections;

const knownEmailRoles: Record<string, AppRole> = {
  'jeremy@jdtnurseries.com': 'owner_admin',
  'buck@jdtnurseries.com': 'owner_admin',
  'jennifer@jdtnurseries.com': 'operations_coordinator',
  'regina@jdtnurseries.com': 'office_admin',
  'max@jdtnurseries.com': 'operations_coordinator',
};

const permissionMatrix: Record<AppRole, AppPermissions> = {
  owner_admin: {
    canRead: true,
    canWrite: true,
    canImport: true,
    canDelete: true,
    canReset: true,
    canManageSources: true,
    canManageUsers: true,
    canSubmitFieldUpdates: true,
  },
  operations_coordinator: {
    canRead: true,
    canWrite: true,
    canImport: true,
    canDelete: false,
    canReset: false,
    canManageSources: true,
    canManageUsers: false,
    canSubmitFieldUpdates: true,
  },
  office_admin: {
    canRead: true,
    canWrite: true,
    canImport: true,
    canDelete: false,
    canReset: false,
    canManageSources: true,
    canManageUsers: false,
    canSubmitFieldUpdates: true,
  },
  field_user: {
    canRead: true,
    canWrite: false,
    canImport: false,
    canDelete: false,
    canReset: false,
    canManageSources: false,
    canManageUsers: false,
    canSubmitFieldUpdates: true,
  },
  contact_only: {
    canRead: true,
    canWrite: false,
    canImport: false,
    canDelete: false,
    canReset: false,
    canManageSources: false,
    canManageUsers: false,
    canSubmitFieldUpdates: false,
  },
  unauthorized: {
    canRead: false,
    canWrite: false,
    canImport: false,
    canDelete: false,
    canReset: false,
    canManageSources: false,
    canManageUsers: false,
    canSubmitFieldUpdates: false,
  },
};

const clearGroups: Record<string, AppCollectionName[]> = {
  projects: ['projects', 'jobs', 'workOrders', 'projectMaterialItems'],
  jobs: ['projects', 'jobs', 'workOrders', 'projectMaterialItems'],
  work_orders: ['workOrders'],
  assignments: ['workOrders'],
  project_material_items: ['projectMaterialItems'],
  materials: ['projectMaterialItems'],
  freight: ['loads'],
  loads: ['loads'],
  trees: ['ranchOaks', 'inventoryItems', 'treeRelocationRecords'],
  ranch_oaks: ['ranchOaks', 'inventoryItems', 'treeRelocationRecords'],
  inventory: ['inventoryItems'],
  inventory_items: ['inventoryItems'],
  equipment: ['equipment'],
  field_updates: ['fieldUpdates'],
  fieldUpdates: ['fieldUpdates'],
  crews: ['crews', 'staff'],
  employees: ['crews', 'staff'],
  people: ['crews', 'staff'],
  clients: ['clients'],
  locations: ['locations'],
  species: ['species'],
  reference: ['locations', 'species'],
  schedule: ['scheduleTasks'],
  schedule_tasks: ['scheduleTasks'],
  relocation_records: ['treeRelocationRecords'],
  alerts: ['alerts'],
  documents: ['documents'],
  sources: ['syncSources', 'syncMappings', 'importBatches'],
  sync: ['syncSources', 'syncMappings', 'importBatches'],
};

export function normalizeEmail(email: string | null | undefined) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function roleForEmail(email: string | null | undefined): AppRole {
  const normalized = normalizeEmail(email);
  if (!normalized) return 'unauthorized';
  if (knownEmailRoles[normalized]) return knownEmailRoles[normalized];
  if (normalized.endsWith('@jdtnurseries.com')) return 'field_user';
  return 'unauthorized';
}

export function permissionsForRole(role: AppRole): AppPermissions {
  return permissionMatrix[role];
}

export function permissionsForEmail(email: string | null | undefined): AppPermissions {
  return permissionsForRole(roleForEmail(email));
}

export function collectionNamesForClear(clearType: string): AppCollectionName[] {
  const normalized = clearType.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'everything') {
    return Object.keys(appCollections) as AppCollectionName[];
  }
  return clearGroups[normalized] || [];
}

export function importableCollectionNames(): AppCollectionName[] {
  return (Object.keys(appCollections) as AppCollectionName[]).filter((name) => {
    const collection = appCollections[name] as AppCollectionDefinition;
    return collection.importable === true;
  });
}
