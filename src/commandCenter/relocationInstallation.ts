export const relocationInstallationDivisionLabel = 'Relocation & Installation';

export const relocationInstallationJobTypes = [
  'Relocation Job',
  'Installation Job',
  'Mixed Job',
] as const;

export const relocationInstallationJobFilters = [
  'All',
  ...relocationInstallationJobTypes,
] as const;

export type RelocationInstallationJobType = typeof relocationInstallationJobTypes[number];
export type RelocationInstallationJobFilter = typeof relocationInstallationJobFilters[number];

type JobLike = {
  division?: unknown;
  jobType?: unknown;
  projectType?: unknown;
  workType?: unknown;
  category?: unknown;
  workTypes?: unknown;
  workCategories?: unknown;
  title?: unknown;
  name?: unknown;
  client?: unknown;
  notes?: unknown;
  installItemCount?: unknown;
  installationItemCount?: unknown;
  relocationTreeCount?: unknown;
  hasInstallWork?: unknown;
  hasInstallationWork?: unknown;
  hasRelocationWork?: unknown;
};

export function classifyRelocationInstallationJob(job: JobLike): RelocationInstallationJobType {
  const explicitType = detectTypeFromValues(job.jobType, job.projectType, job.workType, job.category);
  if (explicitType) return explicitType;

  const signals = [
    job.division,
    job.title,
    job.name,
    job.notes,
    ...arrayValues(job.workTypes),
    ...arrayValues(job.workCategories),
  ].map(cleanText);

  const hasInstall = Boolean(job.hasInstallWork || job.hasInstallationWork)
    || numericValue(job.installItemCount) > 0
    || numericValue(job.installationItemCount) > 0
    || signals.some(isInstallSignal);

  const hasRelocation = Boolean(job.hasRelocationWork)
    || numericValue(job.relocationTreeCount) > 0
    || signals.some(isRelocationSignal);

  if (hasInstall && hasRelocation) return 'Mixed Job';
  if (hasInstall) return 'Installation Job';
  return 'Relocation Job';
}

export function isRelocationInstallationJob(job: JobLike): boolean {
  if (detectTypeFromValues(job.jobType, job.projectType, job.workType, job.category)) return true;
  if (Boolean(job.hasInstallWork || job.hasInstallationWork || job.hasRelocationWork)) return true;
  if (numericValue(job.installItemCount) > 0 || numericValue(job.installationItemCount) > 0 || numericValue(job.relocationTreeCount) > 0) return true;

  const division = cleanText(job.division);
  if (division) return isRelocationInstallationDivisionSignal(division);

  return [job.title, job.name, job.notes].map(cleanText).some((value) => isInstallSignal(value) || isRelocationSignal(value));
}

export function relocationInstallationJobTypeTone(type: RelocationInstallationJobType): string {
  if (type === 'Installation Job') return 'bg-lime-100 text-lime-900 border-lime-200';
  if (type === 'Mixed Job') return 'bg-amber-100 text-amber-950 border-amber-200';
  return 'bg-emerald-100 text-emerald-900 border-emerald-200';
}

function detectTypeFromValues(...values: unknown[]): RelocationInstallationJobType | '' {
  const joined = values.flatMap(arrayValues).map(cleanText).join(' ');
  if (joined.includes('mixed')) return 'Mixed Job';
  const hasInstall = isInstallSignal(joined);
  const hasRelocation = isRelocationSignal(joined);

  if (hasInstall && hasRelocation) return 'Mixed Job';
  if (hasInstall) return 'Installation Job';
  if (hasRelocation) return 'Relocation Job';
  return '';
}

function arrayValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [value];
}

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim().toLowerCase();
}

function numericValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRelocationInstallationDivisionSignal(value: string): boolean {
  return value === relocationInstallationDivisionLabel.toLowerCase()
    || value.includes('relocation')
    || value.includes('installation')
    || value.includes('install')
    || value.includes('nursery');
}

function isInstallSignal(value: string): boolean {
  return value.includes('installation')
    || value.includes('install')
    || value.includes('planting')
    || value.includes('planted')
    || value.includes('hole');
}

function isRelocationSignal(value: string): boolean {
  return value.includes('relocation')
    || value.includes('relocated')
    || value.includes('move')
    || value.includes('root prune')
    || value.includes('root-prune');
}
