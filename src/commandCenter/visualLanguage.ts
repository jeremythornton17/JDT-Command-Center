export type OperatingCategory =
  | 'crew'
  | 'equipment'
  | 'freight'
  | 'nursery'
  | 'relocation'
  | 'alert'
  | 'client'
  | 'document'
  | 'schedule'
  | 'general';

export const operatingCategoryLabels: Record<OperatingCategory, string> = {
  crew: 'Crew',
  equipment: 'Equipment',
  freight: 'Freight',
  nursery: 'Nursery',
  relocation: 'Relocation',
  alert: 'Attention',
  client: 'Client',
  document: 'Document',
  schedule: 'Schedule',
  general: 'Operations',
};

const navCategoryMap: Record<string, OperatingCategory> = {
  crews: 'crew',
  crewView: 'crew',
  equipment: 'equipment',
  freight: 'freight',
  inventory: 'nursery',
  nursery: 'nursery',
  tracker: 'relocation',
  maps: 'relocation',
  alerts: 'alert',
  clients: 'client',
  documents: 'document',
  calendar: 'schedule',
};

const recordTypeCategoryMap: Record<string, OperatingCategory> = {
  employee: 'crew',
  crew: 'crew',
  crews: 'crew',
  fieldUpdate: 'crew',
  equipment: 'equipment',
  freight: 'freight',
  load: 'freight',
  loads: 'freight',
  tree: 'nursery',
  ranchOak: 'nursery',
  inventory: 'nursery',
  nursery: 'nursery',
  job: 'relocation',
  project: 'relocation',
  relocation: 'relocation',
  tracker: 'relocation',
  map: 'relocation',
  alert: 'alert',
  issue: 'alert',
  client: 'client',
  document: 'document',
  schedule: 'schedule',
  calendar: 'schedule',
};

const workItemToneCategoryMap: Record<string, OperatingCategory> = {
  relocation: 'relocation',
  freight: 'freight',
  task: 'crew',
  equipment: 'equipment',
};

export function operatingCategoryForNavId(navId: string): OperatingCategory {
  return navCategoryMap[navId] || 'general';
}

export function operatingCategoryForRecordType(recordType: string): OperatingCategory {
  return recordTypeCategoryMap[recordType] || 'general';
}

export function categoryForWorkItemTone(tone: string): OperatingCategory {
  return workItemToneCategoryMap[tone] || 'general';
}

export function categoryLabel(category: OperatingCategory): string {
  return operatingCategoryLabels[category];
}

export function categoryPillClass(category: OperatingCategory): string {
  if (category === 'alert') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-jdt-border bg-white text-jdt-primary';
}
