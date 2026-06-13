import { useMemo, useState } from 'react';
import { useFirestoreSyncState } from './useFirestoreCollection';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  ChevronRight,
  Database,
  DollarSign,
  Folder,
  HardHat,
  LayoutGrid,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Settings,
  Tractor,
  Truck,
  User,
  X,
} from 'lucide-react';

import FreightBoard from './components/FreightBoard';
import NurseryBoard from './components/NurseryBoard';
import EquipmentBoard from './components/EquipmentBoard';
import CommandDrawer from './components/CommandDrawer';
import CrewViewBoard from './components/CrewViewBoard';
import SyncBoard from './components/SyncBoard';
import UniversalModal from './components/UniversalModal';
import CrewsBoard from './components/CrewsBoard';
import ClientsBoard from './components/ClientsBoard';
import AlertsBoard from './components/AlertsBoard';
import CalendarBoard from './components/CalendarBoard';
import MapsBoard from './components/MapsBoard';
import ReportsBoard from './components/ReportsBoard';
import DocumentsBoard from './components/DocumentsBoard';
import SettingsBoard from './components/SettingsBoard';
import { CategoryIcon, CategoryPill } from './components/CategoryIcon';
import { useAuth } from './AuthProvider';
import { auditEventForRecordType, stampRecordForSave } from './commandCenter/audit';
import { collectionNamesForClear } from './commandCenter/dataModel';
import { defaultJdtFarmLocations, equipmentCategory, equipmentDisplayName, mergeLocationLibrary, normalizeDelimitedList, withHomeBaseEquipmentDefaults, workOrderResourceNames } from './commandCenter/equipmentFreight';
import {
  advanceFreightStop,
  applyCompletedRouteStepToEquipment,
  applyVehicleActivity,
  clientContactFromFreightStop,
  completeFreightRouteStep,
  completeFreightWithPod,
  createEquipmentWorkOrderFromIssue,
  locationRecordFromFreightStop,
  normalizeFreightLoadForSave,
  parseFreightRouteSteps,
} from './commandCenter/freightWorkflow';
import { applyImportBatch, rollbackImportBatch, type ImportCollections } from './commandCenter/importWorkflow';
import type {
  AlertRecord,
  ClientRecord,
  CommandRecord,
  CrewRecord,
  DocumentRecord,
  EquipmentRecord,
  FieldUpdateRecord,
  FleetTelematicsEventRecord,
  ImportBatchRecord,
  InventoryItemRecord,
  JobRecord,
  LocationRecord,
  LoadRecord,
  ProjectMaterialItemRecord,
  ProjectRecord,
  RanchOakRecord,
  ScheduleTaskRecord,
  SpeciesRecord,
  StaffRecord,
  SyncMappingRecord,
  SyncSourceRecord,
  TreeRelocationRecord,
  ToastMessage,
  WorkOrderRecord,
} from './commandCenter/records';
import { defaultJdtPersonnelRoster, mergePersonnelRecords } from './commandCenter/personnel';
import { buildDashboardSummary, type DashboardCommandAlert, type DashboardWorkItem, type FeaturedOperation } from './commandCenter/dashboard';
import { filterSeedRecords } from './commandCenter/operatingIntelligence';
import { applyTelematicsEventsToFreightLoads, buildTelematicsExceptionAlerts } from './commandCenter/telematicsIntelligence';
import { defaultRelocationStatus } from './commandCenter/treeLifecycle';
import { normalizeProjectImportContext, pasteHeadersForTemplate, sheetImportTemplates, type ImportPreview, type ProjectImportContext, type SheetImportTemplateId } from './commandCenter/sheetImport';
import { dataSyncDraftStorageKey, serializeDataSyncDraft } from './commandCenter/syncDraft';
import {
  operatingJobIdFromParts,
  projectOperatingIdFromParts,
  normalizeProjectRelationship,
  normalizeWorkOrderRelationship,
  resolveClientIdentityFromList,
  sameProjectTreeAsset,
  uniqueProjectOperatingIdFromParts,
  type RelationshipInput,
} from './commandCenter/relationships';
import { sourceRefFromWorkbookRow, workbookTabForWorkOrderType } from './commandCenter/workbookProjectFlow';
import {
  classifyRelocationInstallationJob,
  isRelocationInstallationJob,
  relocationInstallationDivisionLabel,
  relocationInstallationJobFilters,
  relocationInstallationJobTypeTone,
  type RelocationInstallationJobFilter,
} from './commandCenter/relocationInstallation';
import {
  categoryAccentBorderClass,
  categoryForWorkItemTone,
  categoryHeaderClass,
  categorySurfaceClass,
  operatingCategoryForRecordType,
  riskPillClass,
  riskSurfaceClass,
  relocationInstallationJobTypeAccentClass,
  statusDotClass as visualStatusDotClass,
  statusPillClass,
} from './commandCenter/visualLanguage';

const mainNav = [
  { id: 'board', label: 'Command Board', icon: LayoutGrid },
  { id: 'tracker', label: 'Relocation & Installation', icon: MapPin },
  { id: 'freight', label: 'Freight', icon: Truck },
  { id: 'inventory', label: 'Nursery', icon: Leaf },
  { id: 'equipment', label: 'Equipment', icon: Tractor },
  { id: 'crews', label: 'Crews', icon: HardHat },
  { id: 'crewView', label: 'Crew View', icon: HardHat },
  { id: 'clients', label: 'Clients', icon: User },
];

