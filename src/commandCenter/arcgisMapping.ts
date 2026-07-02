import type {
  EquipmentRecord,
  JobRecord,
  LocationRecord,
  ProjectRecord,
  RanchOakRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from './records';
import { parseGoogleMapsLocationText, pointFromSavedSiteLocation, type TreeRelocationPoint } from '../treeRelocationMap';
import { defaultRelocationStatus } from './treeLifecycle';
import { arcGisLayerUrlEnvKeys, type ArcGisHostedLayerId } from './arcgisLayerConfig';
import { normalizeFieldMapsTreeRelocationStatus } from './fieldMapsRelocationStandard';

type RuntimeEnv = Partial<Record<string, string>>;

export type ArcGisLayerGeometry = 'point' | 'polygon';

export type ArcGisLayerField = {
  name: string;
  alias: string;
  type: 'oid' | 'string' | 'double' | 'integer' | 'date';
};

export type ArcGisClientLayerId =
  | 'treeAssets'
  | 'projectBoundary'
  | 'finalTreeLocations'
  | 'holdingAreas'
  | 'workZones'
  | 'rootPruneEvents'
  | 'relocationWork'
  | 'nutrientCareTasks'
  | 'equipmentLocations';

export type ArcGisFeatureLayerSchema = {
  id: ArcGisClientLayerId;
  hostedLayerId: ArcGisHostedLayerId;
  title: string;
  geometryType: ArcGisLayerGeometry;
  objectIdField: string;
  fields: ArcGisLayerField[];
};

export type ArcGisTreeAssetFeature = {
  objectId: number;
  treeId: string;
  treeAssetId: string;
  treeTag: string;
  treeType: string;
  assetCategory: string;
  projectId: string;
  projectName: string;
  species: string;
  dbh: string;
  status: string;
  loadersNeeded: string;
  additionalEquipmentRequired: string;
  equipmentAccess: string;
  equipmentAccessNotes: string;
  issueAlert: string;
  currentFieldLocation: string;
  existingSourcePin: string;
  destinationPin: string;
  treeFinalOutcome: string;
  mapGeometryStatus: string;
  rootPruneDate: string;
  finalMoveDate: string;
  crew: string;
  crewNotes: string;
  notes: string;
  latitude: number;
  longitude: number;
  arcGisFeatureId?: string;
  arcGisLayerUrl?: string;
  lastMapSyncAt?: string;
  lastUpdatedSource?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  lastSyncDirection?: string;
  syncTransactionId?: string;
  arcGisLastSyncAt?: string;
  jdtLastSyncAt?: string;
};

export type ArcGisFinalTreeLocationFeature = {
  objectId: number;
  finalLocationId: string;
  treeAssetId: string;
  projectId: string;
  treeTag: string;
  treeType: string;
  destinationStatus: string;
  approvedBy: string;
  approvalDate: string;
  installNotes: string;
  latitude: number;
  longitude: number;
};

export type ArcGisPolygonFeature = {
  objectId: number;
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  status: string;
  notes: string;
  rings: number[][][];
};

export type ArcGisEquipmentFeature = {
  objectId: number;
  equipmentId: string;
  equipmentName: string;
  category: string;
  status: string;
  currentLocation: string;
  assignedProjectId: string;
  assignedProjectName: string;
  crew: string;
  notes: string;
  latitude: number;
  longitude: number;
};

export type ArcGisTaskFeature = {
  objectId: number;
  taskId: string;
  treeAssetId: string;
  projectId: string;
  treeTag: string;
  taskType: string;
  status: string;
  scheduledDate: string;
  completedDate: string;
  crew: string;
  notes: string;
  latitude: number;
  longitude: number;
};

export type ArcGisTaskOverlayFeatures = {
  rootPruneEvents: ArcGisTaskFeature[];
  relocationWork: ArcGisTaskFeature[];
  nutrientCareTasks: ArcGisTaskFeature[];
};

export type ArcGisHostedEditFeature = {
  geometry?: {
    type: 'point';
    latitude: number;
    longitude: number;
    spatialReference: { wkid: 4326 };
  };
  attributes: Record<string, string | number | null>;
};

export type ArcGisMapFilters = {
  projectId: string;
  status: string;
  treeType: string;
  dbh: string;
  crew: string;
};

export const emptyArcGisMapFilters: ArcGisMapFilters = {
  projectId: 'all',
  status: 'all',
  treeType: 'all',
  dbh: 'all',
  crew: 'all',
};

export const jdtArcGisLayerSchemas: ArcGisFeatureLayerSchema[] = [
  {
    id: 'treeAssets',
    hostedLayerId: 'JDT_Tree_Assets',
    title: 'Tree Assets',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'treeId', alias: 'Tree ID', type: 'string' },
      { name: 'treeAssetId', alias: 'JDT Tree Asset ID', type: 'string' },
      { name: 'treeTag', alias: 'Field Tag', type: 'string' },
      { name: 'treeType', alias: 'Tree Type', type: 'string' },
      { name: 'assetCategory', alias: 'Asset Category', type: 'string' },
      { name: 'projectId', alias: 'Project ID', type: 'string' },
      { name: 'projectName', alias: 'Project', type: 'string' },
      { name: 'species', alias: 'Species', type: 'string' },
      { name: 'dbh', alias: 'DBH', type: 'string' },
      { name: 'status', alias: 'Tree Relocation Status', type: 'string' },
      { name: 'loadersNeeded', alias: 'Loader(s) Needed', type: 'string' },
      { name: 'additionalEquipmentRequired', alias: 'Additional Equipment Required', type: 'string' },
      { name: 'equipmentAccess', alias: 'Equipment Access', type: 'string' },
      { name: 'equipmentAccessNotes', alias: 'Equipment Access Notes', type: 'string' },
      { name: 'issueAlert', alias: 'Issue Alert', type: 'string' },
      { name: 'currentFieldLocation', alias: 'Current Field Location', type: 'string' },
      { name: 'existingSourcePin', alias: 'Existing Source Pin', type: 'string' },
      { name: 'destinationPin', alias: 'Destination Pin', type: 'string' },
      { name: 'treeFinalOutcome', alias: 'Tree Final Outcome', type: 'string' },
      { name: 'mapGeometryStatus', alias: 'Map Geometry Status', type: 'string' },
      { name: 'rootPruneDate', alias: 'Root Prune Date', type: 'string' },
      { name: 'finalMoveDate', alias: 'Final Move Date', type: 'string' },
      { name: 'crew', alias: 'Crew', type: 'string' },
      { name: 'crewNotes', alias: 'Crew Notes', type: 'string' },
      { name: 'lastUpdatedSource', alias: 'Last Updated Source', type: 'string' },
      { name: 'lastSyncDirection', alias: 'Last Sync Direction', type: 'string' },
      { name: 'syncTransactionId', alias: 'Sync Transaction ID', type: 'string' },
      { name: 'notes', alias: 'Notes', type: 'string' },
    ],
  },
  {
    id: 'projectBoundary',
    hostedLayerId: 'JDT_Project_Boundaries',
    title: 'Project Boundary',
    geometryType: 'polygon',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'id', alias: 'Boundary ID', type: 'string' },
      { name: 'projectId', alias: 'Project ID', type: 'string' },
      { name: 'projectName', alias: 'Project', type: 'string' },
      { name: 'name', alias: 'Boundary Name', type: 'string' },
      { name: 'status', alias: 'Status', type: 'string' },
      { name: 'notes', alias: 'Notes', type: 'string' },
    ],
  },
  {
    id: 'finalTreeLocations',
    hostedLayerId: 'JDT_Final_Tree_Locations',
    title: 'Final Tree Locations',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'finalLocationId', alias: 'Final Location ID', type: 'string' },
      { name: 'treeAssetId', alias: 'Tree Asset ID', type: 'string' },
      { name: 'projectId', alias: 'Project ID', type: 'string' },
      { name: 'treeTag', alias: 'Tree Tag', type: 'string' },
      { name: 'treeType', alias: 'Tree Type', type: 'string' },
      { name: 'destinationStatus', alias: 'Destination Status', type: 'string' },
      { name: 'approvedBy', alias: 'Approved By', type: 'string' },
      { name: 'approvalDate', alias: 'Approval Date', type: 'string' },
      { name: 'installNotes', alias: 'Install Notes', type: 'string' },
    ],
  },
  {
    id: 'holdingAreas',
    hostedLayerId: 'JDT_Holding_Areas',
    title: 'Holding Area',
    geometryType: 'polygon',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'id', alias: 'Holding Area ID', type: 'string' },
      { name: 'projectId', alias: 'Project ID', type: 'string' },
      { name: 'projectName', alias: 'Project', type: 'string' },
      { name: 'name', alias: 'Holding Area', type: 'string' },
      { name: 'status', alias: 'Status', type: 'string' },
      { name: 'notes', alias: 'Notes', type: 'string' },
    ],
  },
  {
    id: 'workZones',
    hostedLayerId: 'JDT_Work_Zones',
    title: 'Work Zones',
    geometryType: 'polygon',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'id', alias: 'Work Zone ID', type: 'string' },
      { name: 'projectId', alias: 'Project ID', type: 'string' },
      { name: 'projectName', alias: 'Project', type: 'string' },
      { name: 'name', alias: 'Work Zone', type: 'string' },
      { name: 'status', alias: 'Status', type: 'string' },
      { name: 'notes', alias: 'Notes', type: 'string' },
    ],
  },
  {
    id: 'rootPruneEvents',
    hostedLayerId: 'JDT_Root_Prune_Events',
    title: 'Root Prune Events',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: taskLayerFields('Root Pruning ID'),
  },
  {
    id: 'relocationWork',
    hostedLayerId: 'JDT_Relocation_Work',
    title: 'Relocation Work',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: taskLayerFields('Relocation Work ID'),
  },
  {
    id: 'nutrientCareTasks',
    hostedLayerId: 'JDT_Nutrient_Care_Tasks',
    title: 'Nutrient Care Tasks',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: taskLayerFields('Nutrient Care ID'),
  },
  {
    id: 'equipmentLocations',
    hostedLayerId: 'JDT_Equipment_Locations',
    title: 'Equipment Location',
    geometryType: 'point',
    objectIdField: 'objectId',
    fields: [
      { name: 'objectId', alias: 'Object ID', type: 'oid' },
      { name: 'equipmentId', alias: 'Equipment ID', type: 'string' },
      { name: 'equipmentName', alias: 'Equipment', type: 'string' },
      { name: 'category', alias: 'Category', type: 'string' },
      { name: 'status', alias: 'Status', type: 'string' },
      { name: 'currentLocation', alias: 'Current Location', type: 'string' },
      { name: 'assignedProjectId', alias: 'Assigned Project ID', type: 'string' },
      { name: 'assignedProjectName', alias: 'Assigned Project', type: 'string' },
      { name: 'crew', alias: 'Crew / Driver', type: 'string' },
      { name: 'notes', alias: 'Notes', type: 'string' },
    ],
  },
];

