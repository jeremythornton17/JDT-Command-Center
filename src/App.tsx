import { useMemo, useState } from 'react';
import { useFirestoreSyncState } from './useFirestoreCollection';
import {
  AlertTriangle,
  Bell,
  BarChart2,
  Calendar,
  CheckCircle2,
  CirclePause,
  ChevronLeft,
  ChevronRight,
  Database,
  DollarSign,
  FileText,
  Folder,
  Gauge,
  HardHat,
  LayoutGrid,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  Scissors,
  Sun,
  Tractor,
  TreePine,
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
import ArcGisMapBoard from './components/ArcGisMapBoard';
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
import { buildDashboardSummary, type DashboardCommandAlert, type DashboardSummaryInput, type DashboardWorkItem, type FeaturedOperation } from './commandCenter/dashboard';
import { filterSeedRecords } from './commandCenter/operatingIntelligence';
import { applyTelematicsEventsToFreightLoads, buildTelematicsExceptionAlerts } from './commandCenter/telematicsIntelligence';
import { defaultRelocationStatus } from './commandCenter/treeLifecycle';
import { treeRelocationStatusOptions } from './commandCenter/treeRelocationSchema';
import { normalizeProjectImportContext, pasteHeadersForTemplate, sheetImportTemplates, type ImportPreview, type ProjectImportContext, type SheetImportTemplateId } from './commandCenter/sheetImport';
import { dataSyncDraftStorageKey, serializeDataSyncDraft } from './commandCenter/syncDraft';
import { getConfiguredGoogleCalendarName, syncGoogleCalendarToScheduleTasks } from './commandCenter/googleCalendarSync';
import { rescheduledEventDateRange, type OperatingCalendarEvent } from './commandCenter/calendar';
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

const mapNav = [
  { id: 'jdtLocations', label: 'JDT Locations', icon: MapPin },
  { id: 'treeGisMap', label: 'Tree GIS Map', icon: TreePine },
  { id: 'fleetGps', label: 'Fleet GPS', icon: Truck },
  { id: 'mapImports', label: 'Map Imports', icon: Database },
];

const secondaryNav = [
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: Folder },
  { id: 'sheets', label: 'Import / Backup', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const navItems = [...mainNav, ...mapNav, ...secondaryNav];

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

type MapsIntent = {
  mode: 'locations' | 'project' | 'liveGps';
  selectedGpsAssetId?: string;
};

type AppRouteIntent = {
  activeTab: string;
  projectId?: string;
};

function appRouteFromPathname(pathname = typeof window !== 'undefined' ? window.location.pathname : ''): AppRouteIntent | null {
  const projectMapMatch = pathname.match(/^\/projects\/([^/]+)\/map\/?$/);
  if (projectMapMatch?.[1]) {
    return { activeTab: 'treeGisMap', projectId: decodeURIComponent(projectMapMatch[1]) };
  }
  if (/^\/maps\/locations\/?$/.test(pathname)) {
    return { activeTab: 'jdtLocations' };
  }
  if (/^\/maps\/tree-gis\/?$/.test(pathname)) {
    return { activeTab: 'treeGisMap' };
  }
  if (/^\/maps\/fleet-gps\/?$/.test(pathname)) {
    return { activeTab: 'fleetGps' };
  }
  if (/^\/maps\/imports\/?$/.test(pathname)) {
    return { activeTab: 'mapImports' };
  }
  if (/^\/map\/?$/.test(pathname)) {
    return { activeTab: 'treeGisMap' };
  }
  return null;
}

function isLocalDashboardPreviewRoute() {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  return Boolean(isDev && typeof window !== 'undefined' && window.location.pathname === '/dashboard-preview');
}

function isLocalCalendarPreviewRoute() {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  return Boolean(isDev && typeof window !== 'undefined' && window.location.pathname === '/calendar-preview');
}

function isLocalClientsPreviewRoute() {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  return Boolean(isDev && typeof window !== 'undefined' && window.location.pathname === '/clients-preview');
}

function buildDashboardPreviewInput(): DashboardSummaryInput {
  const todayIso = '2026-06-17';
  const activeProjects: ProjectRecord[] = [
    { id: 'preview-boca-west', title: 'Boca West Tree Relocation', name: 'Boca West Tree Relocation', client: 'Boca West Country Club', location: 'Boca Raton, FL', status: 'Active', phase: '50% Cut', crew: 'Christian', equipment: ['Loader 1', 'Loader 2'], nextAction: 'Continue root pruning', notes: 'In Progress', startDate: todayIso, endDate: '2026-06-19' },
    { id: 'preview-frenchmans', title: "Frenchman's Creek", name: "Frenchman's Creek", client: "Frenchman's Creek Country Club", location: 'Palm Beach Gardens, FL', status: 'Active', phase: '70% Cut', crew: 'Carlos', equipment: ['Mini X', 'Telehandler'], nextAction: 'Confirm equipment', notes: 'In Progress', startDate: todayIso },
    { id: 'preview-mcarthur', title: 'McArthur Golf Club', name: 'McArthur Golf Club', client: 'McArthur Golf Club', location: 'Hobe Sound, FL', status: 'Active', phase: 'Relocation', crew: 'Nick', equipment: ['Semi Dropdeck'], nextAction: 'Finish delivery', notes: 'In Progress', startDate: '2026-06-18' },
    { id: 'preview-bellaire', title: 'Bellaire Country Club', name: 'Bellaire Country Club', client: 'Bellaire Country Club', location: 'Bellaire, FL', status: 'Active', phase: 'Relocation', crew: 'Jack', equipment: ['TBD'], nextAction: 'Continue relocation', notes: 'In Progress', startDate: '2026-06-19' },
    { id: 'preview-miakka', title: 'Miakka Golf Club', name: 'Miakka Golf Club', client: 'Miakka Golf Club', location: 'Sarasota, FL', status: 'Active', phase: '60% Cut', crew: 'Jeff / Santiago', equipment: ['Loader 1'], nextAction: 'Continue root pruning', notes: 'In Progress', startDate: '2026-06-20' },
    { id: 'preview-waterford', title: 'Waterford', name: 'Waterford', client: 'Waterford', location: 'Juno Beach, FL', status: 'Active', phase: 'Relocation', crew: 'Carlos', equipment: ['TBD'], nextAction: 'Confirm site requirements', startDate: '2026-06-22' },
    { id: 'preview-pine-tree', title: 'Pine Tree GC', name: 'Pine Tree GC', client: 'Pine Tree Golf Club', location: 'Boynton Beach, FL', status: 'Active', phase: 'Root Prep', crew: 'Warren', equipment: ['Loader 2'], nextAction: 'Set oaks on 18', startDate: '2026-06-23' },
    { id: 'preview-seaglass', title: 'Seaglass', name: 'Seaglass', client: 'Seaglass', location: 'Delray Beach, FL', status: 'Active', phase: '40% Cut', crew: 'Doug', equipment: ['Mini X'], nextAction: 'Continue root pruning', startDate: '2026-06-24' },
  ];
  const upcomingProjects: ProjectRecord[] = Array.from({ length: 4 }, (_, index) => ({
    id: `preview-upcoming-${index + 1}`,
    title: ['Hammock Shores', 'Grove XXIII', 'Treetop Academy', 'Lost Tree'][index],
    location: ['Palm Coast, FL', 'Hobe Sound, FL', 'Fort Myers, FL', 'North Palm Beach, FL'][index],
    status: 'Upcoming',
    phase: 'Scheduled soon',
    crew: 'TBD',
  }));
  const onHoldProjects: ProjectRecord[] = Array.from({ length: 3 }, (_, index) => ({
    id: `preview-hold-${index + 1}`,
    title: ['Waterford Access Review', "Frenchman's Equipment Hold", 'Boca West Billing Hold'][index],
    location: ['Juno Beach, FL', 'Palm Beach Gardens, FL', 'Boca Raton, FL'][index],
    status: 'On Hold',
    phase: 'Awaiting action',
    crew: 'TBD',
  }));

  const treeRelocationRecords: TreeRelocationRecord[] = Array.from({ length: 240 }, (_, index) => {
    const project = activeProjects[index % activeProjects.length];
    return {
      id: `preview-tree-${index + 1}`,
      treeId: String(index + 1).padStart(3, '0'),
      tag: String(index + 1),
      type: index % 3 === 0 ? 'Live Oak' : index % 3 === 1 ? 'Densa Pine' : 'Crepe Myrtle',
      projectId: project.id,
      projectName: project.title,
      relocationStatus: index < 98 ? 'Relocated' : index < 140 ? '50% Cut' : index < 190 ? '25% Cut' : 'Not Started',
      status: index < 98 ? 'Relocated' : 'Active',
      dbh: index % 3 === 0 ? '18' : index % 3 === 1 ? '12' : '7',
    };
  });

  const jobs: JobRecord[] = activeProjects.concat(upcomingProjects, onHoldProjects).map((project) => ({
    id: `job-${project.id}`,
    projectId: project.id,
    projectName: project.title,
    title: project.title,
    client: project.client,
    location: project.location,
    status: project.status,
    jobType: String(project.phase || 'Project Work'),
    crew: project.crew,
    equipment: Array.isArray(project.equipment) ? project.equipment.join(', ') : String(project.equipment || ''),
    nextAction: String(project.nextAction || 'Continue operations'),
    notes: String(project.notes || ''),
    startDate: project.startDate,
    endDate: project.endDate,
  }));

  const clients: ClientRecord[] = [
    {
      id: 'preview-client-boca-west',
      name: 'Boca West Country Club',
      contactName: 'Travis Wehrs',
      phone: '(239) 340-9223',
      email: 'TWehrs@bocawestcc.org',
      billingAddress: '20583 Boca West Dr, Boca Raton, FL 33434',
      billingDetails: 'Net 30',
      clientStatus: 'Active',
      members: [{ name: 'Course Superintendent', role: 'Site Contact', phone: '(239) 340-9223', email: 'TWehrs@bocawestcc.org' }],
    },
    {
      id: 'preview-client-frenchmans',
      name: "Frenchman's Creek Country Club",
      contactName: 'Bill Schmit',
      phone: '904-463-1420',
      email: 'wschmit@frenchmanscreek.com',
      billingAddress: '13495 Tournament Dr, Palm Beach Gardens, FL 33410',
      billingDetails: 'Net 30',
      clientStatus: 'Active',
    },
    {
      id: 'preview-client-mcarthur',
      name: 'McArthur Golf Club',
      contactName: 'Project Manager',
      billingAddress: 'Hobe Sound, FL',
      billingDetails: 'Net 30',
      clientStatus: 'Active',
    },
    {
      id: 'preview-client-missing',
      name: 'Waterford',
      clientStatus: 'Needs Cleanup',
    },
  ];

  const loads: LoadRecord[] = [
    { id: 'preview-load-alex', title: 'McArthur delivery', client: 'McArthur Golf Club', driver: 'Alex', truck: 'Semi #1', trailer: 'Dropdeck', status: 'En Route', origin: 'JD Thornton Nurseries Home Base', delivery: 'McArthur Golf Club', eta: '10:30 AM', date: todayIso },
    { id: 'preview-load-vince', title: 'M&P delivery', client: 'M&P', driver: 'Vince', truck: 'F550 2018', trailer: 'Tag Along', status: 'En Route', origin: 'JD Thornton Nurseries Home Base', delivery: 'M&P delivery', eta: '1:00 PM', date: '2026-06-18' },
    { id: 'preview-load-new', title: 'Starts Monday', client: 'Boca West Country Club', driver: 'New Driver', truck: 'Ram 2500', status: 'Scheduled', origin: 'JD Thornton Nurseries Home Base', delivery: 'Boca West', eta: 'Monday', date: '2026-06-22' },
  ];

  const workOrders: WorkOrderRecord[] = [
    { id: 'preview-wo-christian', title: 'Boca West root prune block', projectName: 'Boca West Tree Relocation', crewLeadName: 'Christian Crew', taskType: '50% Cut', status: 'Active', startDate: todayIso, endDate: '2026-06-19' },
    { id: 'preview-wo-nelson', title: "Frenchman's Creek root prune", projectName: "Frenchman's Creek", crewLeadName: 'Nelson Crew', taskType: '70% Cut', status: 'Active', startDate: todayIso },
    { id: 'preview-wo-carlos', title: 'Bellaire install', projectName: 'Bellaire Country Club', crewLeadName: 'Carlos Crew', taskType: 'Installation', status: 'Active', startDate: '2026-06-19' },
    { id: 'preview-wo-albert', title: 'McArthur oak prep', projectName: 'McArthur Golf Club', crewLeadName: 'Albert Crew', taskType: 'Root Prep', status: 'Active', startDate: '2026-06-18' },
  ];

  const scheduleTasks: ScheduleTaskRecord[] = [
    { id: 'preview-pickup-coastal', title: 'Customer pickup - Coastal Gardens', task: 'Nursery customer pickup', clientCompany: 'Coastal Gardens', startDate: todayIso, status: 'Scheduled', notes: '10:30 AM pickup' },
    { id: 'preview-pickup-signature', title: 'Customer pickup - Signature Landscape', task: 'Nursery customer pickup', clientCompany: 'Signature Landscape', startDate: '2026-06-18', status: 'Scheduled', notes: '2:00 PM pickup' },
    { id: 'preview-irrigation', title: 'Nursery irrigation update', task: 'Irrigation / watering', startDate: '2026-06-20', status: 'Needs Update' },
  ];

  const nurseryTrees: InventoryItemRecord[] = [
    ...Array.from({ length: 76 }, (_, index) => ({ id: `preview-prepped-${index}`, name: 'Live Oak', status: 'Prepped' })),
    ...Array.from({ length: 22 }, (_, index) => ({ id: `preview-needs-prep-${index}`, name: 'Densa Pine', status: 'Needs Prep' })),
    ...Array.from({ length: 31 }, (_, index) => ({ id: `preview-staged-${index}`, name: 'Podocarpus', status: 'Staged for Delivery' })),
  ];

  const equipment: EquipmentRecord[] = [
    ...Array.from({ length: 27 }, (_, index) => ({ id: `preview-eq-in-use-${index}`, name: `Loader ${index + 1}`, category: 'Machine', status: 'In Use', currentLocationName: index % 2 ? 'Boca West' : 'Frenchman’s Creek' })),
    ...Array.from({ length: 9 }, (_, index) => ({ id: `preview-eq-available-${index}`, name: `Trailer ${index + 1}`, category: 'Trailer', status: 'Available', currentLocationName: 'JD Thornton Nurseries Home Base' })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `preview-eq-maint-${index}`, name: `Mini X ${index + 1}`, category: 'Machine', status: 'Maintenance', currentLocationName: 'Shop' })),
    { id: 'preview-water-truck', name: 'Water Truck', category: 'Truck', status: 'Down - blown clutch', currentLocationName: 'Boca West' },
  ];

  const gpsEvents: FleetTelematicsEventRecord[] = [
    { id: 'preview-gps-alex', provider: 'Reveal', vehicleName: 'Semi #1', driverName: 'Alex', status: 'En Route', address: 'McArthur Golf Club', eventAt: `${todayIso}T21:47:00.000Z`, latitude: 27.065, longitude: -80.14, speedMph: 42, matchedEquipmentDocumentName: 'Semi #1' },
    { id: 'preview-gps-vince', provider: 'Reveal', vehicleName: 'F550 2018', driverName: 'Vince', status: 'En Route', address: 'M&P delivery', eventAt: `${todayIso}T21:44:00.000Z`, latitude: 26.82, longitude: -80.25, speedMph: 35, matchedEquipmentDocumentName: 'F550 2018' },
    { id: 'preview-gps-water-truck', provider: 'Reveal', vehicleName: 'Water Truck', driverName: 'Carlos', status: 'Down', address: 'Boca West / blown clutch', eventAt: `${todayIso}T21:40:00.000Z`, latitude: 26.39, longitude: -80.17, speedMph: 0, matchedEquipmentDocumentName: 'Water Truck' },
  ];

  const fieldUpdates: FieldUpdateRecord[] = [
    ...Array.from({ length: 27 }, (_, index) => ({
      id: `demo-issue-${index + 1}`,
      title: `Open field issue ${index + 1}`,
      relatedTitle: index % 2 ? 'Waterford jobsite requirements needed' : 'Water Truck blown clutch',
      crewName: index % 2 ? 'Carlos Reyes' : 'Alex Bueno',
      updateType: 'Issue',
      fieldStatus: 'Needs Attention',
      needsAdminReview: true,
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `demo-report-${index + 1}`,
      title: `Daily report ${index + 1}`,
      relatedTitle: 'Daily closeout report submitted',
      crewName: 'Christian Crew',
      updateType: 'Daily Closeout',
      fieldStatus: 'Closeout Submitted',
    })),
  ];

  const alerts: AlertRecord[] = [
    { id: 'preview-alert-waterford', title: 'Waterford jobsite requirements needed', severity: 'High', body: 'Due today' },
    { id: 'preview-alert-water-truck', title: 'Water Truck blown clutch', severity: 'High', body: 'Equipment blocking dispatch' },
    { id: 'preview-alert-frenchmans', title: "Confirm Frenchman's Creek equipment", severity: 'Medium', body: 'Due tomorrow' },
    { id: 'preview-alert-new-driver', title: 'New driver compliance / contact details', severity: 'Medium', body: 'Before dispatch' },
    { id: 'preview-alert-nursery', title: 'Nursery irrigation update needed', severity: 'Low', body: 'Watering status needs review' },
    { id: 'preview-alert-billing', title: 'Boca West billing packet check', severity: 'Medium', body: 'Office review' },
    { id: 'preview-alert-root-prune', title: 'Root prune schedule confirmation', severity: 'Low', body: 'Confirm crew windows' },
  ];

  return {
    todayIso,
    clients,
    projects: [...activeProjects, ...upcomingProjects, ...onHoldProjects],
    jobs,
    loads,
    trees: nurseryTrees,
    equipment,
    crew: [],
    workOrders,
    scheduleTasks,
    treeRelocationRecords,
    alerts,
    fieldUpdates,
    fleetTelematicsEvents: gpsEvents,
  };
}

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
  const { user, logOut, permissions, authorizeGoogleSheetsAccess, authorizeGoogleCalendarAccess } = useAuth();
  const isDashboardPreview = isLocalDashboardPreviewRoute();
  const isCalendarPreview = isLocalCalendarPreviewRoute();
  const isClientsPreview = isLocalClientsPreviewRoute();
  const isLocalPreview = isDashboardPreview || isCalendarPreview || isClientsPreview;
  const firestoreEnabled = !!user && !isLocalPreview;
  const initialRouteIntent = appRouteFromPathname();
  const [activeTab, setActiveTab] = useState(isCalendarPreview ? 'calendar' : isClientsPreview ? 'clients' : initialRouteIntent?.activeTab || 'board');
  const [arcGisInitialProjectId] = useState(initialRouteIntent?.projectId || '');
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig>({ isOpen: false, type: '', itemId: null, defaultTab: 'overview' });
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ isOpen: false, type: '' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [projectImportContext, setProjectImportContext] = useState<ProjectImportContext | null>(null);
  const [isSyncingRevealVehicles, setIsSyncingRevealVehicles] = useState(false);
  const [revealVehicleSyncStatus, setRevealVehicleSyncStatus] = useState('Ready to sync Verizon Reveal vehicles');
  const [isSyncingRevealRecommendedApis, setIsSyncingRevealRecommendedApis] = useState(false);
  const [revealRecommendedSyncStatus, setRevealRecommendedSyncStatus] = useState('Ready to sync Reveal driver, asset, geofence, inspection, GPS history, and segment APIs');
  const [isSyncingRevealLiveLocations, setIsSyncingRevealLiveLocations] = useState(false);
  const [revealLiveLocationSyncStatus, setRevealLiveLocationSyncStatus] = useState('Ready to sync Reveal live locations');
  const [isSyncingGoogleCalendar, setIsSyncingGoogleCalendar] = useState(false);
  const [googleCalendarSyncStatus, setGoogleCalendarSyncStatus] = useState(`Ready to sync ${getConfiguredGoogleCalendarName()}`);
  const [isPreviewingRevealMatches, setIsPreviewingRevealMatches] = useState(false);
  const [isApprovingRevealMatches, setIsApprovingRevealMatches] = useState(false);
  const [revealMatchReviewStatus, setRevealMatchReviewStatus] = useState('Review Reveal vehicle matches before trusting live GPS updates.');
  const [revealMatchCandidates, setRevealMatchCandidates] = useState<RevealVehicleMatchCandidate[]>([]);
  const [mapsIntent, setMapsIntent] = useState<MapsIntent | null>(null);

  const [jobs, setJobs] = useFirestoreSyncState<JobRecord>('jobs', [], firestoreEnabled);
  const [projects, setProjects] = useFirestoreSyncState<ProjectRecord>('projects', [], firestoreEnabled);
  const [workOrders, setWorkOrders] = useFirestoreSyncState<WorkOrderRecord>('workOrders', [], firestoreEnabled);
  const [projectMaterialItems, setProjectMaterialItems] = useFirestoreSyncState<ProjectMaterialItemRecord>('projectMaterialItems', [], firestoreEnabled);
  const [loads, setLoads] = useFirestoreSyncState<LoadRecord>('loads', [], firestoreEnabled);
  const [ranchOaks, setRanchOaks] = useFirestoreSyncState<RanchOakRecord>('ranchOaks', [], firestoreEnabled);
  const [inventoryItems, setInventoryItems] = useFirestoreSyncState<InventoryItemRecord>('inventoryItems', [], firestoreEnabled);
  const [equipment, setEquipment] = useFirestoreSyncState<EquipmentRecord>('equipment', [], firestoreEnabled);
  const [crews, setCrews] = useFirestoreSyncState<CrewRecord>('crews', [], firestoreEnabled);
  const [staffDirectory, setStaffDirectory] = useFirestoreSyncState<StaffRecord>('staff', [], firestoreEnabled);
  const [clients, setClients] = useFirestoreSyncState<ClientRecord>('clients', [], firestoreEnabled);
  const [locations, setLocations] = useFirestoreSyncState<LocationRecord>('locations', [], firestoreEnabled);
  const [species, setSpecies] = useFirestoreSyncState<SpeciesRecord>('species', [], firestoreEnabled);
  const [scheduleTasks, setScheduleTasks] = useFirestoreSyncState<ScheduleTaskRecord>('scheduleTasks', [], firestoreEnabled);
  const [treeRelocationRecords, setTreeRelocationRecords] = useFirestoreSyncState<TreeRelocationRecord>('treeRelocationRecords', [], firestoreEnabled);
  const [fieldUpdates, setFieldUpdates] = useFirestoreSyncState<FieldUpdateRecord>('fieldUpdates', [], firestoreEnabled);
  const [alerts, setAlerts] = useFirestoreSyncState<AlertRecord>('alerts', [], firestoreEnabled);
  const [fleetTelematicsEvents] = useFirestoreSyncState<FleetTelematicsEventRecord>('fleetTelematicsEvents', [], firestoreEnabled);
  const [documents, setDocuments] = useFirestoreSyncState<DocumentRecord>('documents', [], firestoreEnabled);
  const [syncSources, setSyncSources] = useFirestoreSyncState<SyncSourceRecord>('syncSources', [], firestoreEnabled);
  const [syncMappings, setSyncMappings] = useFirestoreSyncState<SyncMappingRecord>('syncMappings', [], firestoreEnabled);
  const [importBatches, setImportBatches] = useFirestoreSyncState<ImportBatchRecord>('importBatches', [], firestoreEnabled);
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
  const previewInput = useMemo(() => isLocalPreview ? buildDashboardPreviewInput() : null, [isLocalPreview]);
  const dashboardPreviewInput = isDashboardPreview ? previewInput : null;
  const calendarPreviewInput = isCalendarPreview ? previewInput : null;
  const clientsPreviewInput = isClientsPreview ? previewInput : null;

  const dashboardSummary = useMemo(() => buildDashboardSummary(dashboardPreviewInput || {
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
  }), [dashboardPreviewInput, jobs, loadsWithTelematics, nurseryInventory, equipmentWithDefaults, personnel, clients, projects, workOrders, scheduleTasks, treeRelocationRecords, documents, alertsWithTelematics, fieldUpdates, fleetTelematicsEvents, importBatches]);

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

  const handleSyncGoogleCalendar = async (syncRange: { startIso: string; endIso: string; view: string; focusIso: string }) => {
    if (user === null) {
      addToast('Sign in before syncing Google Calendar', 'error');
      return;
    }
    if (!permissions.canManageSources && !permissions.canImport) {
      addToast('You do not have permission to sync Google Calendar into the app.', 'error');
      return;
    }

    setIsSyncingGoogleCalendar(true);
    setGoogleCalendarSyncStatus(`Opening Google authorization for ${getConfiguredGoogleCalendarName()}`);

    try {
      const accessToken = await authorizeGoogleCalendarAccess();
      setGoogleCalendarSyncStatus(`Syncing ${getConfiguredGoogleCalendarName()} for ${syncRange.startIso} to ${syncRange.endIso}`);
      const result = await syncGoogleCalendarToScheduleTasks({
        accessToken,
        existingScheduleTasks: scheduleTasks,
        window: { startIso: syncRange.startIso, endIso: syncRange.endIso },
      });
      const saved = await setScheduleTasks(result.scheduleTasks);
      if (!saved) throw new Error('Google Calendar events imported, but schedule tasks could not be saved to Firestore.');

      const summary = `${result.importedCount} Google Calendar event${result.importedCount === 1 ? '' : 's'} synced from ${result.calendar.summary || getConfiguredGoogleCalendarName()}.${result.removedCount ? ` ${result.removedCount} stale event${result.removedCount === 1 ? '' : 's'} removed.` : ''}`;
      setGoogleCalendarSyncStatus(summary);
      addToast(summary, result.importedCount || result.removedCount ? 'success' : 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Calendar sync failed.';
      setGoogleCalendarSyncStatus(message);
      addToast(message, 'error');
    } finally {
      setIsSyncingGoogleCalendar(false);
    }
  };

  const handleRescheduleCalendarEvent = async (event: OperatingCalendarEvent, nextDateIso: string) => {
    const nextRange = rescheduledEventDateRange(event, nextDateIso);
    const notes = `${event.title} moved to ${nextRange.dateIso}${nextRange.endDateIso !== nextRange.dateIso ? ` through ${nextRange.endDateIso}` : ''}`;
    let matched = false;

    const stampMovedRecord = <T extends CommandRecord>(nextRecord: T, previousRecord: T): T => stampRecordForSave(nextRecord, previousRecord, {
      actorEmail: user?.email,
      event: 'Rescheduled from calendar',
      notes,
    });

    if (event.sourceType === 'job') {
      const saved = await setJobs((prev) => prev.map((job) => {
        const isMatch = job.id === event.recordId || job.jobId === event.recordId || job.projectId === event.recordId || job.title === event.recordId;
        if (!isMatch) return job;
        matched = true;
        return stampMovedRecord({
          ...job,
          startDate: nextRange.dateIso,
          endDate: nextRange.endDateIso,
          scheduledDate: nextRange.dateIso,
          scheduledEndDate: nextRange.endDateIso,
        }, job);
      }));
      addToast(saved && matched ? `Calendar item rescheduled: ${event.title}` : `Could not reschedule ${event.title}`, saved && matched ? 'success' : 'error');
      return;
    }

    if (event.sourceType === 'freight') {
      const saved = await setLoads((prev) => prev.map((load) => {
        const isMatch = load.id === event.recordId || load.loadNumber === event.recordId || load.title === event.recordId;
        if (!isMatch) return load;
        matched = true;
        return stampMovedRecord({
          ...load,
          date: nextRange.dateIso,
          pickupDate: nextRange.dateIso,
          deliveryDate: nextRange.endDateIso,
        }, load);
      }));
      addToast(saved && matched ? `Freight move rescheduled: ${event.title}` : `Could not reschedule ${event.title}`, saved && matched ? 'success' : 'error');
      return;
    }

    if (event.sourceType === 'workOrder') {
      const saved = await setWorkOrders((prev) => prev.map((workOrder) => {
        const isMatch = workOrder.id === event.recordId || workOrder.jobId === event.recordId || workOrder.projectId === event.recordId || workOrder.title === event.recordId;
        if (!isMatch) return workOrder;
        matched = true;
        return stampMovedRecord({
          ...workOrder,
          startDate: nextRange.dateIso,
          scheduledDate: nextRange.dateIso,
          endDate: nextRange.endDateIso,
        }, workOrder);
      }));
      addToast(saved && matched ? `Work order rescheduled: ${event.title}` : `Could not reschedule ${event.title}`, saved && matched ? 'success' : 'error');
      return;
    }

    if (event.sourceType === 'scheduleTask') {
      const saved = await setScheduleTasks((prev) => prev.map((task) => {
        const isMatch = task.id === event.recordId || task.jobScheduleId === event.recordId || task.title === event.recordId || task.task === event.recordId;
        if (!isMatch) return task;
        matched = true;
        return stampMovedRecord({
          ...task,
          date: nextRange.dateIso,
          startDate: nextRange.dateIso,
          endDate: nextRange.endDateIso,
        }, task);
      }));
      addToast(saved && matched ? `Schedule item rescheduled: ${event.title}` : `Could not reschedule ${event.title}`, saved && matched ? 'success' : 'error');
      return;
    }

    addToast('This planner item cannot be rescheduled from the calendar grid.', 'info');
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

  const openLiveGpsMap = (selectedGpsAssetId?: string) => {
    setMapsIntent({ mode: 'liveGps', selectedGpsAssetId });
    setActiveTab('fleetGps');
    setIsSidebarOpen(false);
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
    const typedRelocationMap = relocationMap as TreeRelocationRecord['relocationMap'];
    const updateRecord = (item: RanchOakRecord) => (
      item.id === treeId || item.treeId === treeId ? { ...item, ...relocationContext, relocationMap } : item
    );
    setRanchOaks((prev) => prev.map(updateRecord));
    setInventoryItems((prev) => prev.map(updateRecord));
    setTreeRelocationRecords((prev) => prev.map((item) => (
      item.id === treeId || item.treeId === treeId ? { ...item, ...relocationContext, relocationMap: typedRelocationMap } : item
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

  const handleSaveArcGisTreePoint = async (record: TreeRelocationRecord) => {
    const enrichedRecord = enrichProjectTreeAssetRecord(record);
    const saved = await setTreeRelocationRecords((prev) => upsertRecordWithAudit(
      prev,
      enrichedRecord,
      'tree',
      user?.email,
      'arcgis tree point',
      (item) => sameProjectTreeAsset(item, enrichedRecord),
    ));
    addToast(saved ? `ArcGIS tree point saved: ${record.treeId || record.id}` : 'ArcGIS tree point could not be saved', saved ? 'success' : 'error');
  };

  const getArcGisAuthToken = async () => {
    if (user === null) throw new Error('Sign in before syncing ArcGIS hosted layers.');
    return user.getIdToken();
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

  const handleSyncRevealLiveLocations = async () => {
    if (user === null) {
      addToast('Sign in before syncing Reveal live locations', 'error');
      return;
    }

    setIsSyncingRevealLiveLocations(true);
    setRevealLiveLocationSyncStatus('Syncing Reveal live GPS locations...');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/integrations/reveal/live-locations/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'live-gps-map' }),
      });
      const result = await response.json() as {
        ok?: boolean;
        checked?: number;
        synced?: number;
        written?: number;
        skipped?: Array<{ name?: string; reason?: string }>;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Reveal live location sync failed.');
      }

      const skippedCount = result.skipped?.length || 0;
      const firstReason = result.skipped?.[0]?.reason;
      const summary = result.synced
        ? `${result.synced} Reveal live location${result.synced === 1 ? '' : 's'} synced.${skippedCount ? ` ${skippedCount} skipped.` : ''}`
        : `${result.checked || 0} Reveal vehicle${result.checked === 1 ? '' : 's'} checked, no live GPS synced.${firstReason ? ` ${firstReason}` : ''}`;
      setRevealLiveLocationSyncStatus(summary);
      addToast(summary, result.synced ? 'success' : 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reveal live location sync failed.';
      setRevealLiveLocationSyncStatus(message);
      addToast(message, 'error');
    } finally {
      setIsSyncingRevealLiveLocations(false);
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

  const handleApproveRevealMatches = async (candidates: RevealVehicleMatchCandidate[]) => {
    if (user === null) {
      addToast('Sign in before approving Reveal matches', 'error');
      return;
    }

    const approvals = candidates
      .map((candidate) => ({
        revealVehicleId: candidate.revealVehicleId,
        jdtEquipmentId: candidate.jdtEquipmentId,
      }))
      .filter((approval): approval is { revealVehicleId: string; jdtEquipmentId: string } => Boolean(approval.revealVehicleId && approval.jdtEquipmentId));

    if (approvals.length === 0) {
      addToast('Select a Reveal vehicle match with a JDT equipment record before approving.', 'info');
      return;
    }

    setIsApprovingRevealMatches(true);
    setRevealMatchReviewStatus(`Approving ${approvals.length} Reveal match${approvals.length === 1 ? '' : 'es'}...`);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/integrations/reveal/vehicles/matches/approve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'equipment-board', approvals }),
      });
      const result = await response.json() as {
        ok?: boolean;
        approved?: Array<{ revealVehicleId: string; jdtEquipmentId: string }>;
        skipped?: Array<{ revealVehicleId?: string; jdtEquipmentId?: string; reason: string }>;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Reveal match approval failed.');
      }

      const approvedMatches = result.approved || [];
      const skippedCount = result.skipped?.length || 0;
      const approvedKeys = new Set(approvedMatches.map((approval) => `${approval.revealVehicleId}:${approval.jdtEquipmentId}`));
      setRevealMatchCandidates((previous) => previous.map((candidate) => (
        approvedKeys.has(`${candidate.revealVehicleId || ''}:${candidate.jdtEquipmentId || ''}`)
          ? {
            ...candidate,
            confidence: 'Approved',
            status: 'matched',
            recommendedAction: 'Approved match. Reveal can update this JDT equipment record.',
          }
          : candidate
      )));

      const summary = `${approvedMatches.length} Reveal match${approvedMatches.length === 1 ? '' : 'es'} approved.${skippedCount ? ` ${skippedCount} skipped.` : ''}`;
      setRevealMatchReviewStatus(summary);
      addToast(summary, approvedMatches.length ? 'success' : 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reveal match approval failed.';
      setRevealMatchReviewStatus(message);
      addToast(message, 'error');
    } finally {
      setIsApprovingRevealMatches(false);
    }
  };

  const renderActiveBoard = () => {
    switch (activeTab) {
      case 'tracker':
        return <TrackerBoard projects={projects} jobs={jobs} workOrders={workOrders} projectMaterialItems={projectMaterialItems} treeRelocationRecords={treeRelocationRecords} openDrawer={openDrawer} openModal={openModal} />;
      case 'freight':
        return <FreightBoard loads={loadsWithTelematics} equipment={equipmentWithDefaults} workOrders={workOrders} openDrawer={openDrawer} openModal={openModal} onOpenLiveMap={() => openLiveGpsMap()} />;
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
            isSyncingRevealLiveLocations={isSyncingRevealLiveLocations}
            revealLiveLocationSyncStatus={revealLiveLocationSyncStatus}
            onSyncRevealLiveLocations={handleSyncRevealLiveLocations}
            isPreviewingRevealMatches={isPreviewingRevealMatches}
            revealMatchReviewStatus={revealMatchReviewStatus}
            onPreviewRevealMatches={handlePreviewRevealMatches}
            isApprovingRevealMatches={isApprovingRevealMatches}
            onApproveRevealMatches={handleApproveRevealMatches}
            revealMatchCandidates={revealMatchCandidates}
            onOpenLiveMap={openLiveGpsMap}
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
        return <ClientsBoard clients={clientsPreviewInput?.clients || clients} projects={clientsPreviewInput?.projects || projects} jobs={clientsPreviewInput?.jobs || jobs} openModal={openModal} openDrawer={openDrawer} />;
      case 'alerts':
        return <AlertsBoard alerts={alertsWithTelematics} setAlerts={setAlerts} openModal={openModal} />;
      case 'calendar':
        return (
          <CalendarBoard
            jobs={calendarPreviewInput?.jobs || jobs}
            loads={calendarPreviewInput?.loads || loadsWithTelematics}
            workOrders={calendarPreviewInput?.workOrders || workOrders}
            scheduleTasks={calendarPreviewInput?.scheduleTasks || scheduleTasks}
            treeRelocationRecords={calendarPreviewInput?.treeRelocationRecords || treeRelocationRecords}
            equipment={calendarPreviewInput?.equipment || equipmentWithDefaults}
            todayIso={calendarPreviewInput?.todayIso}
            canSyncGoogleCalendar={!isCalendarPreview && (permissions.canManageSources || permissions.canImport)}
            isSyncingGoogleCalendar={isSyncingGoogleCalendar}
            googleCalendarSyncStatus={googleCalendarSyncStatus}
            onSyncGoogleCalendar={handleSyncGoogleCalendar}
            onRescheduleEvent={isCalendarPreview ? undefined : handleRescheduleCalendarEvent}
            openDrawer={openDrawer}
          />
        );
      case 'jdtLocations':
        return (
          <MapsBoard
            key="maps-jdt-locations"
            pagePurpose="locations"
            jobs={jobs}
            loads={loadsWithTelematics}
            scheduleTasks={scheduleTasks}
            ranchOaks={nurseryInventory}
            treeRelocationRecords={treeRelocationRecords}
            locationsList={locationsWithDefaults}
            equipment={equipmentWithDefaults}
            fleetTelematicsEvents={fleetTelematicsEvents}
            canSyncRevealLiveLocations={permissions.canManageSources}
            isSyncingRevealLiveLocations={isSyncingRevealLiveLocations}
            revealLiveLocationSyncStatus={revealLiveLocationSyncStatus}
            onSyncRevealLiveLocations={handleSyncRevealLiveLocations}
            onUpdateTreeLocation={handleUpdateTreeLocation}
            onImportTreePins={handleImportTreePinsFromMap}
            openDrawer={openDrawer}
          />
        );
      case 'treeGisMap':
        return (
          <ArcGisMapBoard
            initialProjectId={arcGisInitialProjectId}
            projects={projects}
            jobs={jobs}
            treeRelocationRecords={treeRelocationRecords}
            ranchOaks={nurseryInventory}
            equipment={equipmentWithDefaults}
            locations={locationsWithDefaults}
            workOrders={workOrders}
            onSaveTreePoint={handleSaveArcGisTreePoint}
            getAuthToken={getArcGisAuthToken}
          />
        );
      case 'fleetGps':
        return (
          <MapsBoard
            key={`maps-fleet-gps-${mapsIntent?.selectedGpsAssetId || 'all'}`}
            pagePurpose="fleetGps"
            jobs={jobs}
            loads={loadsWithTelematics}
            scheduleTasks={scheduleTasks}
            ranchOaks={nurseryInventory}
            treeRelocationRecords={treeRelocationRecords}
            locationsList={locationsWithDefaults}
            equipment={equipmentWithDefaults}
            fleetTelematicsEvents={fleetTelematicsEvents}
            canSyncRevealLiveLocations={permissions.canManageSources}
            isSyncingRevealLiveLocations={isSyncingRevealLiveLocations}
            revealLiveLocationSyncStatus={revealLiveLocationSyncStatus}
            onSyncRevealLiveLocations={handleSyncRevealLiveLocations}
            initialSelectedGpsAssetId={mapsIntent?.selectedGpsAssetId}
            onUpdateTreeLocation={handleUpdateTreeLocation}
            openDrawer={openDrawer}
          />
        );
      case 'mapImports':
        return (
          <MapsBoard
            key="maps-imports"
            pagePurpose="imports"
            jobs={jobs}
            loads={loadsWithTelematics}
            scheduleTasks={scheduleTasks}
            ranchOaks={nurseryInventory}
            treeRelocationRecords={treeRelocationRecords}
            locationsList={locationsWithDefaults}
            equipment={equipmentWithDefaults}
            fleetTelematicsEvents={fleetTelematicsEvents}
            onUpdateTreeLocation={handleUpdateTreeLocation}
            onImportTreePins={handleImportTreePinsFromMap}
            openDrawer={openDrawer}
          />
        );
      case 'reports':
        return <ReportsBoard jobs={jobs} projects={projects} workOrders={workOrders} loads={loadsWithTelematics} ranchOaks={nurseryInventory} equipment={equipmentWithDefaults} alerts={alertsWithTelematics} clients={clients} fieldUpdates={fieldUpdates} scheduleTasks={scheduleTasks} treeRelocationRecords={treeRelocationRecords} documents={documents} fleetTelematicsEvents={fleetTelematicsEvents} importBatches={importBatches} />;
      case 'documents':
        return <DocumentsBoard documents={documents} openModal={openModal} />;
      case 'sheets':
        return <SyncBoard sources={syncSources} mappings={syncMappings} importBatches={importBatches} openModal={openModal} openDrawer={openDrawer} onImportPreview={handleImportPreview} onRollbackImport={handleRollbackImport} canImport={permissions.canImport} projectImportContext={projectImportContext} projects={projects} treeRelocationRecords={treeRelocationRecords} workOrders={workOrders} projectMaterialItems={projectMaterialItems} documents={documents} authorizeGoogleSheetsAccess={authorizeGoogleSheetsAccess} />;
      case 'settings':
        return <SettingsBoard openModal={openModal} onClearSeedData={handleClearSeedData} />;
      default:
      return <Dashboard user={user} recentRecords={recentRecords} dashboardSummary={dashboardSummary} workOrders={workOrders} openModal={openModal} openDrawer={openDrawer} setActiveTab={setActiveTab} />;
    }
  };

  const isDashboardActive = activeTab === 'board';
  const isMapActive = ['jdtLocations', 'treeGisMap', 'fleetGps', 'mapImports'].includes(activeTab);
  const isCalendarActive = activeTab === 'calendar';

  return (
    <div className="min-h-screen bg-jdt-bg text-jdt-text">
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-jdt-border bg-jdt-primary px-4 py-3 text-white">
        <button type="button" onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 hover:bg-white/10"><Menu className="h-5 w-5" /></button>
        <span className="text-sm font-black uppercase tracking-wide">JDT Command Center</span>
        <button type="button" onClick={logOut} className="rounded-lg p-2 hover:bg-white/10"><LogOut className="h-5 w-5" /></button>
      </div>

      <div className="flex">
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-jdt-primary text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:translate-x-0 lg:h-screen ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
          <div className="flex h-full flex-col">
            <div className={`flex items-center justify-between gap-3 border-b border-white/10 py-5 ${isSidebarCollapsed ? 'px-3 lg:px-2' : 'px-5'}`}>
              <div className={`jdt-sidebar-brand min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                <img src="/jd-thornton-logo.png" alt="JD Thornton Nurseries" className="h-24 w-40 rounded-sm bg-white object-contain p-2 shadow-sm" />
                <p className="mt-3 text-[0.78rem] font-black uppercase tracking-[0.18em] text-white/85">Command Center</p>
                <p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white/50">Big Trees, Big Moves</p>
              </div>
              <div className="flex items-center gap-1">
                {isSidebarCollapsed ? (
                  <button
                    type="button"
                    aria-label="Expand sidebar"
                    title="Expand sidebar"
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 lg:flex"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 lg:flex"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => setIsSidebarOpen(false)} className="lg:hidden rounded-lg p-2 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <nav className={`flex-1 overflow-y-auto py-4 space-y-6 ${isSidebarCollapsed ? 'px-3 lg:px-2' : 'px-3'}`}>
              <NavGroup label="Operations" items={mainNav} activeTab={activeTab} setActiveTab={setActiveTab} closeMenu={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
              <NavGroup label="Maps" items={mapNav} activeTab={activeTab} setActiveTab={setActiveTab} closeMenu={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
              <NavGroup label="Workspace" items={secondaryNav} activeTab={activeTab} setActiveTab={setActiveTab} closeMenu={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
            </nav>

            <div className={`border-t border-white/10 p-3 ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
              <button onClick={logOut} title="Sign Out" className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-black text-white/75 hover:bg-white/10 hover:text-white ${isSidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                <LogOut className="h-4 w-4" /> <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <button type="button" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />}

        <main className={`min-w-0 flex-1 ${isMapActive || isDashboardActive || isCalendarActive ? 'p-3 sm:p-4 lg:p-5' : 'p-4 sm:p-6 lg:p-8'}`}>
          {!isDashboardActive && !isCalendarActive && (
            <header className="mb-6 flex flex-col gap-4 border-b border-jdt-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Live Workspace</p>
                <h2 className="mt-1 text-3xl font-black text-jdt-primary">{activeNav.label}</h2>
              </div>
              <button onClick={() => openModal('job')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors">
                <Plus className="h-4 w-4" /> New Project
              </button>
            </header>
          )}

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

function NavGroup({ label, items, activeTab, setActiveTab, closeMenu, collapsed }: any) {
  return (
    <div>
      <p className={`px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-2 ${collapsed ? 'lg:sr-only' : ''}`}>{label}</p>
      <div className="space-y-1">
        {items.map((item: any) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); closeMenu(); }}
              title={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-black transition-colors ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${active ? 'bg-white text-jdt-primary shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />
              <span className={`min-w-0 flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              {active && !collapsed && <ChevronRight className="h-4 w-4" />}
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
  todayWork: Calendar,
  blockedDecision: AlertTriangle,
  treesReady: TreePine,
  rootPruneDue: Scissors,
  careFollowUps: Leaf,
  equipmentConflicts: Tractor,
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

const overviewKpiIcons: Record<string, typeof LayoutGrid> = {
  activeProjects: LayoutGrid,
  inProgress: CheckCircle2,
  upcoming: Calendar,
  onHold: CirclePause,
  openIssues: AlertTriangle,
  relocatedTrees: TreePine,
  activeAlerts: AlertTriangle,
  reportsToday: BarChart2,
};

const overviewKpiToneClass: Record<string, string> = {
  green: 'border-emerald-100 bg-emerald-50/40 text-emerald-800',
  blue: 'border-blue-100 bg-blue-50/50 text-blue-800',
  amber: 'border-amber-100 bg-amber-50/50 text-amber-800',
  red: 'border-red-100 bg-red-50/50 text-red-800',
  purple: 'border-violet-100 bg-violet-50/50 text-violet-800',
  teal: 'border-teal-100 bg-teal-50/50 text-teal-800',
};

const movementToneClass: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  moving: 'bg-blue-50 text-blue-800',
  scheduled: 'bg-amber-50 text-amber-800',
  issue: 'bg-red-50 text-red-800',
  stale: 'bg-zinc-100 text-zinc-600',
};

const mapMarkerClass: Record<string, string> = {
  active: 'bg-emerald-600',
  moving: 'bg-blue-600',
  scheduled: 'bg-amber-500',
  issue: 'bg-red-600',
  stale: 'bg-zinc-500',
};

function formatOverviewDate(value: string) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatOverviewTime(value: string) {
  if (!value || value === 'No sync yet') return value || 'No sync yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsed);
}

function displayFirstName(user: any) {
  const source = user?.displayName || user?.email || '';
  const first = String(source).split('@')[0].split(/[.\s_-]+/).find(Boolean);
  if (!first) return 'Jeremy';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function initialsForUser(user: any) {
  const name = user?.displayName || user?.email || 'Jeremy';
  const parts = String(name).replace(/@.*/, '').split(/[.\s_-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'JR').toUpperCase();
}

function openDashboardRecord(item: any, setActiveTab: (tab: string) => void, openDrawer: (type: string, id: string) => void, fallbackTab = 'tracker') {
  if (item?.recordId && item?.drawerType && drawerBackedTypes.has(item.drawerType)) {
    openDrawer(item.drawerType, item.recordId);
    return;
  }
  setActiveTab(item?.targetTab || fallbackTab);
}

export function Dashboard({ user, dashboardSummary, openDrawer, setActiveTab }: any) {
  const overview = dashboardSummary.overview;
  const displayName = displayFirstName(user);
  const userInitials = initialsForUser(user);

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black text-jdt-primary">Welcome back, {displayName}</p>
          <h2 className="mt-0.5 text-3xl font-black tracking-normal text-jdt-primary">Command Center Overview</h2>
          <p className="mt-1 text-sm font-semibold text-zinc-500">Live summary of today's operations, projects, crews, freight, nursery, equipment, and critical needs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-jdt-text">
          <div className="rounded-full border border-jdt-border bg-white px-3 py-1.5 text-xs font-black shadow-sm">{formatOverviewDate(overview.date)}</div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-white px-3 py-1.5 text-xs font-black shadow-sm">
            <Sun className="h-4 w-4 text-amber-400" /> 86 F
          </div>
          <button type="button" onClick={() => setActiveTab('alerts')} className="relative rounded-full border border-jdt-border bg-white p-2.5 shadow-sm hover:border-jdt-olive">
            <Bell className="h-4 w-4 text-jdt-primary" />
            <span className="absolute -right-1 -top-1 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-black text-white">{overview.kpis.find((kpi: any) => kpi.id === 'activeAlerts')?.value || 0}</span>
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-jdt-primary text-xs font-black text-white shadow-sm">{userInitials}</div>
        </div>
      </header>

      <section className="grid gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {overview.kpis.map((kpi: any) => {
          const Icon = overviewKpiIcons[kpi.id] || LayoutGrid;
          return (
            <button key={kpi.id} type="button" onClick={() => setActiveTab(kpi.targetTab)} className="min-h-[70px] rounded-lg border border-jdt-border bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-jdt-olive hover:shadow-md">
              <div className="flex items-start gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${overviewKpiToneClass[kpi.tone] || overviewKpiToneClass.green}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black uppercase text-zinc-600">{kpi.label}</p>
                  <p className="mt-0.5 text-xl font-black leading-none text-jdt-primary">{kpi.value}</p>
                  <p className="mt-0.5 truncate text-[10px] font-bold text-zinc-500">{kpi.detail}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-[3fr_5fr] 2xl:grid-cols-[4fr_7fr]">
        <FleetGpsQuickGlanceCard fleetGps={overview.fleetGps} setActiveTab={setActiveTab} />
        <ProjectSnapshotsCard projects={overview.projectSnapshots} openDrawer={openDrawer} setActiveTab={setActiveTab} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FreightTodayOverviewCard items={overview.freightToday} setActiveTab={setActiveTab} />
        <CrewAtGlanceOverviewCard items={overview.crewAtGlance} setActiveTab={setActiveTab} />
        <NurseryOverviewCard snapshot={overview.nurserySnapshot} setActiveTab={setActiveTab} />
        <EquipmentStatusOverviewCard status={overview.equipmentStatus} setActiveTab={setActiveTab} />
        <AttentionOverviewCard items={overview.alerts} openDrawer={openDrawer} setActiveTab={setActiveTab} />
      </section>
    </div>
  );
}

function OverviewCardShell({ icon: Icon, title, children, footer, accent = 'bg-emerald-50 text-emerald-800' }: { icon: any; title: string; children: any; footer?: any; accent?: string }) {
  return (
    <section className="rounded-lg border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-xs font-black uppercase text-jdt-text">{title}</h3>
      </div>
      {children}
      {footer}
    </section>
  );
}

function FleetGpsQuickGlanceCard({ fleetGps, setActiveTab }: { fleetGps: any; setActiveTab: (tab: string) => void }) {
  const statItems = [
    ['GPS assets visible', fleetGps.visibleAssets],
    ['Vehicles on road', fleetGps.vehiclesOnRoad],
    ['Equipment offsite', fleetGps.equipmentOffsite],
    ['Unmatched GPS', fleetGps.unmatchedAssets],
  ];
  const markerPositions = [
    ['20%', '22%'], ['42%', '34%'], ['68%', '28%'], ['76%', '62%'], ['36%', '70%'],
    ['55%', '56%'], ['88%', '42%'], ['14%', '64%'], ['61%', '78%'], ['29%', '44%'],
  ];

  return (
    <section className="rounded-lg border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wide text-jdt-primary">Fleet GPS Quick Glance</h3>
          <p className="mt-0.5 text-xs font-semibold text-zinc-500">Live vehicle, equipment, freight, and unmatched GPS asset tracking</p>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-800">Last sync {formatOverviewTime(fleetGps.lastSyncAt)}</span>
      </div>

      <button type="button" onClick={() => setActiveTab('fleetGps')} className="relative h-28 w-full overflow-hidden rounded-lg border border-jdt-border bg-[radial-gradient(circle_at_25%_20%,#365f48_0,#214735_28%,#163628_42%,#243f31_57%,#496245_74%,#1d3b2e_100%)] text-left shadow-inner xl:h-36">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(35deg,transparent_0_44%,rgba(255,255,255,.22)_45%_47%,transparent_48%_100%),linear-gradient(120deg,transparent_0_55%,rgba(84,196,140,.24)_56%_58%,transparent_59%_100%)]" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-3 py-1 text-[10px] font-black text-jdt-primary shadow-sm">Satellite</span>
        <span className="absolute bottom-3 left-3 rounded-lg bg-zinc-950/75 px-3 py-2 text-xs font-bold text-white">{fleetGps.visibleAssets} GPS assets visible • Last sync {formatOverviewTime(fleetGps.lastSyncAt)}</span>
        {(fleetGps.mapMarkers?.length ? fleetGps.mapMarkers : fleetGps.movements).slice(0, 10).map((marker: any, index: number) => {
          const [left, top] = markerPositions[index % markerPositions.length];
          return (
            <span key={marker.id || `${marker.label}-${index}`} title={marker.label} className={`absolute h-3 w-3 rounded-full border-2 border-white shadow-lg ${mapMarkerClass[marker.tone] || mapMarkerClass.active}`} style={{ left, top }} />
          );
        })}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {statItems.map(([label, value]) => (
          <div key={label} className="rounded-md border border-jdt-border bg-jdt-panel px-2.5 py-2">
            <p className="text-xl font-black leading-none text-jdt-primary">{value}</p>
            <p className="mt-1 text-[9px] font-black uppercase text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-black uppercase text-jdt-text">Quick movement</p>
        <div className="space-y-1.5">
          {(fleetGps.movements || []).slice(0, 4).map((item: any) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,.7fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs">
              <span className="truncate font-black text-jdt-text">{item.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${movementToneClass[item.tone] || movementToneClass.active}`}>{item.status}</span>
              <span className="truncate font-semibold text-zinc-500">{item.detail}</span>
            </div>
          ))}
          {(!fleetGps.movements || fleetGps.movements.length === 0) && (
            <p className="rounded-md border border-dashed border-jdt-border bg-jdt-panel px-3 py-3 text-xs font-semibold text-zinc-500">No live GPS movement records yet.</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => setActiveTab('fleetGps')} className="rounded-full bg-jdt-primary px-4 py-1.5 text-[11px] font-black uppercase text-white hover:bg-jdt-dark">Open Fleet Map</button>
        <button type="button" onClick={() => setActiveTab('fleetGps')} className="rounded-full border border-jdt-border bg-white px-4 py-1.5 text-[11px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Sync GPS</button>
      </div>
    </section>
  );
}

function ProjectSnapshotsCard({ projects, openDrawer, setActiveTab }: { projects: any[]; openDrawer: (type: string, id: string) => void; setActiveTab: (tab: string) => void }) {
  return (
    <section className="rounded-lg border border-jdt-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wide text-jdt-text">Project Snapshots</h3>
          <p className="mt-0.5 text-xs font-semibold text-zinc-500">Quick status cards for active relocation and installation work</p>
        </div>
        <button type="button" onClick={() => setActiveTab('tracker')} className="text-[11px] font-black uppercase text-jdt-olive hover:text-jdt-primary">View all projects</button>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <button key={project.id} type="button" onClick={() => openDashboardRecord(project, setActiveTab, openDrawer, 'tracker')} className="rounded-lg border border-jdt-border border-l-4 border-l-jdt-primary bg-jdt-panel p-2.5 text-left transition hover:-translate-y-0.5 hover:border-jdt-olive hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-jdt-text">{project.name}</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-zinc-500">{project.location}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${statusPillClass(project.status)}`}>{project.status}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-[56px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[10px]">
                <span className="font-black uppercase text-zinc-500">Phase</span><span className="font-bold text-jdt-text">{project.phase}</span>
                <span className="font-black uppercase text-zinc-500">Crew</span><span className="truncate font-bold text-jdt-text">{project.crewLead}</span>
                <span className="font-black uppercase text-zinc-500">Equipment</span><span className="truncate font-bold text-jdt-text">{project.equipment?.join(', ') || 'TBD'}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-jdt-primary" style={{ width: `${Math.max(0, Math.min(100, project.progressPercent || 0))}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-bold">
                <span className="text-emerald-700">Trees: {project.treesRelocatedCount} of {project.treesTotalCount} relocated</span>
                <span className={project.issuesCount > 0 ? 'text-red-700' : 'text-emerald-700'}>Issues: {project.issuesCount}</span>
              </div>
              <p className="mt-1 truncate text-[10px] font-black text-jdt-olive">Next: {project.nextAction}</p>
            </button>
          ))}
        </div>
      ) : (
        <DashboardEmpty icon={LayoutGrid} title="No project snapshots yet" detail="Active, upcoming, and on-hold project summaries will appear here once projects are saved." compact />
      )}
    </section>
  );
}

