import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, User, Truck, Tractor, HardHat, Leaf, Clock, History, Edit2, FileText, Upload, Search } from 'lucide-react';
import type { DocumentRecord, FieldUpdateRecord, LoadRecord, ProjectMaterialItemRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import type { ProjectImportContext, SheetImportTemplateId } from '../commandCenter/sheetImport';
import { sameClient, sameProject } from '../commandCenter/relationships';
import { equipmentCategory, equipmentDisplayName } from '../commandCenter/equipmentFreight';
import { defaultRelocationStatus, formatRelocationCost, relocationStatusBadgeClass } from '../commandCenter/treeLifecycle';

type CommandDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  itemId: string | null;
  defaultTab?: string;
  openModal: (type: string, data?: any) => void;
  openDrawer?: (type: string, id: string, defaultTab?: string) => void;
  projectsList?: any[];
  jobsList?: any[];
  loadsList?: any[];
  ranchOaksList?: any[];
  equipmentList?: any[];
  crewsList?: any[];
  clientsList?: any[];
  workOrdersList?: WorkOrderRecord[];
  projectMaterialItemsList?: ProjectMaterialItemRecord[];
  treeRelocationRecordsList?: TreeRelocationRecord[];
  documentsList?: DocumentRecord[];
  fieldUpdatesList?: FieldUpdateRecord[];
  openImportTemplate?: (templateId: SheetImportTemplateId, projectContext?: ProjectImportContext) => void;
};

const drawerConfig: Record<string, { title: string; icon: any; editType: string; collection: keyof CommandDrawerProps }> = {
  job: { title: 'Project', icon: MapPin, editType: 'edit_project', collection: 'jobsList' },
  project: { title: 'Project', icon: MapPin, editType: 'edit_project', collection: 'projectsList' },
  tree: { title: 'Tree', icon: Leaf, editType: 'edit_tree', collection: 'ranchOaksList' },
  freight: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  load: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  equipment: { title: 'Equipment', icon: Tractor, editType: 'equipment', collection: 'equipmentList' },
  employee: { title: 'Employee', icon: HardHat, editType: 'employee', collection: 'crewsList' },
  client: { title: 'Client', icon: User, editType: 'client', collection: 'clientsList' },
  fieldUpdate: { title: 'Field Update', icon: User, editType: 'field_update', collection: 'fieldUpdatesList' },
};

function matchesRecord(record: any, itemId: string | null) {
  if (!record || !itemId) return false;
  const candidates = [record.id, record.title, record.name, record.treeId, record.client, record.email].filter(Boolean).map(String);
  return candidates.includes(itemId);
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export type TreeAssetFilterState = {
  query: string;
  treeType: string;
  status: string;
  priority: string;
  difficulty: string;
};

const emptyTreeAssetFilters: TreeAssetFilterState = {
  query: '',
  treeType: '',
  status: '',
  priority: '',
  difficulty: '',
};

const treeAssetIdCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function recordTitle(record: any, fallback = 'Untitled record'): string {
  return displayValue(record?.title || record?.name || record?.projectName || record?.jobName || record?.loadNumber || record?.relatedTitle || fallback);
}

function cleanFilterValue(value: unknown): string {
  return String(value || '').trim();
}

function normalizeFilterValue(value: unknown): string {
  return cleanFilterValue(value).toLowerCase();
}

function treeAssetIdForSort(tree: TreeRelocationRecord): string {
  return cleanFilterValue(
    tree.treeId
      || tree.treeAssetId
      || tree.treeAssetsId
      || tree.Tree_Asset_ID
      || tree.Tree_Assets_ID
      || tree.id
      || tree.title,
  );
}

function treeAssetType(tree: TreeRelocationRecord): string {
  return cleanFilterValue(tree.type || tree.treeType || tree.species || tree.title);
}

function treeAssetStatus(tree: TreeRelocationRecord): string {
  return cleanFilterValue(tree.treeRelocationStatus || tree.relocationStatus || tree.status || tree.currentStatus);
}

function treeAssetCardTitle(tree: TreeRelocationRecord): string {
  const tag = cleanFilterValue(tree.treeTag || tree.tag || tree.treeId || tree.treeAssetId || tree.id);
  const type = cleanFilterValue(tree.treeType || tree.type || tree.species || tree.title);
  const dbh = cleanFilterValue(tree.dbh);
  return [
    tag ? `Tree #${tag}` : '',
    type,
    dbh ? `${dbh} inch DBH` : '',
  ].filter(Boolean).join(' - ') || 'Project tree';
}

function sortedTreeAssetsByAssetId(trees: TreeRelocationRecord[]): TreeRelocationRecord[] {
  return [...trees].sort((left, right) => (
    treeAssetIdCollator.compare(treeAssetIdForSort(left), treeAssetIdForSort(right))
    || treeAssetIdCollator.compare(treeAssetType(left), treeAssetType(right))
    || treeAssetIdCollator.compare(cleanFilterValue(left.id), cleanFilterValue(right.id))
  ));
}

function uniqueTreeAssetOptions(trees: TreeRelocationRecord[], getValue: (tree: TreeRelocationRecord) => unknown): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const tree of trees) {
    const value = cleanFilterValue(getValue(tree));
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }
  return values.sort((left, right) => treeAssetIdCollator.compare(left, right));
}

function treeMatchesSelectedFilter(value: unknown, filter: string): boolean {
  return !filter || normalizeFilterValue(value) === normalizeFilterValue(filter);
}

function treeAssetSearchText(tree: TreeRelocationRecord): string {
  return [
    treeAssetIdForSort(tree),
    treeAssetType(tree),
    tree.title,
    tree.tag,
    treeAssetStatus(tree),
    tree.condition,
    tree.difficulty,
    tree.priority,
    tree.dbh,
    tree.existingLocationDescription,
    tree.proposedFinalLocationDescription,
    tree.location,
    tree.notes,
  ].map(normalizeFilterValue).join(' ');
}

export function filterTreeAssets(trees: TreeRelocationRecord[], filters: TreeAssetFilterState): TreeRelocationRecord[] {
  const query = normalizeFilterValue(filters.query);
  return sortedTreeAssetsByAssetId(trees).filter((tree) => (
    (!query || treeAssetSearchText(tree).includes(query))
    && treeMatchesSelectedFilter(treeAssetType(tree), filters.treeType)
    && treeMatchesSelectedFilter(treeAssetStatus(tree), filters.status)
    && treeMatchesSelectedFilter(tree.priority, filters.priority)
    && treeMatchesSelectedFilter(tree.difficulty, filters.difficulty)
  ));
}

function sameKnownField(left: unknown, right: unknown): boolean {
  const cleanLeft = String(left || '').trim();
  const cleanRight = String(right || '').trim();
  return Boolean(cleanLeft && cleanRight && cleanLeft === cleanRight);
}

const projectSiteAccessDisplayFields = [
  ['location', 'Main Jobsite Address'],
  ['crewAccessAddress', 'Crew Access Address'],
  ['truckAccessAddress', 'Truck / Equipment Access Address'],
  ['constructionAccessPin', 'Construction / Equipment Access Pin'],
  ['loadUnloadPin', 'Load / Unload Pin'],
  ['secondaryLoadUnloadPin', 'Additional Load / Unload Pin'],
  ['siteAccessNotes', 'Site Access Notes'],
] as const;

const projectSiteAddressOptionKeys = [
  'location',
  'crewAccessAddress',
  'truckAccessAddress',
  'constructionAccessPin',
  'loadUnloadPin',
  'secondaryLoadUnloadPin',
] as const;

function cleanProjectSiteValue(value: unknown): string {
  return String(value || '').trim();
}

function uniqueProjectSiteValues(values: unknown[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const value of values) {
    const clean = cleanProjectSiteValue(value);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    results.push(clean);
  }
  return results;
}

export function projectSiteAddressOptionsForRecord(record: any): string[] {
  return uniqueProjectSiteValues(projectSiteAddressOptionKeys.map((key) => record?.[key]));
}