export const treeAssetPopupFields = [
  'treeId',
  'treeAssetId',
  'treeTag',
  'assetCategory',
  'species',
  'dbh',
  'status',
  'loadersNeeded',
  'additionalEquipmentRequired',
  'equipmentAccess',
  'issueAlert',
  'currentFieldLocation',
  'existingSourcePin',
  'destinationPin',
  'treeFinalOutcome',
  'rootPruneDate',
  'finalMoveDate',
  'crew',
  'crewNotes',
  'notes',
];

function taskLayerFields(taskIdAlias: string): ArcGisLayerField[] {
  return [
    { name: 'objectId', alias: 'Object ID', type: 'oid' },
    { name: 'taskId', alias: taskIdAlias, type: 'string' },
    { name: 'treeAssetId', alias: 'Tree Asset ID', type: 'string' },
    { name: 'projectId', alias: 'Project ID', type: 'string' },
    { name: 'treeTag', alias: 'Tree Tag', type: 'string' },
    { name: 'taskType', alias: 'Task Type', type: 'string' },
    { name: 'status', alias: 'Status', type: 'string' },
    { name: 'scheduledDate', alias: 'Scheduled Date', type: 'string' },
    { name: 'completedDate', alias: 'Completed Date', type: 'string' },
    { name: 'crew', alias: 'Crew', type: 'string' },
    { name: 'notes', alias: 'Notes', type: 'string' },
  ];
}

