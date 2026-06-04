import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, User, Truck, Wrench, Leaf, Clock, History, Edit2, FileText, Upload } from 'lucide-react';
import type { DocumentRecord, FieldUpdateRecord, LoadRecord, ProjectMaterialItemRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import type { SheetImportTemplateId } from '../commandCenter/sheetImport';
import { sameProject } from '../commandCenter/relationships';
import { equipmentCategory, equipmentDisplayName } from '../commandCenter/equipmentFreight';

type CommandDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  itemId: string | null;
  defaultTab?: string;
  openModal: (type: string, data?: any) => void;
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
  openImportTemplate?: (templateId: SheetImportTemplateId) => void;
};

const drawerConfig: Record<string, { title: string; icon: any; editType: string; collection: keyof CommandDrawerProps }> = {
  job: { title: 'Project', icon: MapPin, editType: 'edit_project', collection: 'jobsList' },
  tree: { title: 'Tree', icon: Leaf, editType: 'edit_tree', collection: 'ranchOaksList' },
  freight: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  load: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  equipment: { title: 'Equipment', icon: Wrench, editType: 'equipment', collection: 'equipmentList' },
  employee: { title: 'Employee', icon: User, editType: 'employee', collection: 'crewsList' },
  client: { title: 'Client', icon: User, editType: 'client', collection: 'clientsList' },
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

export function projectModalContextForRecord(record: any) {
  if (!record) return { projectSiteAddressOptions: [] };
  return {
    clientId: record.clientId,
    clientName: record.clientName || record.client,
    projectId: record.projectId,
    projectsId: record.projectsId || record.projectId,
    projectName: record.projectName || record.title,
    jobId: record.jobId || record.id,
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

  if (type === 'job') {
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
  if (!record || type !== 'job') return [];
  return materialItems.filter((item) => (
    sameKnownField(item.projectId, record.projectId)
    || sameKnownField(item.projectsId, record.projectsId)
    || sameKnownField(item.projectName, record.projectName)
    || sameKnownField(item.projectName, record.title)
    || sameProject(record, item)
  ));
}

function loadsForRecord(type: string, record: any, loads: LoadRecord[]) {
  if (!record || type !== 'job') return [];
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
  if (!record || type !== 'job') return [];
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
    || (type === 'job' && sameProject(record, update))
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
    || ['tree_pruning', 'treatment_aftercare'].includes(String(workOrder.workOrderType || ''))
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

function equipmentOnSiteForRecord(type: string, record: any, equipmentList: any[]) {
  if (!record || type !== 'job') return [];

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
          <div key={key} className={`rounded-lg border border-jdt-border bg-white p-3 ${key === 'siteAccessNotes' ? 'sm:col-span-2' : ''}`}>
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-1 text-sm font-black text-jdt-text break-words">{displayValue(record?.[key])}</p>
          </div>
        ))}
      </div>
    </section>
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
  } = props;
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab);
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
  const relatedWorkOrders = workOrdersForRecord(type, record, props.workOrdersList || []);
  const relatedMaterialItems = materialItemsForRecord(type, record, props.projectMaterialItemsList || []);
  const relatedLoads = loadsForRecord(type, record, props.loadsList || []);
  const relatedTreeAssets = treeAssetsForRecord(type, record, props.treeRelocationRecordsList || []);
  const relatedTreeWorkOrders = treeWorkOrdersForRecord(relatedWorkOrders, relatedTreeAssets);
  const relatedDocuments = documentsForRecord(record, props.documentsList || [], relatedTreeAssets);
  const relatedEquipmentOnSite = equipmentOnSiteForRecord(type, record, props.equipmentList || []);
  const relatedFieldUpdates = fieldUpdatesForRecord(type, record, props.fieldUpdatesList || [], relatedWorkOrders, relatedLoads);
  const profileTabs = type === 'job'
    ? ['overview', 'work orders', 'trees', 'equipment', 'freight', 'documents', 'field updates', 'financials', 'history']
    : ['overview', 'work orders', 'materials', 'history', 'documents'];
  const projectContext = projectModalContextForRecord(record);
  const treeIdFor = (tree: TreeRelocationRecord) => String(tree.treeId || tree.id || '').trim();
  const seedTreeAsset = (tree?: TreeRelocationRecord) => ({
    ...projectContext,
    ...(tree || {}),
    treeId: tree ? treeIdFor(tree) : '',
  });
  const seedTreeWork = (tree: TreeRelocationRecord, workOrder: WorkOrderRecord | undefined, workOrderType: 'tree_pruning' | 'treatment_aftercare') => {
    const treeId = treeIdFor(tree);
    const titlePrefix = workOrderType === 'tree_pruning' ? 'Root Pruning' : 'Nutrient Care';
    return {
      ...projectContext,
      ...(workOrder || {}),
      title: workOrder?.title || `${titlePrefix} ${treeId}`,
      treeIds: workOrder?.treeIds || [treeId],
      treeNames: workOrder?.treeNames || [treeId],
      workOrderType,
      taskType: workOrder?.taskType || titlePrefix,
      sourceSheetName: workOrder?.sourceSheetName || (workOrderType === 'tree_pruning' ? 'Tree Pruning' : 'Treatment or Aftercare'),
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
              {type === 'job' && <ProjectSiteAccessPanel record={record} />}
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
                {type === 'job' && (
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
              {type === 'job' && (
                <section className="mb-4 rounded-lg border border-jdt-border bg-white p-3">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-jdt-text">
                        <Wrench className="h-4 w-4 text-jdt-olive" /> Equipment On Site
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
              {relatedWorkOrders.length > 0 ? (
                <div className="space-y-2">
                  {relatedWorkOrders.map((workOrder) => (
                    <article key={workOrder.id || workOrder.title} className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-jdt-primary">{workOrder.title || 'Untitled work order'}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{workOrder.workOrderType || 'general_task'} - {workOrder.sourceSheetName || 'Manual'}</p>
                        </div>
                        <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{workOrder.status || 'Draft'}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Crew:</span> {(workOrder.assignedCrewNames || []).join(', ') || workOrder.crewLeadName || 'Needs crew'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Due:</span> {workOrder.dueDate || workOrder.scheduledDate || 'No due date'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Equipment:</span> {(workOrder.equipmentNames || []).join(', ') || 'None linked'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Implements:</span> {(workOrder.implementNames || []).join(', ') || 'None linked'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Freight:</span> {(workOrder.loadNames || []).join(', ') || 'None linked'}</p>
                        <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Trees:</span> {(workOrder.treeNames || []).join(', ') || 'None linked'}</p>
                        {(workOrder.origin || workOrder.destination) && <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Route:</span> {[workOrder.origin, workOrder.destination].filter(Boolean).join(' to ')}</p>}
                      </div>
                      {workOrder.blockerReason && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{workOrder.blockerReason}</p>}
                    </article>
                  ))}
                </div>
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
                        ['Tree Assets', 'jdt_project_flow_tree_assets'],
                        ['Root Pruning', 'jdt_project_flow_tree_pruning'],
                        ['Nutrient Care', 'jdt_project_flow_treatment_aftercare'],
                        ['Photos', 'jdt_project_flow_tree_photos'],
                      ].map(([label, templateId]) => (
                        <button
                          key={templateId}
                          type="button"
                          onClick={() => props.openImportTemplate?.(templateId as SheetImportTemplateId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                        >
                          <Upload className="h-3.5 w-3.5" /> {label}
                        </button>
                      ))}
                  </div>
                </div>

                {relatedTreeAssets.length > 0 ? (
                  <div className="space-y-3">
                    {relatedTreeAssets.map((tree) => {
                      const treeKey = String(tree.id || tree.treeId || tree.title);
                      const treeLabel = displayValue(tree.type || tree.treeType || tree.title || tree.treeId || 'Project tree');
                      const locationLine = [tree.existingLocationDescription, tree.proposedFinalLocationDescription]
                        .map(displayValue)
                        .filter((item) => item !== '-')
                        .join(' -> ');
                      const rootPruningRecords = workOrdersForTree(relatedTreeWorkOrders, tree, 'tree_pruning');
                      const nutrientCareRecords = workOrdersForTree(relatedTreeWorkOrders, tree, 'treatment_aftercare');
                      const treeDocuments = documentsForTree(relatedDocuments, tree);

                      return (
                        <article key={treeKey} className="rounded-lg border border-jdt-border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-jdt-primary">{treeLabel}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{displayValue(tree.treeId || tree.id)}</p>
                            </div>
                            <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{displayValue(tree.relocationStatus || tree.status || 'Open')}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => openModal('project_tree_asset', seedTreeAsset(tree))} className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Edit Tree</button>
                            <button type="button" onClick={() => openModal('project_tree_pruning', seedTreeWork(tree, undefined, 'tree_pruning'))} className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Root Pruning</button>
                            <button type="button" onClick={() => openModal('project_tree_aftercare', seedTreeWork(tree, undefined, 'treatment_aftercare'))} className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Nutrient Care</button>
                            <button type="button" onClick={() => openModal('project_tree_photo', seedTreePhoto(tree))} className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Add Photo</button>
                            <button type="button" onClick={() => openModal('delete_tree', tree)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase text-red-700 hover:border-red-300">Delete Tree</button>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">DBH:</span> {displayValue(tree.dbh)}</p>
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Difficulty:</span> {displayValue(tree.difficulty)}</p>
                            <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Priority:</span> {displayValue(tree.priority)}</p>
                          </div>
                          {locationLine && <p className="mt-2 text-xs font-semibold text-zinc-600">{locationLine}</p>}
                          <div className="mt-4 grid gap-3 lg:grid-cols-3">
                            <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <h4 className="text-[10px] font-black uppercase text-jdt-text">Root Pruning</h4>
                                <button type="button" onClick={() => openModal('project_tree_pruning', seedTreeWork(tree, undefined, 'tree_pruning'))} className="text-[9px] font-black uppercase text-jdt-primary">Add</button>
                              </div>
                              {rootPruningRecords.length > 0 ? (
                                <div className="space-y-2">
                                  {rootPruningRecords.map((workOrder) => (
                                    <div key={workOrder.id} className="rounded border border-jdt-border bg-white p-2">
                                      <p className="text-xs font-black text-jdt-primary">{workOrder.title || 'Root pruning'}</p>
                                      <p className="text-[10px] font-bold text-zinc-500">{workOrder.status || 'Open'}{workOrder.scheduledDate ? ` - ${workOrder.scheduledDate}` : ''}</p>
                                      <div className="mt-2 flex gap-2">
                                        <button type="button" onClick={() => openModal('project_tree_pruning', seedTreeWork(tree, workOrder, 'tree_pruning'))} className="text-[9px] font-black uppercase text-jdt-primary">Edit</button>
                                        <button type="button" onClick={() => openModal('delete_work_order', workOrder)} className="text-[9px] font-black uppercase text-red-700">Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-zinc-500">No root pruning records yet.</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <h4 className="text-[10px] font-black uppercase text-jdt-text">Nutrient Care</h4>
                                <button type="button" onClick={() => openModal('project_tree_aftercare', seedTreeWork(tree, undefined, 'treatment_aftercare'))} className="text-[9px] font-black uppercase text-jdt-primary">Add</button>
                              </div>
                              {nutrientCareRecords.length > 0 ? (
                                <div className="space-y-2">
                                  {nutrientCareRecords.map((workOrder) => (
                                    <div key={workOrder.id} className="rounded border border-jdt-border bg-white p-2">
                                      <p className="text-xs font-black text-jdt-primary">{workOrder.title || 'Nutrient care'}</p>
                                      <p className="text-[10px] font-bold text-zinc-500">{workOrder.status || 'Open'}{workOrder.scheduledDate ? ` - ${workOrder.scheduledDate}` : ''}</p>
                                      <div className="mt-2 flex gap-2">
                                        <button type="button" onClick={() => openModal('project_tree_aftercare', seedTreeWork(tree, workOrder, 'treatment_aftercare'))} className="text-[9px] font-black uppercase text-jdt-primary">Edit</button>
                                        <button type="button" onClick={() => openModal('delete_work_order', workOrder)} className="text-[9px] font-black uppercase text-red-700">Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-zinc-500">No nutrient care records yet.</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <h4 className="text-[10px] font-black uppercase text-jdt-text">Photos</h4>
                                <button type="button" onClick={() => openModal('project_tree_photo', seedTreePhoto(tree))} className="text-[9px] font-black uppercase text-jdt-primary">Add</button>
                              </div>
                              {treeDocuments.length > 0 ? (
                                <div className="space-y-2">
                                  {treeDocuments.map((doc) => (
                                    <div key={doc.id || doc.name} className="rounded border border-jdt-border bg-white p-2">
                                      <p className="text-xs font-black text-jdt-primary">{displayValue(doc.title || doc.name || 'Tree photo')}</p>
                                      <p className="text-[10px] font-bold text-zinc-500">{displayValue(doc.photoDate || doc.photoLocation || doc.treeId)}</p>
                                      <div className="mt-2 flex gap-2">
                                        <button type="button" onClick={() => openModal('project_tree_photo', seedTreePhoto(tree, doc))} className="text-[9px] font-black uppercase text-jdt-primary">Edit</button>
                                        <button type="button" onClick={() => openModal('delete_document', doc)} className="text-[9px] font-black uppercase text-red-700">Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-zinc-500">No tree photos yet.</p>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
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
                    <Wrench className="h-4 w-4 text-jdt-olive" /> Equipment On Site
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