function FreightTodayOverviewCard({ items, setActiveTab }: { items: any[]; setActiveTab: (tab: string) => void }) {
  return (
    <OverviewCardShell icon={Truck} title="Freight Today" accent="bg-blue-50 text-blue-800" footer={<OverviewFooter label="View all freight" onClick={() => setActiveTab('freight')} />}>
      <div className="space-y-2">
        {items.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-start gap-2 rounded-md border border-jdt-border bg-jdt-panel p-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-black text-blue-800">{item.driverName.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-jdt-text">{item.driverName}</p>
              <p className="truncate text-[11px] font-semibold text-zinc-500">{item.assignmentSummary}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-zinc-500">{item.destination}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${movementToneClass[fleetToneForDisplay(item.status)]}`}>{item.status}</span>
          </div>
        ))}
        {items.length === 0 && <CompactEmpty text="No freight moves are active today." />}
      </div>
    </OverviewCardShell>
  );
}

function CrewAtGlanceOverviewCard({ items, setActiveTab }: { items: any[]; setActiveTab: (tab: string) => void }) {
  return (
    <OverviewCardShell icon={HardHat} title="Crew at a Glance" accent="bg-emerald-50 text-emerald-800" footer={<OverviewFooter label="View all crews" onClick={() => setActiveTab('crews')} />}>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-jdt-border bg-jdt-panel p-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-jdt-text">{item.crewLead}</p>
              <p className="truncate text-[11px] font-semibold text-zinc-500">{item.currentJob}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-800">{item.phase}</span>
          </div>
        ))}
        {items.length === 0 && <CompactEmpty text="No crew assignments are visible yet." />}
      </div>
    </OverviewCardShell>
  );
}