export function getArcGisConfig(env: RuntimeEnv = viteEnv(), runtimeConfig: RuntimeEnv = runtimeEnv()) {
  const apiKey = firstConfiguredValue(env.VITE_ARCGIS_API_KEY, runtimeConfig.VITE_ARCGIS_API_KEY);
  const orgUrl = firstConfiguredValue(env.VITE_ARCGIS_ORG_URL, runtimeConfig.VITE_ARCGIS_ORG_URL);
  const webMapId = firstConfiguredValue(env.VITE_ARCGIS_WEB_MAP_ID, runtimeConfig.VITE_ARCGIS_WEB_MAP_ID);
  const layerUrls = Object.entries(arcGisLayerUrlEnvKeys).reduce<Partial<Record<ArcGisHostedLayerId, string>>>((urls, [layerId, envKey]) => {
    const value = firstConfiguredValue(env[envKey], runtimeConfig[envKey]);
    if (value) urls[layerId as ArcGisHostedLayerId] = normalizeArcGisFeatureLayerUrl(value);
    return urls;
  }, {});
  return {
    apiKey,
    orgUrl,
    webMapId,
    layerUrls,
    isReady: apiKey.length > 0,
  };
}

export function normalizeArcGisFeatureLayerUrl(url: string): string {
  const cleanUrl = clean(url);
  if (!cleanUrl) return '';
  if (/\/FeatureServer\/\d+\/?$/i.test(cleanUrl)) return cleanUrl.replace(/\/$/, '');
  if (/\/FeatureServer\/?$/i.test(cleanUrl)) return `${cleanUrl.replace(/\/$/, '')}/0`;
  return cleanUrl;
}

