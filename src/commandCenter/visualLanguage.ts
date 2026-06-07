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

type CategoryVisualTone = {
  pillClass: string;
  surfaceClass: string;
  accentBorderClass: string;
  headerClass: string;
  dotClass: string;
};

const categoryVisualTones: Record<OperatingCategory, CategoryVisualTone> = {
  crew: {
    pillClass: 'border-[#A7BC86] bg-[#F1F6EA] text-[#384521]',
    surfaceClass: 'border-[#A7BC86] bg-[#F7FAF2] text-[#384521]',
    accentBorderClass: 'border-l-[#82995D]',
    headerClass: 'bg-[#6F7D4D] text-white',
    dotClass: 'bg-[#82995D]',
  },
  equipment: {
    pillClass: 'border-[#C68B64] bg-[#F8EDE5] text-[#7A331F]',
    surfaceClass: 'border-[#C68B64] bg-[#FBF1E7] text-[#7A331F]',
    accentBorderClass: 'border-l-[#935231]',
    headerClass: 'bg-[#935231] text-white',
    dotClass: 'bg-[#935231]',
  },
  freight: {
    pillClass: 'border-[#8DB4BD] bg-[#EEF6F7] text-[#24515D]',
    surfaceClass: 'border-[#8DB4BD] bg-[#F2F7F8] text-[#24515D]',
    accentBorderClass: 'border-l-[#345B6B]',
    headerClass: 'bg-[#345B6B] text-white',
    dotClass: 'bg-[#345B6B]',
  },
  nursery: {
    pillClass: 'border-[#8FAC72] bg-[#EDF5E8] text-[#2F4A23]',
    surfaceClass: 'border-[#8FAC72] bg-[#F2F7EE] text-[#2F4A23]',
    accentBorderClass: 'border-l-[#5F7D3A]',
    headerClass: 'bg-[#5F7D3A] text-white',
    dotClass: 'bg-[#5F7D3A]',
  },
  relocation: {
    pillClass: 'border-[#6F7D4D] bg-[#F3F6EC] text-[#243D28]',
    surfaceClass: 'border-[#6F7D4D] bg-[#F7F9F1] text-[#243D28]',
    accentBorderClass: 'border-l-[#384521]',
    headerClass: 'bg-[#384521] text-white',
    dotClass: 'bg-[#384521]',
  },
  alert: {
    pillClass: 'border-[#D9B85E] bg-[#FFF8DD] text-[#725B11]',
    surfaceClass: 'border-[#D9B85E] bg-[#FFF8DD] text-[#725B11]',
    accentBorderClass: 'border-l-[#B98138]',
    headerClass: 'bg-[#B98138] text-white',
    dotClass: 'bg-[#B98138]',
  },
  client: {
    pillClass: 'border-[#B89563] bg-[#FBF2E3] text-[#6B4A1C]',
    surfaceClass: 'border-[#B89563] bg-[#FBF2E3] text-[#6B4A1C]',
    accentBorderClass: 'border-l-[#B89563]',
    headerClass: 'bg-[#7A5A2B] text-white',
    dotClass: 'bg-[#B89563]',
  },
  document: {
    pillClass: 'border-[#B7AA94] bg-[#F7F3EA] text-[#5B5040]',
    surfaceClass: 'border-[#B7AA94] bg-[#F7F3EA] text-[#5B5040]',
    accentBorderClass: 'border-l-[#B7AA94]',
    headerClass: 'bg-[#5B5040] text-white',
    dotClass: 'bg-[#B7AA94]',
  },
  schedule: {
    pillClass: 'border-[#9CA58D] bg-[#F5F4EF] text-[#3E463E]',
    surfaceClass: 'border-[#9CA58D] bg-[#F5F4EF] text-[#3E463E]',
    accentBorderClass: 'border-l-[#6F7D4D]',
    headerClass: 'bg-[#6F7D4D] text-white',
    dotClass: 'bg-[#6F7D4D]',
  },
  general: {
    pillClass: 'border-jdt-border bg-white text-jdt-primary',
    surfaceClass: 'border-jdt-border bg-white text-jdt-text',
    accentBorderClass: 'border-l-jdt-border',
    headerClass: 'bg-jdt-primary text-white',
    dotClass: 'bg-jdt-olive',
  },
};

export function categoryPillClass(category: OperatingCategory): string {
  return categoryVisualTones[category]?.pillClass || categoryVisualTones.general.pillClass;
}

export function categorySurfaceClass(category: OperatingCategory): string {
  return categoryVisualTones[category]?.surfaceClass || categoryVisualTones.general.surfaceClass;
}

export function categoryAccentBorderClass(category: OperatingCategory): string {
  return categoryVisualTones[category]?.accentBorderClass || categoryVisualTones.general.accentBorderClass;
}

export function categoryHeaderClass(category: OperatingCategory): string {
  return categoryVisualTones[category]?.headerClass || categoryVisualTones.general.headerClass;
}

export function categoryDotClass(category: OperatingCategory): string {
  return categoryVisualTones[category]?.dotClass || categoryVisualTones.general.dotClass;
}