function NurseryOverviewCard({ snapshot, setActiveTab }: { snapshot: any; setActiveTab: (tab: string) => void }) {
  const rows = [
    ['Orders Today', snapshot.ordersToday],
    ['Trees Prepped', snapshot.treesPrepped],
    ['Needs Prepped', snapshot.needsPrepped],
    ['Staged for Delivery', snapshot.stagedForDelivery],
  ];
  return (
    <OverviewCardShell icon={Leaf} title="Nursery Snapshot" accent="bg-emerald-50 text-emerald-800" footer={<OverviewFooter label="View nursery" onClick={() => setActiveTab('inventory')} />}>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-jdt-border pb-1.5 text-xs">
            <span className="font-semibold text-zinc-500">{label}</span>
            <span className="font-black text-jdt-primary">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-b border-jdt-border pb-1.5 text-xs">
          <span className="font-semibold text-zinc-500">Irrigation / Watering</span>
          <span className={`font-black ${snapshot.irrigationStatus === 'Good' ? 'text-emerald-700' : 'text-amber-700'}`}>{snapshot.irrigationStatus}</span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-black uppercase text-jdt-olive">Customer Pickups</p>
        <div className="mt-1.5 space-y-1">
          {(snapshot.customerPickups || []).slice(0, 2).map((pickup: any) => (
            <p key={pickup.id} className="truncate text-[11px] font-semibold text-jdt-text">{pickup.customer} <span className="text-zinc-500">{pickup.time}</span></p>
          ))}
          {(!snapshot.customerPickups || snapshot.customerPickups.length === 0) && <p className="text-[11px] font-semibold text-zinc-500">No customer pickups staged.</p>}
        </div>
      </div>
    </OverviewCardShell>
  );
}