export function buildArcGisTreeAssetFeatures(input: {
  treeRelocationRecords?: TreeRelocationRecord[];
  ranchOaks?: RanchOakRecord[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  workOrders?: WorkOrderRecord[];
}): ArcGisTreeAssetFeature[] {
  const projectLookup = buildProjectLookup(input.projects, input.jobs);
  const crewLookup = buildTreeCrewLookup(input.workOrders);
  const trees = mergeTreeSources(input.treeRelocationRecords, input.ranchOaks);

  return trees
    .map((tree, index) => {
      const point = pointFromTree(tree);
      if (!point) return undefined;
      const treeId = clean(firstText(tree.treeId, tree.treeAssetId, tree.id, tree.tag, `tree-${index + 1}`));
      const treeTag = clean(firstText(tree.treeTag, tree.tag, tree.treeId));
      const treeType = clean(firstText(tree.treeType, tree.type, tree.species, tree.ranchOakType, tree.commonName));
      const project = projectLookup.get(clean(firstText(tree.projectId, tree.projectsId, tree.jobId))) || ({} as Partial<ProjectRecord | JobRecord>);
      const projectId = clean(firstText(tree.projectId, tree.projectsId, project.projectId, tree.jobId));
      const projectName = clean(firstText(tree.projectName, tree.jobName, project.projectName, tree.clientName));
      const relocationMap = tree.relocationMap as { source?: TreeRelocationPoint; destination?: TreeRelocationPoint } | undefined;
      const sourcePointText = pointText(relocationMap?.source) || clean(firstText(tree.existingSourcePin, tree.existingLocationDescription));
      const destinationPointText = pointText(relocationMap?.destination) || clean(firstText(tree.destinationPin, tree.proposedFinalLocationDescription));
      return {
        objectId: index + 1,
        treeId,
        treeAssetId: clean(firstText(tree.treeAssetId, tree.id, treeId)),
        treeTag,
        treeType,
        assetCategory: clean(firstText(tree.assetCategory, 'Relocation')),
        projectId,
        projectName,
        species: clean(firstText(tree.species, treeType)),
        dbh: clean(firstText(tree.dbh, tree.dbhIn, (tree as Record<string, unknown>).DBH_IN)),
        status: normalizeFieldMapsTreeRelocationStatus(firstText(tree.treeRelocationStatus, tree.relocationStatus, tree.status, tree.currentStatus, defaultRelocationStatus)),
        loadersNeeded: normalizeStringList(firstText(tree.loadersNeeded) || tree.loaderNamesNeeded || tree.loaderIdsNeeded).join('; '),
        additionalEquipmentRequired: clean(firstText(tree.additionalEquipmentRequired, 'None')),
        equipmentAccess: clean(firstText(tree.equipmentAccess)),
        equipmentAccessNotes: clean(firstText(tree.equipmentAccessNotes, tree.accessNotes)),
        issueAlert: clean(firstText(tree.issueAlert, 'None')),
        currentFieldLocation: clean(firstText(tree.currentFieldLocation, 'Existing Location')),
        existingSourcePin: sourcePointText,
        destinationPin: destinationPointText,
        treeFinalOutcome: clean(firstText(tree.treeFinalOutcome, 'Active in Scope')),
        mapGeometryStatus: clean(firstText(tree.mapGeometryStatus, sourcePointText || destinationPointText ? 'Parsed' : 'Missing')),
        rootPruneDate: clean(firstText(tree.rootPruneDate, tree.rootPruneDate1, tree.dateOfFirstCut, tree.firstCutDate)),
        finalMoveDate: clean(firstText(tree.finalMoveDate, tree.relocationDate, tree.dateMoved, tree.dateInstalled)),
        crew: clean(firstText(tree.crew, tree.crewLeadName, crewLookup.get(treeId))),
        crewNotes: clean(firstText(tree.crewNotes)),
        notes: clean(firstText(tree.notes, tree.existingLocationDescription, tree.proposedFinalLocationDescription)),
        latitude: point.lat,
        longitude: point.lng,
        arcGisFeatureId: clean(firstText(tree.arcGisFeatureId)),
        arcGisLayerUrl: clean(firstText(tree.arcGisLayerUrl)),
        lastMapSyncAt: clean(firstText(tree.lastMapSyncAt)),
        lastUpdatedSource: clean(firstText(tree.lastUpdatedSource)),
        lastUpdatedBy: clean(firstText(tree.lastUpdatedBy)),
        lastUpdatedAt: clean(firstText(tree.lastUpdatedAt)),
        lastSyncDirection: clean(firstText(tree.lastSyncDirection)),
        syncTransactionId: clean(firstText(tree.syncTransactionId)),
        arcGisLastSyncAt: clean(firstText(tree.arcGisLastSyncAt)),
        jdtLastSyncAt: clean(firstText(tree.jdtLastSyncAt)),
      };
    })
    .filter(Boolean) as ArcGisTreeAssetFeature[];
}

export function buildArcGisFinalTreeLocationFeatures(input: {
  treeRelocationRecords?: TreeRelocationRecord[];
  ranchOaks?: RanchOakRecord[];
}): ArcGisFinalTreeLocationFeature[] {
  return mergeTreeSources(input.treeRelocationRecords, input.ranchOaks)
    .map((tree, index) => {
      const point = pointFromTreeDestination(tree);
      if (!point) return undefined;
      const treeAssetId = clean(firstText(tree.treeAssetId, tree.id, tree.treeId, tree.tag, `tree-${index + 1}`));
      return {
        objectId: index + 1,
        finalLocationId: clean(firstText((tree as Record<string, unknown>).finalLocationId, `final-${treeAssetId}`)),
        treeAssetId,
        projectId: clean(firstText(tree.projectId, tree.projectsId, tree.jobId)),
        treeTag: clean(firstText(tree.treeTag, tree.tag, tree.treeId)),
        treeType: clean(firstText(tree.treeType, tree.type, tree.species, tree.ranchOakType, tree.commonName)),
        destinationStatus: clean(firstText(tree.installationStatus, tree.installStatus, tree.treeRelocationStatus, 'Proposed')),
        approvedBy: clean(firstText(tree.outcomeDecidedBy)),
        approvalDate: clean(firstText(tree.outcomeDate)),
        installNotes: clean(firstText(tree.proposedFinalLocationDescription, tree.outcomeNotes, tree.notes)),
        latitude: point.lat,
        longitude: point.lng,
      };
    })
    .filter(Boolean) as ArcGisFinalTreeLocationFeature[];
}

export function buildArcGisProjectBoundaryFeatures(input: {
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  treeFeatures?: ArcGisTreeAssetFeature[];
  locations?: LocationRecord[];
}): ArcGisPolygonFeature[] {
  const projectRecords = mergeProjectRecords(input.projects, input.jobs);
  return projectRecords
    .map((project, index) => {
      const projectId = clean(firstText(project.projectId, project.projectsId, project.id, project.jobId));
      const projectName = clean(firstText(project.projectName, project.title, project.name, project.jobName));
      const projectPoints = [
        ...pointsFromProject(project),
        ...(input.treeFeatures || [])
          .filter((tree) => projectId && tree.projectId === projectId)
          .map((tree) => ({ lat: tree.latitude, lng: tree.longitude })),
        ...(input.locations || [])
          .filter((location) => !projectId || clean(firstText(location.projectId, location.jobId)) === projectId)
          .map(pointFromSavedSiteLocation)
          .filter(Boolean) as TreeRelocationPoint[],
      ];
      const center = averagePoint(projectPoints);
      if (!center) return undefined;
      return {
        objectId: index + 1,
        id: clean(firstText(project.id, projectId, `project-boundary-${index + 1}`)),
        projectId,
        projectName,
        name: `${projectName || 'Project'} Boundary`,
        status: clean(firstText(project.status, project.projectStatusId, 'Active')),
        notes: clean(firstText(project.siteAccessNotes, project.notes, project.location)),
        rings: squareRings(center, 0.0035),
      };
    })
    .filter(Boolean) as ArcGisPolygonFeature[];
}

export function buildArcGisHoldingAreaFeatures(input: {
  locations?: LocationRecord[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
}): ArcGisPolygonFeature[] {
  const projectLookup = buildProjectLookup(input.projects, input.jobs);
  return (input.locations || [])
    .filter((location) => /holding/i.test(clean(firstText(location.accessType, location.locationType, location.name, location.title))))
    .map((location, index) => {
      const point = pointFromSavedSiteLocation(location);
      if (!point) return undefined;
      const projectId = clean(firstText(location.projectId, location.jobId));
      const project = projectLookup.get(projectId) || {};
      return {
        objectId: index + 1,
        id: clean(firstText(location.id, `holding-area-${index + 1}`)),
        projectId,
        projectName: clean(firstText(location.projectName, project.projectName)),
        name: clean(firstText(location.name, location.title, 'Holding Area')),
        status: clean(firstText(location.status, 'Active')),
        notes: clean(firstText(location.notes, location.mainAddress, location.sourceText)),
        rings: squareRings(point, 0.0015),
      };
    })
    .filter(Boolean) as ArcGisPolygonFeature[];
}

export function buildArcGisWorkZoneFeatures(input: {
  locations?: LocationRecord[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
}): ArcGisPolygonFeature[] {
  const projectLookup = buildProjectLookup(input.projects, input.jobs);
  return (input.locations || [])
    .filter((location) => {
      const text = clean(firstText(location.accessType, location.locationType, location.name, location.title));
      return /work\s*zone|construction|staging|active\s*work|zone/i.test(text) && !/holding/i.test(text);
    })
    .map((location, index) => {
      const point = pointFromSavedSiteLocation(location);
      if (!point) return undefined;
      const projectId = clean(firstText(location.projectId, location.jobId));
      const project = projectLookup.get(projectId) || {};
      return {
        objectId: index + 1,
        id: clean(firstText(location.id, location.locationId, `work-zone-${index + 1}`)),
        projectId,
        projectName: clean(firstText(location.projectName, project.projectName)),
        name: clean(firstText(location.name, location.title, 'Work Zone')),
        status: clean(firstText(location.status, 'Active')),
        notes: clean(firstText(location.notes, location.mainAddress, location.sourceText)),
        rings: squareRings(point, 0.0018),
      };
    })
    .filter(Boolean) as ArcGisPolygonFeature[];
}

export function buildArcGisEquipmentLocationFeatures(equipment: EquipmentRecord[] = []): ArcGisEquipmentFeature[] {
  return equipment
    .map((item, index) => {
      const point = pointFromEquipment(item);
      if (!point) return undefined;
      return {
        objectId: index + 1,
        equipmentId: clean(firstText(item.id, item.assetId, item.vehicleNumber, `equipment-${index + 1}`)),
        equipmentName: clean(firstText(item.name, item.title, item.make && item.model ? `${item.make} ${item.model}` : '', item.assetId)),
        category: clean(firstText(item.category, item.eqType, item.type, 'Equipment')),
        status: clean(firstText(item.status, item.availability, item.serviceStatus, item.lastTelematicsStatus, 'Available')),
        currentLocation: clean(firstText(item.currentLocationName, item.currentLocation, item.location, item.lastTelematicsAddress)),
        assignedProjectId: clean(firstText(item.assignedProjectId)),
        assignedProjectName: clean(firstText(item.assignedProjectName)),
        crew: clean(firstText(item.assignedCrewName, item.operator, item.lastTelematicsDriverName)),
        notes: clean(firstText(item.notes, item.revealSyncStatus)),
        latitude: point.lat,
        longitude: point.lng,
      };
    })
    .filter(Boolean) as ArcGisEquipmentFeature[];
}

export function buildArcGisTaskOverlayFeatures(input: {
  workOrders?: WorkOrderRecord[];
  treeFeatures?: ArcGisTreeAssetFeature[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
}): ArcGisTaskOverlayFeatures {
  const treeLookup = buildTreeFeatureLookup(input.treeFeatures);
  const projectLookup = buildProjectLookup(input.projects, input.jobs);
  const build = (workOrder: WorkOrderRecord, index: number): ArcGisTaskFeature | undefined => {
    const point = pointFromWorkOrder(workOrder, treeLookup, projectLookup);
    if (!point) return undefined;
    const tree = firstTreeFeatureForWorkOrder(workOrder, treeLookup);
    return {
      objectId: index + 1,
      taskId: clean(firstText(workOrder.sourceRowId, workOrder.id, workOrder.jobId, `task-${index + 1}`)),
      treeAssetId: clean(firstText(firstListValue(workOrder.treeIds), tree?.treeAssetId, firstListValue(workOrder.treeNames))),
      projectId: clean(firstText(workOrder.projectId, workOrder.projectsId, tree?.projectId, workOrder.jobId)),
      treeTag: clean(firstText(tree?.treeTag, firstListValue(workOrder.treeNames), firstListValue(workOrder.treeIds))),
      taskType: clean(firstText(workOrder.taskType, workOrder.workOrderType, workOrder.title)),
      status: clean(firstText(workOrder.rootPruneTaskStatus, workOrder.moveTaskStatus, workOrder.careTaskStatus, workOrder.status, 'Scheduled')),
      scheduledDate: clean(firstText(workOrder.scheduledDate, workOrder.startDate, workOrder.dueDate)),
      completedDate: clean(firstText(workOrder.completedDate)),
      crew: clean(firstText(workOrder.crewLeadName, workOrder.assignedCrewNames?.join(', '))),
      notes: clean(firstText(workOrder.notes, workOrder.origin, workOrder.destination)),
      latitude: point.lat,
      longitude: point.lng,
    };
  };

  const workOrders = input.workOrders || [];
  return {
    rootPruneEvents: workOrders.filter((order) => order.workOrderType === 'tree_pruning').map(build).filter(Boolean) as ArcGisTaskFeature[],
    relocationWork: workOrders.filter((order) => order.workOrderType === 'tree_relocation_work').map(build).filter(Boolean) as ArcGisTaskFeature[],
    nutrientCareTasks: workOrders.filter((order) => ['treatment_aftercare', 'nutrient_care'].includes(String(order.workOrderType || ''))).map(build).filter(Boolean) as ArcGisTaskFeature[],
  };
}

export function buildArcGisFilterOptions(input: {
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  treeFeatures?: ArcGisTreeAssetFeature[];
}) {
  const projectRecords = mergeProjectRecords(input.projects, input.jobs);
  const projectOptions = uniqueOptions([
    ...projectRecords.map((project) => ({
      value: clean(firstText(project.projectId, project.projectsId, project.id, project.jobId)),
      label: clean(firstText(project.projectName, project.title, project.name, project.jobName)),
    })),
    ...(input.treeFeatures || []).map((tree) => ({ value: tree.projectId, label: tree.projectName || tree.projectId })),
  ]);

  return {
    projects: projectOptions,
    statuses: uniqueStrings((input.treeFeatures || []).map((tree) => tree.status)),
    treeTypes: uniqueStrings((input.treeFeatures || []).map((tree) => tree.treeType || tree.species)),
    dbhValues: uniqueStrings((input.treeFeatures || []).map((tree) => tree.dbh)),
    crews: uniqueStrings((input.treeFeatures || []).map((tree) => tree.crew)),
  };
}

export function filterArcGisTreeFeatures(features: ArcGisTreeAssetFeature[], filters: ArcGisMapFilters): ArcGisTreeAssetFeature[] {
  return features.filter((feature) => (
    matchesFilter(feature.projectId, filters.projectId) &&
    matchesFilter(feature.status, filters.status) &&
    matchesFilter(feature.treeType || feature.species, filters.treeType) &&
    matchesFilter(feature.dbh, filters.dbh) &&
    matchesFilter(feature.crew, filters.crew)
  ));
}

export function buildTreeDefinitionExpression(filters: ArcGisMapFilters): string {
  const clauses = [
    sqlEquals('projectId', filters.projectId),
    sqlEquals('status', filters.status),
    sqlEquals('treeType', filters.treeType),
    sqlEquals('dbh', filters.dbh),
    sqlEquals('crew', filters.crew),
  ].filter(Boolean);
  return clauses.length ? clauses.join(' AND ') : '1=1';
}

export function buildProjectDefinitionExpression(projectId: string): string {
  return sqlEquals('projectId', projectId) || '1=1';
}

export function treeFeatureToTreeRecord(feature: Partial<ArcGisTreeAssetFeature>, fallbackProject?: Partial<ProjectRecord | JobRecord>): TreeRelocationRecord {
  const treeId = clean(firstText(feature.treeId, `arcgis-tree-${Date.now().toString(36)}`));
  return {
    id: `tree-${slugify([feature.projectId, treeId].filter(Boolean).join('-') || treeId)}`,
    treeId,
    treeAssetId: clean(firstText(feature.treeAssetId, treeId)),
    treeTag: clean(firstText(feature.treeTag, treeId)),
    projectId: clean(firstText(feature.projectId, fallbackProject?.projectId, fallbackProject?.projectsId, fallbackProject?.id)),
    projectName: clean(firstText(feature.projectName, fallbackProject?.projectName, fallbackProject?.title, fallbackProject?.name)),
    type: clean(firstText(feature.treeType, feature.species)),
    treeType: clean(firstText(feature.treeType, feature.species)),
    assetCategory: clean(firstText(feature.assetCategory, 'Relocation')),
    species: clean(feature.species),
    dbh: clean(feature.dbh),
    status: clean(firstText(feature.status, defaultRelocationStatus)),
    treeRelocationStatus: clean(firstText(feature.status, defaultRelocationStatus)),
    relocationStatus: clean(firstText(feature.status, defaultRelocationStatus)),
    loaderNamesNeeded: normalizeStringList(feature.loadersNeeded),
    additionalEquipmentRequired: clean(firstText(feature.additionalEquipmentRequired, 'None')),
    equipmentAccess: clean(feature.equipmentAccess),
    equipmentAccessNotes: clean(feature.equipmentAccessNotes),
    issueAlert: clean(firstText(feature.issueAlert, 'None')),
    currentFieldLocation: clean(firstText(feature.currentFieldLocation, 'Existing Location')),
    existingSourcePin: clean(feature.existingSourcePin),
    destinationPin: clean(feature.destinationPin),
    treeFinalOutcome: clean(firstText(feature.treeFinalOutcome, 'Active in Scope')),
    mapGeometryStatus: clean(firstText(feature.mapGeometryStatus, 'Parsed')),
    rootPruneDate1: clean(feature.rootPruneDate),
    relocationDate: clean(feature.finalMoveDate),
    crew: clean(feature.crew),
    crewNotes: clean(feature.crewNotes),
    notes: clean(feature.notes),
    relocationMap: feature.latitude !== undefined && feature.longitude !== undefined
      ? { source: { lat: Number(feature.latitude), lng: Number(feature.longitude), label: 'ArcGIS tree point' } }
      : undefined,
    arcGisFeatureId: clean(firstText((feature as Record<string, unknown>).arcGisFeatureId, feature.objectId)),
    arcGisLayerUrl: clean((feature as Record<string, unknown>).arcGisLayerUrl),
    lastMapSyncAt: clean((feature as Record<string, unknown>).lastMapSyncAt),
    lastUpdatedSource: clean((feature as Record<string, unknown>).lastUpdatedSource),
    lastSyncDirection: clean((feature as Record<string, unknown>).lastSyncDirection),
    syncTransactionId: clean((feature as Record<string, unknown>).syncTransactionId),
    arcGisLastSyncAt: clean((feature as Record<string, unknown>).arcGisLastSyncAt),
    jdtLastSyncAt: clean((feature as Record<string, unknown>).jdtLastSyncAt),
  } as TreeRelocationRecord;
}

export function buildArcGisTreeAssetHostedEdit(feature: Partial<ArcGisTreeAssetFeature>): ArcGisHostedEditFeature {
  const latitude = Number(feature.latitude);
  const longitude = Number(feature.longitude);
  const objectId = numericValue(feature.arcGisFeatureId);
  const attributes = withoutUndefined({
    OBJECTID: objectId,
    Tree_Asset_ID: firstText(feature.treeAssetId, feature.treeId),
    Project_ID: feature.projectId,
    Client_ID: (feature as Record<string, unknown>).clientId,
    Asset_Category: firstText(feature.assetCategory, 'Relocation'),
    Tree_Tag: firstText(feature.treeTag, feature.treeId),
    Tree_Type: firstText(feature.treeType, feature.species),
    DBH_IN: numericValue(feature.dbh),
    Height_FT: numericValue((feature as Record<string, unknown>).height),
    Spread_FT: numericValue((feature as Record<string, unknown>).spread),
    Condition: (feature as Record<string, unknown>).condition,
    Difficulty: (feature as Record<string, unknown>).difficulty,
    Priority: (feature as Record<string, unknown>).priority,
    Tree_Relocation_Status: firstText(feature.status, defaultRelocationStatus),
    Installation_Status: (feature as Record<string, unknown>).installationStatus,
    Tree_Final_Outcome: firstText(feature.treeFinalOutcome, 'Active in Scope'),
    Current_Field_Location: feature.currentFieldLocation,
    Holding_Area_Name: (feature as Record<string, unknown>).holdingAreaName,
    Existing_Location_Description: feature.existingSourcePin,
    Proposed_Final_Location_Description: feature.destinationPin,
    Loaders_Needed: feature.loadersNeeded,
    Additional_Equipment_Required: firstText(feature.additionalEquipmentRequired, 'None'),
    Equipment_Access: feature.equipmentAccess,
    Equipment_Access_Notes: feature.equipmentAccessNotes,
    Issue_Alert: firstText(feature.issueAlert, 'None'),
    Crew_Notes: feature.crewNotes,
    Relocation_Cost: numericValue((feature as Record<string, unknown>).relocationCost),
    Billing_Status: (feature as Record<string, unknown>).billingStatus,
    Estimated_Relocation_Cost: numericValue((feature as Record<string, unknown>).estimatedRelocationCost),
    Contract_Relocation_Cost: numericValue((feature as Record<string, unknown>).contractRelocationCost),
    Risk_Level: (feature as Record<string, unknown>).riskLevel,
    Map_Geometry_Status: firstText(feature.mapGeometryStatus, feature.arcGisFeatureId ? 'Synced' : 'Ready for ArcGIS Sync'),
    Last_Map_Sync_At: dateValue(feature.lastMapSyncAt),
    Last_Updated_Source: (feature as Record<string, unknown>).lastUpdatedSource,
    Last_Updated_By: (feature as Record<string, unknown>).lastUpdatedBy,
    Last_Updated_At: dateValue((feature as Record<string, unknown>).lastUpdatedAt),
    Last_Sync_Direction: (feature as Record<string, unknown>).lastSyncDirection,
    Sync_Transaction_ID: (feature as Record<string, unknown>).syncTransactionId,
    ArcGIS_Last_Sync_At: dateValue((feature as Record<string, unknown>).arcGisLastSyncAt),
    JDT_Last_Sync_At: dateValue((feature as Record<string, unknown>).jdtLastSyncAt),
    Notes: feature.notes,
  });

  return {
    ...(Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { geometry: { type: 'point' as const, latitude, longitude, spatialReference: { wkid: 4326 as const } } }
      : {}),
    attributes,
  };
}

export function arcGisFeatureIdFromApplyEditsResult(result: unknown): string {
  const response = result as {
    addFeatureResults?: Array<{ objectId?: number | string; success?: boolean }>;
    updateFeatureResults?: Array<{ objectId?: number | string; success?: boolean }>;
  };
  const resultItem = [...(response.addFeatureResults || []), ...(response.updateFeatureResults || [])]
    .find((item) => item?.success !== false && item?.objectId !== undefined && item?.objectId !== null);
  return clean(resultItem?.objectId);
}

export function applyArcGisSyncReference<T extends Record<string, unknown>>(record: T, sync: {
  featureId?: string | number;
  layerUrl?: string;
  geometryStatus?: string;
  syncedAt?: string;
}): T & {
  arcGisFeatureId: string;
  arcGisLayerUrl: string;
  mapGeometryStatus: string;
  lastMapSyncAt: string;
} {
  const current = record as Record<string, unknown>;
  return {
    ...record,
    arcGisFeatureId: clean(firstText(sync.featureId, current.arcGisFeatureId)),
    arcGisLayerUrl: normalizeArcGisFeatureLayerUrl(firstText(sync.layerUrl, current.arcGisLayerUrl)),
    mapGeometryStatus: clean(firstText(sync.geometryStatus, current.mapGeometryStatus, 'Synced')),
    lastMapSyncAt: clean(firstText(sync.syncedAt, new Date().toISOString())),
  };
}

function viteEnv(): RuntimeEnv {
  return ((import.meta as unknown as { env?: RuntimeEnv }).env ?? {}) as RuntimeEnv;
}

function runtimeEnv(): RuntimeEnv {
  if (typeof window === 'undefined') return {};
  return ((window as unknown as { JDT_RUNTIME_CONFIG?: RuntimeEnv }).JDT_RUNTIME_CONFIG) ?? {};
}

function firstConfiguredValue(...values: (string | undefined)[]): string {
  return values.map(value => value?.trim() ?? '').find(Boolean) ?? '';
}

function mergeTreeSources(treeRelocationRecords: TreeRelocationRecord[] = [], ranchOaks: RanchOakRecord[] = []) {
  const byId = new Map<string, TreeRelocationRecord | RanchOakRecord>();
  [...ranchOaks, ...treeRelocationRecords].forEach((tree) => {
    const id = clean(firstText(tree.treeId, tree.id, tree.tag));
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...tree, treeId: firstText(tree.treeId, tree.id) });
  });
  return Array.from(byId.values());
}

function mergeProjectRecords(projects: ProjectRecord[] = [], jobs: JobRecord[] = []) {
  const byId = new Map<string, ProjectRecord | JobRecord>();
  [...projects, ...jobs].forEach((record) => {
    const id = clean(firstText(record.projectId, record.projectsId, record.id, record.jobId, record.title, record.name));
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...record });
  });
  return Array.from(byId.values());
}