const secondaryNav = [
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'maps', label: 'Maps', icon: MapPin },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: Folder },
  { id: 'sheets', label: 'Import / Backup', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const navItems = [...mainNav, ...secondaryNav];

type DrawerConfig = {
  isOpen: boolean;
  type: string;
  itemId: string | null;
  defaultTab?: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

type ModalConfig = {
  isOpen: boolean;
  type: string;
  data?: CommandRecord;
};

type RevealVehicleMatchCandidate = {
  revealVehicleId?: string;
  revealVehicleName: string;
  revealVehicleNumber?: string;
  registrationNumber?: string;
  vin?: string;
  jdtEquipmentId?: string;
  jdtEquipmentName?: string;
  confidence: string;
  status: 'matched' | 'needsReview' | 'newVehicle' | string;
  matchField?: string;
  matchValue?: string;
  recommendedAction: string;
};

function upsertRecord<T extends CommandRecord>(items: T[], record: Partial<T>, fallbackPrefix: string, matcher?: (item: T) => boolean) {
  const id = record.id || makeId(fallbackPrefix);
  const existing = items.find((item) => matcher ? matcher(item) : item.id === id);
  const nextRecord = { ...record, id } as T;

  if (!existing) return [nextRecord, ...items];
  return items.map((item) => (matcher ? matcher(item) : item.id === id) ? { ...item, ...nextRecord } : item);
}

function upsertRecordWithAudit<T extends CommandRecord>(
  items: T[],
  record: Partial<T>,
  fallbackPrefix: string,
  actorEmail: string | null | undefined,
  recordType: string,
  matcher?: (item: T) => boolean,
) {
  const id = record.id || makeId(fallbackPrefix);
  const existing = items.find((item) => matcher ? matcher(item) : item.id === id);
  const stamped = stampRecordForSave({ ...record, id } as T, existing, {
    actorEmail,
    event: auditEventForRecordType(recordType, Boolean(existing)),
  });

  if (!existing) return [stamped, ...items];
  return items.map((item) => (matcher ? matcher(item) : item.id === id) ? stamped : item);
}

function appendHistory<T extends CommandRecord>(record: T, event: string, notes?: string): T {
  return {
    ...record,
    history: [
      { date: new Date().toLocaleString(), user: 'Command Center', event, notes: notes || '' },
      ...(record.history || []),
    ],
  } as T;
}

function mergeImportedRecords<T extends CommandRecord>(existing: T[], incoming: CommandRecord[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));

  incoming.forEach((record) => {
    const current = byId.get(record.id);
    byId.set(record.id, { ...(current || {}), ...record } as T);
  });

  return Array.from(byId.values());
}

function enrichProjectLikeRecord<T extends CommandRecord>(record: T, existingProjects: RelationshipInput[] = [], clients: RelationshipInput[] = []): T {
  const clientIdentity = resolveClientIdentityFromList(record, clients);
  const relationship = normalizeProjectRelationship({ ...record, ...clientIdentity });
  const source = record as T & { client?: string };
  const projectName = relationship.projectName || record.title || record.name || 'Untitled project';
  const clientName = relationship.clientName || source.client;
  const projectId = String(record.projectId || (record as T & { projectsId?: string }).projectsId || record.id || '').trim()
    || uniqueProjectOperatingIdFromParts({
      clientName,
      projectName,
      createdDate: record.createdAtIso || new Date(),
      existingProjects,
    });

  return {
    ...record,
    ...relationship,
    id: record.id || projectId,
    projectId,
    projectsId: (record as T & { projectsId?: string }).projectsId || projectId,
    title: record.title || projectName,
    name: record.name || projectName,
    client: source.client || clientName,
    clientName,
  } as T;
}

function nextOperatingJobSequence(record: WorkOrderRecord, existingWorkOrders: WorkOrderRecord[], relationship: ReturnType<typeof normalizeWorkOrderRelationship>): number {
  if (record.jobId) return 1;
  const purpose = record.taskType || record.workOrderType || record.jobName || record.title;
  const date = record.scheduledDate || record.dueDate || record.completedDate || record.createdAtIso || new Date();
  const assigneeName = record.crewLeadName || firstListValue(record.assignedCrewNames);
  const firstId = operatingJobIdFromParts({
    projectId: relationship.projectId,
    projectName: relationship.projectName,
    purpose,
    assigneeName,
    date,
    sequence: 1,
  });
  const prefix = firstId.replace(/-\d{2}$/, '-');
  const existingCount = existingWorkOrders.filter((workOrder) => String(workOrder.jobId || workOrder.id || '').startsWith(prefix)).length;
  return existingCount + 1;
}

function enrichWorkOrderRecord(record: WorkOrderRecord, existingWorkOrders: WorkOrderRecord[] = []): WorkOrderRecord {
  const baseRelationship = normalizeWorkOrderRelationship(record);
  const hasExplicitProjectId = Boolean(String(record.projectId || '').trim());
  const projectId = hasExplicitProjectId
    ? baseRelationship.projectId
    : projectOperatingIdFromParts(baseRelationship.clientName, record.createdAtIso || record.scheduledDate || new Date());
  const relationship = {
    ...baseRelationship,
    projectId,
    jobId: String(record.jobId || '').trim() || operatingJobIdFromParts({
      projectId,
      projectName: baseRelationship.projectName,
      purpose: record.taskType || record.workOrderType || baseRelationship.jobName || baseRelationship.title,
      assigneeName: record.crewLeadName || firstListValue(record.assignedCrewNames),
      date: record.scheduledDate || record.dueDate || record.completedDate || record.createdAtIso || new Date(),
      sequence: nextOperatingJobSequence(record, existingWorkOrders, { ...baseRelationship, projectId }),
    }),
  };
  const workOrderType = record.workOrderType || 'general_task';
  const listFields = {
    assignedCrewNames: normalizeDelimitedList(record.assignedCrewNames),
    assignedCrewIds: normalizeDelimitedList(record.assignedCrewIds),
    requiredSkills: normalizeDelimitedList(record.requiredSkills),
    equipmentNames: normalizeDelimitedList(record.equipmentNames),
    equipmentIds: normalizeDelimitedList(record.equipmentIds),
    implementNames: normalizeDelimitedList(record.implementNames),
    implementIds: normalizeDelimitedList(record.implementIds),
    requiredImplementTypes: normalizeDelimitedList(record.requiredImplementTypes),
    loadNames: normalizeDelimitedList(record.loadNames),
    loadIds: normalizeDelimitedList(record.loadIds),
    truckNames: normalizeDelimitedList(record.truckNames),
    truckIds: normalizeDelimitedList(record.truckIds),
    trailerNames: normalizeDelimitedList(record.trailerNames),
    trailerIds: normalizeDelimitedList(record.trailerIds),
  };

  return {
    ...record,
    ...relationship,
    id: record.id || relationship.jobId,
    ...listFields,
    workOrderType,
    sourceSheetName: record.sourceSheetName || workbookTabForWorkOrderType(workOrderType),
  };
}

function slugifyLocalId(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function enrichProjectMaterialItemRecord(record: ProjectMaterialItemRecord): ProjectMaterialItemRecord {
  const projectName = String(record.projectName || record.jobName || record.title || '').trim();
  const projectId = String(record.projectId || record.projectsId || '').trim();
  const projectMaterialItemsId = String(record.projectMaterialItemsId || record.sourceRowId || record.id || '').trim();
  const generatedId = [projectId, projectName, record.holeNumberOrArea, record.materialType, record.sizeClass]
    .map(slugifyLocalId)
    .filter(Boolean)
    .join('-');

  return {
    ...record,
    id: record.id || projectMaterialItemsId || generatedId,
    projectId,
    projectName,
    projectMaterialItemsId,
    sourceSheetName: record.sourceSheetName || 'Project_Material_Items',
    sourceRowId: record.sourceRowId || projectMaterialItemsId,
    sourceRefs: record.sourceRefs || [sourceRefFromWorkbookRow('Project_Material_Items', {
      Material_Item_ID: projectMaterialItemsId,
    })],
  };
}

function coordinatePointFromText(text: unknown, label: string) {
  const match = String(text || '').match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    label,
  };
}

function enrichProjectTreeAssetRecord(record: TreeRelocationRecord): TreeRelocationRecord {
  const treeId = String(record.treeId || record.id || '').trim();
  const projectId = String(record.projectId || record.projectsId || '').trim();
  const type = String(record.type || record.treeType || record.ranchOakType || record.title || '').trim();
  const currentStatus = String(record.status || record.currentStatus || record.relocationStatus || defaultRelocationStatus);
  const generatedId = [projectId, treeId, type].map(slugifyLocalId).filter(Boolean).join('-');
  const sourcePin = coordinatePointFromText(record.existingLocationDescription || record.location, 'Manual source pin');
  const relocationMap = sourcePin ? { ...(record.relocationMap || {}), source: sourcePin } : record.relocationMap;

  return {
    ...record,
    id: record.id || treeId || `tree-${generatedId || Date.now().toString(36)}`,
    treeId: treeId || record.id,
    title: record.title || [type, treeId || record.id].filter(Boolean).join(' ') || 'Project tree',
    name: record.name || record.title || [type, treeId || record.id].filter(Boolean).join(' ') || 'Project tree',
    type,
    treeType: String(record.treeType || type),
    ranchOakType: String(record.ranchOakType || type),
    status: currentStatus,
    relocationStatus: String(record.relocationStatus || currentStatus || defaultRelocationStatus),
    projectId,
    projectsId: String(record.projectsId || projectId),
    sourceSheetName: String(record.sourceSheetName || 'Manual Project Profile'),
    relocationMap,
  } as unknown as TreeRelocationRecord;
}

function firstListValue(value: unknown): string {
  const list = normalizeDelimitedList(value);
  return String(list[0] || value || '').trim();
}

function enrichProjectTreeWorkOrderRecord(record: WorkOrderRecord, workOrderType: WorkOrderRecord['workOrderType']): WorkOrderRecord {
  const treeId = firstListValue(record.treeIds || record.treeNames);
  const titlePrefix = workOrderType === 'tree_pruning' ? 'Root Pruning' : 'Nutrient Care';
  const sourceSheetName = workOrderType === 'tree_pruning' ? 'Project_Root_Pruning' : 'Project_Nutrient_Care';
  const generatedId = [record.projectId, treeId, workOrderType, record.scheduledDate, record.completedDate].map(slugifyLocalId).filter(Boolean).join('-');

  return enrichWorkOrderRecord({
    ...record,
    id: record.id || `work-order-${generatedId || Date.now().toString(36)}`,
    title: record.title || [titlePrefix, treeId].filter(Boolean).join(' '),
    taskType: record.taskType || titlePrefix,
    workOrderType,
    division: record.division || relocationInstallationDivisionLabel,
    sourceSheetName: record.sourceSheetName || sourceSheetName,
    sourceRowId: record.sourceRowId || record.id,
    treeIds: normalizeDelimitedList(record.treeIds || treeId),
    treeNames: normalizeDelimitedList(record.treeNames || treeId),
    status: record.status || 'Ready',
  });
}

function enrichProjectTreePhotoRecord(record: DocumentRecord): DocumentRecord {
  const treeId = String(record.treeId || firstListValue(record.treeIds) || '').trim();
  const generatedId = [record.projectId, treeId, record.name || record.title || record.photoDate].map(slugifyLocalId).filter(Boolean).join('-');

  return {
    ...record,
    id: record.id || `document-${generatedId || Date.now().toString(36)}`,
    name: record.name || record.title || `Tree photo ${treeId}`,
    title: record.title || record.name || `Tree photo ${treeId}`,
    category: record.category || 'Tree Photo',
    treeId,
    treeIds: normalizeDelimitedList(record.treeIds || treeId),
    sourceSheetName: record.sourceSheetName || 'Project_Tree_Photos',
  } as DocumentRecord;
}

function enrichLoadRecord(record: LoadRecord, existingLoads: LoadRecord[] = []): LoadRecord {
  const normalizedRecord = normalizeFreightLoadForSave(record, existingLoads);
  const stepPlanText = String(normalizedRecord.stepPlanText || '').trim();
  const routeSteps = normalizedRecord.routeSteps?.length ? normalizedRecord.routeSteps : parseFreightRouteSteps(stepPlanText);
  return {
    ...normalizedRecord,
    title: normalizedRecord.title || normalizedRecord.name || normalizedRecord.loadNumber || 'Untitled freight dispatch',
    name: normalizedRecord.name || normalizedRecord.title || normalizedRecord.loadNumber || 'Untitled freight dispatch',
    routeSteps,
    stepPlanText: stepPlanText || normalizedRecord.routeSteps?.map((step) => step.label || step.notes || '').filter(Boolean).join('\n') || '',
  };
}

function projectRecordFromProjectLike(record: CommandRecord): ProjectRecord {
  const enriched = enrichProjectLikeRecord(record);
  const source = enriched as CommandRecord & JobRecord;
  const projectId = enriched.projectId || enriched.id || makeId('project');

  return {
    id: projectId,
    title: enriched.projectName || enriched.title || enriched.name || 'Untitled project',
    name: enriched.projectName || enriched.title || enriched.name || 'Untitled project',
    client: source.client || enriched.clientName,
    clientId: enriched.clientId,
    clientName: enriched.clientName || source.client,
    projectId,
    projectName: enriched.projectName || enriched.title || enriched.name,
    division: source.division,
    projectType: source.jobType,
    location: source.location,
    crewAccessAddress: source.crewAccessAddress,
    truckAccessAddress: source.truckAccessAddress,
    constructionAccessPin: source.constructionAccessPin,
    loadUnloadPin: source.loadUnloadPin,
    secondaryLoadUnloadPin: source.secondaryLoadUnloadPin,
    siteAccessNotes: source.siteAccessNotes,
    status: enriched.status,
    date: source.date,
    startDate: source.startDate,
    scheduledDate: source.scheduledDate,
    crew: source.crew,
    pm: source.pm,
    notes: enriched.notes,
  };
}

function upsertClientSiteContact(
  clients: ClientRecord[],
  sourceRecord: CommandRecord,
  contact: NonNullable<ClientRecord['members']>[number],
  actorEmail?: string | null,
) {
  const clientId = String(sourceRecord.clientId || '').trim();
  const sourceWithClient = sourceRecord as CommandRecord & { client?: string };
  const clientName = String(sourceRecord.clientName || sourceWithClient.client || '').trim();
  const generatedClientId = clientId || (clientName ? `client-${slugifyLocalId(clientName)}` : '');

  if (!generatedClientId && !clientName) return clients;

  const matchesClient = (client: ClientRecord) => (
    Boolean(clientId && client.id === clientId)
    || Boolean(clientName && (client.name === clientName || client.title === clientName || client.clientName === clientName))
  );
  const existing = clients.find(matchesClient);

  if (!existing && clientName) {
    return upsertRecordWithAudit(clients, {
      id: generatedClientId,
      name: clientName,
      title: clientName,
      members: [contact],
    }, 'client', actorEmail, 'site_contact');
  }

  return clients.map((client) => {
    if (!matchesClient(client)) return client;
    const members = client.members || [];
    const alreadySaved = members.some((member) => (
      String(member.name || '').toLowerCase() === String(contact.name || '').toLowerCase()
      && String(member.phone || '') === String(contact.phone || '')
    ));
    if (alreadySaved) return client;
    return stampRecordForSave({
      ...client,
      members: [...members, contact],
    }, client, {
      actorEmail,
      event: 'Saved freight site contact',
      notes: contact.name,
    });
  });
}

export default function App() {
  const { user, logOut, permissions, authorizeGoogleSheetsAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig>({ isOpen: false, type: '', itemId: null, defaultTab: 'overview' });
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: '' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projectImportContext, setProjectImportContext] = useState<ProjectImportContext | null>(null);
  const [isSyncingRevealVehicles, setIsSyncingRevealVehicles] = useState(false);
  const [revealVehicleSyncStatus, setRevealVehicleSyncStatus] = useState('Ready to sync Verizon Reveal vehicles');
  const [isSyncingRevealRecommendedApis, setIsSyncingRevealRecommendedApis] = useState(false);
  const [revealRecommendedSyncStatus, setRevealRecommendedSyncStatus] = useState('Ready to sync Reveal driver, asset, geofence, inspection, GPS history, and segment APIs');
  const [isPreviewingRevealMatches, setIsPreviewingRevealMatches] = useState(false);
  const [revealMatchReviewStatus, setRevealMatchReviewStatus] = useState('Review Reveal vehicle matches before trusting live GPS updates.');
  const [revealMatchCandidates, setRevealMatchCandidates] = useState<RevealVehicleMatchCandidate[]>([]);

  const [jobs, setJobs] = useFirestoreSyncState<JobRecord>('jobs', [], !!user);
  const [projects, setProjects] = useFirestoreSyncState<ProjectRecord>('projects', [], !!user);
  const [workOrders, setWorkOrders] = useFirestoreSyncState<WorkOrderRecord>('workOrders', [], !!user);
  const [projectMaterialItems, setProjectMaterialItems] = useFirestoreSyncState<ProjectMaterialItemRecord>('projectMaterialItems', [], !!user);
  const [loads, setLoads] = useFirestoreSyncState<LoadRecord>('loads', [], !!user);
  const [ranchOaks, setRanchOaks] = useFirestoreSyncState<RanchOakRecord>('ranchOaks', [], !!user);
  const [inventoryItems, setInventoryItems] = useFirestoreSyncState<InventoryItemRecord>('inventoryItems', [], !!user);
  const [equipment, setEquipment] = useFirestoreSyncState<EquipmentRecord>('equipment', [], !!user);
  const [crews, setCrews] = useFirestoreSyncState<CrewRecord>('crews', [], !!user);
  const [staffDirectory, setStaffDirectory] = useFirestoreSyncState<StaffRecord>('staff', [], !!user);
  const [clients, setClients] = useFirestoreSyncState<ClientRecord>('clients', [], !!user);
  const [locations, setLocations] = useFirestoreSyncState<LocationRecord>('locations', [], !!user);
  const [species, setSpecies] = useFirestoreSyncState<SpeciesRecord>('species', [], !!user);
  const [scheduleTasks, setScheduleTasks] = useFirestoreSyncState<ScheduleTaskRecord>('scheduleTasks', [], !!user);
  const [treeRelocationRecords, setTreeRelocationRecords] = useFirestoreSyncState<TreeRelocationRecord>('treeRelocationRecords', [], !!user);
  const [fieldUpdates, setFieldUpdates] = useFirestoreSyncState<FieldUpdateRecord>('fieldUpdates', [], !!user);
  const [alerts, setAlerts] = useFirestoreSyncState<AlertRecord>('alerts', [], !!user);
  const [fleetTelematicsEvents] = useFirestoreSyncState<FleetTelematicsEventRecord>('fleetTelematicsEvents', [], !!user);
  const [documents, setDocuments] = useFirestoreSyncState<DocumentRecord>('documents', [], !!user);
  const [syncSources, setSyncSources] = useFirestoreSyncState<SyncSourceRecord>('syncSources', [], !!user);
  const [syncMappings, setSyncMappings] = useFirestoreSyncState<SyncMappingRecord>('syncMappings', [], !!user);
  const [importBatches, setImportBatches] = useFirestoreSyncState<ImportBatchRecord>('importBatches', [], !!user);
  const personnel = useMemo(() => mergePersonnelRecords(defaultJdtPersonnelRoster, [...staffDirectory, ...crews]), [staffDirectory, crews]);
  const nurseryInventory = useMemo<RanchOakRecord[]>(() => [...inventoryItems, ...ranchOaks], [inventoryItems, ranchOaks]);
  const equipmentWithDefaults = useMemo<EquipmentRecord[]>(() => equipment.map(withHomeBaseEquipmentDefaults), [equipment]);
  const locationsWithDefaults = useMemo<LocationRecord[]>(() => mergeLocationLibrary(defaultJdtFarmLocations, locations), [locations]);
  const loadsWithTelematics = useMemo(
    () => applyTelematicsEventsToFreightLoads(loads, equipmentWithDefaults, fleetTelematicsEvents),
    [loads, equipmentWithDefaults, fleetTelematicsEvents],
  );
  const telematicsAlerts = useMemo(
    () => buildTelematicsExceptionAlerts({ equipment: equipmentWithDefaults, loads: loadsWithTelematics, events: fleetTelematicsEvents }),
    [equipmentWithDefaults, loadsWithTelematics, fleetTelematicsEvents],
  );
  const alertsWithTelematics = useMemo(() => [...telematicsAlerts, ...alerts], [telematicsAlerts, alerts]);

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  const dashboardSummary = useMemo(() => buildDashboardSummary({
    jobs,
    loads: loadsWithTelematics,
    trees: nurseryInventory,
    equipment: equipmentWithDefaults,
    crew: personnel,
    clients,
    projects,
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts: alertsWithTelematics,
    fieldUpdates,
    fleetTelematicsEvents,
    importBatches,
  }), [jobs, loadsWithTelematics, nurseryInventory, equipmentWithDefaults, personnel, clients, projects, workOrders, scheduleTasks, treeRelocationRecords, documents, alertsWithTelematics, fieldUpdates, fleetTelematicsEvents, importBatches]);

  const recentRecords = useMemo(() => [
    ...jobs.map((item) => ({ type: 'job', label: item.title || item.client || 'Untitled project', meta: item.status || item.date || 'Project', id: item.id || item.title })),
    ...loadsWithTelematics.map((item) => ({ type: 'freight', label: item.title || item.id || 'Untitled load', meta: item.status || item.eta || 'Freight', id: item.id || item.title })),
    ...nurseryInventory.map((item) => ({ type: 'tree', label: item.treeId || item.name || 'Tree record', meta: item.status || item.farm || 'Tree', id: item.id || item.treeId })),
    ...treeRelocationRecords.map((item) => ({ type: 'tree', label: item.title || item.tag || 'Relocation tree', meta: item.status || item.jobId || 'Relocation', id: item.id || item.tag })),
    ...equipmentWithDefaults.map((item) => ({ type: 'equipment', label: item.name || item.type || 'Equipment record', meta: item.status || item.operator || 'Equipment', id: item.id || item.name })),
    ...fieldUpdates.map((item) => ({ type: 'fieldUpdate', label: item.relatedTitle || item.title || 'Crew field update', meta: item.fieldStatus || item.updateType || 'Field update', id: item.id || item.title })),
    ...documents.map((item) => ({ type: 'document', label: item.name || item.title || 'Document', meta: item.category || item.job || 'Document', id: item.id || item.name })),
  ].slice(0, 8), [jobs, loadsWithTelematics, nurseryInventory, treeRelocationRecords, equipmentWithDefaults, fieldUpdates, documents]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const openDrawer = (type: string, itemId: string, defaultTab = 'overview') => {
    setDrawerConfig({ isOpen: true, type, itemId, defaultTab });
  };

  const openImportTemplate = (templateId: SheetImportTemplateId, context?: ProjectImportContext) => {
    const template = sheetImportTemplates.find((item) => item.id === templateId);
    const normalizedContext = normalizeProjectImportContext(context);
    setProjectImportContext(normalizedContext || null);
    if (template && typeof window !== 'undefined') {
      const includedHeaders = templateId === 'jdt_project_flow_tree_assets' && normalizedContext
        ? ['Tree_Type', 'Tag', 'DBH_IN']
        : pasteHeadersForTemplate(template);
      window.localStorage.setItem(dataSyncDraftStorageKey, serializeDataSyncDraft({
        templateId,
        pastedRows: '',
        includedHeaders,
        savedAtIso: new Date().toISOString(),
        projectContext: normalizedContext,
      }));
    }
    setDrawerConfig((current) => ({ ...current, isOpen: false }));
    setActiveTab('sheets');
  };

  const openModal = (type: string, data?: CommandRecord) => {
    setModalConfig({ isOpen: true, type, data });
  };

  const onDeleteRecord = (recordType: string, id: string) => {
    const removeById = (item: CommandRecord & { treeId?: string }) => item.id !== id && item.title !== id && item.name !== id && item.treeId !== id;

    if (recordType === 'client') setClients((prev) => prev.filter(removeById));
    else if (recordType === 'employee' || recordType === 'crew') {
      setCrews((prev) => prev.filter(removeById));
      setStaffDirectory((prev) => prev.filter(removeById));
    }
    else if (recordType === 'freight' || recordType === 'load') setLoads((prev) => prev.filter(removeById));
    else if (recordType === 'equipment') setEquipment((prev) => prev.filter(removeById));
    else if (recordType === 'work_order' || recordType === 'workorder') setWorkOrders((prev) => prev.filter(removeById));
    else if (recordType === 'tree') {
      setRanchOaks((prev) => prev.filter(removeById));
      setInventoryItems((prev) => prev.filter(removeById));
      setTreeRelocationRecords((prev) => prev.filter(removeById));
    }
    else if (recordType === 'document') setDocuments((prev) => prev.filter(removeById));
    else if (recordType === 'sync_source') setSyncSources((prev) => prev.filter(removeById));
    else if (recordType === 'sync_mapping') setSyncMappings((prev) => prev.filter(removeById));
    else setJobs((prev) => prev.filter(removeById));

    addToast('Record deleted', 'info');
  };

  const onSaveRecord = (recordType: string, recordData: CommandRecord) => {
    const normalizedType = recordType.toLowerCase().replace(/^edit_/, '');
    const vehicleActionByType: Record<string, string> = {
      spot_vehicle: 'Spot Location',
      drop_trailer: 'Drop Trailer',
      hook_trailer: 'Hook Trailer',
      mark_vehicle_empty: 'Mark Empty',
      mark_vehicle_loaded: 'Mark Loaded',
    };

    switch (normalizedType) {
      case 'spot_vehicle':
      case 'drop_trailer':
      case 'hook_trailer':
      case 'mark_vehicle_empty':
      case 'mark_vehicle_loaded':
        {
          const action = vehicleActionByType[normalizedType];
          const updatedVehicle = withHomeBaseEquipmentDefaults(applyVehicleActivity(recordData as EquipmentRecord, {
            ...(recordData as EquipmentRecord),
            action,
            actorName: String((recordData as CommandRecord & { actorName?: string }).actorName || user?.email || 'Command Center'),
          }));
          setEquipment((prev) => upsertRecordWithAudit(
            prev,
            updatedVehicle,
            'equipment',
            user?.email,
            normalizedType,
            (item) => item.id === updatedVehicle.id || item.assetId === updatedVehicle.assetId || item.name === updatedVehicle.name || item.asset === updatedVehicle.asset,
          ));
        }
        break;
      case 'advance_freight_stop':
        {
          const stopInput = {
            ...(recordData as LoadRecord),
            actorName: String((recordData as CommandRecord & { actorName?: string }).actorName || user?.email || 'Command Center'),
          };
          const updatedLoad = advanceFreightStop(recordData as LoadRecord, stopInput);
          setLoads((prev) => upsertRecordWithAudit(
            prev,
            updatedLoad,
            'load',
            user?.email,
            normalizedType,
            (item) => item.id === updatedLoad.id || item.title === updatedLoad.title || item.loadNumber === updatedLoad.loadNumber,
          ));

          const savedLocation = locationRecordFromFreightStop(recordData as Record<string, unknown>);
          if (savedLocation) {
            setLocations((prev) => upsertRecordWithAudit(
              prev,
              savedLocation,
              'location',
              user?.email,
              normalizedType,
              (item) => item.id === savedLocation.id || item.name === savedLocation.name,
            ));
          }

          const savedContact = clientContactFromFreightStop(recordData as Record<string, unknown>);
          if (savedContact) {
            setClients((prev) => upsertClientSiteContact(prev, recordData, savedContact, user?.email));
          }
        }
        break;
      case 'complete_freight_pod':
        {
          const completedLoad = completeFreightWithPod(recordData as LoadRecord, {
            ...(recordData as LoadRecord),
            actorName: String((recordData as CommandRecord & { actorName?: string }).actorName || user?.email || 'Command Center'),
          });
          setLoads((prev) => upsertRecordWithAudit(
            prev,
            completedLoad,
            'load',
            user?.email,
            normalizedType,
            (item) => item.id === completedLoad.id || item.title === completedLoad.title || item.loadNumber === completedLoad.loadNumber,
          ));
        }
        break;
      case 'complete_freight_route_step':
        {
          const completedLoad = completeFreightRouteStep(recordData as LoadRecord, {
            ...(recordData as LoadRecord & { routeStepId?: string; routeStepStatus?: string; actualStart?: string; actualEnd?: string }),
            actorName: String((recordData as CommandRecord & { actorName?: string }).actorName || user?.email || 'Command Center'),
          });
          const routeStepId = String((recordData as LoadRecord & { routeStepId?: string }).routeStepId || '');
          const completedStep = completedLoad.routeSteps?.find((step) => step.id === routeStepId || String(step.sequence) === routeStepId || step.label === routeStepId);
          setLoads((prev) => upsertRecordWithAudit(
            prev,
            completedLoad,
            'load',
            user?.email,
            normalizedType,
            (item) => item.id === completedLoad.id || item.title === completedLoad.title || item.loadNumber === completedLoad.loadNumber,
          ));
          if (completedStep) {
            setEquipment((prev) => prev.map((item) => withHomeBaseEquipmentDefaults(applyCompletedRouteStepToEquipment(item, completedLoad, completedStep))));
          }
        }
        break;
      case 'report_vehicle_issue':
        {
          const equipmentRecord = recordData as EquipmentRecord & { severity?: string; description?: string; reportedBy?: string; issue?: string };
          const assetName = equipmentDisplayName(equipmentRecord);
          const description = String(equipmentRecord.description || equipmentRecord.issue || equipmentRecord.notes || '').trim();
          const severity = String(equipmentRecord.severity || (equipmentRecord as EquipmentRecord & { priority?: string }).priority || 'Medium');
          const reportedBy = String(equipmentRecord.reportedBy || user?.email || 'Command Center');
          const assetId = String(equipmentRecord.id || equipmentRecord.assetId || slugifyLocalId(assetName));
          const updatedEquipment = withHomeBaseEquipmentDefaults({
            ...equipmentRecord,
            id: assetId,
            status: severity === 'Critical' ? 'Down' : 'Needs Service',
            serviceStatus: 'Needs Attention',
            issue: description,
          } as EquipmentRecord);
          const workOrder = createEquipmentWorkOrderFromIssue({
            assetId,
            assetName,
            assetType: equipmentCategory(equipmentRecord),
            severity,
            description,
            reportedBy,
          });

          setEquipment((prev) => upsertRecordWithAudit(
            prev,
            updatedEquipment,
            'equipment',
            user?.email,
            normalizedType,
            (item) => item.id === updatedEquipment.id || item.assetId === updatedEquipment.assetId || item.name === updatedEquipment.name,
          ));
          setWorkOrders((prev) => upsertRecordWithAudit(
            prev,
            workOrder,
            'work-order',
            user?.email,
            normalizedType,
            (item) => item.id === workOrder.id,
          ));
          setAlerts((prev) => [{
            id: makeId('alert'),
            title: `${assetName} maintenance issue`,
            body: description || 'Vehicle issue reported from Freight',
            severity,
            time: 'Just now',
          }, ...prev]);
        }
        break;
      case 'job':
      case 'project':
        {
          const enrichedRecord = enrichProjectLikeRecord(recordData as JobRecord, jobs, clients);
          setJobs((prev) => upsertRecordWithAudit(prev, enrichedRecord, 'job', user?.email, normalizedType, (item) => item.id === enrichedRecord.id || item.title === enrichedRecord.title || item.projectId === enrichedRecord.projectId));
          setProjects((prev) => upsertRecordWithAudit(prev, projectRecordFromProjectLike(enrichedRecord), 'project', user?.email, normalizedType, (item) => item.id === enrichedRecord.projectId || item.projectId === enrichedRecord.projectId || item.title === enrichedRecord.projectName));
        }
        break;
      case 'client':
        setClients((prev) => upsertRecordWithAudit(prev, recordData, 'client', user?.email, normalizedType));
        break;
      case 'contact':
        setClients((prev) => {
          const company = String(recordData.company || recordData.client || '').trim();
          const contact = {
            name: String(recordData.name || recordData.contactName || ''),
            role: String(recordData.role || 'Contact'),
            phone: String(recordData.phone || ''),
            email: String(recordData.email || ''),
          };
          const matched = prev.find((client) => client.name === company || client.title === company || client.id === recordData.clientId);
          if (!matched && company) {
            return upsertRecordWithAudit(prev, {
              id: `client-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
              name: company,
              title: company,
              contactName: contact.name,
              phone: contact.phone,
              email: contact.email,
              members: [],
            }, 'client', user?.email, normalizedType);
          }
          return prev.map((client) => {
            if (client !== matched) return client;
            return stampRecordForSave({
              ...client,
              members: [...(client.members || []), contact],
            }, client, {
              actorEmail: user?.email,
              event: 'Added contact point',
              notes: contact.name,
            });
          });
        });
        break;
      case 'employee':
        setStaffDirectory((prev) => upsertRecordWithAudit(prev, recordData, 'staff', user?.email, normalizedType));
        break;
      case 'crew':
        setCrews((prev) => upsertRecordWithAudit(prev, recordData, 'crew', user?.email, normalizedType));
        break;
      case 'tree':
      case 'ranch_oak':
      case 'add_tree':
      case 'log_prune':
      case 'treatment':
      case 'move_check':
      case 'assign_tree':
        setRanchOaks((prev) => upsertRecordWithAudit(prev, recordData, 'tree', user?.email, normalizedType, (item) => item.id === recordData.id || item.treeId === recordData.treeId));
        break;
      case 'propagation':
        setInventoryItems((prev) => upsertRecordWithAudit(
          prev,
          {
            ...recordData,
            inventoryClass: 'Propagation',
            sourceCollection: 'inventoryItems',
            internalUseOnly: true,
          },
          'tree',
          user?.email,
          normalizedType,
          (item) => item.id === recordData.id || item.treeId === recordData.treeId || item.propagationBatchId === recordData.propagationBatchId,
        ));
        break;
      case 'project_tree_asset':
        {
          const enrichedRecord = enrichProjectTreeAssetRecord(recordData as TreeRelocationRecord);
          setTreeRelocationRecords((prev) => upsertRecordWithAudit(
            prev,
            enrichedRecord,
            'tree',
            user?.email,
            normalizedType,
            (item) => sameProjectTreeAsset(item, enrichedRecord),
          ));
        }
        break;
      case 'project_tree_pruning':
        {
          const enrichedRecord = enrichProjectTreeWorkOrderRecord(recordData as WorkOrderRecord, 'tree_pruning');
          setWorkOrders((prev) => upsertRecordWithAudit(
            prev,
            enrichedRecord,
            'work-order',
            user?.email,
            normalizedType,
            (item) => item.id === enrichedRecord.id || Boolean(item.sourceRowId && item.sourceRowId === enrichedRecord.sourceRowId),
          ));
        }
        break;
      case 'project_tree_aftercare':
        {
          const enrichedRecord = enrichProjectTreeWorkOrderRecord(recordData as WorkOrderRecord, 'treatment_aftercare');
          setWorkOrders((prev) => upsertRecordWithAudit(
            prev,
            enrichedRecord,
            'work-order',
            user?.email,
            normalizedType,
            (item) => item.id === enrichedRecord.id || Boolean(item.sourceRowId && item.sourceRowId === enrichedRecord.sourceRowId),
          ));
        }
        break;
      case 'project_tree_photo':
        {
          const enrichedRecord = enrichProjectTreePhotoRecord(recordData as DocumentRecord);
          setDocuments((prev) => upsertRecordWithAudit(prev, enrichedRecord, 'document', user?.email, normalizedType, (item) => item.id === enrichedRecord.id || item.name === enrichedRecord.name));
        }
        break;
      case 'load':
      case 'freight':
      case 'create_move':
      case 'set_freight_status':
      case 'complete':
        {
          setLoads((prev) => {
            const enrichedLoad = enrichLoadRecord(recordData as LoadRecord, prev);
            return upsertRecordWithAudit(prev, enrichedLoad, 'load', user?.email, normalizedType, (item) => item.id === enrichedLoad.id || item.title === enrichedLoad.title || item.loadNumber === enrichedLoad.loadNumber);
          });
        }
        break;
      case 'equipment':
      case 'maintenance':
      case 'log_issue':
      case 'set_eq_status':
        {
          const equipmentRecord = withHomeBaseEquipmentDefaults(recordData as EquipmentRecord);
          setEquipment((prev) => upsertRecordWithAudit(prev, equipmentRecord, 'equipment', user?.email, normalizedType, (item) => item.id === equipmentRecord.id || item.name === equipmentRecord.name || item.name === equipmentRecord.asset));
        }
        if (normalizedType === 'maintenance') {
          setAlerts((prev) => [{ id: makeId('alert'), title: String(recordData.asset || 'Maintenance report'), body: String(recordData.notes || ''), severity: String(recordData.severity || 'Info'), time: 'Just now' }, ...prev]);
        }
        break;
      case 'change_order':
      case 'delay':
        if (drawerConfig.itemId) {
          setJobs((prev) => prev.map((job) => {
            const matches = job.id === drawerConfig.itemId || job.title === drawerConfig.itemId;
            return matches ? appendHistory({ ...job, ...recordData }, normalizedType.replace('_', ' '), String(recordData.notes || recordData.reason || recordData.description || '')) : job;
          }));
        }
        break;
      case 'work_order':
      case 'workorder':
      case 'assign_work':
      case 'assign_crew':
      case 'assign_equipment':
      case 'assign_freight':
        {
          setWorkOrders((prev) => {
            const enrichedRecord = enrichWorkOrderRecord(recordData as WorkOrderRecord, prev);
            return upsertRecordWithAudit(
              prev,
              enrichedRecord,
              'work-order',
              user?.email,
              normalizedType,
              (item) => item.id === enrichedRecord.id || Boolean(item.sourceRowId && item.sourceRowId === enrichedRecord.sourceRowId),
            );
          });
        }
        break;
      case 'project_material_item':
      case 'projectmaterialitem':
      case 'material_item':
        {
          const enrichedRecord = enrichProjectMaterialItemRecord(recordData as ProjectMaterialItemRecord);
          setProjectMaterialItems((prev) => upsertRecordWithAudit(
            prev,
            enrichedRecord,
            'project-material-item',
            user?.email,
            normalizedType,
            (item) => item.id === enrichedRecord.id || Boolean(item.sourceRowId && item.sourceRowId === enrichedRecord.sourceRowId),
          ));
        }
        break;
      case 'document':
        setDocuments((prev) => upsertRecordWithAudit(prev, recordData, 'document', user?.email, normalizedType, (item) => item.id === recordData.id || item.name === recordData.name));
        break;
      case 'sync_source':
      case 'syncsource':
        setSyncSources((prev) => upsertRecordWithAudit(prev, recordData, 'sync-source', user?.email, normalizedType, (item) => item.id === recordData.id || item.name === recordData.name));
        break;
      case 'sync_mapping':
      case 'syncmapping':
        setSyncMappings((prev) => upsertRecordWithAudit(prev, recordData, 'sync-mapping', user?.email, normalizedType));
        break;
      default:
        setJobs((prev) => upsertRecordWithAudit(prev, recordData, 'record', user?.email, normalizedType));
        break;
    }

    setModalConfig((current) => ({ ...current, isOpen: false }));
    addToast('Record saved', 'success');
  };

  const handleClearData = (clearType = 'all') => {
    const collections = new Set(collectionNamesForClear(clearType));
    if (collections.has('jobs')) setJobs([]);
    if (collections.has('projects')) setProjects([]);
    if (collections.has('workOrders')) setWorkOrders([]);
    if (collections.has('projectMaterialItems')) setProjectMaterialItems([]);
    if (collections.has('loads')) setLoads([]);
    if (collections.has('ranchOaks')) setRanchOaks([]);
    if (collections.has('inventoryItems')) setInventoryItems([]);
    if (collections.has('equipment')) setEquipment([]);
    if (collections.has('crews')) setCrews([]);
    if (collections.has('staff')) setStaffDirectory([]);
    if (collections.has('clients')) setClients([]);
    if (collections.has('locations')) setLocations([]);
    if (collections.has('species')) setSpecies([]);
    if (collections.has('scheduleTasks')) setScheduleTasks([]);
    if (collections.has('treeRelocationRecords')) setTreeRelocationRecords([]);
    if (collections.has('fieldUpdates')) setFieldUpdates([]);
    if (collections.has('alerts')) setAlerts([]);
    if (collections.has('documents')) setDocuments([]);
    if (collections.has('syncSources')) setSyncSources([]);
    if (collections.has('syncMappings')) setSyncMappings([]);
    if (collections.has('importBatches')) setImportBatches([]);
    addToast(clearType === 'all' ? 'Workspace cleared' : 'Records cleared', 'info');
  };

  const handleClearSeedData = (seedBatchId?: string) => {
    const batchId = seedBatchId?.trim();
    setJobs((prev) => filterSeedRecords(prev, batchId));
    setProjects((prev) => filterSeedRecords(prev, batchId));
    setWorkOrders((prev) => filterSeedRecords(prev, batchId));
    setProjectMaterialItems((prev) => filterSeedRecords(prev, batchId));
    setLoads((prev) => filterSeedRecords(prev, batchId));
    setRanchOaks((prev) => filterSeedRecords(prev, batchId));
    setInventoryItems((prev) => filterSeedRecords(prev, batchId));
    setEquipment((prev) => filterSeedRecords(prev, batchId));
    setCrews((prev) => filterSeedRecords(prev, batchId));
    setStaffDirectory((prev) => filterSeedRecords(prev, batchId));
    setClients((prev) => filterSeedRecords(prev, batchId));
    setLocations((prev) => filterSeedRecords(prev, batchId));
    setSpecies((prev) => filterSeedRecords(prev, batchId));
    setScheduleTasks((prev) => filterSeedRecords(prev, batchId));
    setTreeRelocationRecords((prev) => filterSeedRecords(prev, batchId));
    setFieldUpdates((prev) => filterSeedRecords(prev, batchId));
    setAlerts((prev) => filterSeedRecords(prev, batchId));
    setDocuments((prev) => filterSeedRecords(prev, batchId));
    setSyncSources((prev) => filterSeedRecords(prev, batchId));
    setSyncMappings((prev) => filterSeedRecords(prev, batchId));
    setImportBatches((prev) => filterSeedRecords(prev, batchId));
    addToast(batchId ? `Seed batch ${batchId} cleared` : 'All seed data cleared', 'info');
  };

  const handleImportPreview = async (preview: ImportPreview) => {
    const result = applyImportBatch(preview, currentImportCollections(), { actorEmail: user?.email });
    await applyImportedCollections(result.collections);
    const importHistorySaved = await setImportBatches((prev) => [result.batch, ...prev].slice(0, 30));
    if (!importHistorySaved) {
      throw new Error('Import records saved, but the import history could not be saved to Firestore.');
    }
    addToast(`${result.batch.recordCount} ${preview.label} records saved`, result.batch.recordCount ? 'success' : 'info');
  };

  const currentImportCollections = (): ImportCollections => ({
    projects,
    workOrders,
    projectMaterialItems,
    inventoryItems,
    clients,
    equipment: equipmentWithDefaults,
    locations,
    staff: staffDirectory,
    species,
    scheduleTasks,
    treeRelocationRecords,
    documents,
  });

  const applyImportedCollections = async (collections: ImportCollections) => {
    const writes: Promise<boolean>[] = [];

    if (collections.projects) writes.push(setProjects(collections.projects as ProjectRecord[]));
    if (collections.workOrders) writes.push(setWorkOrders(collections.workOrders as WorkOrderRecord[]));
    if (collections.projectMaterialItems) writes.push(setProjectMaterialItems(collections.projectMaterialItems as ProjectMaterialItemRecord[]));
    if (collections.inventoryItems) writes.push(setInventoryItems(collections.inventoryItems as InventoryItemRecord[]));
    if (collections.clients) writes.push(setClients(collections.clients as ClientRecord[]));
    if (collections.equipment) writes.push(setEquipment((collections.equipment as EquipmentRecord[]).map(withHomeBaseEquipmentDefaults)));
    if (collections.locations) writes.push(setLocations(collections.locations as LocationRecord[]));
    if (collections.staff) writes.push(setStaffDirectory(collections.staff as StaffRecord[]));
    if (collections.species) writes.push(setSpecies(collections.species as SpeciesRecord[]));
    if (collections.scheduleTasks) writes.push(setScheduleTasks(collections.scheduleTasks as ScheduleTaskRecord[]));
    if (collections.treeRelocationRecords) writes.push(setTreeRelocationRecords(collections.treeRelocationRecords as TreeRelocationRecord[]));
    if (collections.documents) writes.push(setDocuments(collections.documents as DocumentRecord[]));

    const results = await Promise.all(writes);
    if (results.some((saved) => !saved)) {
      throw new Error('Some import records could not be saved to Firestore.');
    }
  };

  const handleRollbackImport = async (batchId: string) => {
    const batch = importBatches.find((item) => item.id === batchId);
    if (!batch) return;
    const rolledBack = rollbackImportBatch(currentImportCollections(), batch);
    await applyImportedCollections(rolledBack);
    await setImportBatches((prev) => prev.map((item) => item.id === batchId ? { ...item, status: 'Rolled Back' } : item));
    addToast(`${batch.name || 'Import'} rolled back`, 'info');
  };

  const handleUpdateTreeLocation = (treeId: string, relocationMap: unknown, relocationContext: Partial<RanchOakRecord> = {}) => {
    const updateRecord = (item: RanchOakRecord) => (
      item.id === treeId || item.treeId === treeId ? { ...item, ...relocationContext, relocationMap } : item
    );
    setRanchOaks((prev) => prev.map(updateRecord));
    setInventoryItems((prev) => prev.map(updateRecord));
    setTreeRelocationRecords((prev) => prev.map((item) => (
      item.id === treeId || item.treeId === treeId ? { ...item, ...relocationContext, relocationMap } : item
    )));
  };

  const handleImportTreePinsFromMap = async (records: TreeRelocationRecord[]) => {
    const saved = await setTreeRelocationRecords((prev) => records.reduce((nextRecords, record) => (
      upsertRecordWithAudit(
        nextRecords,
        record,
        'tree',
        user?.email,
        'kml tree import',
        (item) => sameProjectTreeAsset(item, record),
      )
    ), prev));

    if (saved) {
      addToast(`${records.length} tree pin${records.length === 1 ? '' : 's'} imported`, 'success');
    }
    return saved;
  };

  const handleSaveFieldUpdate = async (update: Partial<FieldUpdateRecord>) => {
    const saved = await setFieldUpdates((prev) => upsertRecordWithAudit(
      prev,
      {
        ...update,
        createdAtIso: update.createdAtIso || new Date().toISOString(),
        createdBy: update.createdBy || user?.email || update.userEmail,
      },
      'field-update',
      user?.email,
      'field_update',
      (item) => Boolean(update.id) && item.id === update.id,
    ));
    addToast(saved ? 'Crew update submitted' : 'Crew update could not be saved', saved ? 'success' : 'error');
  };

  const handleSyncRevealVehicles = async () => {
    if (user === null) {
      addToast('Sign in before syncing Verizon vehicles', 'error');
      return;
    }

    setIsSyncingRevealVehicles(true);
    setRevealVehicleSyncStatus('Syncing Verizon Reveal vehicles...');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/integrations/reveal/vehicles/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'equipment-board' }),
      });
      const result = await response.json() as {
        ok?: boolean;
        fetched?: number;
        created?: number;
        updated?: number;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Verizon vehicle sync failed.');
      }

      const summary = `${result.fetched || 0} Verizon vehicle${result.fetched === 1 ? '' : 's'} synced: ${result.created || 0} created, ${result.updated || 0} updated.`;
      setRevealVehicleSyncStatus(summary);
      addToast(summary, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verizon vehicle sync failed.';
      setRevealVehicleSyncStatus(message);
      addToast(message, 'error');
    } finally {
      setIsSyncingRevealVehicles(false);
    }
  };

  const handleSyncRevealRecommendedApis = async () => {
    if (user === null) {
      addToast('Sign in before syncing Reveal APIs', 'error');
      return;
    }

    setIsSyncingRevealRecommendedApis(true);
    setRevealRecommendedSyncStatus('Syncing recommended Reveal APIs...');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/integrations/reveal/recommended/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'equipment-board' }),
      });
      const result = await response.json() as {
        ok?: boolean;
        totalFetched?: number;
        totalWritten?: number;
        apis?: Array<{ id: string; label: string; written: number }>;
        skipped?: Array<{ label: string; reason: string }>;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Reveal API sync failed.');
      }

      const syncedLabels = (result.apis || []).map((api) => `${api.label}: ${api.written}`).join(', ');
      const skippedCount = result.skipped?.length || 0;
      const summary = syncedLabels
        ? `${result.totalWritten || 0} Reveal record${result.totalWritten === 1 ? '' : 's'} synced (${syncedLabels}).${skippedCount ? ` ${skippedCount} API${skippedCount === 1 ? '' : 's'} skipped until endpoint paths are configured.` : ''}`
        : `No recommended Reveal API endpoint paths are configured yet. ${skippedCount} API${skippedCount === 1 ? '' : 's'} skipped.`;
      setRevealRecommendedSyncStatus(summary);
      addToast(summary, result.totalWritten ? 'success' : 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reveal API sync failed.';
      setRevealRecommendedSyncStatus(message);
      addToast(message, 'error');
    } finally {
      setIsSyncingRevealRecommendedApis(false);
    }
  };

  const handlePreviewRevealMatches = async () => {
    if (user === null) {
      addToast('Sign in before reviewing Reveal matches', 'error');
      return;
    }

    setIsPreviewingRevealMatches(true);
    setRevealMatchReviewStatus('Reviewing Reveal vehicle matches...');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/integrations/reveal/vehicles/matches/preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'equipment-board' }),
      });
      const result = await response.json() as {
        ok?: boolean;
        fetchedRevealVehicles?: number;
        summary?: { matched?: number; needsReview?: number; newVehicle?: number };
        reviewCandidates?: RevealVehicleMatchCandidate[];
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Reveal match preview failed.');
      }

      const candidates = result.reviewCandidates || [];
      setRevealMatchCandidates(candidates);
      const matched = result.summary?.matched || 0;
      const needsReview = result.summary?.needsReview || 0;
      const newVehicle = result.summary?.newVehicle || 0;
      const summary = `${result.fetchedRevealVehicles || candidates.length} Reveal vehicle${(result.fetchedRevealVehicles || candidates.length) === 1 ? '' : 's'} reviewed: ${matched} approved, ${needsReview} need review, ${newVehicle} new.`;
      setRevealMatchReviewStatus(summary);
      addToast(summary, needsReview || newVehicle ? 'info' : 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reveal match preview failed.';
      setRevealMatchReviewStatus(message);
      addToast(message, 'error');
    } finally {
      setIsPreviewingRevealMatches(false);
    }
  };

  const renderActiveBoard = () => {
    switch (activeTab) {
      case 'tracker':
        return <TrackerBoard projects={projects} jobs={jobs} workOrders={workOrders} projectMaterialItems={projectMaterialItems} openDrawer={openDrawer} openModal={openModal} />;
      case 'freight':
        return <FreightBoard loads={loadsWithTelematics} equipment={equipmentWithDefaults} workOrders={workOrders} openDrawer={openDrawer} openModal={openModal} />;
      case 'inventory':
        return <NurseryBoard starterRanchOaks={nurseryInventory} inventoryItems={inventoryItems} ranchOaks={ranchOaks} openDrawer={openDrawer} openModal={openModal} />;
      case 'equipment':
        return (
          <EquipmentBoard
            starterEquipment={equipmentWithDefaults}
            fleetTelematicsEvents={fleetTelematicsEvents}
            openDrawer={openDrawer}
            openModal={openModal}
            canSyncRevealVehicles={permissions.canManageSources}
            isSyncingRevealVehicles={isSyncingRevealVehicles}
            revealVehicleSyncStatus={revealVehicleSyncStatus}
            onSyncRevealVehicles={handleSyncRevealVehicles}
            isSyncingRevealRecommendedApis={isSyncingRevealRecommendedApis}
            revealRecommendedSyncStatus={revealRecommendedSyncStatus}
            onSyncRevealRecommendedApis={handleSyncRevealRecommendedApis}
            isPreviewingRevealMatches={isPreviewingRevealMatches}
            revealMatchReviewStatus={revealMatchReviewStatus}
            onPreviewRevealMatches={handlePreviewRevealMatches}
            revealMatchCandidates={revealMatchCandidates}
          />
        );
      case 'crews':
        return <CrewsBoard crews={[...staffDirectory, ...crews]} workOrders={workOrders} openModal={openModal} openDrawer={openDrawer} />;
      case 'crewView':
        return (
          <CrewViewBoard
            crews={personnel}
            loads={loadsWithTelematics}
            workOrders={workOrders}
            jobs={jobs}
            equipment={equipmentWithDefaults}
            fieldUpdates={fieldUpdates}
            currentUserEmail={user?.email}
            canSubmitFieldUpdates={permissions.canSubmitFieldUpdates}
            onSaveFieldUpdate={handleSaveFieldUpdate}
            openDrawer={openDrawer}
          />
        );
      case 'clients':
        return <ClientsBoard clients={clients} projects={projects} jobs={jobs} openModal={openModal} openDrawer={openDrawer} />;
      case 'alerts':
        return <AlertsBoard alerts={alertsWithTelematics} setAlerts={setAlerts} openModal={openModal} />;
      case 'calendar':
        return <CalendarBoard jobs={jobs} loads={loadsWithTelematics} workOrders={workOrders} scheduleTasks={scheduleTasks} treeRelocationRecords={treeRelocationRecords} equipment={equipmentWithDefaults} openDrawer={openDrawer} />;
      case 'maps':
        return <MapsBoard jobs={jobs} ranchOaks={nurseryInventory} treeRelocationRecords={treeRelocationRecords} locationsList={locationsWithDefaults} equipment={equipmentWithDefaults} fleetTelematicsEvents={fleetTelematicsEvents} onUpdateTreeLocation={handleUpdateTreeLocation} onImportTreePins={handleImportTreePinsFromMap} openDrawer={openDrawer} />;
      case 'reports':
        return <ReportsBoard jobs={jobs} projects={projects} workOrders={workOrders} loads={loadsWithTelematics} ranchOaks={nurseryInventory} equipment={equipmentWithDefaults} alerts={alertsWithTelematics} clients={clients} fieldUpdates={fieldUpdates} scheduleTasks={scheduleTasks} treeRelocationRecords={treeRelocationRecords} documents={documents} fleetTelematicsEvents={fleetTelematicsEvents} importBatches={importBatches} />;
      case 'documents':
        return <DocumentsBoard documents={documents} openModal={openModal} />;
      case 'sheets':
        return <SyncBoard sources={syncSources} mappings={syncMappings} importBatches={importBatches} openModal={openModal} openDrawer={openDrawer} onImportPreview={handleImportPreview} onRollbackImport={handleRollbackImport} canImport={permissions.canImport} projectImportContext={projectImportContext} projects={projects} treeRelocationRecords={treeRelocationRecords} workOrders={workOrders} projectMaterialItems={projectMaterialItems} documents={documents} authorizeGoogleSheetsAccess={authorizeGoogleSheetsAccess} />;
      case 'settings':
        return <SettingsBoard openModal={openModal} onClearSeedData={handleClearSeedData} />;
      default:
        return <Dashboard recentRecords={recentRecords} dashboardSummary={dashboardSummary} workOrders={workOrders} openModal={openModal} openDrawer={openDrawer} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-jdt-bg text-jdt-text">
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-jdt-border bg-jdt-primary px-4 py-3 text-white">
        <button type="button" onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 hover:bg-white/10"><Menu className="h-5 w-5" /></button>
        <span className="text-sm font-black uppercase tracking-wide">JDT Command Center</span>
        <button type="button" onClick={logOut} className="rounded-lg p-2 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
      </div>

      <div className="flex">
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-jdt-primary text-white transition-transform lg:sticky lg:top-0 lg:translate-x-0 lg:h-screen`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">JD Thornton</p>
                <h1 className="text-lg font-black">Command Center</h1>
              </div>
              <button type="button" onClick={() => setIsSidebarOpen(false)} className="lg:hidden rounded-lg p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              <NavGroup label="Operations" items={mainNav} activeTab={activeTab} setActiveTab={setActiveTab} closeMenu={() => setIsSidebarOpen(false)} />
              <NavGroup label="Workspace" items={secondaryNav} activeTab={activeTab} setActiveTab={setActiveTab} closeMenu={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="border-t border-white/10 p-3">
              <button onClick={logOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-black text-white/75 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <button type="button" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 border-b border-jdt-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Live Workspace</p>
              <h2 className="mt-1 text-3xl font-black text-jdt-primary">{activeNav.label}</h2>
            </div>
            <button onClick={() => openModal('job')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors">
              <Plus className="h-4 w-4" /> New Project
            </button>
          </header>

          {renderActiveBoard()}
        </main>
      </div>

      <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto flex min-w-[280px] items-center justify-between rounded-xl border p-4 text-white shadow-2xl ${toast.type === 'error' ? 'bg-red-800 border-red-900' : toast.type === 'info' ? 'bg-[#935231] border-amber-950' : 'bg-[#384521] border-[#293414]'}`}>
            <p className="text-xs font-black uppercase tracking-wide">{toast.message}</p>
            <button onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))} className="ml-3 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      <CommandDrawer
        isOpen={drawerConfig.isOpen}
        onClose={() => setDrawerConfig((current) => ({ ...current, isOpen: false }))}
        type={drawerConfig.type}
        itemId={drawerConfig.itemId}
        defaultTab={drawerConfig.defaultTab}
        openModal={openModal}
        openDrawer={openDrawer}
        projectsList={projects}
        jobsList={jobs}
        loadsList={loadsWithTelematics}
        ranchOaksList={nurseryInventory}
        equipmentList={equipmentWithDefaults}
        crewsList={personnel}
        clientsList={clients}
        workOrdersList={workOrders}
        projectMaterialItemsList={projectMaterialItems}
        treeRelocationRecordsList={treeRelocationRecords}
        documentsList={documents}
        fieldUpdatesList={fieldUpdates}
        openImportTemplate={openImportTemplate}
      />

      <UniversalModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((current) => ({ ...current, isOpen: false }))}
        type={modalConfig.type}
        data={modalConfig.data}
        openModal={openModal}
        onSaveRecord={onSaveRecord}
        onDeleteRecord={onDeleteRecord}
        onClearData={handleClearData}
        jobsList={jobs}
        loadsList={loads}
        ranchOaksList={nurseryInventory}
        equipmentList={equipmentWithDefaults}
        crewsList={personnel}
        clientsList={clients}
        locationsList={locationsWithDefaults}
        workOrders={workOrders}
        projectMaterialItems={projectMaterialItems}
      />
    </div>
  );
}

function NavGroup({ label, items, activeTab, setActiveTab, closeMenu }: any) {
  return (
    <div>
      <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-2">{label}</p>
      <div className="space-y-1">
        {items.map((item: any) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); closeMenu(); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black transition-colors ${active ? 'bg-white text-jdt-primary shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const operationIconMap: Record<FeaturedOperation['id'], typeof MapPin> = {
  relocation: MapPin,
  freight: Truck,
  nursery: Leaf,
  equipment: Tractor,
};

const operationToneMap: Record<FeaturedOperation['id'], string> = {
  relocation: categoryHeaderClass('relocation'),
  freight: categoryHeaderClass('freight'),
  nursery: categoryHeaderClass('nursery'),
  equipment: categoryHeaderClass('equipment'),
};

function statusDotClass(status: string) {
  return visualStatusDotClass(status);
}

function riskLevelClass(level: string) {
  return riskPillClass(level);
}

const commandAlertIconMap: Record<DashboardCommandAlert['id'], typeof MapPin> = {
  today: Calendar,
  blocked: AlertTriangle,
  approved: DollarSign,
  trees: Leaf,
  crew: HardHat,
  freight: Truck,
  equipment: Tractor,
};

const commandAlertToneMap: Record<DashboardCommandAlert['tone'], string> = {
  context: 'border-jdt-primary bg-jdt-primary text-white',
  bad: `border-l-4 ${riskSurfaceClass('critical')} ${categoryAccentBorderClass('alert')}`,
  ready: `border-l-4 ${riskSurfaceClass('low')} ${categoryAccentBorderClass('crew')}`,
  warn: `border-l-4 ${riskSurfaceClass('watch')} ${categoryAccentBorderClass('alert')}`,
  blue: `border-l-4 ${categorySurfaceClass('freight')} ${categoryAccentBorderClass('freight')}`,
};

const drawerBackedTypes = new Set(['job', 'project', 'freight', 'load', 'tree', 'equipment', 'employee', 'client', 'fieldUpdate']);

function dataQualitySeverityClass(severity: string) {
  if (severity === 'High') return riskPillClass('critical');
  if (severity === 'Medium') return riskPillClass('watch');
  return riskPillClass('low');
}

export function Dashboard({ recentRecords, dashboardSummary, openModal, openDrawer, setActiveTab }: any) {
  const openOperation = (operation: FeaturedOperation) => {
    if (operation.recordId) {
      openDrawer(operation.drawerType, operation.recordId);
      return;
    }
    setActiveTab(operation.targetTab);
  };

  const openWorkItem = (item: DashboardWorkItem) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab);
  };

  const dailyBrief = dashboardSummary.dailyBrief;
  const topRisks = dashboardSummary.projectRisks.slice(0, 3);
  const openBriefItem = (item: any) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab);
  };
  const openDataQualityItem = (item: any) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab || 'reports');
  };
  const openWorkflowReadinessItem = (item: any) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab || 'reports');
  };
  const openCloseoutReviewItem = (item: any) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab || 'crewView');
  };
  const openComplianceReviewItem = (item: any) => {
    if (item.recordId && drawerBackedTypes.has(item.drawerType)) {
      openDrawer(item.drawerType, item.recordId);
      return;
    }
    setActiveTab(item.targetTab || 'documents');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-jdt-olive">Live Operations</p>
          <h2 className="mt-1 text-2xl font-black text-jdt-primary sm:text-3xl">Today's Command Board</h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">Daily dispatch, tomorrow planning, owner decisions, and operating focus in one working view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openModal('job')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark">
            <Plus className="h-4 w-4" /> Create Project
          </button>
          <button onClick={() => setActiveTab('calendar')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-jdt-panel px-4 py-2.5 text-xs font-black uppercase text-jdt-text shadow-sm hover:bg-jdt-sand">
            <Calendar className="h-4 w-4" /> Calendar
          </button>
        </div>
      </div>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.35fr_repeat(6,minmax(0,1fr))]">
        {dashboardSummary.commandAlerts.map((alert: DashboardCommandAlert) => {
          const Icon = commandAlertIconMap[alert.id];
          return (
            <button key={alert.id} type="button" onClick={() => setActiveTab(alert.targetTab)} className={`min-h-[78px] rounded-lg border p-3 text-left shadow-sm transition-colors hover:border-jdt-olive ${commandAlertToneMap[alert.tone]}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-[10px] font-black uppercase ${alert.tone === 'context' ? 'text-white/70' : 'text-zinc-500'}`}>{alert.label}</p>
                <Icon className={`h-4 w-4 ${alert.tone === 'context' ? 'text-jdt-sand' : 'text-jdt-olive'}`} />
              </div>
              <p className="mt-2 text-2xl font-black leading-none">{alert.value}</p>
              <p className={`mt-1 text-[10px] font-bold ${alert.tone === 'context' ? 'text-white/70' : 'text-zinc-500'}`}>{alert.detail}</p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">Daily Command Brief</h3>
              <p className="mt-1 text-xs font-bold text-zinc-500">{dailyBrief.summary}</p>
            </div>
            <button onClick={() => setActiveTab('reports')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
              Open Reports
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { title: 'Today', date: dailyBrief.todayIso, items: dailyBrief.today, empty: 'No work dated today' },
              { title: 'Tomorrow', date: dailyBrief.tomorrowIso, items: dailyBrief.tomorrow, empty: 'No tomorrow prep staged' },
              { title: 'Owner Decisions', date: 'Review', items: dailyBrief.decisions, empty: 'No owner decisions flagged' },
            ].map((section) => (
              <div key={section.title} className="rounded-lg border border-jdt-border bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-zinc-500">{section.title}</p>
                  <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{section.date}</span>
                </div>
                {section.items.length > 0 ? (
                  <div className="space-y-2">
                    {section.items.slice(0, 3).map((item: any) => (
                      <button key={`${section.title}-${item.id}`} type="button" onClick={() => openBriefItem(item)} className="w-full rounded border border-jdt-border bg-jdt-panel px-3 py-2 text-left hover:border-jdt-olive">
                        <p className="truncate text-xs font-black text-jdt-text">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[10px] font-bold text-zinc-500">{item.detail}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded border border-dashed border-jdt-border bg-jdt-panel px-3 py-6 text-center text-xs font-bold text-zinc-500">{section.empty}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">At Risk Projects</h3>
              <p className="mt-1 text-xs font-bold text-zinc-500">Client, project, job, and assignment issues</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-jdt-olive" />
          </div>
          {topRisks.length > 0 ? (
            <div className="space-y-3">
              {topRisks.map((risk: any) => (
                <button key={risk.id} type="button" onClick={() => openDrawer(risk.drawerType, risk.recordId)} className="w-full rounded-lg border border-jdt-border bg-white p-4 text-left transition-colors hover:border-jdt-olive">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-jdt-text">{risk.title}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">{risk.clientName || 'No client linked'}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-1 text-[9px] font-black uppercase ${riskLevelClass(risk.level)}`}>{risk.level} {risk.score}</span>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {risk.reasons.slice(0, 3).map((reason: string) => (
                      <li key={reason} className="text-[11px] font-bold text-zinc-600">- {reason}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
              <p className="text-sm font-black text-jdt-text">No project risk detected</p>
              <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Missing crew, freight gaps, equipment holds, field issues, and proof gaps will show here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-jdt-border px-5 py-4">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">Today Schedule</h3>
              <p className="mt-1 text-xs font-bold text-zinc-500">Jobs, freight, and scheduled tasks that need field attention</p>
            </div>
            <button onClick={() => setActiveTab('calendar')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
              Open Calendar
            </button>
          </div>
          {dashboardSummary.todaySchedule.length > 0 ? (
            <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
              {dashboardSummary.todaySchedule.map((item: DashboardWorkItem) => {
                const category = categoryForWorkItemTone(item.tone);
                return (
                  <button key={`${item.drawerType}-${item.id}`} type="button" onClick={() => openWorkItem(item)} className={`min-h-[130px] rounded-lg border border-jdt-border border-l-4 p-4 text-left shadow-sm transition-colors hover:border-jdt-olive ${categorySurfaceClass(category)} ${categoryAccentBorderClass(category)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryIcon category={category} size="xs" />
                        <p className="truncate text-[10px] font-black uppercase text-zinc-500">{item.assignee}</p>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase shadow-sm ${statusPillClass(item.status)}`}>{item.status}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-black uppercase text-jdt-text">{item.title}</p>
                    <p className="mt-2 line-clamp-2 text-[11px] font-bold text-zinc-500">{item.detail}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <div className="rounded-xl border border-dashed border-jdt-border bg-white p-8 text-center">
                <Calendar className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
                <p className="text-sm font-black text-jdt-text">No scheduled field work on the board yet</p>
                <p className="mx-auto mt-1 max-w-md text-xs font-bold text-zinc-500">Approved jobs, scheduled tasks, and active freight loads will appear here once they are entered.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-jdt-border px-5 py-4">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">Tomorrow Builder</h3>
              <p className="mt-1 text-xs font-bold text-zinc-500">Approved work that is ready to schedule</p>
            </div>
            <button onClick={() => setActiveTab('tracker')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
              View Jobs
            </button>
          </div>
          <WorkItemStack items={dashboardSummary.tomorrowQueue} emptyTitle="Nothing ready for tomorrow yet" emptyDetail="Approved unscheduled work will show here for office planning." onOpen={openWorkItem} />
        </div>
      </section>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-jdt-text">Compact Command Board</h3>
            <p className="mt-1 text-xs font-bold text-zinc-500">Pipeline and operating focus stays visible without stealing the top of the page</p>
          </div>
          <button onClick={() => setActiveTab('tracker')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
            <LayoutGrid className="h-4 w-4" /> All Jobs
          </button>
        </div>

        <div className="rounded-xl border border-jdt-border bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-jdt-primary" />
            <h4 className="text-xs font-black uppercase text-jdt-text">Quote-to-Job Sales Pipeline</h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {dashboardSummary.pipeline.map((stage: any) => (
              <div key={stage.id} className="rounded-lg border border-jdt-border bg-jdt-sand/30 p-3 text-center">
                <p className="text-[10px] font-black uppercase text-zinc-500">{stage.label}</p>
                <p className="mt-2 text-3xl font-black text-jdt-text">{stage.value}</p>
                <p className="mt-1 text-[10px] font-bold text-jdt-olive">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {dashboardSummary.operationList.map((operation: FeaturedOperation) => {
            const Icon = operationIconMap[operation.id];
            return (
              <article key={operation.id} className="flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-jdt-border bg-white shadow-sm">
                <button type="button" onClick={() => setActiveTab(operation.targetTab)} className={`flex items-center justify-between gap-3 px-4 py-3 text-left text-white transition-colors ${operationToneMap[operation.id]}`}>
                  <span className="inline-flex items-center gap-2 text-sm font-black uppercase">
                    <Icon className="h-4 w-4 text-jdt-sand" />
                    {operation.label}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-75" />
                </button>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex gap-4">
                    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-jdt-border bg-jdt-sand">
                      <Icon className="h-7 w-7 text-jdt-olive" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => openOperation(operation)} className="block w-full truncate text-left text-base font-black uppercase text-jdt-text hover:underline">
                        {operation.title}
                      </button>
                      <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{operation.subtitle}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-jdt-border py-3">
                    {operation.stats.map((stat) => (
                      <div key={stat.label} className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-zinc-400">{stat.label}</p>
                        <p className="mt-0.5 truncate text-xs font-black text-jdt-text">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex-1">
                    <p className="text-[10px] font-black uppercase text-zinc-400">Operating Count</p>
                    <div className="mt-2 flex items-end gap-2">
                      <p className="text-3xl font-black text-jdt-text">{operation.value}</p>
                      <p className="pb-1 text-[10px] font-bold uppercase text-zinc-500">{operation.valueLabel}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-jdt-border pt-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(operation.status)}`} />
                      <p className="truncate text-[10px] font-black uppercase text-zinc-600">{operation.status}</p>
                    </div>
                    <button onClick={() => openOperation(operation)} className="rounded border border-jdt-border bg-jdt-sand px-3 py-1.5 text-[10px] font-black uppercase text-jdt-text transition-colors hover:bg-white">
                      {operation.actionLabel}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">Recent Records</h3>
              <p className="text-xs font-bold text-zinc-500 mt-1">Your latest projects, loads, trees, and equipment</p>
            </div>
            <button onClick={() => openModal('job')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
              Create Project
            </button>
          </div>

          {recentRecords.length > 0 ? (
            <div className="divide-y divide-jdt-border">
              {recentRecords.map((record: any, index: number) => {
                const category = operatingCategoryForRecordType(record.type);
                return (
                  <button key={`${record.type}-${record.id}-${index}`} onClick={() => openDrawer(record.type, record.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-jdt-sand/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <CategoryIcon category={category} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-jdt-text">{record.label}</p>
                        <p className="mt-1 text-xs font-bold text-zinc-500">{record.meta}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border p-10 text-center">
              <Database className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-black text-jdt-text">No operational records yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs font-bold text-zinc-500">This workspace is clean. Add your current projects, tree inventory, freight loads, crews, clients, and equipment to build the live command center.</p>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Owner Review Queue</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Blocked, urgent, or decision-ready items</p>
              </div>
            </div>
            <WorkItemStack items={dashboardSummary.ownerReviewQueue} emptyTitle="No owner review items" emptyDetail="Blocked jobs, freight issues, service holds, and active alerts will collect here." onOpen={openWorkItem} />
          </section>

          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Field Closeout Review</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Crew and driver closeouts waiting on proof, filing, or follow-up</p>
              </div>
              <button onClick={() => setActiveTab('crewView')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
                Crew View
              </button>
            </div>
            {dashboardSummary.fieldCloseoutReviewQueue?.length > 0 ? (
              <div className="divide-y divide-jdt-border">
                {dashboardSummary.fieldCloseoutReviewQueue.slice(0, 5).map((item: any) => {
                  const proofLabel = `${item.proofCount} proof${item.proofCount === 1 ? '' : 's'}`;
                  return (
                    <button key={item.id} type="button" onClick={() => openCloseoutReviewItem(item)} className="block w-full px-1 py-3 text-left hover:bg-jdt-sand/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-jdt-text">{item.title}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{item.crewName} / {item.projectName}</p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>{item.reviewStatus}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{proofLabel}</span>
                        <span className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{item.drawerType}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase text-jdt-olive">{item.recommendedAction}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
                  <p className="text-sm font-black text-jdt-text">No closeouts waiting for review</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Submitted crew and driver closeouts will collect here for office filing and follow-up.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Compliance Review</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Driver licenses, CDL medical cards, registrations, and insurance needing office action</p>
              </div>
              <button onClick={() => setActiveTab('documents')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
                Documents
              </button>
            </div>
            {dashboardSummary.complianceReviewQueue?.length > 0 ? (
              <div className="divide-y divide-jdt-border">
                {dashboardSummary.complianceReviewQueue.slice(0, 5).map((item: any) => {
                  const expirationLabel = item.expirationDate ? `Expires ${item.expirationDate}` : 'No expiration on file';
                  return (
                    <button key={item.id} type="button" onClick={() => openComplianceReviewItem(item)} className="block w-full px-1 py-3 text-left hover:bg-jdt-sand/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-jdt-text">{item.entityName}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{item.documentType} / {item.entityType}</p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>{item.status}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{expirationLabel}</span>
                        <span className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{item.targetTab}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase text-jdt-olive">{item.recommendedAction}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
                  <p className="text-sm font-black text-jdt-text">No compliance documents need review</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Missing, expired, and expiring driver or vehicle documents will collect here.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Resource Conflicts</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Double-booked crew, drivers, trucks, trailers, or equipment from the operating calendar</p>
              </div>
              <button onClick={() => setActiveTab('calendar')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
                Calendar
              </button>
            </div>
            {dashboardSummary.resourceConflictQueue?.length > 0 ? (
              <div className="divide-y divide-jdt-border">
                {dashboardSummary.resourceConflictQueue.slice(0, 5).map((conflict: any) => {
                  const assignmentLabel = conflict.eventTitles.join(' / ');
                  const resourceMeta = `${conflict.dateIso} / ${conflict.resourceKind}`;
                  return (
                    <button key={conflict.id} type="button" onClick={() => setActiveTab('calendar')} className="block w-full px-1 py-3 text-left hover:bg-jdt-sand/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-jdt-text">{conflict.resourceLabel}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{resourceMeta}</p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${riskPillClass('critical')}`}>Double Booked</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase text-jdt-olive">{assignmentLabel}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
                  <p className="text-sm font-black text-jdt-text">No resource conflicts detected</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Calendar double-bookings will collect here before the schedule goes out.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Workflow Readiness</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Required details missing before dispatch, closeout, or review</p>
              </div>
              <button onClick={() => setActiveTab('reports')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
                Reports
              </button>
            </div>
            {dashboardSummary.workflowReadinessQueue?.length > 0 ? (
              <div className="divide-y divide-jdt-border">
                {dashboardSummary.workflowReadinessQueue.slice(0, 5).map((item: any) => (
                  <button key={item.id} type="button" onClick={() => openWorkflowReadinessItem(item)} className="block w-full px-1 py-3 text-left hover:bg-jdt-sand/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-jdt-text">{item.title}</p>
                        <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{item.workflow} / {item.stage}</p>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>{item.severity}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(item.missingFields || []).slice(0, 4).map((field: string) => (
                        <span key={`${item.id}-${field}`} className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{field}</span>
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase text-jdt-olive">{item.recommendedAction}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
                  <p className="text-sm font-black text-jdt-text">No workflow readiness issues detected</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Missing dispatch, closeout, maintenance, tree, and inventory details will collect here.</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-jdt-text">Data Quality Queue</h3>
                <p className="mt-1 text-xs font-bold text-zinc-500">Client, project, work order, tree, freight, and import cleanup</p>
              </div>
              <button onClick={() => setActiveTab('reports')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
                Reports
              </button>
            </div>
            {dashboardSummary.dataQualityQueue?.length > 0 ? (
              <div className="divide-y divide-jdt-border">
                {dashboardSummary.dataQualityQueue.slice(0, 5).map((item: any) => (
                  <button key={item.id} type="button" onClick={() => openDataQualityItem(item)} className="block w-full px-1 py-3 text-left hover:bg-jdt-sand/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-jdt-text">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-bold text-zinc-500">{item.detail}</p>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>{item.severity}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] font-black uppercase text-jdt-olive">{item.recommendedAction}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
                  <p className="text-sm font-black text-jdt-text">No data quality issues detected</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">Client, project, work order, tree, freight, document, and import problems will collect here.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
        <h3 className="text-sm font-black uppercase text-jdt-text">Quick Actions</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button onClick={() => openModal('job')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Create Project</button>
          <button onClick={() => openModal('tree')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Add tree</button>
          <button onClick={() => openModal('load')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Dispatch Freight Move</button>
          <button onClick={() => setActiveTab('maps')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Open tree map</button>
        </div>
      </section>
    </div>
  );
}

function WorkItemStack({ items, emptyTitle, emptyDetail, onOpen }: { items: DashboardWorkItem[]; emptyTitle: string; emptyDetail: string; onOpen: (item: DashboardWorkItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-dashed border-jdt-border bg-white p-6 text-center">
          <p className="text-sm font-black text-jdt-text">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs font-bold text-zinc-500">{emptyDetail}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-jdt-border">
      {items.map((item) => {
        const category = categoryForWorkItemTone(item.tone);
        return (
          <button key={`${item.drawerType}-${item.id}`} type="button" onClick={() => onOpen(item)} className={`flex w-full items-start justify-between gap-3 border-l-4 px-4 py-3 text-left hover:bg-jdt-sand/50 ${categoryAccentBorderClass(category)}`}>
            <div className="flex min-w-0 items-start gap-3">
              <CategoryIcon category={category} size="xs" className="mt-0.5" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-jdt-text">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{item.detail}</p>
                <p className="mt-2 text-[10px] font-black uppercase text-jdt-olive">{item.assignee}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(item.status)}`}>{item.status}</span>
          </button>
        );
      })}
    </div>
  );
}

function trackerProjectId(record: any): string {
  return String(record?.projectId || record?.projectsId || record?.id || '').trim();
}

function trackerProjectTitle(record: any): string {
  return String(record?.projectName || record?.title || record?.name || 'Untitled project').trim();
}

function trackerClientName(record: any): string {
  return String(record?.clientName || record?.client || 'Unassigned Client').trim();
}

function trackerProjectKey(record: any): string {
  return trackerProjectId(record) || trackerProjectTitle(record).toLowerCase();
}

function trackerFieldMatches(left: unknown, right: unknown): boolean {
  const cleanLeft = String(left || '').trim();
  const cleanRight = String(right || '').trim();
  return Boolean(cleanLeft && cleanRight && cleanLeft === cleanRight);
}

function mergedRelocationInstallationProjects(projects: any[] = [], jobs: any[] = []) {
  const byKey = new Map<string, any>();
  const records = [
    ...jobs.filter(isRelocationInstallationJob).map((record) => ({ ...record, drawerType: 'job' })),
    ...projects.filter(isRelocationInstallationJob).map((record) => ({ ...record, drawerType: 'project' })),
  ];

  records.forEach((record) => {
    const projectId = trackerProjectId(record);
    const projectName = trackerProjectTitle(record);
    const clientName = trackerClientName(record);
    const key = trackerProjectKey(record);
    if (!key) return;
    const normalized = {
      ...record,
      id: record.id || projectId || projectName,
      projectId,
      projectsId: record.projectsId || projectId,
      projectName,
      title: record.title || projectName,
      name: record.name || projectName,
      clientName,
      client: record.client || clientName,
    };
    const existing = byKey.get(key);
    byKey.set(key, existing ? { ...existing, ...normalized } : normalized);
  });

  return Array.from(byKey.values()).sort((left, right) => (
    trackerClientName(left).localeCompare(trackerClientName(right))
    || trackerProjectTitle(left).localeCompare(trackerProjectTitle(right))
  ));
}

export function TrackerBoard({ projects = [], jobs = [], workOrders = [], projectMaterialItems = [], openDrawer, openModal }: any) {
  const [jobFilter, setJobFilter] = useState<RelocationInstallationJobFilter>('All');
  const relocationInstallationProjects = useMemo(() => mergedRelocationInstallationProjects(projects, jobs), [projects, jobs]);
  const filteredProjects = relocationInstallationProjects.filter((project: any) => (
    jobFilter === 'All' || classifyRelocationInstallationJob(project) === jobFilter
  ));
  const filterCounts = relocationInstallationJobFilters.reduce<Record<string, number>>((counts, filter) => {
    counts[filter] = filter === 'All'
      ? relocationInstallationProjects.length
      : relocationInstallationProjects.filter((project: any) => classifyRelocationInstallationJob(project) === filter).length;
    return counts;
  }, {});
  const workOrdersForProject = (project: any) => workOrders.filter((workOrder: WorkOrderRecord) => (
    trackerFieldMatches(workOrder.projectId, project.projectId)
    || trackerFieldMatches(workOrder.projectId, project.projectsId)
    || trackerFieldMatches(workOrder.projectId, project.id)
    || trackerFieldMatches(workOrder.jobId, project.projectId)
    || trackerFieldMatches(workOrder.jobId, project.id)
    || trackerFieldMatches(workOrder.projectName, project.projectName)
    || trackerFieldMatches(workOrder.projectName, project.title)
  ));
  const materialItemsForProject = (project: any) => projectMaterialItems.filter((item: ProjectMaterialItemRecord) => (
    trackerFieldMatches(item.projectId, project.projectId)
    || trackerFieldMatches(item.projectsId, project.projectsId)
    || trackerFieldMatches(item.projectName, project.projectName)
    || trackerFieldMatches(item.projectName, project.title)
  ));
  const projectPayloadForProject = (project: any) => ({
    clientId: project.clientId,
    clientName: project.clientName || project.client,
    projectId: project.projectId || project.id,
    projectsId: project.projectsId || project.projectId || project.id,
    projectName: project.projectName || project.title,
    division: relocationInstallationDivisionLabel,
    location: project.location,
    origin: project.location,
    destination: project.location,
    projectSiteAddressOptions: [
      project.location,
      project.crewAccessAddress,
      project.truckAccessAddress,
      project.constructionAccessPin,
      project.loadUnloadPin,
      project.secondaryLoadUnloadPin,
    ].filter(Boolean),
  });
  const clientGroups = filteredProjects.reduce<Array<{ clientName: string; clientId?: string; projects: any[] }>>((groups, project) => {
    const clientName = trackerClientName(project);
    const clientId = String(project.clientId || '').trim();
    const existing = groups.find((group) => group.clientId === clientId || group.clientName === clientName);
    if (existing) {
      existing.projects.push(project);
      return groups;
    }
    groups.push({ clientName, clientId, projects: [project] });
    return groups;
  }, []);

  return (
    <div className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-jdt-border bg-jdt-sand/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CategoryIcon category="relocation" size="md" />
          <div>
            <h2 className="text-xl font-black text-jdt-primary">{relocationInstallationDivisionLabel}</h2>
            <p className="text-sm font-bold text-zinc-500">Track relocation jobs, installation jobs, and mixed project work from one operating board</p>
          </div>
        </div>
        <button
          onClick={() => openModal('job', { division: relocationInstallationDivisionLabel })}
          className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark"
        >
          New Project
        </button>
      </div>

      {relocationInstallationProjects.length > 0 ? (
        <div>
          <div className="flex flex-wrap gap-2 border-b border-jdt-border bg-white px-4 py-3">
            {relocationInstallationJobFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setJobFilter(filter)}
                className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase transition-colors ${jobFilter === filter ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-jdt-panel text-zinc-600 hover:border-jdt-olive'}`}
              >
                {filter} <span className={jobFilter === filter ? 'text-white/80' : 'text-zinc-400'}>{filterCounts[filter] || 0}</span>
              </button>
            ))}
          </div>

          {filteredProjects.length > 0 ? (
            <div className="space-y-4 bg-jdt-sand/20 p-4">
              {clientGroups.map((group) => (
                <section key={group.clientId || group.clientName} className="overflow-hidden rounded-xl border border-jdt-border bg-white shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-jdt-border bg-jdt-panel px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase text-jdt-primary">{group.clientName}</h3>
                      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{group.clientId || 'No client ID saved'}</p>
                    </div>
                    <span className="rounded-md border border-jdt-border bg-white px-3 py-1 text-[10px] font-black uppercase text-zinc-600">
                      {`${group.projects.length} ${group.projects.length === 1 ? 'project' : 'projects'}`}
                    </span>
                  </div>

                  <div className="divide-y divide-jdt-border">
                    {group.projects.map((project: any) => {
                    const jobType = classifyRelocationInstallationJob(project);
                    const linkedWorkOrders = workOrdersForProject(project);
                    const nextWorkOrder = linkedWorkOrders.find((workOrder: WorkOrderRecord) => !['Complete', 'Cancelled'].includes(String(workOrder.status || ''))) || linkedWorkOrders[0];
                    const linkedEquipmentNames = workOrderResourceNames(linkedWorkOrders, 'equipmentNames');
                    const linkedImplementNames = workOrderResourceNames(linkedWorkOrders, 'implementNames');
                    const linkedLoadNames = workOrderResourceNames(linkedWorkOrders, 'loadNames');
                    const assignmentBase = projectPayloadForProject(project);
                    const linkedMaterialItems = materialItemsForProject(project);
                    const requiredMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityRequired || 0), 0);
                    const installedMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityInstalled || 0), 0);
                    return (
                      <div
                        key={project.id || project.projectId || project.title}
                        className={`cursor-pointer border-l-4 p-4 transition-colors hover:bg-jdt-sand/40 ${relocationInstallationJobTypeAccentClass(jobType)}`}
                        onClick={() => openDrawer(project.drawerType || 'project', project.id || project.projectId || project.title)}
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.15fr)_minmax(220px,0.85fr)_minmax(260px,1fr)]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-[#384521]">{project.title || project.projectName || 'Untitled project'}</p>
                              <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase ${relocationInstallationJobTypeTone(jobType)}`}>
                                {jobType}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">Project ID: {project.projectId || project.id || '-'}</p>
                            <p className="mt-2 text-xs font-bold text-zinc-600">{project.location || project.division || relocationInstallationDivisionLabel}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              aria-label="Create Crew Work"
                              onClick={(event) => {
                                event.stopPropagation();
                                openModal('assign_work', {
                                  ...assignmentBase,
                                  title: `Work order for ${project.title || project.projectName || 'project'}`,
                                  workOrderType: 'general_task',
                                  taskType: 'Field work',
                                  status: 'Draft',
                                  priority: 'Normal',
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded bg-jdt-primary px-2 py-1 text-[9px] font-black uppercase text-white"
                            >
                              <CategoryPill category="crew" compact className="border-white/20 bg-white/10 px-1.5 py-0.5 text-white" />
                              Create Job / Work Order
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openModal('assign_equipment', {
                                  ...assignmentBase,
                                  title: `Equipment for ${project.title || project.projectName || 'project'}`,
                                  workOrderType: 'equipment',
                                  taskType: 'Equipment change request',
                                  status: 'Draft',
                                  priority: 'Normal',
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                            >
                              <CategoryPill category="equipment" compact className="px-1.5 py-0.5" />
                              Request Equipment
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openModal('assign_freight', {
                                  ...assignmentBase,
                                  title: `Freight support for ${project.title || project.projectName || 'project'}`,
                                  workOrderType: 'freight',
                                  taskType: 'Freight support request',
                                  status: 'Draft',
                                  priority: 'Normal',
                                  origin: project.location,
                                  destination: project.location,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                            >
                              <CategoryPill category="freight" compact className="px-1.5 py-0.5" />
                              Request Freight
                            </button>
                          </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-zinc-600 sm:grid-cols-4 xl:grid-cols-2">
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Status</p>
                              <p>{project.status || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Target Date</p>
                              <p>{project.date || project.scheduledDate || project.startDate || 'TBD'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Crew</p>
                              <p>{project.crew || 'Unassigned'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">PM</p>
                              <p>{project.pm || '-'}</p>
                            </div>
                          </div>

                          <div className="font-bold text-zinc-600">
                            <p className="text-[9px] font-black uppercase text-zinc-400">Active Jobs / Work Orders</p>
                            <p className="mt-1 text-sm font-black text-jdt-text">{nextWorkOrder?.title || 'No work order'}</p>
                            <div className="mt-2 flex max-w-md flex-wrap gap-1">
                              {linkedWorkOrders.slice(0, 2).map((workOrder: WorkOrderRecord) => (
                                <span key={workOrder.id || workOrder.jobId || workOrder.title} className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">
                                  {workOrder.jobId || workOrder.status || 'Job'}
                                </span>
                              ))}
                              {linkedEquipmentNames.slice(0, 2).map((name) => <CategoryPill key={name} category="equipment" label={name} className="bg-zinc-100 text-zinc-700" />)}
                              {linkedImplementNames.slice(0, 2).map((name) => <span key={name} className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{name}</span>)}
                              {linkedLoadNames.slice(0, 2).map((name) => <CategoryPill key={name} category="freight" label={name} className="bg-zinc-100 text-zinc-700" />)}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-black uppercase text-zinc-400">Needs</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {!nextWorkOrder?.assignedCrewNames?.length && <CategoryPill category="crew" label="Needs crew" className={riskPillClass('watch')} />}
                              {!linkedEquipmentNames.length && <CategoryPill category="equipment" label="Needs equipment" className={riskPillClass('watch')} />}
                              {!linkedLoadNames.length && <CategoryPill category="freight" label="Needs freight" className={riskPillClass('watch')} />}
                              {requiredMaterialCount > installedMaterialCount && <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${riskPillClass('watch')}`}>{installedMaterialCount}/{requiredMaterialCount} material</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <MapPin className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-black text-jdt-text">No {jobFilter.toLowerCase()} records yet</p>
              <p className="mt-1 text-xs font-bold text-zinc-500">Switch filters or create a new {relocationInstallationDivisionLabel} job.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-black text-jdt-text">No relocation or installation projects yet</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">Create a real project to start tracking active relocation, install, or mixed work.</p>
        </div>
      )}
    </div>
  );
}