function EquipmentStatusOverviewCard({ status, setActiveTab }: { status: any; setActiveTab: (tab: string) => void }) {
  const rows = [
    ['In Use', status.inUse, status.utilizationPercent, 'bg-emerald-700'],
    ['Available', status.available, status.availablePercent, 'bg-emerald-600'],
    ['In Maintenance', status.maintenance, status.maintenancePercent, 'bg-amber-600'],
    ['Down', status.down, status.downPercent, 'bg-red-700'],
  ];
  return (
    <OverviewCardShell icon={Tractor} title="Equipment Status" accent="bg-violet-50 text-violet-800" footer={<OverviewFooter label="View equipment" onClick={() => setActiveTab('equipment')} />}>
      <div className="space-y-2">
        {rows.map(([label, count, percent, color]) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-jdt-text">{label}</span>
              <span className="font-black text-jdt-primary">{count} <span className="ml-2 text-[11px] font-semibold text-zinc-500">{percent}%</span></span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, Number(percent) || 0))}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] font-bold text-red-700">Highlight: {status.keyIssue}</p>
    </OverviewCardShell>
  );
}

function AttentionOverviewCard({ items, openDrawer, setActiveTab }: { items: any[]; openDrawer: (type: string, id: string) => void; setActiveTab: (tab: string) => void }) {
  return (
    <OverviewCardShell icon={AlertTriangle} title="Alerts / Needs Attention" accent="bg-amber-50 text-amber-800" footer={<OverviewFooter label="View all alerts" onClick={() => setActiveTab('alerts')} />}>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <button key={item.id} type="button" onClick={() => openDashboardRecord(item, setActiveTab, openDrawer, 'alerts')} className="grid w-full grid-cols-[auto_auto_1fr] items-center gap-2 rounded-md border border-jdt-border bg-jdt-panel p-2 text-left hover:border-jdt-olive">
            <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${attentionSeverityClass(item.severity)}`}>{item.severity}</span>
            <span className="text-xs font-black text-jdt-primary">{item.count}</span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-black text-jdt-text">{item.title}</span>
              <span className="block truncate text-[10px] font-semibold text-zinc-500">{item.detail}</span>
            </span>
          </button>
        ))}
        {items.length === 0 && <CompactEmpty text="No attention items are open." />}
      </div>
    </OverviewCardShell>
  );
}

function OverviewFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 text-[11px] font-black uppercase text-jdt-olive hover:text-jdt-primary">
      {label} <ChevronRight className="inline h-3.5 w-3.5" />
    </button>
  );
}

function CompactEmpty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-jdt-border bg-jdt-panel px-3 py-3 text-xs font-semibold text-zinc-500">{text}</p>;
}

function attentionSeverityClass(severity: string) {
  if (severity === 'High') return 'bg-red-50 text-red-800';
  if (severity === 'Medium') return 'bg-amber-50 text-amber-800';
  if (severity === 'Low') return 'bg-emerald-50 text-emerald-800';
  return 'bg-blue-50 text-blue-800';
}

function fleetToneForDisplay(status: string) {
  const text = String(status || '').toLowerCase();
  if (/route|transit|moving|dispatched/.test(text)) return 'moving';
  if (/delay|issue|down|review|cancel/.test(text)) return 'issue';
  if (/scheduled|loading|pending/.test(text)) return 'scheduled';
  if (/delivered|complete|site/.test(text)) return 'active';
  return 'scheduled';
}

function DashboardActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-jdt-border bg-white px-2 py-2 text-[9px] font-black uppercase text-jdt-text shadow-sm hover:border-jdt-olive hover:bg-jdt-sand"
    >
      {label}
    </button>
  );
}

function DashboardEmpty({ icon: Icon, title, detail, compact = false }: { icon: any; title: string; detail: string; compact?: boolean }) {
  return (
    <div className={compact ? "p-0" : "p-5"}>
      <div className={`rounded-xl border border-dashed border-jdt-border bg-white text-center ${compact ? "p-5" : "p-8"}`}>
        <Icon className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
        <p className="text-sm font-black text-jdt-text">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs font-bold text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

function DashboardQueueCard({ title, subtitle, items, empty, onOpen, actionLabel }: { title: string; subtitle: string; items: DashboardWorkItem[]; empty: string; onOpen: (item: DashboardWorkItem) => void; actionLabel: string }) {
  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-jdt-border px-5 py-4">
        <div>
          <h3 className="text-sm font-black uppercase text-jdt-text">{title}</h3>
          <p className="mt-1 text-xs font-bold text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-jdt-border">
          {items.slice(0, 6).map((item) => {
            const category = categoryForWorkItemTone(item.tone);
            return (
              <article key={`${title}-${item.id}`} className={`border-l-4 px-4 py-3 ${categoryAccentBorderClass(category)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-jdt-text">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{item.detail}</p>
                    <p className="mt-2 text-[10px] font-black uppercase text-jdt-olive">{item.assignee}</p>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(item.status)}`}>{item.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <DashboardActionButton label={actionLabel} onClick={() => onOpen(item)} />
                  <DashboardActionButton label="Create Task" onClick={() => onOpen(item)} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <DashboardEmpty icon={Calendar} title={empty} detail="When this queue has live work, it will show the next action here." />
      )}
    </section>
  );
}

function DashboardCloseoutReviewList({ items, onOpen }: { items: any[]; onOpen: (item: any) => void }) {
  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
      <div className="border-b border-jdt-border px-5 py-4">
        <h3 className="text-sm font-black uppercase text-jdt-text">Field Closeout Review</h3>
        <p className="mt-1 text-xs font-bold text-zinc-500">Daily closeouts that need proof, issue review, or office filing.</p>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-jdt-border">
          {items.slice(0, 5).map((item) => {
            const proofCount = Number(item.proofCount || 0);
            const proofLabel = `${proofCount} proof${proofCount === 1 ? "" : "s"}`;
            return (
              <button key={item.id || item.recordId || item.title} type="button" onClick={() => onOpen(item)} className="block w-full px-4 py-3 text-left hover:bg-jdt-sand/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-jdt-text">{item.title || "Daily closeout"}</p>
                    <p className="mt-1 text-[10px] font-black uppercase text-zinc-500">{item.projectName || "Unlinked project"} - {item.crewName || "Crew user"}</p>
                    <p className="mt-2 line-clamp-2 text-xs font-bold text-zinc-600">{item.recommendedAction || item.detail || "Review this closeout before filing."}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{item.reviewStatus || "Review"}</span>
                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-900">{proofLabel}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <DashboardEmpty icon={AlertTriangle} title="No field closeouts waiting" detail="Submitted daily closeouts will appear here when they need proof or office review." />
      )}
    </section>
  );
}

function DashboardSimpleList({ title, subtitle, items, empty, onOpen }: { title: string; subtitle: string; items: any[]; empty: string; onOpen: (item: any) => void }) {
  return (
    <section className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
      <div className="border-b border-jdt-border px-5 py-4">
        <h3 className="text-sm font-black uppercase text-jdt-text">{title}</h3>
        <p className="mt-1 text-xs font-bold text-zinc-500">{subtitle}</p>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-jdt-border">
          {items.slice(0, 5).map((item) => {
            const itemTitle = item.resourceLabel || item.entityName || item.title || item.name || item.workflow || "Review Item";
            const detail = item.eventTitles?.join(" / ") || item.recommendedAction || item.detail || item.documentType || item.stage || "Open for details";
            const meta = item.dateIso || item.status || item.severity || item.resourceKind || item.targetTab || "";
            return (
              <button key={item.id || `${title}-${itemTitle}-${detail}`} type="button" onClick={() => onOpen(item)} className="block w-full px-4 py-3 text-left hover:bg-jdt-sand/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-jdt-text">{itemTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-zinc-500">{detail}</p>
                  </div>
                  {meta && <span className="shrink-0 rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{meta}</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <DashboardEmpty icon={AlertTriangle} title={empty} detail="This will stay quiet unless something blocks dispatch or review." />
      )}
    </section>
  );
}

function DashboardBriefColumn({ section, onOpen }: { section: { title: string; date?: string; items: any[]; empty: string }; onOpen: (item: any) => void }) {
  return (
    <div className="rounded-lg border border-jdt-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase text-zinc-500">{section.title}</p>
        <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{section.date || 'Review'}</span>
      </div>
      {section.items.length > 0 ? (
        <div className="space-y-2">
          {section.items.slice(0, 3).map((item: any) => (
            <button key={`${section.title}-${item.id}`} type="button" onClick={() => onOpen(item)} className="w-full rounded border border-jdt-border bg-jdt-panel px-3 py-2 text-left hover:border-jdt-olive">
              <p className="truncate text-xs font-black text-jdt-text">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-[10px] font-bold text-zinc-500">{item.detail}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded border border-dashed border-jdt-border bg-jdt-panel px-3 py-6 text-center text-xs font-bold text-zinc-500">{section.empty}</p>
      )}
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

const relocationReadinessFilters = [
  'All',
  'Ready',
  'Needs Scheduling',
  'Needs Crew',
  'Needs Equipment',
  'Needs Freight',
  'Needs Map Cleanup',
  'Blocked',
  'Tomorrow',
] as const;

type RelocationReadinessFilter = typeof relocationReadinessFilters[number];

function trackerDateOnly(value: unknown): string {
  return String(value || '').trim().slice(0, 10);
}

function trackerIsCompleteStatus(value: unknown): boolean {
  const status = String(value || '').toLowerCase();
  return status.includes('complete') || status.includes('cancel') || status.includes('relocated');
}

function trackerArrayHasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.some(Boolean) : Boolean(String(value || '').trim());
}

function treeRelocationStatus(tree: TreeRelocationRecord): string {
  const status = String(tree.treeRelocationStatus || tree.relocationStatus || tree.status || tree.currentStatus || defaultRelocationStatus).trim();
  return treeRelocationStatusOptions.find((option) => option.toLowerCase() === status.toLowerCase()) || status || defaultRelocationStatus;
}

function treeHasSourcePin(tree: TreeRelocationRecord): boolean {
  return Boolean(
    tree.existingSourcePin
    || (tree.existingLatitude !== undefined && tree.existingLongitude !== undefined)
    || tree.relocationMap?.source?.lat !== undefined,
  );
}

function treeHasDestinationPin(tree: TreeRelocationRecord): boolean {
  return Boolean(
    tree.destinationPin
    || (tree.destinationLatitude !== undefined && tree.destinationLongitude !== undefined)
    || tree.relocationMap?.destination?.lat !== undefined,
  );
}

function treeAssetsForTrackerProject(treeRelocationRecords: TreeRelocationRecord[], project: any): TreeRelocationRecord[] {
  return treeRelocationRecords.filter((tree) => (
    trackerFieldMatches(tree.projectId, project.projectId)
    || trackerFieldMatches(tree.projectId, project.projectsId)
    || trackerFieldMatches(tree.projectId, project.id)
    || trackerFieldMatches(tree.projectsId, project.projectsId)
    || trackerFieldMatches(tree.projectsId, project.projectId)
    || trackerFieldMatches(tree.jobId, project.id)
    || trackerFieldMatches(tree.sourceJobId, project.id)
    || trackerFieldMatches(tree.projectName, project.projectName)
    || trackerFieldMatches(tree.projectName, project.title)
  ));
}

function buildTrackerPipeline(treeAssets: TreeRelocationRecord[]) {
  return treeRelocationStatusOptions.map((status) => ({
    status,
    count: treeAssets.filter((tree) => treeRelocationStatus(tree).toLowerCase() === status.toLowerCase()).length,
  }));
}

function buildTrackerReadiness(project: any, linkedWorkOrders: WorkOrderRecord[], treeAssets: TreeRelocationRecord[], linkedMaterialItems: ProjectMaterialItemRecord[]) {
  const openWorkOrders = linkedWorkOrders.filter((workOrder) => !trackerIsCompleteStatus(workOrder.status));
  const treeWorkOrders = openWorkOrders.filter((workOrder) => ['tree_pruning', 'tree_relocation_work', 'treatment_aftercare'].includes(String(workOrder.workOrderType || '')));
  const linkedEquipmentNames = workOrderResourceNames(linkedWorkOrders, 'equipmentNames');
  const linkedLoadNames = workOrderResourceNames(linkedWorkOrders, 'loadNames');
  const readyTrees = treeAssets.filter((tree) => treeRelocationStatus(tree) === 'Ready for Relocation').length;
  const missingSourcePins = treeAssets.filter((tree) => !treeHasSourcePin(tree)).length;
  const missingDestinationPins = treeAssets.filter((tree) => !treeHasDestinationPin(tree)).length;
  const requiredMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityRequired || 0), 0);
  const installedMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityInstalled || 0), 0);
  const issues: string[] = [];
  const blockers = linkedWorkOrders.map((workOrder) => String(workOrder.blockerReason || '').trim()).filter(Boolean);

  if (!project.location) issues.push('Missing main address');
  if (!project.crewAccessAddress && !project.truckAccessAddress && !project.constructionAccessPin && !project.loadUnloadPin) issues.push('Missing access pins');
  if (treeAssets.length === 0) issues.push('No tree assets');
  if (missingSourcePins > 0) issues.push(`${missingSourcePins} source pins missing`);
  if (missingDestinationPins > 0) issues.push(`${missingDestinationPins} destination pins missing`);
  if (openWorkOrders.length === 0) issues.push('Needs scheduling');
  if (treeWorkOrders.length > 0 && !openWorkOrders.some((workOrder) => trackerArrayHasValue(workOrder.assignedCrewNames) || workOrder.crewLeadName)) issues.push('Needs crew');
  if (treeWorkOrders.length > 0 && linkedEquipmentNames.length === 0) issues.push('Needs equipment');
  if ((readyTrees > 0 || openWorkOrders.some((workOrder) => workOrder.workOrderType === 'tree_relocation_work')) && linkedLoadNames.length === 0) issues.push('Needs freight');
  if (requiredMaterialCount > installedMaterialCount) issues.push(`${installedMaterialCount}/${requiredMaterialCount} material installed`);
  if (blockers.length > 0) issues.push('Blocked');

  const status = blockers.length
    ? 'Blocked'
    : missingSourcePins > 0 || missingDestinationPins > 0 || (!project.crewAccessAddress && !project.truckAccessAddress && !project.constructionAccessPin && !project.loadUnloadPin)
      ? 'Needs Map Cleanup'
      : issues.includes('Needs crew')
        ? 'Needs Crew'
        : issues.includes('Needs equipment')
          ? 'Needs Equipment'
          : issues.includes('Needs freight')
            ? 'Needs Freight'
            : issues.includes('Needs scheduling')
              ? 'Needs Scheduling'
              : 'Ready';

  return {
    status,
    issues,
    blockers,
    openWorkOrders,
    readyTrees,
    missingSourcePins,
    missingDestinationPins,
    requiredMaterialCount,
    installedMaterialCount,
    linkedEquipmentNames,
    linkedLoadNames,
  };
}

function trackerMatchesReadinessFilter(snapshot: any, filter: RelocationReadinessFilter, todayIso: string, tomorrowIso: string): boolean {
  if (filter === 'All') return true;
  if (filter === 'Tomorrow') {
    return snapshot.workOrders.some((workOrder: WorkOrderRecord) => (
      trackerDateOnly(workOrder.scheduledDate || workOrder.dueDate || workOrder.startDate) === tomorrowIso
    )) || trackerDateOnly(snapshot.project.scheduledDate || snapshot.project.date || snapshot.project.startDate) === tomorrowIso;
  }
  if (filter === 'Ready') return snapshot.readiness.status === 'Ready';
  return snapshot.readiness.status === filter || snapshot.readiness.issues.some((issue: string) => issue.toLowerCase().includes(filter.replace('Needs ', '').toLowerCase()));
}

function TrackerKpiCard({ icon: Icon, label, value, detail, tone }: { icon: any; label: string; value: string | number; detail: string; tone: string }) {
  return (
    <div className={`rounded-xl border px-3 py-3 shadow-sm ${tone}`}>
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-white/60 bg-white/70 p-2">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide opacity-70">{label}</p>
          <p className="text-2xl font-black leading-none">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold opacity-75">{detail}</p>
    </div>
  );
}

function WorkOrderActionMenu({ project, assignmentBase, openModal }: { project: any; assignmentBase: any; openModal: (type: string, data?: any) => void }) {
  const projectTitle = project.title || project.projectName || 'project';
  const actions = [
    { label: 'Root Pruning', category: 'crew' as const, type: 'assign_work', data: { workOrderType: 'tree_pruning', taskType: 'Root Pruning' } },
    { label: 'Relocation Move', category: 'crew' as const, type: 'assign_work', data: { workOrderType: 'tree_relocation_work', taskType: 'Relocation Work' } },
    { label: 'Installation', category: 'crew' as const, type: 'assign_work', data: { workOrderType: 'general_task', taskType: 'Installation' } },
    { label: 'Nutrient Care', category: 'crew' as const, type: 'assign_work', data: { workOrderType: 'treatment_aftercare', taskType: 'Nutrient Care' } },
    { label: 'Equipment', category: 'equipment' as const, type: 'assign_equipment', data: { workOrderType: 'equipment', taskType: 'Equipment change request', equipmentRequestType: 'Add Equipment' } },
    { label: 'Freight', category: 'freight' as const, type: 'assign_freight', data: { workOrderType: 'freight', taskType: 'Freight support request', origin: project.location, destination: project.location } },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openModal(action.type, {
              ...assignmentBase,
              ...action.data,
              title: `${action.label} for ${projectTitle}`,
              status: 'Draft',
              priority: 'Normal',
            });
          }}
          className={`inline-flex items-center rounded border px-2 py-1 text-[9px] font-black uppercase hover:border-jdt-olive ${action.label === 'Root Pruning' || action.label === 'Relocation Move' || action.label === 'Installation' || action.label === 'Nutrient Care' ? 'border-jdt-border bg-jdt-primary text-white' : 'border-jdt-border bg-white text-jdt-primary'}`}
        >
          <CategoryIcon category={action.category} size="xs" className="mr-1.5 border-white/40 bg-white/20 text-current" />
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function TrackerBoard({ projects = [], jobs = [], workOrders = [], projectMaterialItems = [], treeRelocationRecords = [], openDrawer, openModal }: any) {
  const [jobFilter, setJobFilter] = useState<RelocationInstallationJobFilter>('All');
  const [readinessFilter, setReadinessFilter] = useState<RelocationReadinessFilter>('All');
  const relocationInstallationProjects = useMemo(() => mergedRelocationInstallationProjects(projects, jobs), [projects, jobs]);
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const projectSnapshots = relocationInstallationProjects.map((project: any) => {
    const linkedWorkOrders = workOrdersForProject(project);
    const linkedMaterialItems = materialItemsForProject(project);
    const treeAssets = treeAssetsForTrackerProject(treeRelocationRecords, project);
    return {
      project,
      jobType: classifyRelocationInstallationJob(project),
      workOrders: linkedWorkOrders,
      materialItems: linkedMaterialItems,
      treeAssets,
      pipeline: buildTrackerPipeline(treeAssets),
      readiness: buildTrackerReadiness(project, linkedWorkOrders, treeAssets, linkedMaterialItems),
    };
  });
  const filteredSnapshots = projectSnapshots.filter((snapshot) => (
    (jobFilter === 'All' || snapshot.jobType === jobFilter)
    && trackerMatchesReadinessFilter(snapshot, readinessFilter, todayIso, tomorrowIso)
  ));
  const readinessFilterCounts = relocationReadinessFilters.reduce<Record<string, number>>((counts, filter) => {
    counts[filter] = projectSnapshots.filter((snapshot) => trackerMatchesReadinessFilter(snapshot, filter, todayIso, tomorrowIso)).length;
    return counts;
  }, {});
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
  const activeWorkOrders = workOrders.filter((workOrder: WorkOrderRecord) => !trackerIsCompleteStatus(workOrder.status));
  const trackerKpis = {
    activeProjects: relocationInstallationProjects.length,
    workOrdersToday: activeWorkOrders.filter((workOrder: WorkOrderRecord) => trackerDateOnly(workOrder.scheduledDate || workOrder.dueDate || workOrder.startDate) === todayIso).length,
    treesReady: projectSnapshots.reduce((sum, snapshot) => sum + snapshot.readiness.readyTrees, 0),
    rootPruneDue: activeWorkOrders.filter((workOrder: WorkOrderRecord) => workOrder.workOrderType === 'tree_pruning' && trackerDateOnly(workOrder.scheduledDate || workOrder.dueDate) && trackerDateOnly(workOrder.scheduledDate || workOrder.dueDate) <= todayIso).length,
    blockedProjects: projectSnapshots.filter((snapshot) => snapshot.readiness.status === 'Blocked').length,
    resourceNeeds: projectSnapshots.filter((snapshot) => ['Needs Crew', 'Needs Equipment', 'Needs Freight'].includes(snapshot.readiness.status)).length,
  };
  const clientGroups = filteredSnapshots.reduce<Array<{ clientName: string; clientId?: string; projects: any[] }>>((groups, snapshot) => {
    const project = snapshot.project;
    const clientName = trackerClientName(project);
    const clientId = String(project.clientId || '').trim();
    const existing = groups.find((group) => group.clientId === clientId || group.clientName === clientName);
    if (existing) {
      existing.projects.push(snapshot);
      return groups;
    }
    groups.push({ clientName, clientId, projects: [snapshot] });
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
          <div className="grid gap-3 border-b border-jdt-border bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
            <TrackerKpiCard icon={MapPin} label="Active Projects" value={trackerKpis.activeProjects} detail="Relocation, install, and mixed work" tone="border-emerald-200 bg-emerald-50 text-emerald-950" />
            <TrackerKpiCard icon={Calendar} label="Work Orders Today" value={trackerKpis.workOrdersToday} detail="Scheduled or due today" tone="border-sky-200 bg-sky-50 text-sky-950" />
            <TrackerKpiCard icon={TreePine} label="Trees Ready" value={trackerKpis.treesReady} detail="Ready for relocation" tone="border-lime-200 bg-lime-50 text-lime-950" />
            <TrackerKpiCard icon={Scissors} label="Root Prune Due" value={trackerKpis.rootPruneDue} detail="Due or overdue cuts" tone="border-amber-200 bg-amber-50 text-amber-950" />
            <TrackerKpiCard icon={AlertTriangle} label="Blocked" value={trackerKpis.blockedProjects} detail="Needs a decision or fix" tone="border-red-200 bg-red-50 text-red-950" />
            <TrackerKpiCard icon={Tractor} label="Resource Needs" value={trackerKpis.resourceNeeds} detail="Crew, equipment, or freight gaps" tone="border-violet-200 bg-violet-50 text-violet-950" />
          </div>

          <div className="space-y-3 border-b border-jdt-border bg-white px-4 py-3">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-zinc-400">Scope Type</p>
              <div className="flex flex-wrap gap-2">
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
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-zinc-400">Readiness</p>
              <div className="flex flex-wrap gap-2">
                {relocationReadinessFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReadinessFilter(filter)}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase transition-colors ${readinessFilter === filter ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-jdt-panel text-zinc-600 hover:border-jdt-olive'}`}
                  >
                    {filter} <span className={readinessFilter === filter ? 'text-white/80' : 'text-zinc-400'}>{readinessFilterCounts[filter] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredSnapshots.length > 0 ? (
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
                    {group.projects.map((snapshot: any) => {
                    const { project, jobType, workOrders: linkedWorkOrders, materialItems: linkedMaterialItems, treeAssets, pipeline, readiness } = snapshot;
                    const nextWorkOrder = linkedWorkOrders.find((workOrder: WorkOrderRecord) => !trackerIsCompleteStatus(workOrder.status)) || linkedWorkOrders[0];
                    const linkedImplementNames = workOrderResourceNames(linkedWorkOrders, 'implementNames');
                    const assignmentBase = projectPayloadForProject(project);
                    return (
                      <div
                        key={project.id || project.projectId || project.title}
                        className={`cursor-pointer border-l-4 p-4 transition-colors hover:bg-jdt-sand/40 ${relocationInstallationJobTypeAccentClass(jobType)}`}
                        onClick={() => openDrawer(project.drawerType || 'project', project.id || project.projectId || project.title)}
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.1fr)_minmax(260px,0.9fr)_minmax(320px,1.1fr)]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-black text-[#384521]">{project.title || project.projectName || 'Untitled project'}</p>
                              <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase ${relocationInstallationJobTypeTone(jobType)}`}>
                                {jobType}
                              </span>
                              <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(readiness.status)}`}>
                                {readiness.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">Project ID: {project.projectId || project.id || '-'}</p>
                            <p className="mt-2 text-xs font-bold text-zinc-600">{project.location || project.division || relocationInstallationDivisionLabel}</p>
                            {jobType === 'Mixed Job' && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-800">Relocation Scope</span>
                                <span className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[9px] font-black uppercase text-sky-800">Installation Scope</span>
                              </div>
                            )}
                            <div className="mt-3">
                              <p className="mb-1 text-[9px] font-black uppercase text-zinc-400">Create Work Order</p>
                              <WorkOrderActionMenu project={project} assignmentBase={assignmentBase} openModal={openModal} />
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
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Trees</p>
                              <p>{treeAssets.length}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Pins</p>
                              <p>{`${treeAssets.length - readiness.missingSourcePins}/${treeAssets.length} source | ${treeAssets.length - readiness.missingDestinationPins}/${treeAssets.length} destination`}</p>
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
                              {readiness.linkedEquipmentNames.slice(0, 2).map((name: string) => <CategoryPill key={name} category="equipment" label={name} className="bg-zinc-100 text-zinc-700" />)}
                              {linkedImplementNames.slice(0, 2).map((name) => <span key={name} className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{name}</span>)}
                              {readiness.linkedLoadNames.slice(0, 2).map((name: string) => <CategoryPill key={name} category="freight" label={name} className="bg-zinc-100 text-zinc-700" />)}
                            </div>
                          </div>

                          <div className="xl:col-span-3">
                            <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_minmax(260px,0.8fr)]">
                              <div>
                                <p className="text-[9px] font-black uppercase text-zinc-400">Tree Relocation Pipeline</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {pipeline.map((bucket: { status: string; count: number }) => (
                                    <span key={bucket.status} className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${bucket.count ? statusPillClass(bucket.status) : 'border-jdt-border bg-white text-zinc-400'}`}>
                                      {bucket.status}: {bucket.count}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase text-zinc-400">Readiness / Blockers</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {readiness.issues.length > 0 ? readiness.issues.slice(0, 6).map((issue: string) => (
                                    <span key={issue} className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${issue === 'Blocked' ? riskPillClass('high') : riskPillClass('watch')}`}>
                                      {issue}
                                    </span>
                                  )) : (
                                    <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${riskPillClass('low')}`}>Ready for dispatch</span>
                                  )}
                                </div>
                              </div>
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