function buildProjectLookup(projects: ProjectRecord[] = [], jobs: JobRecord[] = []) {
  const lookup = new Map<string, Partial<ProjectRecord | JobRecord>>();
  mergeProjectRecords(projects, jobs).forEach((project) => {
    const values = [
      project.id,
      project.projectId,
      project.projectsId,
      project.jobId,
      project.projectName,
      project.title,
      project.name,
    ].map(clean).filter(Boolean);
    values.forEach((value) => lookup.set(value, project));
  });
  return lookup;
}

function buildTreeCrewLookup(workOrders: WorkOrderRecord[] = []) {
  const lookup = new Map<string, string>();
  workOrders.forEach((order) => {
    const crew = clean(firstText(order.crewLeadName, order.assignedCrewNames?.join(', ')));
    if (!crew) return;
    (order.treeIds || []).forEach((treeId) => lookup.set(clean(treeId), crew));
    (order.treeNames || []).forEach((treeName) => lookup.set(clean(treeName), crew));
  });
  return lookup;
}

function buildTreeFeatureLookup(treeFeatures: ArcGisTreeAssetFeature[] = []) {
  const lookup = new Map<string, ArcGisTreeAssetFeature>();
  treeFeatures.forEach((tree) => {
    [tree.treeId, tree.treeAssetId, tree.treeTag].map(clean).filter(Boolean).forEach((value) => lookup.set(value, tree));
  });
  return lookup;
}

