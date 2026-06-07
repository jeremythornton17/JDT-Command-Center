type NurseryDisplayRecord = {
  id?: unknown;
  treeId?: unknown;
  name?: unknown;
  title?: unknown;
  ranchOakType?: unknown;
  species?: unknown;
  commonName?: unknown;
  treeType?: unknown;
  farm?: unknown;
  fieldLocation?: unknown;
  zone?: unknown;
  row?: unknown;
  position?: unknown;
  quantity?: unknown;
  height?: unknown;
  spread?: unknown;
  rootballSize?: unknown;
  status?: unknown;
  sourceCollection?: unknown;
  collectionName?: unknown;
  inventoryClass?: unknown;
  propagationBatchId?: unknown;
  propagationSource?: unknown;
  propagationStage?: unknown;
  waterNeeds?: unknown;
  nutrientNeeds?: unknown;
  plantHealthStatus?: unknown;
};

const ranchOakTypes = new Set(['single trunk', 'multi trunk', 'split trunk']);
const ranchOakStatuses = ['Available', 'Sold', 'On Hold', 'Dig Queue', 'Harvested'];

export function nurseryInventoryDisplayName(record: NurseryDisplayRecord): string {
  const explicitName = firstReadableValue(record.name, record.title);
  if (explicitName) return explicitName;

  const species = nurseryInventoryType(record);
  const location = [cleanText(record.farm), cleanText(record.zone)].filter(Boolean).join(' ');
  if (species !== 'Tree' && location) return `${species} - ${location}`;
  if (species !== 'Tree') return species;

  return nurseryInventoryCode(record) || 'Untitled inventory';
}

export function nurseryInventoryCardTitle(record: NurseryDisplayRecord): string {
  const type = nurseryInventoryType(record);
  if (type !== 'Tree') return type;

  return nurseryInventoryDisplayName(record);
}

export function nurseryInventoryTableTitle(record: NurseryDisplayRecord): string {
  return nurseryInventoryCardTitle(record);
}

export function nurseryInventoryType(record: NurseryDisplayRecord): string {
  return firstReadableValue(record.ranchOakType, record.species) || 'Tree';
}

export function nurseryInventoryCode(record: NurseryDisplayRecord): string {
  return firstValue(record.treeId, record.id);
}

export function nurseryInventorySearchText(record: NurseryDisplayRecord): string {
  return [
    nurseryInventoryDisplayName(record),
    nurseryInventoryType(record),
    nurseryInventoryCode(record),
    record.farm,
    record.zone,
    record.quantity,
    record.height,
    record.spread,
    record.rootballSize,
    record.propagationBatchId,
    record.propagationSource,
    record.propagationStage,
    record.waterNeeds,
    record.nutrientNeeds,
    record.plantHealthStatus,
  ].map(cleanText).filter(Boolean).join(' ');
}

export function isRanchOakInventoryRecord(record: NurseryDisplayRecord): boolean {
  const id = cleanText(record.treeId || record.id);
  const type = cleanText(record.ranchOakType || record.treeType).toLowerCase();
  const commonName = cleanText(record.commonName || record.name || record.title).toLowerCase();
  const collection = cleanText(record.sourceCollection || record.collectionName || record.inventoryClass).toLowerCase();

  return collection.includes('ranchoak')
    || collection.includes('ranch_oak')
    || collection.includes('ranch oak')
    || /^ro[-_\s]?\d+/i.test(id)
    || ranchOakTypes.has(type)
    || commonName.includes('ranch oak');
}

export function isPropagationInventoryRecord(record: NurseryDisplayRecord): boolean {
  const id = cleanText(record.treeId || record.id || record.propagationBatchId);
  const collection = cleanText(record.sourceCollection || record.collectionName || record.inventoryClass).toLowerCase();
  const source = cleanText(record.propagationSource).toLowerCase();
  const stage = cleanText(record.propagationStage).toLowerCase();

  return collection.includes('propagation')
    || /^prop[-_\s]?\d*/i.test(id)
    || Boolean(source)
    || Boolean(stage);
}

export function propagationLocationName(record: NurseryDisplayRecord): string {
  return firstValue(record.fieldLocation, record.farm) || 'Unlocated';
}

export function propagationStageName(record: NurseryDisplayRecord): string {
  return firstValue(record.propagationStage, record.status) || 'Unstaged';
}

export function propagationSourceName(record: NurseryDisplayRecord): string {
  return firstValue(record.propagationSource) || 'Starter Material';
}

export function propagationHealthName(record: NurseryDisplayRecord): string {
  return firstValue(record.plantHealthStatus, record.status) || 'Needs Review';
}

export function ranchOakLocationName(record: NurseryDisplayRecord): string {
  return firstValue(record.fieldLocation, record.farm) || 'Unlocated';
}

export function ranchOakRowPosition(record: NurseryDisplayRecord): string {
  const row = cleanText(record.row);
  const position = cleanText(record.position);
  if (row && position) return `${row} / ${position}`;
  return row || position || '-';
}

export function ranchOakTypeName(record: NurseryDisplayRecord): string {
  return firstReadableValue(record.ranchOakType, record.treeType, record.commonName) || 'Ranch Oak';
}

export function ranchOakStatusCounts(records: NurseryDisplayRecord[]): Array<{ label: string; value: number }> {
  return ranchOakStatuses.map((label) => ({
    label,
    value: records.filter((record) => cleanText(record.status || 'Available') === label).length,
  }));
}

function firstReadableValue(...values: unknown[]): string {
  return values.map(cleanText).find((value) => value.length > 0 && !isGeneratedInventoryId(value)) || '';
}

function firstValue(...values: unknown[]): string {
  return values.map(cleanText).find(Boolean) || '';
}

function cleanText(input: unknown): string {
  return String(input ?? '').replace(/\u00a0/g, ' ').trim();
}

function isGeneratedInventoryId(value: string): boolean {
  return /^inventory-[a-z0-9-]+$/i.test(value);
}