type StoplightTone = 'danger' | 'caution' | 'active' | 'ready' | 'neutral';

const statusToneClasses: Record<StoplightTone, { pillClass: string; surfaceClass: string; dotClass: string }> = {
  danger: {
    pillClass: 'border-[#DCAEA0] bg-[#F8E3DC] text-[#7A331F]',
    surfaceClass: 'border-[#DCAEA0] bg-[#F8E3DC] text-[#7A331F]',
    dotClass: 'bg-[#A6402D]',
  },
  caution: {
    pillClass: 'border-[#D9B85E] bg-[#FFF8DD] text-[#725B11]',
    surfaceClass: 'border-[#D9B85E] bg-[#FFF8DD] text-[#725B11]',
    dotClass: 'bg-[#D9B85E]',
  },
  active: {
    pillClass: 'border-[#D5AA6E] bg-[#F7E9D6] text-[#7A4A12]',
    surfaceClass: 'border-[#D5AA6E] bg-[#F7E9D6] text-[#7A4A12]',
    dotClass: 'bg-[#B98138]',
  },
  ready: {
    pillClass: 'border-[#8FAC72] bg-[#DDEBD2] text-[#2F4A23]',
    surfaceClass: 'border-[#8FAC72] bg-[#DDEBD2] text-[#2F4A23]',
    dotClass: 'bg-[#2F7D4A]',
  },
  neutral: {
    pillClass: 'border-jdt-border bg-jdt-panel text-jdt-text',
    surfaceClass: 'border-jdt-border bg-jdt-panel text-jdt-text',
    dotClass: 'bg-zinc-400',
  },
};

function textIncludes(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function statusToneName(status: unknown): StoplightTone {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'neutral';

  if (textIncludes(normalized, ['critical', 'high', 'urgent', 'down', 'blocked', 'overdue', 'delayed', 'failed', 'error', 'not started'])) return 'danger';
  if (textIncludes(normalized, ['needs', 'needed', 'missing', 'warning', 'watch', 'waiting', 'scheduled', 'draft', 'pending', 'hold', 'invoiced', 'maintenance', 'inspection', 'service'])) return 'caution';
  if (textIncludes(normalized, ['progress', 'active', 'assigned', 'in use', 'dispatched', 'transit', 'pickup', 'loaded', 'started', 'at delivery', 'at pickup', 'nutrient care'])) return 'active';
  if (textIncludes(normalized, ['complete', 'delivered', 'ready', 'relocated', 'paid', 'available', 'good'])) return 'ready';
  if (textIncludes(normalized, ['closed', 'archived', 'inactive', 'cancelled', 'canceled', 'skipped'])) return 'neutral';

  return 'neutral';
}

export function statusPillClass(status: unknown): string {
  return statusToneClasses[statusToneName(status)].pillClass;
}

export function statusSurfaceClass(status: unknown): string {
  return statusToneClasses[statusToneName(status)].surfaceClass;
}

export function statusDotClass(status: unknown): string {
  return statusToneClasses[statusToneName(status)].dotClass;
}

export function riskPillClass(level: unknown): string {
  const normalized = String(level || '').trim().toLowerCase();
  if (textIncludes(normalized, ['critical', 'high', 'bad', 'urgent', 'blocked'])) return statusToneClasses.danger.pillClass;
  if (textIncludes(normalized, ['watch', 'warning', 'warn', 'medium', 'caution', 'needs'])) return statusToneClasses.caution.pillClass;
  if (textIncludes(normalized, ['low', 'ready', 'good', 'clear'])) return statusToneClasses.ready.pillClass;
  return statusToneClasses.neutral.pillClass;
}

export function riskSurfaceClass(level: unknown): string {
  const normalized = String(level || '').trim().toLowerCase();
  if (textIncludes(normalized, ['critical', 'high', 'bad', 'urgent', 'blocked'])) return statusToneClasses.danger.surfaceClass;
  if (textIncludes(normalized, ['watch', 'warning', 'warn', 'medium', 'caution', 'needs'])) return statusToneClasses.caution.surfaceClass;
  if (textIncludes(normalized, ['low', 'ready', 'good', 'clear'])) return statusToneClasses.ready.surfaceClass;
  return statusToneClasses.neutral.surfaceClass;
}

export function relocationInstallationJobTypePillClass(type: unknown): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('install') && normalized.includes('relocation')) return 'border-[#B89563] bg-[#F7F1E3] text-[#4A3A1A]';
  if (normalized.includes('mixed')) return 'border-[#B89563] bg-[#F7F1E3] text-[#4A3A1A]';
  if (normalized.includes('install')) return 'border-[#D5AA6E] bg-[#FBF1E7] text-[#7A4A12]';
  return categoryPillClass('relocation');
}

export function relocationInstallationJobTypeAccentClass(type: unknown): string {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('install') && normalized.includes('relocation')) return 'border-l-[#B89563]';
  if (normalized.includes('mixed')) return 'border-l-[#B89563]';
  if (normalized.includes('install')) return 'border-l-[#B98138]';
  return categoryAccentBorderClass('relocation');
}