function firstTreeFeatureForWorkOrder(workOrder: WorkOrderRecord, treeLookup: Map<string, ArcGisTreeAssetFeature>) {
  const keys = [
    ...normalizeStringList(workOrder.treeIds),
    ...normalizeStringList(workOrder.treeNames),
  ];
  return keys.map((key) => treeLookup.get(clean(key))).find(Boolean);
}

function pointText(point?: { lat?: number; lng?: number }): string {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') return '';
  return `${point.lat},${point.lng}`;
}

function pointFromTree(tree: any): TreeRelocationPoint | undefined {
  const relocationMap = tree.relocationMap as { source?: TreeRelocationPoint; destination?: TreeRelocationPoint } | undefined;
  const point = relocationMap?.source || relocationMap?.destination;
  if (point?.lat !== undefined && point?.lng !== undefined) return point;
  return [
    tree.existingLocationDescription,
    tree.location,
    tree.fieldLocation,
    tree.proposedFinalLocationDescription,
  ].map(parseGoogleMapsLocationText).find(Boolean) || undefined;
}

function pointFromTreeDestination(tree: any): TreeRelocationPoint | undefined {
  const relocationMap = tree.relocationMap as { source?: TreeRelocationPoint; destination?: TreeRelocationPoint } | undefined;
  const point = relocationMap?.destination;
  if (point?.lat !== undefined && point?.lng !== undefined) return point;
  return [
    tree.destinationPin,
    tree.proposedFinalLocationDescription,
  ].map(parseGoogleMapsLocationText).find(Boolean) || undefined;
}