export function projectSiteMapUrl(value: unknown): string {
  const clean = cleanProjectSiteValue(value);
  if (!clean) return '';
  if (/^https?:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\//i.test(clean)) return clean;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
}

export function projectModalContextForRecord(record: any) {
  if (!record) return { projectSiteAddressOptions: [] };
  const projectId = record.projectId || record.projectsId || record.id;
  return {
    clientId: record.clientId,
    clientName: record.clientName || record.client,
    projectId,
    projectsId: record.projectsId || projectId,
    projectName: record.projectName || record.title,
    jobId: record.jobId || record.id || projectId,
    jobName: record.jobName || record.title,
    division: record.division,
    projectSiteAddressOptions: projectSiteAddressOptionsForRecord(record),
  };
}

function pickSummaryFields(record: any) {
  const preferred = ['status', 'client', 'location', 'currentLocationType', 'currentLocationName', 'date', 'pm', 'crew', 'driver', 'truck', 'trailer', 'origin', 'delivery', 'operator', 'assignedCrewName', 'assignedProjectName', 'hours', 'phone', 'email', 'farm', 'zone', 'dbh', 'height', 'spread'];
  const entries = preferred
    .filter((key) => record && Object.prototype.hasOwnProperty.call(record, key))
    .map((key) => [key, record[key]] as const);

  if (entries.length > 0) return entries;
  return Object.entries(record || {}).filter(([key, value]) => !['id', 'history'].includes(key) && typeof value !== 'object').slice(0, 12) as [string, any][];
}

function workOrdersForRecord(type: string, record: any, workOrders: WorkOrderRecord[]) {
  if (!record) return [];
  if (type === 'employee') {
    const recordId = String(record.id || record.email || record.name || '');
    const recordName = String(record.name || '').toLowerCase();
    return workOrders.filter((workOrder) => (
      (workOrder.assignedCrewIds || []).includes(recordId)
      || (workOrder.assignedCrewNames || []).map((name) => String(name).toLowerCase()).includes(recordName)
    ));
  }

  if (type === 'job' || type === 'project') {
    return workOrders.filter((workOrder) => (
      sameKnownField(workOrder.jobId, record.id)
      || sameKnownField(workOrder.jobId, record.jobId)
      || sameKnownField(workOrder.jobName, record.jobName)
      || sameKnownField(workOrder.projectId, record.projectId)
      || sameProject(record, workOrder)
    ));
  }

  if (type === 'equipment') {
    const recordId = String(record.id || record.assetId || record.asset || record.name || '');
    const recordName = String(record.name || record.asset || '').toLowerCase();
    return workOrders.filter((workOrder) => (
      (workOrder.equipmentIds || []).includes(recordId)
      || (workOrder.equipmentNames || []).map((name) => String(name).toLowerCase()).includes(recordName)
      || (workOrder.implementIds || []).includes(recordId)
      || (workOrder.implementNames || []).map((name) => String(name).toLowerCase()).includes(recordName)
    ));
  }

  if (type === 'freight' || type === 'load') {
    const recordId = String(record.id || record.loadNumber || record.title || '');
    const recordName = String(record.title || record.loadNumber || '').toLowerCase();
    return workOrders.filter((workOrder) => (
      (workOrder.loadIds || []).includes(recordId)
      || (workOrder.loadNames || []).map((name) => String(name).toLowerCase()).includes(recordName)
    ));
  }

  return [];
}

function materialItemsForRecord(type: string, record: any, materialItems: ProjectMaterialItemRecord[]) {
  if (!record || !['job', 'project'].includes(type)) return [];
  return materialItems.filter((item) => (
    sameKnownField(item.projectId, record.projectId)
    || sameKnownField(item.projectsId, record.projectsId)
    || sameKnownField(item.projectName, record.projectName)
    || sameKnownField(item.projectName, record.title)
    || sameProject(record, item)
  ));
}

function loadsForRecord(type: string, record: any, loads: LoadRecord[]) {
  if (!record || !['job', 'project'].includes(type)) return [];
  return loads.filter((load) => (
    sameKnownField(load.jobId, record.id)
    || sameKnownField(load.jobId, record.jobId)
    || sameKnownField(load.projectId, record.projectId)
    || sameKnownField(load.projectName, record.projectName)
    || sameKnownField(load.projectName, record.title)
    || sameProject(record, load)
  ));
}

function treeAssetsForRecord(type: string, record: any, treeAssets: TreeRelocationRecord[]) {
  if (!record || !['job', 'project'].includes(type)) return [];
  return treeAssets.filter((tree) => (
    sameKnownField(tree.projectId, record.projectId)
    || sameKnownField(tree.projectsId, record.projectsId)
    || sameKnownField(tree.projectName, record.projectName)
    || sameKnownField(tree.projectName, record.title)
    || sameKnownField(tree.jobId, record.id)
    || sameKnownField(tree.jobId, record.jobId)
    || sameProject(record, tree)
  ));
}

function fieldUpdatesForRecord(type: string, record: any, fieldUpdates: FieldUpdateRecord[], workOrders: WorkOrderRecord[], loads: LoadRecord[]) {
  if (!record) return [];
  const relatedIds = new Set([
    record.id,
    record.jobId,
    record.projectId,
    ...workOrders.flatMap((workOrder) => [workOrder.id, workOrder.jobId]),
    ...loads.flatMap((load) => [load.id, load.loadNumber]),
  ].filter(Boolean).map(String));

  return fieldUpdates.filter((update) => (
    relatedIds.has(String(update.relatedRecordId || ''))
    || sameKnownField(update.projectId, record.projectId)
    || sameKnownField(update.jobId, record.id)
    || sameKnownField(update.jobId, record.jobId)
    || sameKnownField(update.relatedTitle, record.title)
    || (['job', 'project'].includes(type) && sameProject(record, update))
  ));
}

function documentsForRecord(record: any, documents: DocumentRecord[], treeAssets: TreeRelocationRecord[]) {
  if (!record) return [];
  const treeIds = new Set(treeAssets.flatMap((tree) => [tree.id, tree.treeId]).filter(Boolean).map(String));
  return documents.filter((doc) => (
    sameKnownField(doc.projectId, record.projectId)
    || sameKnownField(doc.projectName, record.projectName)
    || sameKnownField(doc.projectName, record.title)
    || sameKnownField(doc.jobId, record.id)
    || sameKnownField(doc.job, record.title)
    || Boolean(doc.treeId && treeIds.has(String(doc.treeId)))
    || (Array.isArray(doc.treeIds) && doc.treeIds.some((treeId) => treeIds.has(String(treeId))))
    || sameProject(record, doc)
  ));
}

function treeWorkOrdersForRecord(workOrders: WorkOrderRecord[], treeAssets: TreeRelocationRecord[]) {
  const treeIds = new Set(treeAssets.flatMap((tree) => [tree.id, tree.treeId]).filter(Boolean).map(String));
  return workOrders.filter((workOrder) => (
    (Array.isArray(workOrder.treeIds) && workOrder.treeIds.some((treeId) => treeIds.has(String(treeId))))
    || ['tree_pruning', 'tree_relocation_work', 'treatment_aftercare'].includes(String(workOrder.workOrderType || ''))
  ));
}

function idsForTree(tree: TreeRelocationRecord): string[] {
  return [tree.id, tree.treeId, tree.sourceRowId].filter(Boolean).map(String);
}

function workOrdersForTree(workOrders: WorkOrderRecord[], tree: TreeRelocationRecord, type: string) {
  const ids = new Set(idsForTree(tree));
  return workOrders.filter((workOrder) => (
    workOrder.workOrderType === type
    && (
      (workOrder.treeIds || []).some((treeId) => ids.has(String(treeId)))
      || (workOrder.treeNames || []).some((treeName) => ids.has(String(treeName)))
    )
  ));
}

function documentsForTree(documents: DocumentRecord[], tree: TreeRelocationRecord) {
  const ids = new Set(idsForTree(tree));
  return documents.filter((doc) => (
    Boolean(doc.treeId && ids.has(String(doc.treeId)))
    || (Array.isArray(doc.treeIds) && doc.treeIds.some((treeId) => ids.has(String(treeId))))
  ));
}

const treeWorkOrderTypes = new Set(['tree_pruning', 'tree_relocation_work', 'treatment_aftercare']);

type TreeWorkOrderGroupKind = 'rootPruning' | 'relocationWork' | 'nutrientCare';

type TreeWorkOrderGroup = {
  key: string;
  kind: TreeWorkOrderGroupKind;
  title: string;
  projectName: string;
  scheduledDate: string;
  assignedTo: string;
  treeCount: number;
  status: string;
  blockers: string[];
  nextAction: string;
  workOrders: WorkOrderRecord[];
  trees: TreeRelocationRecord[];
  plannedCutPercent?: string;
  actualCutPercent?: string;
  cumulativeCutPercent?: string;
  carePhase?: string;
  treatmentType?: string;
  followUpCount?: number;
  highStressCount?: number;
  moveType?: string;
  holdingAreaName?: string;
  originDestinationSummary?: string;
  equipmentNeeded?: string;
  equipmentNames?: string;
  implementNames?: string;
  loadNames?: string;
};

function isTreeWorkOrder(workOrder: WorkOrderRecord) {
  return treeWorkOrderTypes.has(String(workOrder.workOrderType || ''));
}

function workOrderKind(workOrder: WorkOrderRecord): TreeWorkOrderGroupKind | null {
  if (workOrder.workOrderType === 'tree_pruning') return 'rootPruning';
  if (workOrder.workOrderType === 'tree_relocation_work') return 'relocationWork';
  if (workOrder.workOrderType === 'treatment_aftercare') return 'nutrientCare';
  return null;
}

function workOrderTreeIds(workOrder: WorkOrderRecord): string[] {
  return [...(workOrder.treeIds || []), ...(workOrder.treeNames || [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function treeIdentitySet(tree: TreeRelocationRecord): Set<string> {
  return new Set(idsForTree(tree));
}

function uniqueDisplayList(values: unknown[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const value of values.flatMap((item) => Array.isArray(item) ? item : [item])) {
    const clean = String(value || '').trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    results.push(clean);
  }
  return results;
}

function assignedWorkOrderLabel(workOrder: WorkOrderRecord) {
  return uniqueDisplayList([
    workOrder.assignedCrewNames,
    workOrder.crewLeadName,
    workOrder.vendor,
    workOrder.operator,
  ]).join(', ') || 'Unassigned';
}

function treeRecordsForWorkOrders(workOrders: WorkOrderRecord[], treeAssets: TreeRelocationRecord[]) {
  const ids = new Set(workOrders.flatMap(workOrderTreeIds));
  if (!ids.size) return [];
  return treeAssets.filter((tree) => {
    const treeIds = treeIdentitySet(tree);
    return [...ids].some((id) => treeIds.has(id));
  });
}

function uniqueTreeCount(workOrders: WorkOrderRecord[], trees: TreeRelocationRecord[]) {
  const ids = new Set(workOrders.flatMap(workOrderTreeIds));
  if (ids.size) return ids.size;
  if (trees.length) return trees.length;
  return workOrders.length;
}

function groupDate(workOrder: WorkOrderRecord) {
  return cleanFilterValue(workOrder.scheduledDate || workOrder.dueDate || workOrder.startDate || workOrder.endDate || 'TBD');
}

function groupProjectName(workOrder: WorkOrderRecord) {
  return cleanFilterValue(workOrder.projectName || workOrder.jobName || workOrder.title || 'Project');
}

function formatCutPlan(value: unknown) {
  const clean = cleanFilterValue(value);
  if (!clean) return 'Cut Plan TBD';
  if (/cut/i.test(clean)) return clean;
  return clean.includes('%') ? `${clean} Cut` : `${clean}% Cut`;
}

function batchLabelFromCycle(cycleId: unknown, fallbackIndex: number) {
  const clean = cleanFilterValue(cycleId);
  const match = clean.match(/batch[-_\s]*(\d+)/i);
  if (match?.[1]) return `Batch ${match[1]}`;
  return `Batch ${fallbackIndex + 1}`;
}

function groupKeyForWorkOrder(workOrder: WorkOrderRecord, kind: TreeWorkOrderGroupKind) {
  const base = [
    kind,
    workOrder.projectId || workOrder.projectsId || workOrder.projectName || workOrder.jobId || workOrder.jobName,
    groupDate(workOrder),
    assignedWorkOrderLabel(workOrder),
  ];
  if (kind === 'rootPruning') {
    return [...base, workOrder.rootPruneCycleId, workOrder.plannedCutPercent, workOrder.rootPruneTaskStatus || workOrder.status].map(cleanFilterValue).join('|');
  }
  if (kind === 'nutrientCare') {
    return [...base, workOrder.carePhase, workOrder.treatmentType || workOrder.taskType, workOrder.careTaskStatus || workOrder.status].map(cleanFilterValue).join('|');
  }
  return [...base, workOrder.moveType || workOrder.taskType, workOrder.moveTaskStatus || workOrder.status, workOrder.holdingAreaName].map(cleanFilterValue).join('|');
}

function statusForGroup(kind: TreeWorkOrderGroupKind, workOrders: WorkOrderRecord[]) {
  return uniqueDisplayList(workOrders.map((workOrder) => (
    kind === 'rootPruning'
      ? workOrder.rootPruneTaskStatus || workOrder.status
      : kind === 'nutrientCare'
        ? workOrder.careTaskStatus || workOrder.status
        : workOrder.moveTaskStatus || workOrder.status
  ))).join(', ') || 'Draft';
}

function nextActionForGroup(kind: TreeWorkOrderGroupKind, group: TreeWorkOrderGroup) {
  const status = normalizeFilterValue(group.status);
  if (group.blockers.length) return 'Resolve blocker';
  if (status.includes('complete') || status.includes('relocated')) return 'Review closeout';
  if (status.includes('scheduled')) return kind === 'nutrientCare' ? 'Prepare care list' : kind === 'relocationWork' ? 'Confirm equipment' : 'Print tree list';
  if (group.assignedTo === 'Unassigned') return 'Assign crew';
  if (group.scheduledDate === 'TBD') return 'Schedule';
  return 'Open work package';
}

function titleForWorkOrderGroup(kind: TreeWorkOrderGroupKind, workOrders: WorkOrderRecord[], groupIndex: number) {
  const first = workOrders[0];
  const treeCount = uniqueTreeCount(workOrders, []);
  const isSingleLegacyOrder = workOrders.length === 1 && treeCount <= 1 && !first.rootPruneCycleId && !first.carePhase && !first.moveType;
  if (isSingleLegacyOrder && first.title) return first.title;

  if (kind === 'rootPruning') {
    return `Root Pruning - ${formatCutPlan(first.plannedCutPercent)} - ${batchLabelFromCycle(first.rootPruneCycleId, groupIndex)}`;
  }
  if (kind === 'nutrientCare') {
    return `Nutrient Care - ${cleanFilterValue(first.carePhase || 'Care Phase TBD')} - ${cleanFilterValue(first.treatmentType || first.taskType || 'Treatment TBD')}`;
  }
  return `Relocation Work - ${cleanFilterValue(first.moveType || first.taskType || 'Move Task')} - ${batchLabelFromCycle(first.sourceRowId || first.id, groupIndex)}`;
}

function buildTreeWorkOrderGroups(workOrders: WorkOrderRecord[], treeAssets: TreeRelocationRecord[]): TreeWorkOrderGroup[] {
  const buckets = new Map<string, { kind: TreeWorkOrderGroupKind; workOrders: WorkOrderRecord[] }>();
  for (const workOrder of workOrders) {
    const kind = workOrderKind(workOrder);
    if (!kind) continue;
    const key = groupKeyForWorkOrder(workOrder, kind);
    const bucket = buckets.get(key) || { kind, workOrders: [] };
    bucket.workOrders.push(workOrder);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, bucket], index) => {
    const first = bucket.workOrders[0];
    const trees = treeRecordsForWorkOrders(bucket.workOrders, treeAssets);
    const blockers = uniqueDisplayList(bucket.workOrders.map((workOrder) => workOrder.blockerReason));
    const equipmentNames = uniqueDisplayList(bucket.workOrders.flatMap((workOrder) => workOrder.equipmentNames)).join(', ');
    const implementNames = uniqueDisplayList(bucket.workOrders.flatMap((workOrder) => workOrder.implementNames)).join(', ');
    const loadNames = uniqueDisplayList(bucket.workOrders.flatMap((workOrder) => workOrder.loadNames)).join(', ');
    const group: TreeWorkOrderGroup = {
      key,
      kind: bucket.kind,
      title: titleForWorkOrderGroup(bucket.kind, bucket.workOrders, index),
      projectName: groupProjectName(first),
      scheduledDate: groupDate(first),
      assignedTo: assignedWorkOrderLabel(first),
      treeCount: uniqueTreeCount(bucket.workOrders, trees),
      status: statusForGroup(bucket.kind, bucket.workOrders),
      blockers,
      nextAction: 'Open work package',
      workOrders: bucket.workOrders,
      trees,
      plannedCutPercent: cleanFilterValue(first.plannedCutPercent),
      actualCutPercent: cleanFilterValue(first.actualCutPercent),
      cumulativeCutPercent: cleanFilterValue(first.cumulativeCutPercentAfterEvent),
      carePhase: cleanFilterValue(first.carePhase),
      treatmentType: cleanFilterValue(first.treatmentType || first.taskType),
      followUpCount: bucket.workOrders.filter((workOrder) => Boolean(workOrder.followUpAction)).length,
      highStressCount: bucket.workOrders.filter((workOrder) => /high|severe|critical/i.test(String(workOrder.stressLevel || ''))).length,
      moveType: cleanFilterValue(first.moveType || first.taskType),
      holdingAreaName: cleanFilterValue(first.holdingAreaName),
      originDestinationSummary: uniqueDisplayList(bucket.workOrders.map((workOrder) => [workOrder.origin, workOrder.destination].filter(Boolean).join(' -> '))).join('; '),
      equipmentNeeded: uniqueDisplayList([equipmentNames, implementNames]).join(', '),
      equipmentNames,
      implementNames,
      loadNames,
    };
    group.nextAction = nextActionForGroup(bucket.kind, group);
    return group;
  }).sort((left, right) => (
    treeAssetIdCollator.compare(left.scheduledDate, right.scheduledDate)
    || treeAssetIdCollator.compare(left.title, right.title)
  ));
}

function WorkOrderActionButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-jdt-border bg-white px-2.5 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
      {label}
    </button>
  );
}

function WorkOrderTreeTable({ group }: { group: TreeWorkOrderGroup }) {
  const rows = group.trees.length
    ? group.trees.map((tree) => ({ tree, workOrder: group.workOrders.find((order) => workOrdersForTree([order], tree, order.workOrderType || '').length) }))
    : group.workOrders.map((workOrder) => ({
      tree: {
        id: workOrder.treeIds?.[0] || workOrder.treeNames?.[0] || workOrder.id,
        treeId: workOrder.treeIds?.[0] || workOrder.treeNames?.[0] || '-',
        type: workOrder.taskType || '',
      } as TreeRelocationRecord,
      workOrder,
    }));

  if (group.kind === 'rootPruning') {
    return (
      <CompactTable
        headers={['Tree Tag', 'Tree Type', 'DBH', 'Planned Cut', 'Actual Cut', 'Cumulative Cut', 'Status', 'Notes']}
        rows={rows.map(({ tree, workOrder }) => [
          displayValue(tree.treeTag || tree.tag || tree.treeId || tree.id),
          displayValue(treeAssetType(tree)),
          displayValue(tree.dbh),
          displayValue(workOrder?.plannedCutPercent || group.plannedCutPercent),
          displayValue(workOrder?.actualCutPercent || group.actualCutPercent),
          displayValue(workOrder?.cumulativeCutPercentAfterEvent || group.cumulativeCutPercent),
          displayValue(workOrder?.rootPruneTaskStatus || workOrder?.status || group.status),
          displayValue(workOrder?.notes),
        ])}
      />
    );
  }

  if (group.kind === 'nutrientCare') {
    return (
      <CompactTable
        headers={['Tree Tag', 'Tree Type', 'DBH', 'Care Phase', 'Treatment', 'Stress', 'Condition', 'Status', 'Follow-Up', 'Notes']}
        rows={rows.map(({ tree, workOrder }) => [
          displayValue(tree.treeTag || tree.tag || tree.treeId || tree.id),
          displayValue(treeAssetType(tree)),
          displayValue(tree.dbh),
          displayValue(workOrder?.carePhase || group.carePhase),
          displayValue(workOrder?.treatmentType || group.treatmentType),
          displayValue(workOrder?.stressLevel),
          displayValue(workOrder?.conditionObserved),
          displayValue(workOrder?.careTaskStatus || workOrder?.status || group.status),
          displayValue(workOrder?.followUpAction),
          displayValue(workOrder?.notes),
        ])}
      />
    );
  }

  return (
    <CompactTable
      headers={['Tree Tag', 'Tree Type', 'DBH', 'Move Type', 'Origin / Destination', 'Holding Area', 'Equipment', 'Status', 'Notes']}
      rows={rows.map(({ tree, workOrder }) => [
        displayValue(tree.treeTag || tree.tag || tree.treeId || tree.id),
        displayValue(treeAssetType(tree)),
        displayValue(tree.dbh),
        displayValue(workOrder?.moveType || group.moveType),
        displayValue([workOrder?.origin, workOrder?.destination].filter(Boolean).join(' -> ') || group.originDestinationSummary),
        displayValue(workOrder?.holdingAreaName || group.holdingAreaName),
        displayValue([...(workOrder?.equipmentNames || []), ...(workOrder?.implementNames || [])]),
        displayValue(workOrder?.moveTaskStatus || workOrder?.status || group.status),
        displayValue(workOrder?.notes),
      ])}
    />
  );
}

function CompactTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-jdt-border bg-white">
      <table className="w-full min-w-[760px] text-left text-[11px]">
        <thead className="bg-jdt-sand text-[9px] font-black uppercase text-jdt-muted">
          <tr>{headers.map((header) => <th key={header} className="px-2 py-2">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-jdt-border">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-2 py-2 font-bold text-zinc-600">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectWorkOrderSections({
  groups,
  supportWorkOrders,
  openModal,
  openTrees,
}: {
  groups: TreeWorkOrderGroup[];
  supportWorkOrders: WorkOrderRecord[];
  openModal: (type: string, data?: any) => void;
  openTrees: () => void;
}) {
  const rootGroups = groups.filter((group) => group.kind === 'rootPruning');
  const relocationGroups = groups.filter((group) => group.kind === 'relocationWork');
  const careGroups = groups.filter((group) => group.kind === 'nutrientCare');
  return (
    <div className="space-y-4">
      <TreeWorkOrderSection title="Root Pruning Work Orders" emptyLabel="No root pruning work packages are linked yet." groups={rootGroups} openModal={openModal} openTrees={openTrees} />
      <TreeWorkOrderSection title="Relocation Work Orders" emptyLabel="No relocation move work packages are linked yet." groups={relocationGroups} openModal={openModal} openTrees={openTrees} />
      <TreeWorkOrderSection title="Nutrient Care Work Orders" emptyLabel="No nutrient care work packages are linked yet." groups={careGroups} openModal={openModal} openTrees={openTrees} />
      <section className="rounded-lg border border-jdt-border bg-white p-3">
        <h4 className="text-xs font-black uppercase text-jdt-text">Freight / Equipment Support</h4>
        {supportWorkOrders.length > 0 ? (
          <div className="mt-3 space-y-2">
            {supportWorkOrders.map((workOrder) => (
              <article key={workOrder.id || workOrder.title} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-jdt-primary">{workOrder.title || 'Support work order'}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{workOrder.workOrderType || 'general_task'} - {workOrder.sourceSheetName || 'Manual'}</p>
                  </div>
                  <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{workOrder.status || 'Draft'}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Crew:</span> {assignedWorkOrderLabel(workOrder)}</p>
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Due:</span> {workOrder.dueDate || workOrder.scheduledDate || 'No due date'}</p>
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Equipment:</span> {displayValue(workOrder.equipmentNames)}</p>
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Freight:</span> {displayValue(workOrder.loadNames)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-jdt-border bg-jdt-panel px-3 py-4 text-sm font-bold text-zinc-500">No freight or equipment support work orders are linked yet.</p>
        )}
      </section>
    </div>
  );
}

function TreeWorkOrderSection({
  title,
  emptyLabel,
  groups,
  openModal,
  openTrees,
}: {
  title: string;
  emptyLabel: string;
  groups: TreeWorkOrderGroup[];
  openModal: (type: string, data?: any) => void;
  openTrees: () => void;
}) {
  return (
    <section className="rounded-lg border border-jdt-border bg-white p-3">
      <h4 className="text-xs font-black uppercase text-jdt-text">{title}</h4>
      {groups.length > 0 ? (
        <div className="mt-3 space-y-3">
          {groups.map((group) => {
            const representative = group.workOrders[0];
            return (
              <article key={group.key} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-jdt-primary">{group.title}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{group.projectName}</p>
                  </div>
                  <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{group.status}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Scheduled:</span> {group.scheduledDate}</p>
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Assigned:</span> {group.assignedTo}</p>
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Trees:</span> {`${group.treeCount} trees`}</p>
                  {group.kind === 'rootPruning' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Cut Plan:</span> {formatCutPlan(group.plannedCutPercent)}</p>}
                  {group.kind === 'nutrientCare' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Treatment:</span> {displayValue(group.treatmentType)}</p>}
                  {group.kind === 'nutrientCare' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Care Phase:</span> {displayValue(group.carePhase)}</p>}
                  {group.kind === 'nutrientCare' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Follow-Ups / Stress:</span> {group.followUpCount || 0} follow-up | {group.highStressCount || 0} high stress</p>}
                  {group.kind === 'relocationWork' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Move Type:</span> {displayValue(group.moveType)}</p>}
                  {group.kind === 'relocationWork' && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Origin / Destination:</span> {displayValue(group.originDestinationSummary)}</p>}
                  {group.equipmentNames && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Equipment:</span> {group.equipmentNames}</p>}
                  {group.implementNames && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Implements:</span> {group.implementNames}</p>}
                  {group.loadNames && <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Freight:</span> {group.loadNames}</p>}
                  <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Next Action:</span> {group.nextAction}</p>
                </div>
                {group.blockers.length > 0 && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{group.blockers.join(', ')}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <WorkOrderActionButton label="Open" onClick={() => openModal('assign_work', representative)} />
                  <WorkOrderActionButton label={group.kind === 'nutrientCare' ? 'Assign Crew/Vendor' : 'Assign Crew'} onClick={() => openModal('assign_work', representative)} />
                  <WorkOrderActionButton label="Schedule" onClick={() => openModal('assign_work', representative)} />
                  <WorkOrderActionButton label="View Trees" onClick={openTrees} />
                  <WorkOrderActionButton label="View Map" />
                  <WorkOrderActionButton label={group.kind === 'nutrientCare' ? 'Print Care List' : group.kind === 'relocationWork' ? 'Print Move List' : 'Print Tree List'} />
                  {group.kind === 'relocationWork' && <WorkOrderActionButton label="Assign Equipment" onClick={() => openModal('assign_equipment', representative)} />}
                  {group.kind === 'relocationWork' && <WorkOrderActionButton label="Mark Moved to Holding" onClick={() => openModal('project_tree_relocation_work', { ...representative, moveTaskStatus: 'Moved to Holding' })} />}
                  {group.kind === 'relocationWork' && <WorkOrderActionButton label="Mark Relocated" onClick={() => openModal('project_tree_relocation_work', { ...representative, moveTaskStatus: 'Relocated' })} />}
                  {group.kind !== 'relocationWork' && <WorkOrderActionButton label="Complete Batch" onClick={() => openModal('assign_work', { ...representative, status: 'Complete' })} />}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-[10px] font-black uppercase text-jdt-primary">Open compact tree table</summary>
                  <div className="mt-2">
                    <WorkOrderTreeTable group={group} />
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-jdt-border bg-jdt-panel px-3 py-4 text-sm font-bold text-zinc-500">{emptyLabel}</p>
      )}
    </section>
  );
}

function cleanMatchValue(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function uniqueValues(values: unknown[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const value of values) {
    const clean = cleanMatchValue(value);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    results.push(clean);
  }
  return results;
}

function clientContextForRecord(record: any) {
  return {
    clientId: record?.id || record?.clientId,
    clientName: record?.name || record?.title || record?.clientName,
  };
}

function recordMatchesClient(client: any, record: any): boolean {
  if (!client || !record) return false;
  if (sameClient(client, record)) return true;

  const clientIds = uniqueValues([client.id, client.clientId]);
  const recordClientIds = uniqueValues([record.clientId, record.companiesId]);
  const hasSharedId = clientIds.some((id) => recordClientIds.includes(id));
  if (hasSharedId) return true;

  const clientNames = uniqueValues([client.name, client.title, client.clientName]);
  const recordClientNames = uniqueValues([record.clientName, record.client, record.company, record.companyName, record.clientCompany]);
  return clientNames.some((name) => recordClientNames.includes(name));
}

function recordMatchesLinkedWork(record: any, projects: any[], jobs: any[]) {
  const projectIds = uniqueValues(projects.flatMap((project) => [project.id, project.projectId, project.projectsId]));
  const projectNames = uniqueValues(projects.flatMap((project) => [project.title, project.name, project.projectName]));
  const jobIds = uniqueValues(jobs.flatMap((job) => [job.id, job.jobId]));
  const jobNames = uniqueValues(jobs.flatMap((job) => [job.title, job.name, job.jobName]));

  return (
    uniqueValues([record?.projectId, record?.projectsId]).some((value) => projectIds.includes(value))
    || uniqueValues([record?.projectName, record?.project]).some((value) => projectNames.includes(value))
    || uniqueValues([record?.jobId]).some((value) => jobIds.includes(value))
    || uniqueValues([record?.jobName, record?.job]).some((value) => jobNames.includes(value))
  );
}

function clientProjectsForRecord(type: string, record: any, projects: any[]) {
  if (!record || type !== 'client') return [];
  return projects.filter((project) => recordMatchesClient(record, project));
}

function clientJobsForRecord(type: string, record: any, jobs: any[]) {
  if (!record || type !== 'client') return [];
  return jobs.filter((job) => recordMatchesClient(record, job));
}

function clientWorkOrdersForRecord(record: any, workOrders: WorkOrderRecord[], projects: any[], jobs: any[]) {
  if (!record) return [];
  return workOrders.filter((workOrder) => (
    recordMatchesClient(record, workOrder)
    || recordMatchesLinkedWork(workOrder, projects, jobs)
  ));
}

function clientLoadsForRecord(record: any, loads: LoadRecord[], projects: any[], jobs: any[]) {
  if (!record) return [];
  return loads.filter((load) => (
    recordMatchesClient(record, load)
    || recordMatchesLinkedWork(load, projects, jobs)
  ));
}

function clientDocumentsForRecord(record: any, documents: DocumentRecord[], projects: any[], jobs: any[]) {
  if (!record) return [];
  return documents.filter((doc) => (
    recordMatchesClient(record, doc)
    || recordMatchesLinkedWork(doc, projects, jobs)
  ));
}

function clientFieldUpdatesForRecord(record: any, fieldUpdates: FieldUpdateRecord[], projects: any[], jobs: any[], workOrders: WorkOrderRecord[], loads: LoadRecord[]) {
  if (!record) return [];
  const relatedIds = new Set([
    ...projects.flatMap((project) => [project.id, project.projectId, project.projectsId]),
    ...jobs.flatMap((job) => [job.id, job.jobId]),
    ...workOrders.flatMap((workOrder) => [workOrder.id]),
    ...loads.flatMap((load) => [load.id, load.loadNumber]),
  ].filter(Boolean).map(String));

  return fieldUpdates.filter((update) => (
    recordMatchesClient(record, update)
    || recordMatchesLinkedWork(update, projects, jobs)
    || relatedIds.has(String(update.relatedRecordId || ''))
  ));
}

function relationshipStage(record: any): 'current' | 'upcoming' | 'completed' {
  const status = cleanMatchValue(record?.status || record?.projectStatus || record?.jobStatus || record?.fieldStatus);
  if (/(complete|completed|closed|done|paid|invoiced|cancelled)/.test(status)) return 'completed';
  if (/(active|current|in progress|in-progress|started|underway|in transit|loaded|on site)/.test(status)) return 'current';
  return 'upcoming';
}

function groupedByStage(records: any[]) {
  return {
    current: records.filter((record) => relationshipStage(record) === 'current'),
    upcoming: records.filter((record) => relationshipStage(record) === 'upcoming'),
    completed: records.filter((record) => relationshipStage(record) === 'completed'),
  };
}

function equipmentOnSiteForRecord(type: string, record: any, equipmentList: any[]) {
  if (!record || !['job', 'project'].includes(type)) return [];

  const projectIds = uniqueValues([record.projectId, record.projectsId, record.jobId, record.id]);
  const projectNames = uniqueValues([
    record.projectName,
    record.jobName,
    record.title,
    record.name,
    record.location,
    record.clientName,
    record.client,
  ]);
  const seen = new Set<string>();

  return equipmentList.filter((equipment) => {
    const identity = String(equipment.id || equipment.assetId || equipment.name || equipment.asset || '').trim();
    if (identity && seen.has(identity)) return false;

    const assignedIds = uniqueValues([equipment.assignedProjectId, equipment.assignedJobId]);
    const assignedNames = uniqueValues([
      equipment.assignedProjectName,
      equipment.assignedJobName,
      equipment.currentLocationName,
      equipment.currentLocation,
      equipment.location,
    ]);

    const matchesProjectId = assignedIds.some((value) => projectIds.includes(value));
    const matchesProjectName = assignedNames.some((value) => projectNames.includes(value));
    const isRetired = cleanMatchValue(equipment.status).includes('retired');

    if ((matchesProjectId || matchesProjectName) && !isRetired) {
      if (identity) seen.add(identity);
      return true;
    }
    return false;
  });
}

function ProjectSiteAccessPanel({ record }: { record: any }) {
  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase text-jdt-text">
        <MapPin className="h-4 w-4 text-jdt-olive" /> Project Site Access
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {projectSiteAccessDisplayFields.map(([key, label]) => (
          <ProjectSiteAccessValue key={key} fieldKey={key} label={label} value={record?.[key]} />
        ))}
      </div>
    </section>
  );
}

function ProjectSiteAccessValue({ fieldKey, label, value }: { fieldKey: string; label: string; value: unknown }) {
  const display = displayValue(value);
  const mapUrl = fieldKey === 'siteAccessNotes' ? '' : projectSiteMapUrl(value);

  return (
    <div className={`rounded-lg border border-jdt-border bg-white p-3 ${fieldKey === 'siteAccessNotes' ? 'sm:col-span-2' : ''}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-black text-jdt-text break-words">{display}</p>
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase text-jdt-primary hover:text-jdt-dark"
        >
          <MapPin className="h-3 w-3" /> Open Map
        </a>
      ) : null}
    </div>
  );
}

function ClientContactPanel({ record, openModal }: { record: any; openModal: CommandDrawerProps['openModal'] }) {
  const contacts = Array.isArray(record?.members) ? record.members : [];

  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase text-jdt-text">
            <User className="h-4 w-4 text-jdt-olive" /> Contacts & Account Details
          </h3>
          <p className="mt-1 text-xs font-bold text-zinc-500">Primary contact, additional points of contact, billing terms, and access notes.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('contact', { company: record.name || record.title, clientId: record.id || record.clientId })}
          className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
        >
          Add Contact Point
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['Primary Contact', record.contactName || 'Unassigned'],
          ['Primary Phone', record.phone],
          ['Primary Email', record.email],
          ['Billing Address', record.billingAddress],
          ['Terms & Billing Info', record.billingDetails || 'Net 30'],
          ['Site / Account Notes', record.accessNotes || record.notes],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-jdt-border bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-1 text-sm font-black text-jdt-text break-words">{displayValue(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Additional Contacts</p>
        {contacts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {contacts.map((contact: any, index: number) => (
              <div key={`${contact.name || 'contact'}-${index}`} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                <p className="text-sm font-black text-jdt-primary">{displayValue(contact.name || 'Contact')}</p>
                <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{displayValue(contact.role || 'Point of contact')}</p>
                <p className="mt-2 text-xs font-bold text-zinc-600">{displayValue([contact.phone, contact.email].filter(Boolean).join(' | '))}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-zinc-500">No additional points of contact have been logged yet.</p>
        )}
      </div>
    </section>
  );
}

function ProjectTreeExpandedDetail({
  tree,
  rootPruningRecords,
  relocationWorkRecords,
  nutrientCareRecords,
  treeDocuments,
  openModal,
  seedTreeWork,
  seedTreePhoto,
}: {
  tree: TreeRelocationRecord;
  rootPruningRecords: WorkOrderRecord[];
  relocationWorkRecords: WorkOrderRecord[];
  nutrientCareRecords: WorkOrderRecord[];
  treeDocuments: DocumentRecord[];
  openModal: (type: string, data?: any) => void;
  seedTreeWork: (tree: TreeRelocationRecord, workOrder: WorkOrderRecord | undefined, type: 'tree_pruning' | 'tree_relocation_work' | 'treatment_aftercare') => any;
  seedTreePhoto: (tree: TreeRelocationRecord, document?: DocumentRecord) => any;
}) {
  return (
    <div className="grid gap-3 border-t border-jdt-border bg-jdt-panel p-3 xl:grid-cols-4">
      <TreeMiniSection
        title="Root Pruning"
        emptyLabel="No root pruning records yet."
        addLabel="Add"
        onAdd={() => openModal('project_tree_pruning', seedTreeWork(tree, undefined, 'tree_pruning'))}
        records={rootPruningRecords.map((workOrder) => ({
          id: workOrder.id || workOrder.title || '',
          title: workOrder.title || 'Root pruning',
          detail: `${workOrder.rootPruneTaskStatus || workOrder.status || 'Open'}${workOrder.scheduledDate ? ` - ${workOrder.scheduledDate}` : ''}`,
          onEdit: () => openModal('project_tree_pruning', seedTreeWork(tree, workOrder, 'tree_pruning')),
          onDelete: () => openModal('delete_work_order', workOrder),
        }))}
      />
      <TreeMiniSection
        title="Relocation Work"
        emptyLabel="No relocation work records yet."
        addLabel="Add"
        onAdd={() => openModal('project_tree_relocation_work', seedTreeWork(tree, undefined, 'tree_relocation_work'))}
        records={relocationWorkRecords.map((workOrder) => ({
          id: workOrder.id || workOrder.title || '',
          title: workOrder.title || workOrder.moveType || 'Tree relocation work',
          detail: `${workOrder.moveTaskStatus || workOrder.status || 'Open'}${workOrder.scheduledDate ? ` - ${workOrder.scheduledDate}` : ''}`,
          note: displayValue([workOrder.origin, workOrder.destination].filter(Boolean).join(' -> ')),
          onEdit: () => openModal('project_tree_relocation_work', seedTreeWork(tree, workOrder, 'tree_relocation_work')),
          onDelete: () => openModal('delete_work_order', workOrder),
        }))}
      />
      <TreeMiniSection
        title="Nutrient Care"
        emptyLabel="No nutrient care records yet."
        addLabel="Add"
        onAdd={() => openModal('project_tree_aftercare', seedTreeWork(tree, undefined, 'treatment_aftercare'))}
        records={nutrientCareRecords.map((workOrder) => ({
          id: workOrder.id || workOrder.title || '',
          title: workOrder.title || 'Nutrient care',
          detail: `${workOrder.careTaskStatus || workOrder.status || 'Open'}${workOrder.scheduledDate ? ` - ${workOrder.scheduledDate}` : ''}`,
          onEdit: () => openModal('project_tree_aftercare', seedTreeWork(tree, workOrder, 'treatment_aftercare')),
          onDelete: () => openModal('delete_work_order', workOrder),
        }))}
      />
      <TreeMiniSection
        title="Photos"
        emptyLabel="No tree photos yet."
        addLabel="Add"
        onAdd={() => openModal('project_tree_photo', seedTreePhoto(tree))}
        records={treeDocuments.map((doc) => ({
          id: doc.id || doc.name || doc.title || '',
          title: displayValue(doc.title || doc.name || 'Tree photo'),
          detail: displayValue(doc.photoDate || doc.photoLocation || doc.treeId),
          onEdit: () => openModal('project_tree_photo', seedTreePhoto(tree, doc)),
          onDelete: () => openModal('delete_document', doc),
        }))}
      />
    </div>
  );
}

function TreeMiniSection({
  title,
  emptyLabel,
  addLabel,
  onAdd,
  records,
}: {
  title: string;
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  records: Array<{ id: string; title: string; detail: string; note?: string; onEdit: () => void; onDelete: () => void }>;
}) {
  return (
    <div className="rounded-lg border border-jdt-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase text-jdt-text">{title}</h4>
        <button type="button" onClick={onAdd} className="text-[9px] font-black uppercase text-jdt-primary">{addLabel}</button>
      </div>
      {records.length > 0 ? (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="rounded border border-jdt-border bg-jdt-panel p-2">
              <p className="text-xs font-black text-jdt-primary">{record.title}</p>
              <p className="text-[10px] font-bold text-zinc-500">{record.detail}</p>
              {record.note && record.note !== '-' && <p className="mt-1 text-[10px] font-semibold text-zinc-500">{record.note}</p>}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={record.onEdit} className="text-[9px] font-black uppercase text-jdt-primary">Edit</button>
                <button type="button" onClick={record.onDelete} className="text-[9px] font-black uppercase text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] font-bold text-zinc-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function LinkedRecordCard({ record, type, openDrawer }: { record: any; type?: string; openDrawer?: CommandDrawerProps['openDrawer'] }) {
  const status = displayValue(record.status || record.projectStatus || record.jobStatus || record.fieldStatus || record.updateType || record.category || 'Open');
  const detail = [
    record.projectName,
    record.jobName,
    record.location,
    record.date || record.scheduledDate || record.dueDate || record.eta,
    record.driver,
    record.crewLeadName,
  ].filter(Boolean).join(' - ');
  const drawerId = String(record.id || record.jobId || record.projectId || record.loadNumber || record.title || '').trim();

  return (
    <article className="rounded-lg border border-jdt-border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-jdt-primary break-words">{recordTitle(record)}</p>
          {detail && <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400 break-words">{detail}</p>}
        </div>
        <span className="shrink-0 rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{status}</span>
      </div>
      {(record.notes || record.driverNotes || record.url) && (
        <p className="mt-2 break-words text-xs font-semibold text-zinc-600">{displayValue(record.notes || record.driverNotes || record.url)}</p>
      )}
      {openDrawer && drawerId && type ? (
        <button
          type="button"
          onClick={() => openDrawer(type, drawerId)}
          className="mt-3 text-[10px] font-black uppercase text-jdt-primary hover:text-jdt-dark"
        >
          Open Linked Record
        </button>
      ) : null}
    </article>
  );
}

function EmptyLinkedMessage({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-5 text-sm font-bold text-zinc-500">No {label} linked yet.</p>;
}

function LinkedRecordList({ records, emptyLabel, type, openDrawer }: { records: any[]; emptyLabel: string; type?: string; openDrawer?: CommandDrawerProps['openDrawer'] }) {
  if (!records.length) return <EmptyLinkedMessage label={emptyLabel} />;
  return (
    <div className="space-y-2">
      {records.map((record, index) => (
        <LinkedRecordCard key={record.id || record.title || index} record={record} type={type} openDrawer={openDrawer} />
      ))}
    </div>
  );
}

function StageGroup({ label, records, type, openDrawer }: { label: string; records: any[]; type: string; openDrawer?: CommandDrawerProps['openDrawer'] }) {
  return (
    <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-[10px] font-black uppercase tracking-wide text-jdt-text">{label}</h4>
        <span className="rounded bg-white px-2 py-1 text-[9px] font-black uppercase text-zinc-500">{records.length}</span>
      </div>
      <LinkedRecordList records={records} emptyLabel={`${label.toLowerCase()} records`} type={type} openDrawer={openDrawer} />
    </div>
  );
}

function ClientStageGroups({ title, records, type, openDrawer }: { title: string; records: any[]; type: string; openDrawer?: CommandDrawerProps['openDrawer'] }) {
  const groups = groupedByStage(records);

  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
      <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">{title}</h3>
      <div className="grid gap-3">
        <StageGroup label="Current & Active" records={groups.current} type={type} openDrawer={openDrawer} />
        <StageGroup label="Upcoming / Unscheduled" records={groups.upcoming} type={type} openDrawer={openDrawer} />
        <StageGroup label="Completed / Prior" records={groups.completed} type={type} openDrawer={openDrawer} />
      </div>
    </section>
  );
}

function ClientProfileOverview({
  record,
  projects,
  jobs,
  workOrders,
  loads,
  documents,
  fieldUpdates,
  openModal,
  openDrawer,
}: {
  record: any;
  projects: any[];
  jobs: any[];
  workOrders: WorkOrderRecord[];
  loads: LoadRecord[];
  documents: DocumentRecord[];
  fieldUpdates: FieldUpdateRecord[];
  openModal: CommandDrawerProps['openModal'];
  openDrawer?: CommandDrawerProps['openDrawer'];
}) {
  return (
    <>
      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-jdt-text">Client Operating Profile</h3>
            <p className="mt-1 text-xs font-bold text-zinc-500">Everything currently tied to this account across projects, jobs, crews, freight, documents, and field updates.</p>
          </div>
          <button
            type="button"
            onClick={() => openModal('client', record)}
            className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
          >
            Edit Client
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Projects', projects.length],
            ['Jobs', jobs.length],
            ['Work Orders', workOrders.length],
            ['Freight Moves', loads.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-jdt-border bg-white p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</p>
              <p className="mt-1 text-xl font-black text-jdt-primary">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <ClientContactPanel record={record} openModal={openModal} />
      <ClientStageGroups title="Project History" records={projects} type="project" openDrawer={openDrawer} />
      <ClientStageGroups title="Job History" records={jobs} type="job" openDrawer={openDrawer} />

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Work Orders</h3>
        <LinkedRecordList records={workOrders} emptyLabel="work orders" type="job" openDrawer={openDrawer} />
      </section>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Freight</h3>
        <LinkedRecordList records={loads} emptyLabel="freight moves" type="freight" openDrawer={openDrawer} />
      </section>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Documents</h3>
        <LinkedRecordList records={documents} emptyLabel="documents" />
      </section>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
        <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Field Updates</h3>
        <LinkedRecordList records={fieldUpdates} emptyLabel="field updates" />
      </section>
    </>
  );
}

export default function CommandDrawer(props: CommandDrawerProps) {
  const {
    isOpen,
    onClose,
    type,
    itemId,
    defaultTab = 'overview',
    openModal,
    openDrawer,
  } = props;
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [treeAssetFilters, setTreeAssetFilters] = useState<TreeAssetFilterState>(emptyTreeAssetFilters);
  const [expandedTreeAssetKey, setExpandedTreeAssetKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setTreeAssetFilters(emptyTreeAssetFilters);
      setExpandedTreeAssetKey(null);
    }
  }, [isOpen, defaultTab, type, itemId]);

  const config = drawerConfig[type] || drawerConfig.job;
  const Icon = config.icon;

  const record = useMemo(() => {
    const source = (props[config.collection] as any[]) || [];
    return source.find((item) => matchesRecord(item, itemId));
  }, [props, config.collection, itemId]);

  if (!isOpen) return null;

  const heading = record?.title || record?.name || record?.treeId || itemId || config.title;
  const history = Array.isArray(record?.history) ? record.history : [];
  const relatedClientProjects = clientProjectsForRecord(type, record, props.projectsList || []);
  const relatedClientJobs = clientJobsForRecord(type, record, props.jobsList || []);
  const relatedWorkOrders = type === 'client'
    ? clientWorkOrdersForRecord(record, props.workOrdersList || [], relatedClientProjects, relatedClientJobs)
    : workOrdersForRecord(type, record, props.workOrdersList || []);
  const relatedMaterialItems = materialItemsForRecord(type, record, props.projectMaterialItemsList || []);
  const relatedLoads = type === 'client'
    ? clientLoadsForRecord(record, props.loadsList || [], relatedClientProjects, relatedClientJobs)
    : loadsForRecord(type, record, props.loadsList || []);
  const relatedTreeAssets = treeAssetsForRecord(type, record, props.treeRelocationRecordsList || []);
  const visibleTreeAssets = filterTreeAssets(relatedTreeAssets, treeAssetFilters);
  const treeTypeFilterOptions = uniqueTreeAssetOptions(relatedTreeAssets, treeAssetType);
  const treeStatusFilterOptions = uniqueTreeAssetOptions(relatedTreeAssets, treeAssetStatus);
  const treePriorityFilterOptions = uniqueTreeAssetOptions(relatedTreeAssets, (tree) => tree.priority);
  const treeDifficultyFilterOptions = uniqueTreeAssetOptions(relatedTreeAssets, (tree) => tree.difficulty);
  const hasTreeAssetFilters = Object.values(treeAssetFilters).some((value) => value.trim());
  const updateTreeAssetFilter = (key: keyof TreeAssetFilterState, value: string) => {
    setTreeAssetFilters((current) => ({ ...current, [key]: value }));
    setExpandedTreeAssetKey(null);
  };
  const relatedTreeWorkOrders = treeWorkOrdersForRecord(relatedWorkOrders, relatedTreeAssets);
  const treeWorkOrderGroups = buildTreeWorkOrderGroups(relatedWorkOrders, relatedTreeAssets);
  const supportWorkOrders = relatedWorkOrders.filter((workOrder) => !isTreeWorkOrder(workOrder));
  const relatedDocuments = type === 'client'
    ? clientDocumentsForRecord(record, props.documentsList || [], relatedClientProjects, relatedClientJobs)
    : documentsForRecord(record, props.documentsList || [], relatedTreeAssets);
  const relatedEquipmentOnSite = equipmentOnSiteForRecord(type, record, props.equipmentList || []);
  const relatedFieldUpdates = type === 'client'
    ? clientFieldUpdatesForRecord(record, props.fieldUpdatesList || [], relatedClientProjects, relatedClientJobs, relatedWorkOrders, relatedLoads)
    : fieldUpdatesForRecord(type, record, props.fieldUpdatesList || [], relatedWorkOrders, relatedLoads);
  const isProjectProfile = type === 'job' || type === 'project';
  const profileTabs = isProjectProfile
    ? ['overview', 'work orders', 'trees', 'equipment', 'freight', 'documents', 'field updates', 'financials', 'history']
    : type === 'client'
      ? ['overview', 'contacts', 'projects', 'jobs', 'work orders', 'freight', 'documents', 'field updates', 'history']
      : ['overview', 'work orders', 'materials', 'history', 'documents'];
  const projectContext = type === 'client' ? clientContextForRecord(record) : projectModalContextForRecord(record);
  const treeIdFor = (tree: TreeRelocationRecord) => String(tree.treeId || tree.id || '').trim();
  const seedTreeAsset = (tree?: TreeRelocationRecord) => ({
    ...projectContext,
    ...(tree || {}),
    treeId: tree ? treeIdFor(tree) : '',
  });
  const seedTreeWork = (tree: TreeRelocationRecord, workOrder: WorkOrderRecord | undefined, workOrderType: 'tree_pruning' | 'tree_relocation_work' | 'treatment_aftercare') => {
    const treeId = treeIdFor(tree);
    const titlePrefix = workOrderType === 'tree_pruning'
      ? 'Root Pruning'
      : workOrderType === 'tree_relocation_work'
        ? 'Tree Relocation Work'
        : 'Nutrient Care';
    const sourceSheetName = workOrderType === 'tree_pruning'
      ? 'Project_Root_Pruning'
      : workOrderType === 'tree_relocation_work'
        ? 'Project_Tree_Relocation_Work'
        : 'Project_Nutrient_Care';
    return {
      ...projectContext,
      ...(workOrder || {}),
      title: workOrder?.title || `${titlePrefix} ${treeId}`,
      treeIds: workOrder?.treeIds || [treeId],
      treeNames: workOrder?.treeNames || [treeId],
      workOrderType,
      taskType: workOrder?.taskType || titlePrefix,
      sourceSheetName: workOrder?.sourceSheetName || sourceSheetName,
    };
  };
  const seedTreePhoto = (tree: TreeRelocationRecord, document?: DocumentRecord) => {
    const treeId = treeIdFor(tree);
    return {
      ...projectContext,
      ...(document || {}),
      name: document?.name || document?.title || `Tree photo ${treeId}`,
      treeId,
      treeIds: document?.treeIds || [treeId],
      category: 'Tree Photo',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-jdt-bg shadow-2xl border-l border-jdt-border">
        <div className="sticky top-0 z-10 border-b border-jdt-border bg-jdt-panel/95 backdrop-blur px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-lg bg-jdt-sand border border-jdt-border flex items-center justify-center text-jdt-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{config.title} Profile</p>
                <h2 className="text-xl font-black text-jdt-text truncate">{heading}</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-jdt-border bg-white p-2 text-zinc-500 hover:text-jdt-text">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {profileTabs.map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide border ${activeTab === tab ? 'bg-jdt-primary text-white border-jdt-primary' : 'bg-white text-zinc-600 border-jdt-border hover:border-jdt-olive'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {!record ? (
            <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-sm font-black text-jdt-text">No record found</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">This drawer only shows records that exist in your current workspace.</p>
            </div>
          ) : activeTab === 'overview' ? (
            type === 'client' ? (
              <ClientProfileOverview
                record={record}
                projects={relatedClientProjects}
                jobs={relatedClientJobs}
                workOrders={relatedWorkOrders}
                loads={relatedLoads}
                documents={relatedDocuments}
                fieldUpdates={relatedFieldUpdates}
                openModal={openModal}
                openDrawer={openDrawer}
              />
            ) : (
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                {pickSummaryFields(record).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="mt-1 text-sm font-black text-jdt-text break-words">{displayValue(value)}</p>
                  </div>
                ))}
              </div>
              {record.notes && (
                <div className="rounded-lg border border-jdt-border bg-jdt-panel p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                  <p className="text-sm font-semibold text-zinc-700 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
              {isProjectProfile && <ProjectSiteAccessPanel record={record} />}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openModal(config.editType, record)}
                  className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white hover:bg-jdt-dark transition-colors"
                >
                  <Edit2 className="h-4 w-4" /> Edit Record
                </button>
              </div>
              </>
            )
          ) : type === 'client' && activeTab === 'contacts' ? (
            <ClientContactPanel record={record} openModal={openModal} />
          ) : type === 'client' && activeTab === 'projects' ? (
            <ClientStageGroups title="Project History" records={relatedClientProjects} type="project" openDrawer={openDrawer} />
          ) : type === 'client' && activeTab === 'jobs' ? (
            <ClientStageGroups title="Job History" records={relatedClientJobs} type="job" openDrawer={openDrawer} />
          ) : type === 'client' && activeTab === 'work orders' ? (
            <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Client Work Orders</h3>
              <LinkedRecordList records={relatedWorkOrders} emptyLabel="work orders" type="job" openDrawer={openDrawer} />
            </section>
          ) : type === 'client' && activeTab === 'freight' ? (
            <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Client Freight Moves</h3>
              <LinkedRecordList records={relatedLoads} emptyLabel="freight moves" type="freight" openDrawer={openDrawer} />
            </section>
          ) : type === 'client' && activeTab === 'documents' ? (
            <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase text-jdt-text">Client Documents</h3>
                <button
                  type="button"
                  onClick={() => openModal('document', clientContextForRecord(record))}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Add Document
                </button>
              </div>
              <LinkedRecordList records={relatedDocuments} emptyLabel="documents" />
            </section>
          ) : type === 'client' && activeTab === 'field updates' ? (
            <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <h3 className="mb-3 text-sm font-black uppercase text-jdt-text">Client Field Updates</h3>
              <LinkedRecordList records={relatedFieldUpdates} emptyLabel="field updates" />
            </section>
          ) : activeTab === 'work orders' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                  <FileText className="h-4 w-4 text-jdt-olive" /> Work Orders
                </h3>
                <button
                  type="button"
                  onClick={() => openModal('assign_work', {
                    ...projectContext,
                    title: `Crew work for ${record.title || record.projectName || 'project'}`,
                    workOrderType: 'general_task',
                    taskType: 'Field work',
                    status: 'Draft',
                    priority: 'Normal',
                  })}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Add Crew Work
                </button>
                {isProjectProfile && (
                  <>
                    <button
                      type="button"
                      onClick={() => openModal('assign_equipment', {
                        ...projectContext,
                        title: `Equipment for ${record.title || 'project'}`,
                        workOrderType: 'equipment',
                        taskType: 'Equipment change request',
                        status: 'Draft',
                        priority: 'Normal',
                      })}
                      className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                    >
                      Request Equipment
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('assign_freight', {
                        ...projectContext,
                        title: `Freight support for ${record.title || 'project'}`,
                        workOrderType: 'freight',
                        taskType: 'Freight support request',
                        status: 'Draft',
                        priority: 'Normal',
                      })}
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase text-blue-800 hover:border-blue-300"
                    >
                      Request Freight
                    </button>
                  </>
                )}
              </div>
              {isProjectProfile && (
                <section className="mb-4 rounded-lg border border-jdt-border bg-white p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-jdt-text">
                        <Tractor className="h-4 w-4 text-jdt-olive" /> Equipment On Site
                      </h4>
                      <p className="mt-1 text-[11px] font-bold text-zinc-500">Equipment currently assigned to this project, job, or project site location.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModal('assign_equipment', {
                        ...projectContext,
                        title: `Equipment change for ${record.title || record.projectName || 'project'}`,
                        workOrderType: 'equipment',
                        taskType: 'Equipment change request',
                        equipmentRequestType: 'Add Equipment',
                        equipmentSource: 'JD Thornton Equipment',
                        status: 'Draft',
                        priority: 'Normal',
                      })}
                      className="rounded-lg border border-jdt-border bg-jdt-sand px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                    >
                      Request Equipment Change
                    </button>
                  </div>
                  {relatedEquipmentOnSite.length > 0 ? (
                    <div className="grid gap-2">
                      {relatedEquipmentOnSite.map((equipment) => (
                        <article key={equipment.id || equipment.assetId || equipment.name} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-jdt-primary">{equipmentDisplayName(equipment)}</p>
                              <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{equipmentCategory(equipment)}</p>
                            </div>
                            <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{equipment.status || 'On site'}</span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Location:</span> {equipment.currentLocationName || equipment.currentLocation || equipment.location || 'Project site'}</p>
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Assigned:</span> {equipment.assignedCrewName || equipment.operator || 'Unassigned'}</p>
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Implements:</span> {displayValue(equipment.attachedImplementNames || equipment.compatibleImplementTypes)}</p>
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Unit:</span> {equipment.assetId || equipment.id || 'No asset ID'}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-jdt-border bg-jdt-panel px-3 py-4 text-sm font-bold text-zinc-500">No equipment is currently marked on site for this project.</p>
                  )}
                </section>
              )}
              {isProjectProfile ? (
                <ProjectWorkOrderSections
                  groups={treeWorkOrderGroups}
                  supportWorkOrders={supportWorkOrders}
                  openModal={openModal}
                  openTrees={() => setActiveTab('trees')}
                />
              ) : relatedWorkOrders.length > 0 ? (
                <LinkedRecordList records={relatedWorkOrders} emptyLabel="work orders" type="job" openDrawer={openDrawer} />
              ) : (
                <p className="text-sm font-bold text-zinc-500">No work orders are linked to this record yet.</p>
              )}
            </div>
          ) : activeTab === 'materials' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase text-jdt-text">Project Material Items</h3>
                <button
                  type="button"
                  onClick={() => openModal('project_material_item', {
                    projectId: record.projectId,
                    projectsId: record.projectsId,
                    projectName: record.projectName || record.title,
                    clientId: record.clientId,
                    clientName: record.clientName || record.client,
                  })}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Add Material
                </button>
              </div>
              {relatedMaterialItems.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-jdt-border bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-jdt-sand text-[10px] uppercase text-jdt-muted">
                      <tr>
                        <th className="px-3 py-2">Area</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Required</th>
                        <th className="px-3 py-2">Installed</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedMaterialItems.map((item) => (
                        <tr key={item.id || item.projectMaterialItemsId} className="border-t border-jdt-border">
                          <td className="px-3 py-2 font-bold text-jdt-text">{item.holeNumberOrArea || 'General'}</td>
                          <td className="px-3 py-2 text-zinc-600">{item.source || 'Unknown'}</td>
                          <td className="px-3 py-2 text-zinc-600">{item.materialType || 'Material'}</td>
                          <td className="px-3 py-2 text-zinc-600">{item.sizeClass || 'Size not set'}</td>
                          <td className="px-3 py-2 text-zinc-600">{item.quantityRequired || 0}</td>
                          <td className="px-3 py-2 text-zinc-600">{item.quantityInstalled || 0}</td>
                          <td className="px-3 py-2 font-black uppercase text-jdt-primary">{item.installStatus || 'Needed'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm font-bold text-zinc-500">No project material items are linked to this job yet.</p>
              )}
            </div>
          ) : activeTab === 'tree assets' || activeTab === 'trees' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-jdt-olive" /> Tree Assets
                    </h3>
                    <p className="mt-1 text-xs font-bold text-zinc-500">Project tree inventory, pruning work, treatment history, and photos from the JDT project flow workbook.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openModal('project_tree_asset', seedTreeAsset())}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                    >
                      <Leaf className="h-3.5 w-3.5" /> Add Tree
                    </button>
                    {props.openImportTemplate && [
                        ['Import Trees to This Project', 'jdt_project_flow_tree_assets'],
                        ['Root Pruning', 'jdt_project_flow_tree_pruning'],
                        ['Relocation Work', 'jdt_project_flow_tree_relocation_work'],
                        ['Nutrient Care', 'jdt_project_flow_treatment_aftercare'],
                        ['Photos', 'jdt_project_flow_tree_photos'],
                      ].map(([label, templateId]) => (
                        <button
                          key={templateId}
                          type="button"
                          onClick={() => props.openImportTemplate?.(templateId as SheetImportTemplateId, projectContext)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                        >
                          <Upload className="h-3.5 w-3.5" /> {label}
                        </button>
                      ))}
                  </div>
                </div>

                {relatedTreeAssets.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="flex items-center gap-2 text-[11px] font-black uppercase text-jdt-text">
                            <Search className="h-3.5 w-3.5 text-jdt-olive" /> Filter Tree Assets
                          </h4>
                          <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">
                            {visibleTreeAssets.length} of {relatedTreeAssets.length} shown | Tree Asset ID low to high
                          </p>
                        </div>
                        {hasTreeAssetFilters && (
                          <button
                            type="button"
                            onClick={() => setTreeAssetFilters(emptyTreeAssetFilters)}
                            className="w-fit rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-5">
                        <label className="block md:col-span-2">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Tree ID, name, location</span>
                          <input
                            type="search"
                            value={treeAssetFilters.query}
                            onChange={(event) => updateTreeAssetFilter('query', event.target.value)}
                            placeholder="Search tree assets"
                            className="mt-1 w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Tree Type</span>
                          <select
                            value={treeAssetFilters.treeType}
                            onChange={(event) => updateTreeAssetFilter('treeType', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                          >
                            <option value="">All types</option>
                            {treeTypeFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Status</span>
                          <select
                            value={treeAssetFilters.status}
                            onChange={(event) => updateTreeAssetFilter('status', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                          >
                            <option value="">All statuses</option>
                            {treeStatusFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Priority</span>
                          <select
                            value={treeAssetFilters.priority}
                            onChange={(event) => updateTreeAssetFilter('priority', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                          >
                            <option value="">All priorities</option>
                            {treePriorityFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase text-zinc-500">Difficulty</span>
                          <select
                            value={treeAssetFilters.difficulty}
                            onChange={(event) => updateTreeAssetFilter('difficulty', event.target.value)}
                            className="mt-1 w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                          >
                            <option value="">All difficulties</option>
                            {treeDifficultyFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>

                    {visibleTreeAssets.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-jdt-border bg-white">
                        <div className="flex flex-col gap-1 border-b border-jdt-border bg-jdt-sand px-3 py-2">
                          <h4 className="text-[11px] font-black uppercase text-jdt-text">Compact Tree List</h4>
                          <p className="text-[10px] font-bold uppercase text-zinc-500">Click Details on one tree when you need root pruning, relocation work, nutrient care, or photos.</p>
                        </div>
                        <table className="w-full min-w-[980px] text-left text-[11px]">
                          <thead className="bg-jdt-panel text-[9px] font-black uppercase text-jdt-muted">
                            <tr>
                              <th className="px-2 py-2">Tree Tag</th>
                              <th className="px-2 py-2">Tree Type</th>
                              <th className="px-2 py-2">DBH</th>
                              <th className="px-2 py-2">Tree Relocation Status</th>
                              <th className="px-2 py-2">Current Field Location</th>
                              <th className="px-2 py-2">Destination</th>
                              <th className="px-2 py-2">Final Outcome</th>
                              <th className="px-2 py-2">Cost</th>
                              <th className="px-2 py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTreeAssets.map((tree) => {
                              const treeKey = String(tree.id || tree.treeId || tree.title);
                              const rootPruningRecords = workOrdersForTree(relatedTreeWorkOrders, tree, 'tree_pruning');
                              const relocationWorkRecords = workOrdersForTree(relatedTreeWorkOrders, tree, 'tree_relocation_work');
                              const nutrientCareRecords = workOrdersForTree(relatedTreeWorkOrders, tree, 'treatment_aftercare');
                              const treeDocuments = documentsForTree(relatedDocuments, tree);
                              const treeRelocationStatus = tree.treeRelocationStatus || tree.relocationStatus || tree.status || defaultRelocationStatus;
                              const destinationValue = tree.proposedFinalLocationDescription || tree.destinationPin || '';
                              const isExpanded = expandedTreeAssetKey === treeKey;

                              return (
                                <React.Fragment key={treeKey}>
                                  <tr className="border-t border-jdt-border align-top">
                                    <td className="px-2 py-2 font-black text-jdt-primary">{displayValue(tree.treeTag || tree.tag || tree.treeId || tree.id)}</td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{displayValue(treeAssetType(tree))}</td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{displayValue(tree.dbh)}</td>
                                    <td className="px-2 py-2">
                                      <span className={`inline-block rounded border px-2 py-1 text-[9px] font-black uppercase ${relocationStatusBadgeClass(treeRelocationStatus)}`}>
                                        {displayValue(treeRelocationStatus)}
                                      </span>
                                    </td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{displayValue(tree.currentFieldLocation || tree.existingLocationDescription || 'Existing Location')}</td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{destinationValue ? displayValue(destinationValue) : 'Needs Destination'}</td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{displayValue(tree.treeFinalOutcome || 'Active in Scope')}</td>
                                    <td className="px-2 py-2 font-bold text-zinc-600">{formatRelocationCost(tree.estimatedRelocationCost || tree.relocationCost)}</td>
                                    <td className="px-2 py-2">
                                      <div className="flex flex-wrap gap-1.5">
                                        <button type="button" onClick={() => setExpandedTreeAssetKey(isExpanded ? null : treeKey)} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">{isExpanded ? 'Hide Details' : 'Details'}</button>
                                        <button type="button" onClick={() => openModal('project_tree_asset', seedTreeAsset(tree))} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Edit Tree</button>
                                        <button type="button" onClick={() => openModal('project_tree_pruning', seedTreeWork(tree, undefined, 'tree_pruning'))} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Root Pruning</button>
                                        <button type="button" onClick={() => openModal('project_tree_relocation_work', seedTreeWork(tree, undefined, 'tree_relocation_work'))} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Relocation Work</button>
                                        <button type="button" onClick={() => openModal('project_tree_aftercare', seedTreeWork(tree, undefined, 'treatment_aftercare'))} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Nutrient Care</button>
                                        <button type="button" onClick={() => openModal('project_tree_photo', seedTreePhoto(tree))} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Photo</button>
                                        <button type="button" onClick={() => openModal('delete_tree', tree)} className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[9px] font-black uppercase text-red-700 hover:border-red-300">Delete</button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="border-t border-jdt-border">
                                      <td colSpan={9} className="p-0">
                                        <ProjectTreeExpandedDetail
                                          tree={tree}
                                          rootPruningRecords={rootPruningRecords}
                                          relocationWorkRecords={relocationWorkRecords}
                                          nutrientCareRecords={nutrientCareRecords}
                                          treeDocuments={treeDocuments}
                                          openModal={openModal}
                                          seedTreeWork={seedTreeWork}
                                          seedTreePhoto={seedTreePhoto}
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-sm font-bold text-zinc-500">No tree assets match these filters.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-zinc-500">No tree assets are linked to this project yet.</p>
                )}
              </div>

            </div>
          ) : activeTab === 'equipment' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                    <Tractor className="h-4 w-4 text-jdt-olive" /> Equipment On Site
                  </h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Machines, trailers, trucks, and implements currently assigned to this project.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('assign_equipment', {
                    ...projectContext,
                    title: `Equipment change for ${record.title || record.projectName || 'project'}`,
                    workOrderType: 'equipment',
                    taskType: 'Equipment change request',
                    equipmentRequestType: 'Add Equipment',
                    equipmentSource: 'JD Thornton Equipment',
                    status: 'Draft',
                    priority: 'Normal',
                  })}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Request Equipment Change
                </button>
              </div>
              {relatedEquipmentOnSite.length > 0 ? (
                <div className="grid gap-3">
                  {relatedEquipmentOnSite.map((equipment) => (
                    <article key={equipment.id || equipment.assetId || equipment.name} className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-jdt-primary">{equipmentDisplayName(equipment)}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{equipmentCategory(equipment)}</p>
                        </div>
                        <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{equipment.status || 'On site'}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Location:</span> {equipment.currentLocationName || equipment.currentLocation || equipment.location || 'Project site'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Operator:</span> {equipment.assignedCrewName || equipment.operator || 'Unassigned'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Implements:</span> {displayValue(equipment.attachedImplementNames || equipment.compatibleImplementTypes)}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Service:</span> {equipment.serviceStatus || equipment.nextServiceDue || 'No service flag'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-8 text-center text-sm font-bold text-zinc-500">No equipment is currently marked on site for this project.</p>
              )}
            </div>
          ) : activeTab === 'freight' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                    <Truck className="h-4 w-4 text-jdt-olive" /> Freight Moves
                  </h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Tree deliveries, equipment moves, trailer drops, and support runs tied to this project.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('assign_freight', {
                    ...projectContext,
                    title: `Freight support for ${record.title || 'project'}`,
                    status: 'Draft',
                  })}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Request Freight
                </button>
              </div>
              {relatedLoads.length > 0 ? (
                <div className="space-y-3">
                  {relatedLoads.map((load) => (
                    <article key={load.id || load.loadNumber || load.title} className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-jdt-primary">{load.title || load.loadNumber || 'Freight move'}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{load.loadNumber || (load as any).moveNumber || 'No load number'}</p>
                        </div>
                        <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{load.status || 'Draft'}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Driver:</span> {load.driver || 'Unassigned'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Truck:</span> {load.truck || 'No truck'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">Trailer:</span> {load.trailer || load.requiredTrailerType || 'No trailer'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black uppercase text-zinc-400">ETA:</span> {load.eta || load.deliveryDate || 'TBD'}</p>
                        <p className="text-xs font-bold text-zinc-600 sm:col-span-2"><span className="font-black uppercase text-zinc-400">Route:</span> {[load.origin, load.delivery || load.destination].filter(Boolean).join(' to ') || 'Route not set'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-8 text-center text-sm font-bold text-zinc-500">No freight moves are linked to this project yet.</p>
              )}
            </div>
          ) : activeTab === 'documents' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                    <FileText className="h-4 w-4 text-jdt-olive" /> Documents
                  </h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Photos, permits, bills of lading, project folders, and proof records.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('document', projectContext)}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Add Document
                </button>
              </div>
              {relatedDocuments.length > 0 ? (
                <div className="space-y-2">
                  {relatedDocuments.map((doc) => (
                    <article key={doc.id || doc.url || doc.name || doc.title} className="rounded-lg border border-jdt-border bg-white p-3">
                      <p className="text-sm font-black text-jdt-primary">{displayValue(doc.title || doc.name || 'Document')}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{displayValue(doc.category || (doc as any).type || 'Linked document')}</p>
                      {doc.url && <p className="mt-2 break-all text-xs font-bold text-zinc-600">{doc.url}</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-8 text-center text-sm font-bold text-zinc-500">No linked documents yet.</p>
              )}
            </div>
          ) : activeTab === 'field updates' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
                    <User className="h-4 w-4 text-jdt-olive" /> Field Updates
                  </h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Crew-submitted arrivals, delays, completions, issues, photos, and help requests.</p>
                </div>
              </div>
              {relatedFieldUpdates.length > 0 ? (
                <div className="space-y-3">
                  {relatedFieldUpdates.map((update) => (
                    <article key={update.id || update.createdAtIso || update.title} className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-jdt-primary">{update.relatedTitle || update.title || 'Field update'}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{update.crewName || update.createdBy || 'Crew user'}</p>
                        </div>
                        <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{update.fieldStatus || update.updateType || update.status || 'Update'}</span>
                      </div>
                      {update.notes && <p className="mt-2 text-xs font-semibold text-zinc-600">{update.notes}</p>}
                      {update.proofLinks?.length ? (
                        <div className="mt-3 rounded-lg border border-jdt-border bg-jdt-panel p-3">
                          <p className="text-[10px] font-black uppercase text-zinc-500">Proof Attachments</p>
                          <div className="mt-2 space-y-1">
                            {update.proofLinks.map((link, index) => (
                              <a
                                key={`${link.url}-${index}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block break-all text-xs font-black text-jdt-primary hover:underline"
                              >
                                {link.label || `Proof ${index + 1}`} - {link.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <p className="mt-2 text-[10px] font-bold uppercase text-zinc-400">{displayValue(update.locationName || update.createdAtIso)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-8 text-center text-sm font-bold text-zinc-500">No crew field updates are linked to this project yet.</p>
              )}
            </div>
          ) : activeTab === 'financials' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-jdt-text">Financials</h3>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Designed for revenue, costs, change orders, invoice status, and margin once those fields are populated.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal(config.editType, record)}
                  className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  Edit Financial Fields
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Estimated Revenue', record.estimatedRevenue || record.revenueEstimate || record.contractValue],
                  ['Labor Cost', record.laborCost || record.estimatedLaborCost],
                  ['Equipment Cost', record.equipmentCost || record.estimatedEquipmentCost],
                  ['Freight Cost', record.freightCost || record.estimatedFreightCost],
                  ['Material Cost', record.materialCost || record.estimatedMaterialCost],
                  ['Change Orders', record.changeOrderAmount || record.changeOrders],
                  ['Invoice Status', record.invoiceStatus || record.billingStatus],
                  ['Gross Margin', record.grossMargin || record.estimatedGrossMargin],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-jdt-border bg-white p-3">
                    <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
                    <p className="mt-1 text-sm font-black text-jdt-text">{displayValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2 mb-4"><History className="h-4 w-4 text-jdt-olive" /> History</h3>
              {history.length > 0 ? (
                <ul className="space-y-3">
                  {history.map((item: any, index: number) => (
                    <li key={index} className="border-b border-jdt-border pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-black text-jdt-text">{item.event || 'Update'}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {displayValue(item.date)}</p>
                      {item.notes && <p className="text-xs font-semibold text-zinc-600 mt-1">{item.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-bold text-zinc-500">No history has been recorded for this item yet.</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-sm font-black text-jdt-text">No linked documents yet</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">Attach real permits, photos, bills of lading, or proofs from the documents board.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