function pointsFromProject(project: Partial<ProjectRecord | JobRecord>): TreeRelocationPoint[] {
  return [
    project.loadUnloadPin,
    project.secondaryLoadUnloadPin,
    project.constructionAccessPin,
    project.location,
    project.crewAccessAddress,
    project.truckAccessAddress,
  ].map(parseGoogleMapsLocationText).filter(Boolean) as TreeRelocationPoint[];
}

function pointFromWorkOrder(
  workOrder: WorkOrderRecord,
  treeLookup: Map<string, ArcGisTreeAssetFeature>,
  projectLookup: Map<string, Partial<ProjectRecord | JobRecord>>,
): TreeRelocationPoint | undefined {
  const tree = firstTreeFeatureForWorkOrder(workOrder, treeLookup);
  if (tree) return { lat: tree.latitude, lng: tree.longitude, label: tree.treeId };
  const directPoint = [
    workOrder.origin,
    workOrder.destination,
    workOrder.siteArea,
  ].map(parseGoogleMapsLocationText).find(Boolean);
  if (directPoint) return directPoint;
  const projectId = clean(firstText(workOrder.projectId, workOrder.projectsId, workOrder.jobId));
  const project = projectLookup.get(projectId);
  return project ? averagePoint(pointsFromProject(project)) : undefined;
}

function pointFromEquipment(item: EquipmentRecord): TreeRelocationPoint | undefined {
  if (typeof item.lastTelematicsLatitude === 'number' && typeof item.lastTelematicsLongitude === 'number') {
    return { lat: item.lastTelematicsLatitude, lng: item.lastTelematicsLongitude, label: item.name || item.title };
  }
  return [item.currentLocation, item.location, item.lastTelematicsAddress].map(parseGoogleMapsLocationText).find(Boolean) || undefined;
}

function averagePoint(points: TreeRelocationPoint[]): TreeRelocationPoint | undefined {
  const validPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (!validPoints.length) return undefined;
  const lat = validPoints.reduce((sum, point) => sum + point.lat, 0) / validPoints.length;
  const lng = validPoints.reduce((sum, point) => sum + point.lng, 0) / validPoints.length;
  return { lat, lng };
}

function squareRings(center: TreeRelocationPoint, radius: number): number[][][] {
  const west = center.lng - radius;
  const east = center.lng + radius;
  const south = center.lat - radius;
  const north = center.lat + radius;
  return [[
    [west, south],
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ]];
}

function uniqueOptions(options: Array<{ value: string; label: string }>) {
  const byValue = new Map<string, { value: string; label: string }>();
  options.forEach((option) => {
    const value = clean(option.value);
    if (!value || byValue.has(value)) return;
    byValue.set(value, { value, label: clean(option.label) || value });
  });
  return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function matchesFilter(value: string, filter: string) {
  return filter === 'all' || clean(value) === clean(filter);
}

function sqlEquals(field: string, value: string): string {
  if (!value || value === 'all') return '';
  return `${field} = '${String(value).replace(/'/g, "''")}'`;
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function firstText(...values: unknown[]): string {
  return values.map(clean).find(Boolean) || '';
}

function firstListValue(value: unknown): string {
  return normalizeStringList(value)[0] || clean(value);
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(/[;,]/).map(clean).filter(Boolean);
}

function slugify(value: string): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'record';
}

function numericValue(value: unknown): number | undefined {
  if (value === undefined || value === null || clean(value) === '') return undefined;
  const numberValue = Number(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function dateValue(value: unknown): number | undefined {
  const text = clean(value);
  if (!text) return undefined;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function withoutUndefined(input: Record<string, unknown>): Record<string, string | number | null> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value === '' ? null : value as string | number | null]));
}
