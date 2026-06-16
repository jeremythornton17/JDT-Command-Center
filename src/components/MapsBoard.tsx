import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ClipboardList,
  Compass,
  Crosshair,
  Download,
  Eye,
  Layers,
  List,
  Globe2,
  LocateFixed,
  Maximize2,
  Minimize2,
  MapPin,
  Pencil,
  Plus,
  Route,
  Save,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Target,
  Truck,
  TreePine,
  Upload,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  buildSavedSiteLocationRecord,
  buildProjectGoogleEarthMapPackage,
  buildRelocationJobOptions,
  buildTreeRelocationTasks,
  buildTreeRelocationRecordsFromKmlImport,
  filterSavedSiteLocationsForJob,
  filterTreesForRelocationJob,
  formatTreeCoordinate,
  getGoogleMapsConfig,
  googleMapsUrlForSavedSiteLocation,
  getRelocationStatusTone,
  getTaskStatusTone,
  getTreeRelocationStatus,
  latLngToMapPercent,
  loadGoogleMaps,
  mapPercentToLatLng,
  mapTargetForRelocationJob,
  parseGoogleMapsLocationText,
  parseKmlTreePlacemarks,
  pointFromDevicePosition,
  pointFromSavedSiteLocation,
  relocationContextForJob,
  searchTextForSavedSiteLocation,
  updateTreeRelocationPoint,
  type KmlTreePlacemark,
  type SiteLocationAccessType,
  type TreeRelocationPoint,
  type TreeRelocationPointType,
} from '../treeRelocationMap';
import { useAuth } from '../AuthProvider';
import { useFirestoreSyncState } from '../useFirestoreCollection';
import { defaultJdtFarmLocations, jdtHomeBase, mergeLocationLibrary } from '../commandCenter/equipmentFreight';
import type { EquipmentRecord, FleetTelematicsEventRecord, LoadRecord, ScheduleTaskRecord } from '../commandCenter/records';
import { buildLiveVehicleMapMarkers, type LiveVehicleMapMarker } from '../commandCenter/telematicsIntelligence';
import {
  buildLiveGpsAssets,
  filterLiveGpsAssets,
  isolateLiveGpsAsset,
  type LiveGpsAsset,
  type LiveGpsCategory,
} from '../commandCenter/liveGpsMap';

const defaultFieldCenter = jdtHomeBase.coordinates;

const siteLocationAccessTypes: SiteLocationAccessType[] = [
  'Main Jobsite Address',
  'Crew Access',
  'Truck / Equipment Access',
  'Construction / Equipment Access Pin',
  'Load / Unload Pin',
  'Additional Load / Unload Pin',
  'Farm',
  'Shop',
  'Holding Area',
];

const siteLocationDivisionOptions = ['Relocation & Installation', 'Crew', 'Freight', 'Equipment', 'Nursery'];
const liveGpsCategoryOptions: Array<{ id: LiveGpsCategory; label: string }> = [
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'freight', label: 'Freight' },
  { id: 'unmatched', label: 'Unmatched GPS' },
];
const liveGpsStatusOptions = ['Moving', 'Idle', 'Stopped', 'Stale', 'No Signal', 'Needs Match', 'In Transit'];
const treeRelocationPipelineStatuses = [
  'Not Started',
  '25% Cut',
  '50% Cut',
  '75% Cut',
  '100% Cut',
  'Ready for Relocation',
  'Moved to Holding',
  'Relocated',
];
const mapDataCleanupStatuses = ['Needs Source Pin', 'Needs Destination Pin', 'High Risk', 'Blocked', 'Care Follow-Up Due', 'Ready to Move'];
const arcGisLayerOptions = [
  'JDT_Project_Boundaries',
  'JDT_Tree_Assets',
  'JDT_Final_Tree_Locations',
  'JDT_Holding_Areas',
  'JDT_Work_Zones',
  'JDT_Root_Prune_Events',
  'JDT_Relocation_Work',
  'JDT_Nutrient_Care_Tasks',
  'JDT_Equipment_Locations',
];
const arcGisReferenceFields = ['ArcGIS_Feature_ID', 'ArcGIS_Layer_URL', 'Map_Geometry_Status', 'Last_Map_Sync_At'];

type MapViewMode = 'map' | 'earth';
type MapWorkspaceMode = 'locations' | 'project' | 'liveGps' | 'arcgis';
export type MapBounds = { north: number; south: number; east: number; west: number };

const profileSiteLocationFields: Array<{ key: string; accessType: SiteLocationAccessType; label: string }> = [
  { key: 'location', accessType: 'Main Jobsite Address', label: 'Main Jobsite Address' },
  { key: 'mainAddress', accessType: 'Main Jobsite Address', label: 'Main Jobsite Address' },
  { key: 'siteAddress', accessType: 'Main Jobsite Address', label: 'Main Jobsite Address' },
  { key: 'jobsiteAddress', accessType: 'Main Jobsite Address', label: 'Main Jobsite Address' },
  { key: 'crewAccessAddress', accessType: 'Crew Access', label: 'Crew Access' },
  { key: 'truckAccessAddress', accessType: 'Truck / Equipment Access', label: 'Truck / Equipment Access' },
  { key: 'constructionAccessPin', accessType: 'Construction / Equipment Access Pin', label: 'Construction / Equipment Access Pin' },
  { key: 'loadUnloadPin', accessType: 'Load / Unload Pin', label: 'Load / Unload Pin' },
  { key: 'secondaryLoadUnloadPin', accessType: 'Additional Load / Unload Pin', label: 'Additional Load / Unload Pin' },
];

function applyGoogleMapViewMode(map: any, maps: any, mode: MapViewMode) {
  if (!map || !maps) return;
  map.setMapTypeId(mode === 'earth' ? maps.MapTypeId.SATELLITE : maps.MapTypeId.ROADMAP);
  if (typeof map.setTilt === 'function') map.setTilt(mode === 'earth' ? 45 : 0);
  if (typeof map.setHeading === 'function') map.setHeading(0);
}

function profileJobTitle(job: any) {
  return String(job?.projectName || job?.title || job?.jobName || job?.name || 'Project').trim();
}

function buildProfileSiteLocations(jobs: any[] = []) {
  return jobs.flatMap((job) => {
    const title = profileJobTitle(job);
    const seenValues = new Set<string>();
    return profileSiteLocationFields.flatMap((field) => {
      const sourceText = String(job?.[field.key] || '').trim();
      const valueKey = `${field.accessType}|${sourceText}`.toLowerCase();
      if (!sourceText || seenValues.has(valueKey)) return [];
      seenValues.add(valueKey);
      return buildSavedSiteLocationRecord({
        label: `${title} ${field.label}`,
        accessType: field.accessType,
        sourceText,
        job,
        divisionUse: field.accessType === 'Main Jobsite Address'
          ? ['Relocation & Installation', 'Crew', 'Freight', 'Equipment']
          : ['Relocation & Installation', 'Freight', 'Equipment'],
        savedBy: 'Project Profile',
        savedAt: String(job?.updatedAtIso || job?.createdAtIso || 'Project Profile'),
      });
    });
  });
}

function mergeSavedLocationRecords(locations: any[] = []) {
  const merged = new Map<string, any>();
  locations.forEach((location) => {
    const key = String(location?.id || `${location?.projectId || location?.jobId || 'general'}|${location?.locationType || location?.accessType}|${location?.name || location?.title}|${location?.sourceText || location?.mainAddress}`).toLowerCase();
    if (!key) return;
    merged.set(key, { ...merged.get(key), ...location });
  });
  return [...merged.values()];
}

function sourceTextForSiteLocation(location: any) {
  return String(
    location?.sourceText
      || location?.googleMapsUrl
      || location?.coordinateText
      || location?.mainAddress
      || location?.locationAddress
      || location?.address
      || '',
  ).trim();
}

type MapsBoardProps = {
  pagePurpose?: 'combined' | 'locations' | 'fleetGps' | 'imports';
  jobs?: any[];
  loads?: LoadRecord[];
  equipment?: EquipmentRecord[];
  fleetTelematicsEvents?: FleetTelematicsEventRecord[];
  canSyncRevealLiveLocations?: boolean;
  isSyncingRevealLiveLocations?: boolean;
  revealLiveLocationSyncStatus?: string;
  onSyncRevealLiveLocations?: () => void | Promise<void>;
  scheduleTasks?: ScheduleTaskRecord[];
  ranchOaks?: any[];
  treeRelocationRecords?: any[];
  openDrawer?: (type: string, id: string) => void;
  onUpdateTreeLocation?: (treeId: string, relocationMap: any, relocationContext?: any) => void;
  onImportTreePins?: (records: any[]) => boolean | void | Promise<boolean | void>;
  initialKmlImportOpen?: boolean;
  initialSelectedJobId?: string;
  initialSavedLocations?: any[];
  locationsList?: any[];
  initialAddPinOpen?: boolean;
  initialMapMode?: MapWorkspaceMode;
  initialSelectedGpsAssetId?: string;
};

type SelectedPin = {
  treeId: string;
  pointType: TreeRelocationPointType;
};

export default function MapsBoard({
  pagePurpose = 'combined',
  jobs = [],
  loads = [],
  ranchOaks,
  treeRelocationRecords = [],
  equipment = [],
  fleetTelematicsEvents = [],
  canSyncRevealLiveLocations = false,
  isSyncingRevealLiveLocations = false,
  revealLiveLocationSyncStatus = '',
  onSyncRevealLiveLocations,
  scheduleTasks = [],
  onUpdateTreeLocation,
  onImportTreePins,
  openDrawer,
  initialKmlImportOpen = false,
  initialSelectedJobId = 'all',
  initialSavedLocations,
  locationsList,
  initialAddPinOpen = false,
  initialMapMode,
  initialSelectedGpsAssetId,
}: MapsBoardProps) {
  const { user } = useAuth();
  const [syncedRanchOaks, setSyncedRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user && !ranchOaks);
  const [syncedSavedLocations, setSavedLocations] = useFirestoreSyncState<any>('locations', [], !!user);
  const savedLocations = mergeLocationLibrary(
    defaultJdtFarmLocations,
    (locationsList ?? initialSavedLocations ?? syncedSavedLocations) as any[],
  );
  const treeRecords = useMemo(
    () => mergeMapTreeRecords(ranchOaks ?? syncedRanchOaks ?? [], treeRelocationRecords),
    [ranchOaks, syncedRanchOaks, treeRelocationRecords],
  );
  const relocationJobOptions = useMemo(() => buildRelocationJobOptions(jobs), [jobs]);
  const [selectedJobId, setSelectedJobId] = useState(initialSelectedJobId);
  const [mapMode, setMapMode] = useState<MapWorkspaceMode>(() => {
    if (pagePurpose === 'locations') return 'locations';
    if (pagePurpose === 'fleetGps') return 'liveGps';
    if (pagePurpose === 'imports') return 'project';
    return initialMapMode || (initialSelectedJobId === 'all' ? 'locations' : 'project');
  });
  const filteredTreeRecords = useMemo(
    () => filterTreesForRelocationJob(treeRecords, selectedJobId, jobs),
    [treeRecords, selectedJobId, jobs],
  );
  const selectedJob = jobs.find(job => String(job.id || job.jobId || job.projectId) === selectedJobId);
  const isDedicatedLocationsPage = pagePurpose === 'locations';
  const isDedicatedFleetGpsPage = pagePurpose === 'fleetGps';
  const isDedicatedImportsPage = pagePurpose === 'imports';
  const isLiveGpsView = mapMode === 'liveGps' || isDedicatedFleetGpsPage;
  const isArcGisView = mapMode === 'arcgis';
  const isAllLocationsView = isDedicatedLocationsPage || mapMode === 'locations' || (selectedJobId === 'all' && mapMode !== 'liveGps' && mapMode !== 'arcgis');
  const isRelocationJobView = !isDedicatedLocationsPage && !isDedicatedFleetGpsPage && !isDedicatedImportsPage && (mapMode === 'project' || mapMode === 'arcgis') && Boolean(selectedJob);
  const showTreeMapPanels = isRelocationJobView;
  const showSavedLocationsPanel = !isDedicatedImportsPage && !isLiveGpsView && (isAllLocationsView || isRelocationJobView);
  const showPassiveVehicleLayer = pagePurpose === 'combined' && !isLiveGpsView;
  const savedLocationsTitle = isDedicatedLocationsPage ? 'Saved Site Locations' : isAllLocationsView ? 'All Saved Locations' : 'Saved Site Locations';
  const savedLocationsListLabel = isDedicatedLocationsPage ? 'Saved Site Pins' : isAllLocationsView ? 'All Saved Pins' : 'Project Pins';
  const mapsConfig = useMemo(() => getGoogleMapsConfig(), []);
  const [zoomLevel, setZoomLevel] = useState(17);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('earth');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(() => filteredTreeRecords[0]?.treeId ?? filteredTreeRecords[0]?.id ?? null);
  const [pinMode, setPinMode] = useState<TreeRelocationPointType | null>(null);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [fieldStatus, setFieldStatus] = useState('Select a tree, choose a pin type, then click the map.');
  const [treeSearch, setTreeSearch] = useState('');
  const [activeTreeStatuses, setActiveTreeStatuses] = useState<string[]>([]);
  const [activeArcGisLayers, setActiveArcGisLayers] = useState<string[]>(arcGisLayerOptions);
  const [treeInViewOnly, setTreeInViewOnly] = useState(false);
  const [multiSelectTrees, setMultiSelectTrees] = useState(false);
  const [selectedMapTreeIds, setSelectedMapTreeIds] = useState<string[]>([]);
  const [visibleMapBounds, setVisibleMapBounds] = useState<MapBounds | null>(null);
  const [kmlImportOpen, setKmlImportOpen] = useState(Boolean(initialKmlImportOpen || pagePurpose === 'imports'));
  const [kmlImportText, setKmlImportText] = useState('');
  const [kmlImportFileName, setKmlImportFileName] = useState('');
  const [kmlImportStatus, setKmlImportStatus] = useState('');
  const [isSiteLocationFormOpen, setIsSiteLocationFormOpen] = useState(Boolean(initialAddPinOpen));
  const [editingSiteLocationId, setEditingSiteLocationId] = useState<string | null>(null);
  const googleMapRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkerRefs = useRef<any[]>([]);
  const lastFocusedJobTargetRef = useRef('');
  const pinModeRef = useRef<TreeRelocationPointType | null>(pinMode);
  const selectedTreeIdRef = useRef<string | null>(selectedTreeId);
  const isSiteLocationFormOpenRef = useRef(Boolean(initialAddPinOpen));

  useEffect(() => {
    pinModeRef.current = pinMode;
    selectedTreeIdRef.current = selectedTreeId;
    isSiteLocationFormOpenRef.current = isSiteLocationFormOpen;
  }, [pinMode, selectedTreeId, isSiteLocationFormOpen]);

  useEffect(() => {
    const selectedStillVisible = filteredTreeRecords.some(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
    if (!selectedTreeId || !selectedStillVisible) {
      setSelectedTreeId(filteredTreeRecords[0]?.treeId ?? filteredTreeRecords[0]?.id ?? null);
      setSelectedPin(null);
      setPinMode(null);
    }
  }, [filteredTreeRecords, selectedTreeId]);

  const selectedTree = filteredTreeRecords.find(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
  const selectedJobMapTarget = useMemo(() => mapTargetForRelocationJob(selectedJob), [selectedJob]);
  const selectedTasks = selectedTree ? buildTreeRelocationTasks(selectedTree) : [];
  const projectRelocationPipeline = useMemo(
    () => buildProjectRelocationPipeline(filteredTreeRecords),
    [filteredTreeRecords],
  );
  const selectedTaskGroups = useMemo(() => groupSelectedTreeTasks(selectedTasks), [selectedTasks]);
  const treeStatusOptions = useMemo(() => {
    const statuses = filteredTreeRecords.map(tree => getTreeRelocationStatus(tree)).filter(Boolean);
    return Array.from(new Set([...treeRelocationPipelineStatuses, ...mapDataCleanupStatuses, 'Root Pruning', ...statuses]));
  }, [filteredTreeRecords]);
  const workbenchBounds = resolveMapWorkbenchBounds(treeInViewOnly, visibleMapBounds);
  const workbenchTreeRecords = useMemo(
    () => filterMapWorkbenchTrees(filteredTreeRecords, {
      search: treeSearch,
      statuses: activeTreeStatuses,
      inViewOnly: treeInViewOnly,
      bounds: workbenchBounds,
    }),
    [filteredTreeRecords, treeSearch, activeTreeStatuses, treeInViewOnly, workbenchBounds],
  );
  const allTreeTasks = workbenchTreeRecords.flatMap(tree => buildTreeRelocationTasks(tree).map(task => ({ ...task, tree })));
  const readyTasks = allTreeTasks.filter(task => task.status === 'Ready').slice(0, 7);
  const selectedMapTrees = useMemo(
    () => workbenchTreeRecords.filter(tree => selectedMapTreeIds.includes(treeMapId(tree))),
    [workbenchTreeRecords, selectedMapTreeIds],
  );
  const mapScheduleItems = useMemo(
    () => filterScheduleTasksForMap(scheduleTasks, selectedJob).slice(0, 7),
    [scheduleTasks, selectedJob],
  );
  const earthMapPackage = useMemo(() => buildProjectGoogleEarthMapPackage({
    job: selectedJob,
    name: selectedJob ? undefined : 'All Relocation Jobs',
    trees: selectedMapTrees.length ? selectedMapTrees : workbenchTreeRecords,
    fallbackCenter: defaultFieldCenter,
  }), [selectedJob, selectedMapTrees, workbenchTreeRecords]);
  const selectedPinPoint = selectedPin
    ? selectedTree?.relocationMap?.[selectedPin.pointType]
    : undefined;
  const profileSiteLocations = useMemo(
    () => buildProfileSiteLocations(isAllLocationsView ? jobs : selectedJob ? [selectedJob] : []),
    [isAllLocationsView, jobs, selectedJob],
  );
  const scopedSavedLocations = useMemo(
    () => mergeSavedLocationRecords([
      ...profileSiteLocations,
      ...filterSavedSiteLocationsForJob(savedLocations, selectedJob),
    ]),
    [profileSiteLocations, savedLocations, selectedJob],
  );
  const groupedSavedLocations = useMemo(() => groupSavedSiteLocations(scopedSavedLocations), [scopedSavedLocations]);
  const liveVehicleMarkers = useMemo(
    () => buildLiveVehicleMapMarkers(equipment, fleetTelematicsEvents),
    [equipment, fleetTelematicsEvents],
  );
  const liveGpsAssets = useMemo(
    () => buildLiveGpsAssets({ equipment, events: fleetTelematicsEvents, loads }),
    [equipment, fleetTelematicsEvents, loads],
  );
  const [gpsSearch, setGpsSearch] = useState('');
  const [activeGpsCategories, setActiveGpsCategories] = useState<LiveGpsCategory[]>(['vehicle', 'equipment', 'freight', 'unmatched']);
  const [activeGpsStatuses, setActiveGpsStatuses] = useState<string[]>([]);
  const [selectedGpsAssetId, setSelectedGpsAssetId] = useState(initialSelectedGpsAssetId || '');
  const [isolatedGpsAssetId, setIsolatedGpsAssetId] = useState(initialSelectedGpsAssetId || '');
  const [isGpsPanelCollapsed, setIsGpsPanelCollapsed] = useState(false);
  const [isGpsMapOptionsOpen, setIsGpsMapOptionsOpen] = useState(false);
  const [isGpsTextViewOpen, setIsGpsTextViewOpen] = useState(false);
  const [isGpsMapFullscreen, setIsGpsMapFullscreen] = useState(false);
  const [showGpsLabels, setShowGpsLabels] = useState(true);
  const [isIconClusteringEnabled, setIsIconClusteringEnabled] = useState(true);
  const [showGpsTraffic, setShowGpsTraffic] = useState(true);
  const [isMapWorkbenchCollapsed, setIsMapWorkbenchCollapsed] = useState(false);
  const [isMapWorkspaceFullscreen, setIsMapWorkspaceFullscreen] = useState(false);
  const filteredGpsAssets = useMemo(
    () => filterLiveGpsAssets(liveGpsAssets, {
      categories: activeGpsCategories,
      statuses: activeGpsStatuses,
      search: gpsSearch,
    }),
    [liveGpsAssets, activeGpsCategories, activeGpsStatuses, gpsSearch],
  );
  const visibleGpsAssets = useMemo(
    () => isolateLiveGpsAsset(filteredGpsAssets, isolatedGpsAssetId),
    [filteredGpsAssets, isolatedGpsAssetId],
  );
  const selectedGpsAsset = liveGpsAssets.find((asset) => asset.id === (selectedGpsAssetId || isolatedGpsAssetId));
  const isolatedGpsAsset = liveGpsAssets.find((asset) => asset.id === isolatedGpsAssetId);
  const [siteLocationForm, setSiteLocationForm] = useState({
    label: '',
    accessType: 'Load / Unload Pin' as SiteLocationAccessType,
    sourceText: '',
    divisionUse: ['Relocation & Installation', 'Freight', 'Equipment'],
  });
  const parsedSiteLocation = useMemo(() => parseGoogleMapsLocationText(siteLocationForm.sourceText), [siteLocationForm.sourceText]);
  const kmlImportPreview = useMemo(() => parseKmlTreePlacemarks(kmlImportText), [kmlImportText]);
  const kmlImportRecords = useMemo(() => buildTreeRelocationRecordsFromKmlImport({
    placemarks: kmlImportPreview,
    job: selectedJob,
    importedBy: user?.email || 'Command Center',
    sourceFileName: kmlImportFileName || 'KML Import',
  }), [kmlImportPreview, selectedJob, user?.email, kmlImportFileName]);

  const mapInstruction = pinMode
    ? `Click the map to set ${pinMode === 'source' ? 'current field position' : 'relocation destination'} for ${selectedTree?.treeId || selectedTree?.id || 'selected tree'}.`
    : selectedPin
      ? `Selected ${selectedPin.pointType} pin. Click Move Selected Pin, drag the marker, or use phone GPS to update it.`
    : 'Choose Source or Destination before marking a tree pin.';

  const setMapZoom = (nextZoom: number) => {
    const boundedZoom = Math.min(21, Math.max(4, nextZoom));
    setZoomLevel(boundedZoom);
    googleMapInstanceRef.current?.setZoom?.(boundedZoom);
  };

  const zoomMapBy = (delta: number) => {
    const currentZoom = Number(googleMapInstanceRef.current?.getZoom?.() || zoomLevel || 17);
    setMapZoom(currentZoom + delta);
  };

  const fitVisibleGpsAssets = () => {
    const positionedAssets = visibleGpsAssets.filter((asset) => asset.lat !== undefined && asset.lng !== undefined);
    if (!positionedAssets.length) {
      setFieldStatus('No visible GPS assets have coordinates to fit on the map.');
      return;
    }

    const map = googleMapInstanceRef.current;
    const maps = window.google?.maps;
    if (map && maps?.LatLngBounds) {
      const bounds = new maps.LatLngBounds();
      positionedAssets.forEach((asset) => bounds.extend({ lat: asset.lat, lng: asset.lng }));
      map.fitBounds(bounds);
      const nextZoom = positionedAssets.length === 1 ? Math.max(Number(map.getZoom?.() || 0), 16) : Number(map.getZoom?.() || zoomLevel);
      if (Number.isFinite(nextZoom)) setZoomLevel(nextZoom);
      setFieldStatus(`Fit ${positionedAssets.length} GPS asset${positionedAssets.length === 1 ? '' : 's'} on the live map.`);
      return;
    }

    setFieldStatus(`Fit ${positionedAssets.length} GPS asset${positionedAssets.length === 1 ? '' : 's'} on the fallback map. Live Google Maps fit is available when the API is active.`);
  };

  const focusMapOnSelectedJob = (maps?: any) => {
    if (selectedJobId === 'all') {
      lastFocusedJobTargetRef.current = 'all';
      return;
    }

    const map = googleMapInstanceRef.current;
    const target = selectedJobMapTarget;
    if (!map) return;
    if (!target) {
      lastFocusedJobTargetRef.current = `${selectedJobId}|no-target`;
      return;
    }

    const targetKey = [
      selectedJobId,
      target.sourceField,
      target.point?.lat,
      target.point?.lng,
      target.searchText,
    ].filter(value => value !== undefined && value !== '').join('|');
    if (lastFocusedJobTargetRef.current === targetKey) return;
    lastFocusedJobTargetRef.current = targetKey;

    if (target.point) {
      map.setCenter({ lat: target.point.lat, lng: target.point.lng });
      map.setZoom(Math.max(Number(map.getZoom?.() || 0), 17));
      setFieldStatus(`${target.label} map centered at ${formatTreeCoordinate(target.point)}.`);
      return;
    }

    const googleMaps = maps || window.google?.maps;
    if (target.searchText && googleMaps?.Geocoder) {
      const geocoder = new googleMaps.Geocoder();
      setFieldStatus(`Searching ${target.searchText} inside the in-app map...`);
      geocoder.geocode({ address: target.searchText }, (results: any[] = [], status: string) => {
        const okStatus = googleMaps.GeocoderStatus?.OK || 'OK';
        const result = status === okStatus ? results[0] : null;
        const resultLocation = result?.geometry?.location;
        if (!resultLocation) {
          setFieldStatus(`Google Maps could not locate ${target.searchText}. Add exact coordinates or a Google Maps pin to this project map.`);
          return;
        }

        map.setCenter(resultLocation);
        map.setZoom(Math.max(Number(map.getZoom?.() || 0), 17));
        setFieldStatus(`${target.label} map centered from ${target.searchText}.`);
      });
    }
  };

  useEffect(() => {
    if (!mapsConfig.isReady || !googleMapRef.current) return;
    let cancelled = false;

    const initialize = async () => {
      try {
        const maps = await loadGoogleMaps(mapsConfig.apiKey);
        if (cancelled || !googleMapRef.current) return;

        if (!googleMapInstanceRef.current) {
          googleMapInstanceRef.current = new maps.Map(googleMapRef.current, {
            center: selectedTree?.relocationMap?.source ?? defaultFieldCenter,
            zoom: zoomLevel,
            mapTypeId: mapViewMode === 'earth' ? maps.MapTypeId.SATELLITE : maps.MapTypeId.ROADMAP,
            mapId: mapsConfig.mapId || undefined,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: true,
          });

          googleMapInstanceRef.current.addListener('click', (event: any) => {
            if (!event.latLng) return;
            if (pinModeRef.current && selectedTreeIdRef.current) {
              markTreePoint(selectedTreeIdRef.current, pinModeRef.current, {
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
                label: pinModeRef.current === 'source' ? 'Field source pin' : 'Relocation destination pin',
              });
              return;
            }
            if (isSiteLocationFormOpenRef.current) {
              setSiteLocationSourceFromMapPoint({
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
                label: 'Map-selected project pin',
              });
            }
          });

          googleMapInstanceRef.current.addListener('idle', () => {
            const bounds = googleMapInstanceRef.current?.getBounds?.();
            const northEast = bounds?.getNorthEast?.();
            const southWest = bounds?.getSouthWest?.();
            if (!northEast || !southWest) return;
            const nextBounds = {
              north: Number(northEast.lat()),
              east: Number(northEast.lng()),
              south: Number(southWest.lat()),
              west: Number(southWest.lng()),
            };
            setVisibleMapBounds((current) => (mapBoundsEqual(current, nextBounds) ? current : nextBounds));
          });

          googleMapInstanceRef.current.addListener('zoom_changed', () => {
            const nextZoom = Number(googleMapInstanceRef.current?.getZoom?.());
            if (!Number.isFinite(nextZoom)) return;
            setZoomLevel((currentZoom) => (currentZoom === nextZoom ? currentZoom : nextZoom));
          });
        }

        googleMapInstanceRef.current.setZoom(zoomLevel);
        applyGoogleMapViewMode(googleMapInstanceRef.current, maps, mapViewMode);
        renderGoogleTreeMarkers(maps);
        focusMapOnSelectedJob(maps);
      } catch (error) {
        setFieldStatus(error instanceof Error ? error.message : 'Unable to load Google Maps.');
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [mapsConfig.isReady, mapsConfig.apiKey, mapsConfig.mapId, workbenchTreeRecords, scopedSavedLocations, liveVehicleMarkers, visibleGpsAssets, zoomLevel, mapViewMode, selectedJobId, selectedJobMapTarget, isLiveGpsView, showTreeMapPanels, showSavedLocationsPanel, showPassiveVehicleLayer]);

  useEffect(() => {
    focusMapOnSelectedJob();
  }, [selectedJobId, selectedJobMapTarget]);

  useEffect(() => {
    const map = googleMapInstanceRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;
    applyGoogleMapViewMode(map, maps, mapViewMode);
  }, [mapViewMode]);

  const renderGoogleTreeMarkers = (maps: any) => {
    const map = googleMapInstanceRef.current;
    if (!map) return;

    googleMarkerRefs.current.forEach(marker => marker.setMap?.(null));
    googleMarkerRefs.current = [];

    if (showTreeMapPanels) {
      workbenchTreeRecords.forEach(tree => {
        const status = getTreeRelocationStatus(tree);
        (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
          const point = tree.relocationMap?.[pointType];
          if (!point) return;

          const marker = new maps.Marker({
            position: { lat: point.lat, lng: point.lng },
            map,
            title: `${tree.treeId || tree.id} ${pointType}`,
            label: treeMarkerLabel(tree, pointType),
            draggable: true,
          });
          marker.addListener('click', () => {
            selectExistingPin(tree, pointType, status);
          });
          marker.addListener('dragend', (event: any) => {
            if (!event.latLng) return;
            markTreePoint(tree.treeId ?? tree.id, pointType, {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              label: pointType === 'source' ? 'Moved source pin' : 'Moved destination pin',
            });
          });
          googleMarkerRefs.current.push(marker);
        });
      });
    }

    if (showSavedLocationsPanel) scopedSavedLocations.forEach((location) => {
      const point = pointFromSavedSiteLocation(location);
      if (!point) return;

      const marker = new maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        title: `${location.name || location.title || 'Saved site location'} ${location.locationType || ''}`,
        label: 'L',
        draggable: false,
      });
      marker.addListener('click', () => {
        focusSavedLocation(location);
      });
      googleMarkerRefs.current.push(marker);
    });

    if (isLiveGpsView) {
      visibleGpsAssets.forEach((asset) => {
        if (asset.lat === undefined || asset.lng === undefined) return;
        const marker = new maps.Marker({
          position: { lat: asset.lat, lng: asset.lng },
          map,
          title: `${asset.name} ${asset.status}`,
          label: liveGpsMarkerLabel(asset.category),
          draggable: false,
        });
        marker.addListener('click', () => {
          focusLiveGpsAsset(asset);
        });
        googleMarkerRefs.current.push(marker);
      });
    } else if (showPassiveVehicleLayer) {
      liveVehicleMarkers.forEach((vehicle) => {
        const marker = new maps.Marker({
          position: { lat: vehicle.lat, lng: vehicle.lng },
          map,
          title: `${vehicle.label} ${vehicle.status}`,
          label: 'V',
          draggable: false,
        });
        marker.addListener('click', () => {
          focusVehicleMarker(vehicle);
        });
        googleMarkerRefs.current.push(marker);
      });
    }
  };

  const beginPinEdit = (pointType: TreeRelocationPointType) => {
    if (!selectedTree) {
      setFieldStatus('Select a tree before choosing a pin to edit.');
      return;
    }
    const treeId = selectedTree.treeId ?? selectedTree.id;
    setSelectedPin({ treeId, pointType });
    setPinMode(pointType);
    setFieldStatus(`${pointType === 'source' ? 'Source' : 'Destination'} pin edit mode is active. Click the map, drag the marker, or use phone GPS.`);
  };

  const selectExistingPin = (tree: any, pointType: TreeRelocationPointType, status = getTreeRelocationStatus(tree)) => {
    const treeId = tree.treeId ?? tree.id;
    setSelectedTreeId(treeId);
    setSelectedPin({ treeId, pointType });
    setPinMode(pointType);
    setFieldStatus(`${tree.treeId || tree.id} ${pointType} pin selected for editing. Status: ${status}.`);
  };

  const markTreePoint = (treeId: string, pointType: TreeRelocationPointType, point: TreeRelocationPoint) => {
    const tree = treeRecords.find(candidate => candidate.treeId === treeId || candidate.id === treeId);
    if (!tree) return;

    const nextTree = updateTreeRelocationPoint(tree, pointType, point, 'Field Team');
    const relocationContext = relocationContextForJob(selectedJob);
    if (onUpdateTreeLocation) {
      onUpdateTreeLocation(tree.treeId || tree.id, nextTree.relocationMap, relocationContext);
    } else {
      setSyncedRanchOaks(prev => prev.map(item => (
        item.treeId === treeId || item.id === treeId
          ? { ...item, ...relocationContext, relocationMap: nextTree.relocationMap }
          : item
      )));
    }
    setFieldStatus(`${pointType === 'source' ? 'Source' : 'Destination'} pin saved for ${tree.treeId || tree.id}.`);
    setSelectedPin({ treeId: tree.treeId ?? tree.id, pointType });
    setPinMode(null);
  };

  const setSiteLocationSourceFromMapPoint = (point: TreeRelocationPoint) => {
    const coordinateText = `${Number(point.lat).toFixed(6)}, ${Number(point.lng).toFixed(6)}`;
    setSiteLocationForm((prev) => ({ ...prev, sourceText: coordinateText }));
    setFieldStatus(`Project pin point selected at ${formatTreeCoordinate(point)}. Add a clear label and save it to this map.`);
  };

  const handleFallbackMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    if (isSiteLocationFormOpen && !pinMode) {
      setSiteLocationSourceFromMapPoint({
        ...mapPercentToLatLng(x, y),
        label: 'Fallback map project pin',
      });
      return;
    }

    if (!selectedTree || !pinMode) {
      setFieldStatus('Select a tree and choose Source or Destination before marking the map.');
      return;
    }

    markTreePoint(selectedTree.treeId || selectedTree.id, pinMode, {
      ...mapPercentToLatLng(x, y),
      label: pinMode === 'source' ? `${selectedTree.farm || selectedTree.existingLocationDescription || 'Field'} ${selectedTree.zone || ''}`.trim() : 'Relocation destination',
    });
  };

  const useDeviceLocation = () => {
    const gpsPointType = pinMode || selectedPin?.pointType;
    const gpsTreeId = selectedPin?.treeId || selectedTree?.treeId || selectedTree?.id;
    if (!selectedTree || !gpsPointType || !gpsTreeId) {
      setFieldStatus('Select a tree pin or choose Source/Destination before using phone GPS.');
      return;
    }
    if (!navigator.geolocation) {
      setFieldStatus('GPS is not available in this browser.');
      return;
    }

    setFieldStatus('Reading field GPS position...');
    navigator.geolocation.getCurrentPosition(
      position => {
        markTreePoint(gpsTreeId, gpsPointType, pointFromDevicePosition(position.coords, gpsPointType));
      },
      () => setFieldStatus('Unable to read GPS. You can still click the map to place the pin.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  };

  const toggleSiteLocationDivision = (division: string) => {
    setSiteLocationForm((prev) => {
      const exists = prev.divisionUse.includes(division);
      return {
        ...prev,
        divisionUse: exists
          ? prev.divisionUse.filter((item) => item !== division)
          : [...prev.divisionUse, division],
      };
    });
  };

  const openAddPinForm = () => {
    setIsSiteLocationFormOpen(true);
    setEditingSiteLocationId(null);
    setSiteLocationForm({
      label: '',
      accessType: 'Load / Unload Pin',
      sourceText: '',
      divisionUse: ['Relocation & Installation', 'Freight', 'Equipment'],
    });
    setFieldStatus(selectedJob
      ? `Add Pin mode is active for ${profileJobTitle(selectedJob)}. Click the map, paste a Google Maps link, enter lat/long, or paste a street address.`
      : 'Add Pin mode is active for the JDT map library. Click the map, paste a Google Maps link, enter lat/long, or paste a street address.');
  };

  const editSavedLocation = (location: any, adjustMode = false) => {
    setIsSiteLocationFormOpen(true);
    setEditingSiteLocationId(String(location.id || ''));
    setSiteLocationForm({
      label: String(location.name || location.title || '').trim(),
      accessType: String(location.accessType || location.locationType || 'Load / Unload Pin') as SiteLocationAccessType,
      sourceText: sourceTextForSiteLocation(location),
      divisionUse: Array.isArray(location.divisionUse) && location.divisionUse.length > 0
        ? location.divisionUse
        : ['Relocation & Installation', 'Freight', 'Equipment'],
    });
    setFieldStatus(adjustMode
      ? `Adjusting ${location.name || location.title || 'saved pin'}. Click the map or paste a new Google Maps pin, then save.`
      : `Editing ${location.name || location.title || 'saved pin'}. Update the label, type, divisions, or map pin and save.`);
  };

  const saveSiteLocation = async () => {
    const sourceText = siteLocationForm.sourceText.trim();
    const label = siteLocationForm.label.trim();
    if (!sourceText) {
      setFieldStatus('Paste a Google Maps link, coordinates, or an address before saving a site location.');
      return;
    }
    if (!label) {
      setFieldStatus('Add a short label so this saved location is clear in project and dispatch dropdowns.');
      return;
    }

    const builtRecord = buildSavedSiteLocationRecord({
      label,
      accessType: siteLocationForm.accessType,
      sourceText,
      job: selectedJob,
      divisionUse: siteLocationForm.divisionUse,
      savedBy: user?.email || 'Command Center',
    });
    const record = editingSiteLocationId ? { ...builtRecord, id: editingSiteLocationId } : builtRecord;

    const saved = await setSavedLocations((prev) => {
      const existing = prev.find((item) => item.id === record.id);
      const nextRecord = {
        ...existing,
        ...record,
        createdAtIso: existing?.createdAtIso || record.createdAtIso,
        createdBy: existing?.createdBy || record.createdBy,
      };
      return [...prev.filter((item) => item.id !== record.id), nextRecord];
    });

    if (!saved) {
      setFieldStatus('Unable to save that site location. Check Firebase permissions and try again.');
      return;
    }

    setSiteLocationForm((prev) => ({ ...prev, label: '', sourceText: '' }));
    setEditingSiteLocationId(null);
    setIsSiteLocationFormOpen(false);
    setFieldStatus(`Saved ${record.name} as ${record.locationType}${selectedJob ? ` for ${selectedJob.title || selectedJob.projectName || 'this project'}` : ''}.`);
  };

  const focusSavedLocation = (location: any) => {
    const point = pointFromSavedSiteLocation(location);
    if (point && googleMapInstanceRef.current) {
      setMapViewMode('earth');
      googleMapInstanceRef.current.setCenter({ lat: point.lat, lng: point.lng });
      setMapZoom(Math.max(Number(googleMapInstanceRef.current.getZoom?.() || zoomLevel), 18));
      setFieldStatus(`${location.name || location.title || 'Saved location'} focused at ${formatTreeCoordinate(point)}.`);
      return;
    }
    if (point) {
      setFieldStatus(`${location.name || location.title || 'Saved location'} selected at ${formatTreeCoordinate(point)}.`);
      return;
    }
    setFieldStatus(`${location.name || location.title || 'Saved location'} has an address but no coordinate pin yet. Use Open Maps, then save the exact pin coordinates if this needs map focus.`);
  };

  const openSavedLocationInGoogleMaps = (location: any) => {
    const point = pointFromSavedSiteLocation(location);
    const map = googleMapInstanceRef.current;
    const maps = window.google?.maps;
    const label = location.name || location.title || 'saved location';

    if (point && map) {
      setMapViewMode('earth');
      map.setCenter({ lat: point.lat, lng: point.lng });
      setMapZoom(Math.max(Number(map.getZoom?.() || zoomLevel), 19));
      setFieldStatus(`Opened ${label} in the in-app map at ${formatTreeCoordinate(point)}.`);
      return;
    }

    const searchText = searchTextForSavedSiteLocation(location);
    if (searchText && map && maps?.Geocoder) {
      const geocoder = new maps.Geocoder();
      setFieldStatus(`Searching ${searchText} inside the in-app map...`);
      geocoder.geocode({ address: searchText }, (results: any[] = [], status: string) => {
        const okStatus = maps.GeocoderStatus?.OK || 'OK';
        const result = status === okStatus ? results[0] : null;
        const resultLocation = result?.geometry?.location;
        if (!resultLocation) {
          setFieldStatus(`Google Maps could not locate ${searchText}. Paste exact coordinates or a Google Maps pin for map focus.`);
          return;
        }

        setMapViewMode('earth');
        map.setCenter(resultLocation);
        setMapZoom(Math.max(Number(map.getZoom?.() || zoomLevel), 19));
        const marker = new maps.Marker({
          position: resultLocation,
          map,
          title: label,
          label: 'L',
        });
        googleMarkerRefs.current.push(marker);
        setFieldStatus(`Opened ${label} in the in-app map. Save the exact pin coordinates if this should be reused for dispatch.`);
      });
      return;
    }

    const url = googleMapsUrlForSavedSiteLocation(location);
    if (!url) {
      setFieldStatus('This saved location does not have a Google Maps link, coordinates, or searchable address yet.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setFieldStatus(`Opened ${label} in a Google Maps tab because the in-app map is not available.`);
  };

  const copySavedLocationGps = async (location: any) => {
    const point = pointFromSavedSiteLocation(location);
    const value = point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : searchTextForSavedSiteLocation(location);
    if (!value) {
      setFieldStatus(`${location.name || location.title || 'Saved location'} does not have coordinates or an address to copy yet.`);
      return;
    }
    try {
      await navigator.clipboard?.writeText(value);
      setFieldStatus(`Copied ${location.name || location.title || 'saved location'}: ${value}.`);
    } catch {
      setFieldStatus(`${location.name || location.title || 'Saved location'}: ${value}.`);
    }
  };

  const focusVehicleMarker = (vehicle: LiveVehicleMapMarker) => {
    const map = googleMapInstanceRef.current;
    setMapViewMode('earth');
    if (map) {
      map.setCenter({ lat: vehicle.lat, lng: vehicle.lng });
      setMapZoom(Math.max(Number(map.getZoom?.() || zoomLevel), 17));
    }
    setFieldStatus(`${vehicle.label} focused at ${formatTreeCoordinate({ lat: vehicle.lat, lng: vehicle.lng })}.`);
  };

  const focusLiveGpsAsset = (asset: LiveGpsAsset) => {
    setSelectedGpsAssetId(asset.id);
    setMapMode('liveGps');
    setMapViewMode('earth');
    const map = googleMapInstanceRef.current;
    if (map && asset.lat !== undefined && asset.lng !== undefined) {
      map.setCenter({ lat: asset.lat, lng: asset.lng });
      setMapZoom(Math.max(Number(map.getZoom?.() || zoomLevel), 17));
      setFieldStatus(`${asset.name} focused at ${formatTreeCoordinate({ lat: asset.lat, lng: asset.lng })}.`);
      return;
    }
    setFieldStatus(`${asset.name} selected. This asset does not have a current GPS coordinate yet.`);
  };

  const isolateLiveGpsAssetOnMap = (asset: LiveGpsAsset) => {
    setSelectedGpsAssetId(asset.id);
    setIsolatedGpsAssetId(asset.id);
    focusLiveGpsAsset(asset);
  };

  const openLiveGpsAssetInMaps = (asset: LiveGpsAsset) => {
    if (asset.lat === undefined || asset.lng === undefined) {
      setFieldStatus(`${asset.name} does not have coordinates to open in Google Maps.`);
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${asset.lat},${asset.lng}`, '_blank', 'noopener,noreferrer');
    setFieldStatus(`Opened ${asset.name} coordinates in Google Maps.`);
  };

  const copyLiveGpsCoordinates = async (asset: LiveGpsAsset) => {
    if (asset.lat === undefined || asset.lng === undefined) {
      setFieldStatus(`${asset.name} does not have coordinates to copy.`);
      return;
    }
    const coordinates = `${asset.lat.toFixed(6)}, ${asset.lng.toFixed(6)}`;
    try {
      await navigator.clipboard?.writeText(coordinates);
      setFieldStatus(`Copied ${asset.name} coordinates: ${coordinates}.`);
    } catch {
      setFieldStatus(`${asset.name} coordinates: ${coordinates}.`);
    }
  };

  const toggleLiveGpsCategory = (category: LiveGpsCategory) => {
    setActiveGpsCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      return [...current, category];
    });
  };

  const toggleLiveGpsStatus = (status: string) => {
    setActiveGpsStatuses((current) => {
      if (current.includes(status)) return current.filter((item) => item !== status);
      return [...current, status];
    });
  };

  const toggleTreeStatus = (status: string) => {
    setActiveTreeStatuses((current) => {
      if (current.includes(status)) return current.filter((item) => item !== status);
      return [...current, status];
    });
  };

  const toggleArcGisLayer = (layer: string) => {
    setActiveArcGisLayers((current) => (
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]
    ));
  };

  const toggleSelectedMapTree = (tree: any) => {
    const id = treeMapId(tree);
    setSelectedMapTreeIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const handleWorkbenchTreeClick = (tree: any) => {
    if (multiSelectTrees) {
      toggleSelectedMapTree(tree);
      return;
    }
    setSelectedTreeId(tree.treeId || tree.id);
    setSelectedPin(null);
    setPinMode(null);
  };

  const handleBulkAction = (action: string) => {
    if (action === 'Clear Selection') {
      setSelectedMapTreeIds([]);
      setFieldStatus('Cleared selected map trees.');
      return;
    }
    if (!selectedMapTreeIds.length) {
      setFieldStatus(`Select one or more map trees before using ${action}.`);
      return;
    }
    if (action === 'Export Selected') {
      downloadSelectedTreeCsv();
      return;
    }
    if (action === 'Print Field Map') {
      setFieldStatus(`Preparing field map print view for ${selectedMapTreeIds.length} selected tree${selectedMapTreeIds.length === 1 ? '' : 's'}.`);
      window.print?.();
      return;
    }
    if (action === 'Create Crew Work Order' && selectedJob && openDrawer) {
      openDrawer('job', selectedJob.id || selectedJob.jobId || selectedJob.projectId);
    }
    setFieldStatus(`${action} queued for ${selectedMapTreeIds.length} selected tree${selectedMapTreeIds.length === 1 ? '' : 's'} from this map.`);
  };

  const handleArcGisSync = (scope = 'project') => {
    const subject = scope === 'selected' ? `${selectedMapTreeIds.length} selected tree${selectedMapTreeIds.length === 1 ? '' : 's'}` : selectedJob ? profileJobTitle(selectedJob) : 'current map view';
    setMapMode('arcgis');
    setFieldStatus(`ArcGIS sync queued for ${subject}. JDT remains the operations record; ArcGIS stores geometry and map layers.`);
  };

  const printFieldMap = () => {
    setFieldStatus(`Preparing printable field map for ${selectedJob ? profileJobTitle(selectedJob) : 'the current map view'}.`);
    window.print?.();
  };

  const downloadSelectedTreeCsv = () => {
    if (!selectedMapTrees.length) {
      setFieldStatus('Select tree records before exporting selected map items.');
      return;
    }
    const csv = buildSelectedTreeCsv(selectedMapTrees);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugFileName(selectedJob?.projectName || selectedJob?.title || 'jdt-map-items')}-selected-trees.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFieldStatus(`Exported ${selectedMapTrees.length} selected tree${selectedMapTrees.length === 1 ? '' : 's'} as CSV.`);
  };

  const downloadProjectKml = () => {
    if (!earthMapPackage.pinnedTreeCount) {
      setFieldStatus('Add at least one source or destination pin before exporting this project as a KML backup.');
      return;
    }

    const blob = new Blob([earthMapPackage.kml], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = earthMapPackage.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFieldStatus(`Exported ${earthMapPackage.fileName} as a KML backup from the saved JDT project pins.`);
  };

  const openGoogleEarthProjectView = () => {
    setMapViewMode('earth');
    const map = googleMapInstanceRef.current;
    if (map && earthMapPackage.center) {
      map.setCenter({ lat: earthMapPackage.center.lat, lng: earthMapPackage.center.lng });
      map.setZoom(Math.max(zoomLevel, 18));
    }
    setFieldStatus('Switched to in-app satellite view. Tree and project pins stay inside JDT Command Center and ArcGIS Online.');
  };

  const showClientKmlImportPath = () => {
    setKmlImportOpen(true);
    setKmlImportStatus('Upload a client KML file or paste KML text to preview tree placemarks before saving them into this project.');
    setFieldStatus('Client KML/KMZ import panel opened. Preview the points before saving them to the selected project.');
  };

  const handleKmlFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setKmlImportFileName(file.name);
    if (/\.kmz$/i.test(file.name)) {
      setKmlImportStatus('KMZ files need to be exported as KML for this first import path. Upload the .kml export from ArcGIS Online or the client map source.');
      return;
    }

    try {
      const text = await file.text();
      const points = parseKmlTreePlacemarks(text);
      setKmlImportText(text);
      setKmlImportStatus(`Loaded ${file.name}. Preview found ${points.length} named tree point${points.length === 1 ? '' : 's'}.`);
    } catch {
      setKmlImportStatus('Unable to read that KML file. Try exporting the map again as KML from ArcGIS Online or the client source.');
    }
  };

  const saveKmlImport = async () => {
    if (!selectedJob) {
      setKmlImportStatus('Select a relocation project before saving imported tree pins.');
      return;
    }
    if (!kmlImportRecords.length) {
      setKmlImportStatus('No named tree placemarks are ready to save yet.');
      return;
    }
    if (!onImportTreePins) {
      setKmlImportStatus('This app session cannot save imported tree pins yet. Refresh and try again.');
      return;
    }

    const saved = await onImportTreePins(kmlImportRecords);
    if (saved === false) {
      setKmlImportStatus('Unable to save imported tree pins. Check Firebase permissions and try again.');
      return;
    }

    const firstImportedTree = kmlImportRecords[0];
    setSelectedTreeId(String(firstImportedTree.treeId || firstImportedTree.id || ''));
    setKmlImportStatus(`Saved ${kmlImportRecords.length} imported tree pin${kmlImportRecords.length === 1 ? '' : 's'} to ${selectedJob.projectName || selectedJob.title || 'this project'}.`);
    setFieldStatus(`KML import saved ${kmlImportRecords.length} source pin${kmlImportRecords.length === 1 ? '' : 's'} to the selected project.`);
  };

  const renderFallbackTreePins = () => {
    return workbenchTreeRecords.flatMap(tree => {
      const pins: React.ReactNode[] = [];
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const percent = latLngToMapPercent(point);
        const isSelected = selectedTreeId === tree.treeId || selectedTreeId === tree.id;
        const status = getTreeRelocationStatus(tree);
        pins.push(
          <button
            key={`${tree.treeId || tree.id}-${pointType}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectExistingPin(tree, pointType);
            }}
            className={`absolute h-9 w-9 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-4 transition-all hover:scale-110 z-10 ${treeMarkerPinClass(status, pointType)} ${isSelected ? 'scale-110 ring-amber-300' : ''}`}
            style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
            title={`${tree.treeId || tree.id} ${pointType}`}
          >
            <span className="max-w-[2rem] truncate px-0.5 text-[10px] font-black text-white">{treeMarkerLabel(tree, pointType)}</span>
          </button>
        );
      });
      return pins;
    });
  };

  const renderFallbackSiteLocationPins = () => {
    return scopedSavedLocations.map((location) => {
      const point = pointFromSavedSiteLocation(location);
      if (!point) return null;
      const percent = latLngToMapPercent(point);
      return (
        <button
          key={location.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            focusSavedLocation(location);
          }}
          className="absolute h-8 w-8 rounded-full border-2 border-white bg-amber-500 shadow-xl flex items-center justify-center ring-4 ring-amber-100 transition-all hover:scale-110 z-10"
          style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
          title={`${location.name || location.title || 'Saved location'} ${location.locationType || ''}`}
        >
          <MapPin className="h-4 w-4 text-white" />
        </button>
      );
    });
  };

  const renderFallbackVehiclePins = () => {
    return liveVehicleMarkers.map((vehicle) => {
      const percent = latLngToMapPercent({ lat: vehicle.lat, lng: vehicle.lng });
      return (
        <button
          key={vehicle.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            focusVehicleMarker(vehicle);
          }}
          className="absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-xl ring-4 ring-sky-100 transition-all hover:scale-110 z-10"
          style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
          title={`${vehicle.label} ${vehicle.status}`}
        >
          <Truck className="h-4 w-4 text-white" />
        </button>
      );
    });
  };

  const renderFallbackLiveGpsPins = () => {
    return visibleGpsAssets.map((asset) => {
      if (asset.lat === undefined || asset.lng === undefined) return null;
      const percent = latLngToMapPercent({ lat: asset.lat, lng: asset.lng });
      const Icon = liveGpsIcon(asset.category);
      return (
        <button
          key={asset.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            focusLiveGpsAsset(asset);
          }}
          className={`absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-xl ring-4 transition-all hover:scale-110 z-10 ${liveGpsPinClass(asset.category)}`}
          style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
          title={`${asset.name} ${asset.status}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </button>
      );
    });
  };

  const renderSelectedTreeLine = () => {
    const source = selectedTree?.relocationMap?.source;
    const destination = selectedTree?.relocationMap?.destination;
    if (!source || !destination) return null;

    const sourcePercent = latLngToMapPercent(source);
    const destinationPercent = latLngToMapPercent(destination);

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
        <line
          x1={`${sourcePercent.x}%`}
          y1={`${sourcePercent.y}%`}
          x2={`${destinationPercent.x}%`}
          y2={`${destinationPercent.y}%`}
          stroke="#f59e0b"
          strokeWidth="3"
          strokeDasharray="8 8"
        />
      </svg>
    );
  };

  const selectedTreeCard = (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-zinc-400">Selected Tree Command</p>
          <h3 className="mt-1 text-xl font-black text-jdt-text">{selectedTree ? treeDisplayName(selectedTree) : 'Select a tree'}</h3>
          <p className="text-xs font-bold text-zinc-500 mt-1">{mapInstruction}</p>
          {selectedTree && (
            <div className="mt-4 grid gap-2 text-[11px] font-bold text-zinc-600 sm:grid-cols-2 xl:grid-cols-3">
              <TreeDetailPill label="Tree_Tag" value={treeTagLabel(selectedTree)} />
              <TreeDetailPill label="Tree_Type" value={treeTypeLabel(selectedTree)} />
              <TreeDetailPill label="DBH_IN" value={treeDbhLabel(selectedTree).replace(/^DBH /, '')} />
              <TreeDetailPill label="Project" value={selectedJob ? profileJobTitle(selectedJob) : selectedTree.projectName || selectedTree.jobName || '-'} />
              <TreeDetailPill label="Asset_Category" value={treeAssetCategoryLabel(selectedTree)} />
              <TreeDetailPill label="Tree_Relocation_Status" value={getTreeRelocationStatus(selectedTree)} />
              <TreeDetailPill label="Current_Field_Location" value={treeFieldLocationLabel(selectedTree)} />
              <TreeDetailPill label="Current field position" value={formatTreeCoordinate(selectedTree.relocationMap?.source)} />
              <TreeDetailPill label="Relocation destination" value={formatTreeCoordinate(selectedTree.relocationMap?.destination)} />
              <TreeDetailPill label="Holding_Area_Name" value={treeHoldingAreaLabel(selectedTree)} />
              <TreeDetailPill label="Tree_Final_Outcome" value={treeFinalOutcomeLabel(selectedTree)} />
              <TreeDetailPill label="Source / Destination" value={`${treeSourcePinStatus(selectedTree)} / ${treeDestinationPinStatus(selectedTree)}`} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[420px] xl:justify-end">
          <button onClick={() => beginPinEdit('source')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${pinMode === 'source' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            <TreePine className="h-4 w-4" /> Set Source Pin
          </button>
          <button onClick={() => beginPinEdit('destination')} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${pinMode === 'destination' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            <Target className="h-4 w-4" /> Set Destination Pin
          </button>
          <button onClick={useDeviceLocation} className="px-3 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 bg-jdt-primary text-white">
            <LocateFixed className="h-4 w-4" /> Use Phone GPS
          </button>
          {['Create Root Prune Event', 'Create Nutrient Care Task', 'Create Move Task', 'Mark Ready for Relocation', 'Mark Moved to Holding', 'Mark Relocated', 'Add Photo', 'Add Note'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setFieldStatus(selectedTree ? `${action} queued for ${treeDisplayName(selectedTree)}.` : `Select a tree before using ${action}.`)}
              className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
            >
              {action}
            </button>
          ))}
          {selectedTree && openDrawer && (
            <button
              type="button"
              onClick={() => openDrawer('tree', selectedTree.treeId || selectedTree.id)}
              className="rounded-lg border border-jdt-primary bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
            >
              Open Full Tree Record
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-jdt-border bg-jdt-sand/40 px-3 py-2 text-xs font-bold text-zinc-600 flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-jdt-primary" />
        {fieldStatus}
      </div>
    </div>
  );

  const mapScheduleStrip = showTreeMapPanels ? (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">Map Schedule</p>
          <h3 className="text-sm font-black text-jdt-text">{selectedJob ? `${profileJobTitle(selectedJob)} schedule` : 'Project schedule'}</h3>
        </div>
        <CalendarDays className="h-5 w-5 text-jdt-primary" />
      </div>
      {mapScheduleItems.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mapScheduleItems.map((task) => (
            <div key={task.id || task.title || task.task} className="min-w-[180px] rounded-lg border border-jdt-border bg-white p-3">
              <p className="text-[10px] font-black uppercase text-zinc-400">{formatScheduleDateRange(task.startDate, task.endDate)}</p>
              <p className="mt-1 text-xs font-black text-jdt-text">{task.task || task.title || task.activityType || 'Scheduled work'}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">{task.assignee || task.locationName || task.activityType || 'Unassigned'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-2 text-xs font-bold text-zinc-500">
          No map-linked schedule tasks yet for this selected project or farm view.
        </p>
      )}
    </div>
  ) : null;

  const kmlBridgeCard = (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-jdt-border bg-white">
            <Globe2 className="h-5 w-5 text-jdt-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400">Online GIS Import / KML Backup</p>
            <h3 className="text-sm font-black text-jdt-text">{earthMapPackage.documentName}</h3>
            <p className="mt-1 text-[11px] font-bold text-zinc-500">
              Manual pins are the active project record. ArcGIS Online remains the GIS record. {earthMapPackage.pinnedTreeCount} trees, {earthMapPackage.placemarkCount} pins, and {earthMapPackage.pathCount} move paths are available for backup export.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadProjectKml}
            className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export KML Backup
          </button>
          <button
            type="button"
            onClick={showClientKmlImportPath}
            className="rounded-lg border border-dashed border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-zinc-600 hover:border-jdt-olive flex items-center gap-2"
          >
            <Upload className="h-4 w-4" /> KML/KMZ Bridge Import
          </button>
          <button
            type="button"
            onClick={openGoogleEarthProjectView}
            className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive flex items-center gap-2"
          >
            <Globe2 className="h-4 w-4" /> Satellite View
          </button>
        </div>
      </div>
      <p className="mt-3 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[11px] font-bold text-zinc-500">
        Use map click, pasted coordinates, or phone GPS to build project pins. KML/KMZ is a bridge format for online import, export, and backup, not the system of record.
      </p>
    </div>
  );

  const kmlImportPanel = kmlImportOpen ? (
    <div id="kml-import-panel" className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">KML/KMZ Bridge Import</p>
          <h3 className="text-lg font-black text-jdt-text">Import Marked Tree Positions</h3>
          <p className="mt-1 text-xs font-bold text-zinc-500">
            Use this for client, ArcGIS Online, or legacy map files that already have tree placemarks labeled. Preview first, then save clean records into JDT and sync geometry to ArcGIS Online.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setKmlImportOpen(false)}
          className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-zinc-600 hover:border-jdt-olive"
        >
          Close Import
        </button>
      </div>

      {!selectedJob && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
          Select a relocation project before saving imported tree pins.
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <label className="block rounded-lg border border-jdt-border bg-white p-3">
          <span className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Upload KML File</span>
          <input
            type="file"
            accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
            onChange={handleKmlFileChange}
            className="block w-full text-xs font-bold text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-jdt-primary file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:text-white"
          />
          <p className="mt-2 text-[10px] font-bold text-zinc-400">{kmlImportFileName || 'No file loaded yet'}</p>
        </label>

        <label className="block">
          <span className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Paste KML Text</span>
          <textarea
            value={kmlImportText}
            onChange={(event) => {
              setKmlImportText(event.target.value);
              setKmlImportFileName(kmlImportFileName || 'Pasted KML');
              const points = parseKmlTreePlacemarks(event.target.value);
              setKmlImportStatus(points.length ? `Preview found ${points.length} named tree point${points.length === 1 ? '' : 's'}.` : 'Paste KML with named placemarks to preview tree pins.');
            }}
            placeholder="Paste exported KML here"
            rows={5}
            className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-mono text-jdt-text outline-none focus:border-jdt-olive"
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-jdt-border bg-white">
        <div className="flex flex-col gap-2 border-b border-jdt-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400">Preview Imported Tree Pins</p>
            <p className="text-xs font-bold text-zinc-500">{kmlImportPreview.length} named tree point{kmlImportPreview.length === 1 ? '' : 's'} ready</p>
          </div>
          <button
            type="button"
            onClick={saveKmlImport}
            disabled={!kmlImportPreview.length || !selectedJob}
            className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Save Imported Tree Pins
          </button>
        </div>

        {kmlImportPreview.length ? (
          <div className="max-h-[260px] overflow-y-auto divide-y divide-jdt-border">
            {kmlImportPreview.map((point: KmlTreePlacemark) => (
              <div key={`${point.id || point.name}-${point.lat}-${point.lng}`} className="grid gap-2 px-3 py-2 text-xs font-bold text-zinc-600 md:grid-cols-[1.2fr_0.9fr_1fr_0.8fr]">
                <div>
                  <p className="font-black text-jdt-text">{point.name}</p>
                  <p className="text-[10px] uppercase text-zinc-400">{point.treeType}</p>
                </div>
                <p>{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</p>
                <p>{point.caliperInches ? `${point.caliperInches}" cal.` : '-'}</p>
                <p>{point.relocationCost ? `$${point.relocationCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs font-black uppercase text-jdt-text">No tree points previewed yet</p>
            <p className="mt-1 text-[11px] font-bold text-zinc-500">Upload or paste a KML file with named tree placemarks.</p>
          </div>
        )}
      </div>

      {kmlImportStatus && (
        <div className="mt-3 rounded-lg border border-jdt-border bg-jdt-sand/40 px-3 py-2 text-xs font-bold text-zinc-600">
          {kmlImportStatus}
        </div>
      )}
    </div>
  ) : null;

  const pageTitle = isDedicatedLocationsPage
    ? 'JDT Locations'
    : isDedicatedFleetGpsPage
      ? 'Fleet GPS'
      : isArcGisView
        ? 'ArcGIS Tree Relocation Layers'
        : isLiveGpsView
          ? 'Live GPS Map'
          : 'Field Maps & Tree Relocation';
  const pageDescription = isDedicatedLocationsPage
    ? 'Google Maps-style client, project, jobsite, farm, and saved access pins'
    : isDedicatedFleetGpsPage
      ? 'Verizon Reveal vehicle, equipment, freight, and unmatched GPS tracking'
      : isArcGisView
        ? 'Review ArcGIS hosted layers while JDT keeps project workflow and tree operations as the source of truth'
        : isLiveGpsView
          ? 'Track live GPS vehicles, equipment, freight moves, and unmatched GPS assets'
          : 'Pin source trees, destination locations, GPS field marks, and relocation tasks';

  if (isDedicatedImportsPage) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-jdt-border pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-jdt-primary">Map Imports</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              KML, KMZ, DWG, CAD, survey, and imported pin staging for clean JDT and ArcGIS Online records
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={showClientKmlImportPath} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark">
              <Upload className="h-4 w-4" /> Import KML/KMZ
            </button>
            <button type="button" onClick={downloadProjectKml} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
              <Download className="h-4 w-4" /> Export KML
            </button>
            <button type="button" onClick={() => setFieldStatus('Survey and CAD upload staging is ready for the ArcGIS Online import workflow.')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
              <Upload className="h-4 w-4" /> Upload Survey / CAD File
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <section className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-zinc-400">Target Project</p>
            <select
              value={selectedJobId}
              onChange={(event) => {
                setSelectedJobId(event.target.value);
                setFieldStatus(event.target.value === 'all' ? 'Choose a project before matching imported pins to JDT records.' : 'Import staging is scoped to the selected project.');
              }}
              className="mt-2 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-black text-jdt-text outline-none focus:border-jdt-olive"
            >
              <option value="all">Select Project</option>
              {relocationJobOptions.map((job) => (
                <option key={job.id} value={job.id}>{job.label}</option>
              ))}
            </select>
            <div className="mt-4 grid gap-2">
              {['Preview Import', 'Match Tree IDs', 'Create Draft Tree Assets', 'Sync to ArcGIS'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setFieldStatus(`${action} is staged for ${selectedJob ? profileJobTitle(selectedJob) : 'the selected project'}.`)}
                  className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-left text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                >
                  {action}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
              <p className="text-[10px] font-black uppercase text-zinc-400">Import Rules</p>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                KML/KMZ files are bridge files. Preview, match to Tree_Asset_ID where possible, create draft tree assets for unmatched pins, then sync clean geometry to ArcGIS Online.
              </p>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase text-amber-900">DWG / CAD Survey Staging</p>
              <p className="mt-1 text-xs font-bold text-amber-800">
                Upload survey/CAD references here for admin review. ArcGIS Pro can still be used outside the app for one-off cleanup, but production app sync stays online through ArcGIS Online.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            {kmlImportPanel}
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase text-zinc-400">Import Status</p>
              <h3 className="mt-1 text-sm font-black text-jdt-text">{selectedJob ? profileJobTitle(selectedJob) : 'No project selected'}</h3>
              <p className="mt-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-zinc-500">
                {fieldStatus || 'Choose a target project, preview incoming map files, and save clean records before publishing geometry to ArcGIS Online.'}
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (isDedicatedFleetGpsPage) {
    const positionedGpsAssets = visibleGpsAssets.filter((asset) => asset.lat !== undefined && asset.lng !== undefined);
    const vehicleCategoryActive = activeGpsCategories.includes('vehicle');

    return (
      <div className={`space-y-4 ${isGpsMapFullscreen ? 'fixed inset-0 z-[140] overflow-hidden bg-jdt-bg p-3' : ''}`}>
        <div className="flex flex-col gap-3 border-b border-jdt-border pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-jdt-primary">Fleet GPS</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">
              Reveal-style Live Map for vehicles, equipment trackers, freight moves, and unmatched GPS assets
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-zinc-400">
              Verizon Reveal vehicle, equipment, freight, and unmatched GPS tracking
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(canSyncRevealLiveLocations && onSyncRevealLiveLocations) && (
              <button
                type="button"
                onClick={() => void onSyncRevealLiveLocations()}
                disabled={isSyncingRevealLiveLocations}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                title="Sync Verizon Reveal live locations"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingRevealLiveLocations ? 'animate-spin' : ''}`} />
                {isSyncingRevealLiveLocations ? 'Syncing' : 'Sync GPS'}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open('https://reveal.us.vzconnect.com/en-US/live-map/', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black uppercase text-sky-900 hover:border-sky-500"
              title="Open Verizon Reveal Live Map"
            >
              <Truck className="h-4 w-4" /> Open in Verizon Reveal
            </button>
          </div>
        </div>

        <section className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ${isGpsMapFullscreen ? 'h-[calc(100vh-6rem)]' : 'min-h-[calc(100vh-190px)]'}`}>
          {mapsConfig.isReady ? (
            <div ref={googleMapRef} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1800&auto=format&fit=crop"
                alt="Satellite style live GPS map"
                className="absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-slate-950/20" />
              {renderFallbackLiveGpsPins()}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/18 via-transparent to-black/5" />

          <div className={`absolute left-0 top-0 z-30 h-full border-r border-zinc-200 bg-white shadow-2xl transition-transform duration-200 ${isGpsPanelCollapsed ? '-translate-x-[calc(100%-3.5rem)]' : 'translate-x-0'} w-[22rem] max-w-[82vw]`}>
            <div className="flex h-full flex-col">
              <div className="flex items-center border-b border-zinc-200 bg-white">
                <button
                  type="button"
                  title="Vehicles"
                  className="flex h-14 flex-1 items-center justify-center border-b-4 border-red-600 text-zinc-900"
                >
                  <Truck className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Equipment"
                  className="flex h-14 flex-1 items-center justify-center border-b-4 border-transparent text-zinc-500 hover:text-zinc-900"
                >
                  <Wrench className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label={isGpsPanelCollapsed ? 'Expand asset list' : 'Collapse asset list'}
                  title={isGpsPanelCollapsed ? 'Expand asset list' : 'Collapse asset list'}
                  onClick={() => setIsGpsPanelCollapsed((value) => !value)}
                  className="flex h-14 w-14 items-center justify-center border-l border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                >
                  {isGpsPanelCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </button>
              </div>

              <div className="border-b border-zinc-200 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Live GPS Assets</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">Asset List</p>
                <label className="mt-2 block">
                  <span className="sr-only">View</span>
                  <select
                    value={
                      activeGpsCategories.length === liveGpsCategoryOptions.length
                        ? 'All GPS Assets'
                        : activeGpsCategories.length === 1 && activeGpsCategories[0] === 'equipment'
                          ? 'Equipment'
                          : activeGpsCategories.length === 1 && activeGpsCategories[0] === 'freight'
                            ? 'Freight'
                            : 'Vehicles'
                    }
                    onChange={(event) => {
                      if (event.target.value === 'Equipment') {
                        setActiveGpsCategories(['equipment']);
                      } else if (event.target.value === 'Freight') {
                        setActiveGpsCategories(['freight']);
                      } else if (event.target.value === 'All GPS Assets') {
                        setActiveGpsCategories(['vehicle', 'equipment', 'freight', 'unmatched']);
                      } else {
                        setActiveGpsCategories(['vehicle']);
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-sky-600"
                  >
                    <option>Vehicles</option>
                    <option>Equipment</option>
                    <option>Freight</option>
                    <option>All GPS Assets</option>
                  </select>
                </label>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                    <input
                      type="checkbox"
                      checked={vehicleCategoryActive}
                      onChange={() => toggleLiveGpsCategory('vehicle')}
                      className="h-4 w-4 accent-red-600"
                    />
                    Select All Vehicles
                  </label>
                  <button type="button" onClick={() => setActiveGpsCategories(['vehicle', 'equipment', 'freight', 'unmatched'])} className="text-[10px] font-black uppercase text-sky-700 hover:text-sky-900">
                    Select All
                  </button>
                </div>
              </div>

              <div className="border-b border-zinc-200 p-4">
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={gpsSearch}
                    onChange={(event) => setGpsSearch(event.target.value)}
                    placeholder="Vehicle, asset, driver, address, or place"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-800 outline-none"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredGpsAssets.length > 0 ? filteredGpsAssets.map((asset) => {
                  const selected = selectedGpsAsset?.id === asset.id;
                  const Icon = liveGpsIcon(asset.category);
                  return (
                    <div key={asset.id} className={`border-b border-zinc-200 bg-white p-4 ${selected ? 'ring-2 ring-inset ring-sky-500' : ''}`}>
                      <button type="button" onClick={() => focusLiveGpsAsset(asset)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-zinc-900">{asset.name}</p>
                            <p className="mt-1 text-xs font-bold leading-snug text-zinc-600">
                              {asset.lastUpdatedAt ? `Last Movement ${asset.lastUpdatedAt}` : 'No latest movement time'}
                            </p>
                            <p className="mt-1 text-xs font-bold leading-snug text-zinc-600">
                              {asset.address || asset.currentAddress || (asset.lat !== undefined && asset.lng !== undefined ? formatTreeCoordinate({ lat: asset.lat, lng: asset.lng }) : 'No GPS coordinate')}
                            </p>
                          </div>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white ${liveGpsPinClass(asset.category)}`}>
                            <Icon className="h-4 w-4 text-white" />
                          </span>
                        </div>
                      </button>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => focusLiveGpsAsset(asset)} className="rounded-md border border-zinc-200 px-2 py-1.5 text-[9px] font-black uppercase text-zinc-700 hover:border-sky-500">Zoom To</button>
                        <button type="button" onClick={() => isolateLiveGpsAssetOnMap(asset)} className="rounded-md border border-zinc-200 px-2 py-1.5 text-[9px] font-black uppercase text-zinc-700 hover:border-sky-500">Isolate</button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-5 text-center">
                    <p className="text-xs font-black uppercase text-zinc-900">No GPS assets visible</p>
                    <p className="mt-1 text-xs font-bold text-zinc-500">Adjust filters or sync live locations from Reveal.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute left-[23.5rem] top-4 z-20 flex max-w-[calc(100%-28rem)] items-center gap-2 rounded-full bg-white px-4 py-2 shadow-xl max-lg:left-4 max-lg:max-w-[calc(100%-8rem)]">
            <Search className="h-5 w-5 text-zinc-500" />
            <input
              value={gpsSearch}
              onChange={(event) => setGpsSearch(event.target.value)}
              placeholder="Vehicle, asset, driver, address, or place"
              className="w-[24rem] max-w-full bg-transparent text-sm font-bold text-zinc-800 outline-none"
            />
          </div>

          <div className="absolute right-4 top-4 z-30 flex items-center gap-3">
            <button type="button" onClick={() => setIsGpsPanelCollapsed((value) => !value)} title="Asset List" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl hover:bg-zinc-100">
              <List className="h-5 w-5" />
            </button>
            <button type="button" onClick={fitVisibleGpsAssets} title="Fit all visible GPS assets" className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-zinc-900 shadow-xl hover:bg-zinc-100">
              <Maximize2 className="h-5 w-5" /> Fit To Map
            </button>
            <button type="button" onClick={() => setIsGpsTextViewOpen(true)} title="Open GPS text view" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl hover:bg-zinc-100">
              <List className="h-5 w-5" />
              <span className="sr-only">Text View</span>
            </button>
            <button type="button" onClick={() => setIsGpsMapOptionsOpen((value) => !value)} title="Open map options" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl hover:bg-zinc-100">
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setIsGpsMapFullscreen((value) => !value)} title="Expand map workspace" className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl hover:bg-zinc-100">
              {isGpsMapFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>

          <div className="absolute bottom-5 right-5 z-30 flex flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <button type="button" onClick={() => zoomMapBy(1)} title="Zoom In" className="flex h-12 w-12 items-center justify-center border-b border-zinc-200 text-zinc-900 hover:bg-zinc-100">
              <ZoomIn className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => zoomMapBy(-1)} title="Zoom Out" className="flex h-12 w-12 items-center justify-center text-zinc-900 hover:bg-zinc-100">
              <ZoomOut className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-zinc-900/80 px-4 py-3 text-sm font-bold text-white shadow-xl">
            {positionedGpsAssets.length > 0
              ? `${positionedGpsAssets.length} GPS asset${positionedGpsAssets.length === 1 ? '' : 's'} visible. Zoom: ${zoomLevel}`
              : 'There is too much detail to show on the map at this level. Try zooming in.'}
          </div>

          <div className="absolute bottom-5 right-24 z-30 flex overflow-hidden rounded-lg bg-white text-xs font-black uppercase shadow-xl">
            <button type="button" onClick={() => setMapViewMode('map')} className={`px-5 py-3 ${mapViewMode === 'map' ? 'border-b-4 border-red-600 text-zinc-900' : 'text-zinc-500'}`}>Map</button>
            <button type="button" onClick={() => setMapViewMode('earth')} className={`px-5 py-3 ${mapViewMode === 'earth' ? 'border-b-4 border-red-600 text-zinc-900' : 'text-zinc-500'}`}>Satellite</button>
          </div>

          <div className="absolute left-[23.5rem] top-20 z-20 flex flex-wrap gap-2 max-lg:left-4">
            {showGpsLabels && visibleGpsAssets.slice(0, 3).map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => focusLiveGpsAsset(asset)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-zinc-700 shadow-lg hover:bg-zinc-100"
                title={`Zoom to ${asset.name}`}
              >
                {asset.name}
              </button>
            ))}
          </div>

          {selectedGpsAsset && (
            <div className="absolute left-1/2 top-1/2 z-40 w-[24rem] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
                <div>
                  <p className="text-lg font-black text-zinc-900">{selectedGpsAsset.name}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">{selectedGpsAsset.lat !== undefined && selectedGpsAsset.lng !== undefined ? formatTreeCoordinate({ lat: selectedGpsAsset.lat, lng: selectedGpsAsset.lng }) : 'No GPS coordinate'}</p>
                </div>
                <button type="button" onClick={() => setSelectedGpsAssetId('')} title="Close selected asset" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-2 p-4 text-sm font-bold text-zinc-700">
                <span><strong className="font-black uppercase text-zinc-500">Status:</strong> {selectedGpsAsset.status}</span>
                <span><strong className="font-black uppercase text-zinc-500">Driver/operator:</strong> {selectedGpsAsset.assignedDriver || 'Unassigned'}</span>
                <span><strong className="font-black uppercase text-zinc-500">Assigned project:</strong> {selectedGpsAsset.assignedProjectName || 'Unassigned'}</span>
                <span><strong className="font-black uppercase text-zinc-500">Address:</strong> {selectedGpsAsset.address || selectedGpsAsset.currentAddress || 'No address'}</span>
                <span className={liveGpsConflictLabel(selectedGpsAsset).tone}><strong className="font-black uppercase">Conflict:</strong> {liveGpsConflictLabel(selectedGpsAsset).label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 p-4">
                <button type="button" onClick={() => focusLiveGpsAsset(selectedGpsAsset)} className="rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase text-zinc-700 hover:border-sky-500">Zoom To</button>
                <button type="button" onClick={() => isolateLiveGpsAssetOnMap(selectedGpsAsset)} className="rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase text-zinc-700 hover:border-sky-500">Isolate</button>
                <button type="button" onClick={() => openLiveGpsAssetInMaps(selectedGpsAsset)} className="rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase text-zinc-700 hover:border-sky-500">Open Maps</button>
                <button type="button" onClick={() => void copyLiveGpsCoordinates(selectedGpsAsset)} className="rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase text-zinc-700 hover:border-sky-500">Copy GPS</button>
                {selectedGpsAsset.equipmentId && openDrawer && (
                  <button type="button" onClick={() => openDrawer('equipment', selectedGpsAsset.equipmentId || '')} className="col-span-2 rounded-lg border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase text-zinc-700 hover:border-sky-500">View Equipment</button>
                )}
              </div>
            </div>
          )}

          {isGpsTextViewOpen && (
            <div className="absolute left-1/2 top-1/2 z-50 w-[62rem] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                <h3 className="text-xl font-black text-zinc-900">Vehicle Status (Text View)</h3>
                <button type="button" onClick={() => setIsGpsTextViewOpen(false)} title="Close text view" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs font-black uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Speed</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGpsAssets.map((asset) => (
                      <tr key={asset.id} className="border-t border-zinc-100">
                        <td className="px-4 py-3 font-black text-zinc-900">{asset.name}</td>
                        <td className="px-4 py-3 font-bold text-zinc-600">{asset.assignedDriver || '-'}</td>
                        <td className="px-4 py-3"><span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${liveGpsStatusClass(asset.status)}`}>{asset.status}</span></td>
                        <td className="px-4 py-3 font-bold text-zinc-600">{asset.speedMph ?? 0}</td>
                        <td className="px-4 py-3 font-bold text-zinc-600">{asset.address || asset.currentAddress || '-'}</td>
                        <td className="px-4 py-3 font-bold text-zinc-600">{asset.lastUpdatedAt || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={`absolute right-4 top-20 z-40 w-80 rounded-xl bg-white shadow-2xl transition ${isGpsMapOptionsOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-3 opacity-0'}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 p-4">
              <h3 className="text-lg font-black text-zinc-900">Map Options</h3>
              <button type="button" onClick={() => setIsGpsMapOptionsOpen(false)} title="Close map options" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase text-zinc-600">Map Type</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMapViewMode('map')} className={`rounded-lg border p-3 text-xs font-black ${mapViewMode === 'map' ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-zinc-200 text-zinc-600'}`}>Default</button>
                  <button type="button" onClick={() => setMapViewMode('earth')} className={`rounded-lg border p-3 text-xs font-black ${mapViewMode === 'earth' ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-zinc-200 text-zinc-600'}`}>Satellite</button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase text-zinc-600">Show on Map</p>
                <div className="space-y-2 text-sm font-bold text-zinc-700">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={showGpsTraffic} onChange={() => setShowGpsTraffic((value) => !value)} className="h-4 w-4 accent-red-600" /> Traffic</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={showGpsLabels} onChange={() => setShowGpsLabels((value) => !value)} className="h-4 w-4 accent-red-600" /> Show All Labels</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={isIconClusteringEnabled} onChange={() => setIsIconClusteringEnabled((value) => !value)} className="h-4 w-4 accent-red-600" /> Icon Clustering</label>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase text-zinc-600">Icon Legend</p>
                <div className="grid gap-2 text-xs font-bold text-zinc-700">
                  {liveGpsCategoryOptions.map((category) => {
                    const Icon = liveGpsIcon(category.id);
                    return (
                      <span key={category.id} className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full border border-white ${liveGpsPinClass(category.id)}`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </span>
                        {category.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <span className="sr-only">Full Screen</span>
          <span className="sr-only">Icon Legend</span>
        </section>

        <p className="rounded-xl border border-jdt-border bg-jdt-panel px-4 py-3 text-xs font-bold text-zinc-500">
          {revealLiveLocationSyncStatus || fieldStatus || 'Reveal is the driver/vehicle dispatch execution layer. JDT remains the source of truth. ArcGIS remains the tree/location map layer.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${isMapWorkspaceFullscreen ? 'fixed inset-0 z-[135] overflow-hidden bg-jdt-bg p-3' : ''}`}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">{pageTitle}</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg p-1 shadow-sm">
          <button onClick={() => zoomMapBy(-1)} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs font-black uppercase text-zinc-700 px-3">ZOOM: {zoomLevel}</span>
          <button onClick={() => zoomMapBy(1)} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => setIsMapWorkbenchCollapsed((value) => !value)}
            className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600"
            title={isMapWorkbenchCollapsed ? 'Expand map workbench' : 'Collapse map workbench'}
            aria-label={isMapWorkbenchCollapsed ? 'Expand map workbench' : 'Collapse map workbench'}
          >
            {isMapWorkbenchCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMapWorkspaceFullscreen((value) => !value)}
            className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600"
            title={isMapWorkspaceFullscreen ? 'Exit full screen map' : 'Expand map workspace'}
            aria-label={isMapWorkspaceFullscreen ? 'Exit full screen map' : 'Expand map workspace'}
          >
            {isMapWorkspaceFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${isMapWorkbenchCollapsed ? 'xl:grid-cols-[minmax(0,1fr)_4.5rem]' : 'xl:grid-cols-[minmax(0,1fr)_390px]'}`}>
        <div className="space-y-4">
          <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                {pagePurpose === 'combined' && (
                  <div>
                    <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Map Mode</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'locations' as MapWorkspaceMode, label: 'Locations', tone: 'jdt' },
                        { id: 'project' as MapWorkspaceMode, label: 'Project Trees', tone: 'jdt' },
                        { id: 'liveGps' as MapWorkspaceMode, label: 'Live GPS', tone: 'sky' },
                        { id: 'arcgis' as MapWorkspaceMode, label: 'ArcGIS Layers', tone: 'violet' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            setMapMode(mode.id);
                            if (mode.id === 'locations') setSelectedJobId('all');
                            if (mode.id === 'locations') setFieldStatus('Showing all saved JDT map locations.');
                            if (mode.id === 'project') setFieldStatus(selectedJob ? 'Map focused to the selected relocation job.' : 'Select a relocation job to see project tree and site pins.');
                            if (mode.id === 'liveGps') setFieldStatus('Showing live GPS assets from GPS tracking and JDT dispatch records.');
                            if (mode.id === 'arcgis') setFieldStatus('Showing ArcGIS layer controls for JDT tree relocation geometry.');
                          }}
                          className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${mapMode === mode.id
                            ? mode.tone === 'sky'
                              ? 'border-sky-700 bg-sky-700 text-white'
                              : mode.tone === 'violet'
                                ? 'border-violet-700 bg-violet-700 text-white'
                                : 'border-jdt-primary bg-jdt-primary text-white'
                            : 'border-jdt-border bg-white text-zinc-600 hover:border-jdt-olive'}`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`grid gap-3 ${isDedicatedFleetGpsPage ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.8fr)]'}`}>
                  {!isDedicatedFleetGpsPage && (
                    <label className="block">
                      <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Current Map View</span>
                      <select
                        value={selectedJobId}
                        onChange={(event) => {
                          setSelectedJobId(event.target.value);
                          if (pagePurpose === 'combined') setMapMode(event.target.value === 'all' ? 'locations' : mapMode === 'arcgis' ? 'arcgis' : 'project');
                          setSelectedPin(null);
                          setPinMode(null);
                          setFieldStatus(event.target.value === 'all' ? 'Showing all saved JDT map locations.' : 'Map focused to the selected relocation job.');
                        }}
                        className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-black text-jdt-text outline-none focus:border-jdt-olive"
                      >
                        <option value="all">All JD Thornton Locations</option>
                        {relocationJobOptions.map((job) => (
                          <option key={job.id} value={job.id}>{job.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Search</span>
                    <div className="flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2">
                      <Search className="h-4 w-4 text-zinc-400" />
                      <input
                        value={isLiveGpsView ? gpsSearch : treeSearch}
                        onChange={(event) => isLiveGpsView ? setGpsSearch(event.target.value) : setTreeSearch(event.target.value)}
                        placeholder={isLiveGpsView ? 'Vehicle, equipment, driver...' : isDedicatedLocationsPage ? 'Project, access point, farm, client...' : 'Tree type, tag, status, crew...'}
                        className="min-w-0 flex-1 bg-transparent text-sm font-bold text-jdt-text outline-none"
                      />
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2 xl:max-w-[360px] xl:justify-end">
                {isDedicatedLocationsPage && (
                  <button type="button" onClick={openAddPinForm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark">
                    <Plus className="h-4 w-4" /> Add Location
                  </button>
                )}
                {isDedicatedFleetGpsPage && (
                  <>
                    {(canSyncRevealLiveLocations && onSyncRevealLiveLocations) && (
                      <button type="button" onClick={() => void onSyncRevealLiveLocations()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-sky-800">
                        <RefreshCw className="h-4 w-4" /> Sync GPS
                      </button>
                    )}
                    <button type="button" onClick={() => window.open('https://reveal.us.vzconnect.com/en-US/live-map/', '_blank', 'noopener,noreferrer')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-black uppercase text-sky-900 hover:border-sky-500">
                      <Truck className="h-4 w-4" /> Open in Verizon Reveal
                    </button>
                  </>
                )}
                {pagePurpose === 'combined' && (
                  <>
                    <button type="button" onClick={openAddPinForm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark">
                      <Plus className="h-4 w-4" /> Add Pin
                    </button>
                    <button type="button" onClick={() => handleArcGisSync()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black uppercase text-violet-900 hover:border-violet-500">
                      <RefreshCw className="h-4 w-4" /> Sync ArcGIS
                    </button>
                    <button type="button" onClick={downloadProjectKml} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
                      <Download className="h-4 w-4" /> Export KML
                    </button>
                    <button type="button" onClick={showClientKmlImportPath} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
                      <Upload className="h-4 w-4" /> Import KML/KMZ
                    </button>
                    <button type="button" onClick={printFieldMap} className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
                      <ClipboardList className="h-4 w-4" /> Print Field Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMapWorkspaceFullscreen((value) => !value)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                      title={isMapWorkspaceFullscreen ? 'Exit full screen map' : 'Expand map workspace'}
                    >
                      {isMapWorkspaceFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} Fullscreen Map
                    </button>
                  </>
                )}
                {selectedJob && openDrawer && (
                  <button type="button" onClick={() => openDrawer('job', selectedJob.id || selectedJob.jobId || selectedJob.projectId)} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
                    Open Job
                  </button>
                )}
              </div>
            </div>
          </div>

          {showTreeMapPanels && <RelocationPipelineSummary pipeline={projectRelocationPipeline} />}

          <div className={`relative bg-zinc-950 rounded-2xl border border-jdt-border shadow-sm overflow-hidden isolate ${isMapWorkspaceFullscreen ? 'min-h-[calc(100vh-15rem)]' : 'min-h-[calc(100vh-310px)]'}`}>
            {mapsConfig.isReady ? (
              <>
                <div ref={googleMapRef} className="absolute inset-0" />
              </>
            ) : (
              <div onClick={handleFallbackMapClick} className="absolute inset-0 cursor-crosshair">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1400&auto=format&fit=crop"
                  alt="Satellite style field map"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-jdt-dark/20" />
                {showTreeMapPanels && renderSelectedTreeLine()}
                {showTreeMapPanels && renderFallbackTreePins()}
                {showSavedLocationsPanel && renderFallbackSiteLocationPins()}
                {isLiveGpsView ? renderFallbackLiveGpsPins() : showPassiveVehicleLayer ? renderFallbackVehiclePins() : null}
              </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-col gap-2 rounded-lg border border-jdt-border bg-white/95 px-3 py-2 text-[10px] font-black uppercase text-jdt-text shadow-lg">
              <span>{mapsConfig.isReady ? 'Google Maps API Active' : 'Fallback Field Map - Add VITE_GOOGLE_MAPS_API_KEY for live Google Maps'}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setMapViewMode('map')}
                  className={`rounded-md border px-2 py-1 ${mapViewMode === 'map' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-jdt-border bg-white text-zinc-600'}`}
                >
                  Map View
                </button>
                <button
                  type="button"
                  onClick={() => setMapViewMode('earth')}
                  className={`rounded-md border px-2 py-1 ${mapViewMode === 'earth' ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-jdt-border bg-white text-zinc-600'}`}
                >
                  Satellite View
                </button>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-zinc-900/90 text-white rounded-lg p-2.5 border border-zinc-700 flex flex-col items-center gap-1 shadow-md z-20">
              <Compass className="h-6 w-6 text-zinc-300 transform rotate-12" />
              <span className="text-[8px] font-black uppercase text-zinc-400">NORTH</span>
            </div>
          </div>

          {mapScheduleStrip}

          {showTreeMapPanels && selectedTreeCard}

          {showTreeMapPanels && kmlBridgeCard}

          {kmlImportPanel}

          {showTreeMapPanels && (
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryTile label="Pinned Sources" value={String(filteredTreeRecords.filter(tree => tree.relocationMap?.source).length)} icon={TreePine} />
              <SummaryTile label="Pinned Destinations" value={String(filteredTreeRecords.filter(tree => tree.relocationMap?.destination).length)} icon={Target} />
              <SummaryTile label="Ready Tasks" value={String(readyTasks.length)} icon={ClipboardList} />
            </div>
          )}
        </div>

        <aside className={`space-y-4 xl:max-h-[calc(100vh-230px)] xl:overflow-y-auto xl:pr-1 ${isMapWorkbenchCollapsed ? 'xl:overflow-visible xl:pr-0' : ''}`}>
          {isMapWorkbenchCollapsed ? (
            <div className="sticky top-4 flex flex-col items-center gap-2 rounded-xl border border-jdt-border bg-white p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setIsMapWorkbenchCollapsed(false)}
                title="Expand map workbench"
                aria-label="Expand map workbench"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-jdt-primary text-white hover:bg-jdt-dark"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="sr-only">Map workbench collapsed</span>
              {isLiveGpsView ? <Truck className="h-5 w-5 text-sky-700" /> : showTreeMapPanels ? <TreePine className="h-5 w-5 text-jdt-primary" /> : <MapPin className="h-5 w-5 text-amber-700" />}
              <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-wide text-zinc-400">Workbench</span>
            </div>
          ) : (
          <>
          {isLiveGpsView && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-sky-700" /> Live GPS Assets
                  </h3>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">
                    Live GPS layered with JDT equipment, freight, and project context.
                  </p>
                </div>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{visibleGpsAssets.length}/{liveGpsAssets.length}</span>
              </div>

              {isolatedGpsAsset && (
                <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <p className="text-[10px] font-black uppercase text-sky-800">{`Isolating ${isolatedGpsAsset.name}`}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsolatedGpsAssetId('');
                      setSelectedGpsAssetId(isolatedGpsAsset.id);
                      setFieldStatus('Showing all live GPS assets again.');
                    }}
                    className="mt-2 rounded-md border border-sky-200 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-sky-800 hover:border-sky-500"
                  >
                    Show All GPS Assets
                  </button>
                </div>
              )}

              {(canSyncRevealLiveLocations && onSyncRevealLiveLocations) && (
                <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-sky-900">Reveal Live Location Sync</p>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-sky-800">
                        {revealLiveLocationSyncStatus || 'Sync live vehicle coordinates from the tracking provider.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onSyncRevealLiveLocations()}
                      disabled={isSyncingRevealLiveLocations}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-sky-700 bg-white px-3 py-2 text-[9px] font-black uppercase text-sky-900 hover:border-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncingRevealLiveLocations ? 'animate-spin' : ''}`} />
                      {isSyncingRevealLiveLocations ? 'Syncing' : 'Sync GPS'}
                    </button>
                  </div>
                  {liveGpsAssets.length > 0 && !liveGpsAssets.some((asset) => asset.lat !== undefined && asset.lng !== undefined) && (
                    <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold leading-snug text-amber-900">
                      Vehicle records are linked to tracking IDs, but no coordinates have reached JDT yet. Sync GPS after Vehicle Numbers are set, or configure the GPS webhook.
                    </p>
                  )}
                </div>
              )}

              <label className="mb-3 block">
                <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Search Live GPS</span>
                <div className="flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={gpsSearch}
                    onChange={(event) => setGpsSearch(event.target.value)}
                    placeholder="Vehicle, equipment, driver, project..."
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-jdt-text outline-none"
                  />
                </div>
              </label>

              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-black uppercase text-zinc-400">Categories</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {liveGpsCategoryOptions.map((category) => {
                    const active = activeGpsCategories.includes(category.id);
                    const count = liveGpsAssets.filter((asset) => asset.category === category.id).length;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleLiveGpsCategory(category.id)}
                        className={`rounded-lg border px-2 py-2 text-left text-[10px] font-black uppercase ${active ? liveGpsCategoryButtonClass(category.id) : 'border-jdt-border bg-white text-zinc-500'}`}
                      >
                        {category.label} <span className="opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-black uppercase text-zinc-400">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {liveGpsStatusOptions.map((status) => {
                    const active = activeGpsStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleLiveGpsStatus(status)}
                        className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${active ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-500'}`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-jdt-border bg-white p-3">
                <p className="mb-2 text-[10px] font-black uppercase text-zinc-400">Map Layers</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-zinc-600">
                  <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-amber-600" /> Saved Locations</span>
                  <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-sky-700" /> Vehicles</span>
                  <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-violet-700" /> Equipment</span>
                  <span className="flex items-center gap-1.5"><Route className="h-3.5 w-3.5 text-teal-700" /> Freight</span>
                </div>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {visibleGpsAssets.length > 0 ? visibleGpsAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`rounded-lg border bg-white p-3 ${selectedGpsAsset?.id === asset.id ? 'border-jdt-primary ring-2 ring-jdt-primary/20' : 'border-jdt-border'}`}
                  >
                    <button
                      type="button"
                      onClick={() => focusLiveGpsAsset(asset)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-jdt-text">{asset.name}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{liveGpsAssetSubtitle(asset)}</p>
                        </div>
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-black uppercase ${liveGpsStatusClass(asset.status)}`}>{asset.status}</span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold leading-snug text-zinc-500">{asset.address || asset.currentAddress || (asset.lat !== undefined && asset.lng !== undefined ? formatTreeCoordinate({ lat: asset.lat, lng: asset.lng }) : 'No GPS coordinate')}</p>
                      {asset.lastUpdatedAt && <p className="mt-1 text-[10px] font-bold text-zinc-400">Latest GPS {asset.lastUpdatedAt}</p>}
                      <div className="mt-2 grid gap-1 text-[10px] font-bold text-zinc-500">
                        <span><strong className="font-black uppercase text-zinc-400">Equipment/vehicle name:</strong> {asset.name}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Equipment type:</strong> {liveGpsAssetSubtitle(asset) || asset.category}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Driver/operator:</strong> {asset.assignedDriver || 'Unassigned'}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Assigned project:</strong> {asset.assignedProjectName || 'Unassigned'}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Assigned crew:</strong> {asset.assignedDriver || 'Unassigned'}</span>
                        <span><strong className="font-black uppercase text-zinc-400">GPS status:</strong> {asset.status}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Last seen:</strong> {asset.lastUpdatedAt || 'No timestamp'}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Current coordinates:</strong> {asset.lat !== undefined && asset.lng !== undefined ? formatTreeCoordinate({ lat: asset.lat, lng: asset.lng }) : 'No GPS coordinate'}</span>
                        <span className={liveGpsConflictLabel(asset).tone}><strong className="font-black uppercase">Conflict warning:</strong> {liveGpsConflictLabel(asset).label}</span>
                      </div>
                    </button>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => focusLiveGpsAsset(asset)} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Zoom To</button>
                      <button type="button" onClick={() => isolateLiveGpsAssetOnMap(asset)} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Isolate</button>
                      <button type="button" onClick={() => openLiveGpsAssetInMaps(asset)} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Open Maps</button>
                      <button type="button" onClick={() => void copyLiveGpsCoordinates(asset)} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Copy GPS</button>
                      {asset.equipmentId && openDrawer && (
                        <button type="button" onClick={() => openDrawer('equipment', asset.equipmentId || '')} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">View Equipment</button>
                      )}
                      {asset.freightMoveId && openDrawer && (
                        <button type="button" onClick={() => openDrawer('freight', asset.freightMoveId || '')} className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">View Freight</button>
                      )}
                      {asset.category === 'unmatched' && (
                        <button type="button" onClick={() => setFieldStatus(`${asset.name} needs to be matched to a JDT equipment record from the Equipment page.`)} className="col-span-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] font-black uppercase text-amber-900 hover:border-amber-400">Match GPS</button>
                      )}
                      <button type="button" onClick={() => setFieldStatus(`Assign Driver opened for ${asset.name}. Use the Equipment/Freight record to save the driver assignment.`)} className="col-span-2 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Assign Driver</button>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                    <p className="text-xs font-black uppercase text-jdt-text">No live GPS assets visible</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-500">Adjust filters, sync GPS tracking data, or match GPS trackers to equipment records.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {showTreeMapPanels && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5">
                    <TreePine className="h-4 w-4 text-emerald-700" /> Tree Map Workbench
                  </h3>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">
                    Trees, pins, task readiness, and cleanup needs tied to this project map.
                  </p>
                </div>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">
                  {workbenchTreeRecords.length}/{filteredTreeRecords.length}
                </span>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-[10px] font-black uppercase text-zinc-400">Search Tree Map</span>
                <div className="flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={treeSearch}
                    onChange={(event) => setTreeSearch(event.target.value)}
                    placeholder="Search by tree type, tag, asset ID, or status"
                    className="min-w-0 flex-1 bg-transparent text-xs font-bold text-jdt-text outline-none"
                  />
                </div>
              </label>

              <div className="mb-3">
                <p className="mb-1.5 text-[10px] font-black uppercase text-zinc-400">Status Filters</p>
                <div className="flex flex-wrap gap-1.5">
                  {treeStatusOptions.map((status) => {
                    const active = activeTreeStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleTreeStatus(status)}
                        className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${active ? getRelocationStatusTone(status) : 'border-jdt-border bg-white text-zinc-500'}`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTreeInViewOnly((value) => !value)}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${treeInViewOnly ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-jdt-border bg-white text-zinc-600'}`}
                >
                  In View
                </button>
                <button
                  type="button"
                  onClick={() => setMultiSelectTrees((value) => !value)}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${multiSelectTrees ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-600'}`}
                >
                  Multi-Select
                </button>
              </div>

              <div className="mb-3 rounded-lg border border-jdt-border bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase text-zinc-400">Bulk Actions</p>
                  <span className="text-[10px] font-black uppercase text-zinc-500">{selectedMapTreeIds.length} selected</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Assign Work',
                    'Create Root Prune Events',
                    'Create Nutrient Care Tasks',
                    'Create Relocation Move Tasks',
                    'Assign Crew',
                    'Assign Equipment',
                    'Set Holding Area',
                    'Set Tree_Relocation_Status',
                    'Export Selected',
                    'Print Field Map',
                    'Sync Selected to ArcGIS',
                    'Clear Selection',
                  ].map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => action === 'Sync Selected to ArcGIS' ? handleArcGisSync('selected') : handleBulkAction(action)}
                      disabled={!selectedMapTreeIds.length && action !== 'Clear Selection'}
                      className="rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
                {workbenchTreeRecords.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMapTreeIds(workbenchTreeRecords.map(treeMapId))}
                      className="flex-1 rounded-md border border-jdt-border bg-jdt-sand/40 px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                    >
                      Select Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMapTreeIds([])}
                      className="flex-1 rounded-md border border-jdt-border bg-white px-2 py-1.5 text-[9px] font-black uppercase text-zinc-500 hover:border-jdt-olive"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {workbenchTreeRecords.length > 0 ? workbenchTreeRecords.map(tree => {
                  const status = getTreeRelocationStatus(tree);
                  const treeId = treeMapId(tree);
                  const taskReadiness = treeTaskReadiness(tree);
                  const selected = selectedMapTreeIds.includes(treeId);
                  const activeTree = selectedTreeId === tree.treeId || selectedTreeId === tree.id;
                  return (
                    <button
                      key={treeId}
                      type="button"
                      onClick={() => handleWorkbenchTreeClick(tree)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${activeTree || selected ? 'bg-jdt-sand border-jdt-primary' : 'bg-white border-jdt-border hover:bg-jdt-sand/60'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-sm text-jdt-text">{treeDisplayName(tree)}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{`Asset ${treeId}`}</p>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-black uppercase ${getRelocationStatusTone(status)}`}>{status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500">
                        <span><strong className="font-black uppercase text-zinc-400">Tree Type</strong><br />{treeTypeLabel(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Tag</strong><br />{treeTagLabel(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">DBH</strong><br />{treeDbhLabel(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Relocation Status</strong><br />{status}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Current Field Location</strong><br />{treeFieldLocationLabel(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Source</strong><br />{treeSourcePinStatus(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Destination</strong><br />{treeDestinationPinStatus(tree)}</span>
                        <span><strong className="font-black uppercase text-zinc-400">Tasks</strong><br />{taskReadiness.ready} ready / {taskReadiness.waiting} waiting</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {treeMapBadges(tree).map((badge) => (
                          <span key={badge} className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900">{badge}</span>
                        ))}
                      </div>
                      {multiSelectTrees && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase text-jdt-primary">
                          <CheckSquare className="h-3.5 w-3.5" />
                          {selected ? 'Selected for bulk update' : 'Tap to select for bulk update'}
                        </div>
                      )}
                    </button>
                  );
                }) : (
                  <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                    <p className="text-xs font-black uppercase text-jdt-text">No map items match</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-500">Clear search or filters, or add tree inventory to this project map.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {(showTreeMapPanels || isArcGisView) && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-violet-700" /> ArcGIS Layers
                  </h3>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">
                    Geometry layers for project boundaries, trees, holding areas, work zones, task overlays, and equipment locations.
                  </p>
                </div>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{activeArcGisLayers.length}/{arcGisLayerOptions.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {arcGisLayerOptions.map((layer) => {
                  const active = activeArcGisLayers.includes(layer);
                  return (
                    <button
                      key={layer}
                      type="button"
                      onClick={() => toggleArcGisLayer(layer)}
                      className={`rounded-lg border px-3 py-2 text-left text-[10px] font-black uppercase ${active ? 'border-violet-300 bg-violet-50 text-violet-900' : 'border-jdt-border bg-white text-zinc-500'}`}
                    >
                      {layer}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                <p className="text-[10px] font-black uppercase text-zinc-400">JDT to ArcGIS reference fields</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {arcGisReferenceFields.map((field) => (
                    <span key={field} className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[9px] font-black uppercase text-violet-900">{field}</span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-bold text-zinc-500">
                  JDT Command Center stays the operational record. ArcGIS stores geometry, hosted layer URLs, feature IDs, and last map sync state.
                </p>
              </div>
            </div>
          )}

          {!isLiveGpsView && liveVehicleMarkers.length > 0 && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-sky-700" /> Live Vehicle Layer
                </h3>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{liveVehicleMarkers.length}</span>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {liveVehicleMarkers.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => focusVehicleMarker(vehicle)}
                    className="w-full rounded-lg border border-jdt-border bg-white p-3 text-left hover:bg-sky-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-jdt-text">{vehicle.label}</p>
                        <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{vehicle.driverName || 'Driver not assigned'}</p>
                      </div>
                      <span className="shrink-0 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase text-sky-800">{vehicle.status}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold leading-snug text-zinc-500">{vehicle.address || formatTreeCoordinate({ lat: vehicle.lat, lng: vehicle.lng })}</p>
                    {vehicle.lastSeenAt && <p className="mt-1 text-[10px] font-bold text-zinc-400">Latest GPS {vehicle.lastSeenAt}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSavedLocationsPanel && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-700" /> {savedLocationsTitle}</h3>
              <button
                type="button"
                onClick={openAddPinForm}
                className="inline-flex items-center gap-1.5 rounded-md border border-jdt-border bg-white px-2.5 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
              >
                <Plus className="h-3.5 w-3.5" /> Add Pin
              </button>
            </div>
            {isSiteLocationFormOpen && (
              <div className="mb-4 space-y-3 rounded-lg border border-jdt-border bg-jdt-sand/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-jdt-text">{editingSiteLocationId ? 'Edit Project Pin' : 'Add Project Pin'}</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-500">
                      {selectedJob ? `Saved to ${profileJobTitle(selectedJob)}` : 'Saved to All JD Thornton Locations'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSiteLocationFormOpen(false);
                      setEditingSiteLocationId(null);
                    }}
                    className="rounded border border-jdt-border bg-white px-2 py-1 text-[9px] font-black uppercase text-zinc-500 hover:border-jdt-olive"
                  >
                    Cancel
                  </button>
                </div>
                <p className="rounded-md border border-jdt-border bg-white px-3 py-2 text-[11px] font-bold text-zinc-500">
                  Click the map, paste a Google Maps link, enter lat/long, or paste a street address.
                </p>
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Location Label</span>
                  <input
                    value={siteLocationForm.label}
                    onChange={(event) => setSiteLocationForm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="25 Acre east equipment gate"
                    className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Location Type</span>
                  <select
                    value={siteLocationForm.accessType}
                    onChange={(event) => setSiteLocationForm((prev) => ({ ...prev, accessType: event.target.value }))}
                    className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                  >
                    {siteLocationAccessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <div>
                  <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Division Use</span>
                  <div className="flex flex-wrap gap-1.5">
                    {siteLocationDivisionOptions.map((division) => {
                      const selected = siteLocationForm.divisionUse.includes(division);
                      return (
                        <button
                          key={division}
                          type="button"
                          onClick={() => toggleSiteLocationDivision(division)}
                          className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${selected ? 'border-jdt-primary bg-jdt-primary text-white' : 'border-jdt-border bg-white text-zinc-600'}`}
                        >
                          {division}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Google Maps Link / Pin</span>
                  <textarea
                    value={siteLocationForm.sourceText}
                    onChange={(event) => setSiteLocationForm((prev) => ({ ...prev, sourceText: event.target.value }))}
                    placeholder="Paste Google Maps link, lat/long, or address"
                    rows={3}
                    className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive"
                  />
                </label>
                <div className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[11px] font-bold text-zinc-500">
                  <span className="font-black uppercase text-zinc-400">Parsed Pin: </span>
                  {parsedSiteLocation ? `${parsedSiteLocation.lat.toFixed(5)}, ${parsedSiteLocation.lng.toFixed(5)}` : 'No coordinates detected yet'}
                </div>
                <button
                  type="button"
                  onClick={saveSiteLocation}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                >
                  <Save className="h-4 w-4" /> Save Site Location
                </button>
              </div>
            )}

            <div className="mt-4 border-t border-jdt-border pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase text-zinc-400">{savedLocationsListLabel}</p>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{scopedSavedLocations.length}</span>
              </div>
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {scopedSavedLocations.length > 0 ? groupedSavedLocations.map((group) => (
                  <div key={group.label} className="rounded-lg border border-jdt-border bg-white/60 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <p className="text-[10px] font-black uppercase text-jdt-primary">{group.label}</p>
                      <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{group.locations.length}</span>
                    </div>
                    <div className="space-y-2">
                      {group.locations.map((location) => {
                        const point = pointFromSavedSiteLocation(location);
                        return (
                          <div key={location.id} className="rounded-lg border border-jdt-border bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black text-jdt-text">{location.name || location.title}</p>
                                <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{location.locationType || location.accessType || 'Site Location'}</p>
                              </div>
                              <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">{point ? 'Pinned' : 'Address'}</span>
                            </div>
                            <p className="mt-2 text-[11px] font-bold text-zinc-500">{location.coordinateText || (point ? formatTreeCoordinate(point) : '') || location.mainAddress || location.sourceText || '-'}</p>
                            {Array.isArray(location.divisionUse) && location.divisionUse.length > 0 && (
                              <p className="mt-1 text-[10px] font-bold text-zinc-400">{location.divisionUse.join(' / ')}</p>
                            )}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  focusSavedLocation(location);
                                }}
                                className="flex-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                Focus
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openSavedLocationInGoogleMaps(location);
                                }}
                                className="flex-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                Open Maps
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  editSavedLocation(location);
                                }}
                                className="flex items-center justify-center gap-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit Pin
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  editSavedLocation(location, true);
                                }}
                                className="flex items-center justify-center gap-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                <Crosshair className="h-3.5 w-3.5" /> Adjust Pin
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copySavedLocationGps(location);
                                }}
                                className="flex-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                Copy GPS
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFieldStatus(selectedJob ? `${location.name || location.title || 'Saved pin'} assigned to ${profileJobTitle(selectedJob)}.` : 'Select a project before assigning this saved location.');
                                }}
                                className="flex-1 rounded-md border border-jdt-border px-2 py-1.5 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                              >
                                Assign to Project
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                    <p className="text-xs font-black uppercase text-jdt-text">No saved locations</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-500">{isAllLocationsView ? 'Save company, farm, client, or project locations to start building the JDT map library.' : 'Save access pins for the selected project or job.'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {showTreeMapPanels && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><Route className="h-4 w-4 text-blue-700" /> Source / Destination</h3>
            <div className="space-y-3 text-xs font-bold">
              <CoordinateCard label="Current Field Position" point={selectedTree?.relocationMap?.source} tone="source" />
              <CoordinateCard label="Relocation Destination" point={selectedTree?.relocationMap?.destination} tone="destination" />
              <div className="rounded-lg border border-jdt-border bg-white p-3">
                <p className="text-[10px] font-black uppercase text-zinc-500">Pin Editor</p>
                {selectedPin ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-black text-jdt-text">{selectedPin.pointType === 'source' ? 'Source pin selected' : 'Destination pin selected'}</p>
                    <p className="text-[11px] font-bold text-zinc-500">{formatTreeCoordinate(selectedPinPoint)}</p>
                    <button
                      type="button"
                      onClick={() => beginPinEdit(selectedPin.pointType)}
                      className="w-full rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
                    >
                      Move Selected Pin
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] font-bold text-zinc-500">Select a source or destination pin on the map, then click the map again, drag the marker, or use phone GPS to move it.</p>
                )}
                <p className="mt-2 text-[10px] font-bold text-zinc-400">GPS accuracy is saved when the phone provides it.</p>
              </div>
            </div>
          </div>
          )}

          {showTreeMapPanels && (
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><ClipboardList className="h-4 w-4 text-jdt-primary" /> Selected Tree Tasks</h3>
            <div className="space-y-3">
              {selectedTasks.length > 0 ? selectedTaskGroups.map((group) => (
                <div key={group.label} className="rounded-lg border border-jdt-border bg-white p-3">
                  <p className="mb-2 text-[10px] font-black uppercase text-jdt-primary">{group.label}</p>
                  <div className="space-y-2">
                    {group.tasks.map(task => (
                      <div key={task.id} className="rounded-lg border border-jdt-border bg-jdt-sand/20 p-3">
                        <div className="flex justify-between gap-2">
                          <span className="text-xs font-black text-jdt-text">{task.label}</span>
                          <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${getTaskStatusTone(task.status)}`}>{task.status}</span>
                        </div>
                        <div className="mt-2 grid gap-1 text-[10px] font-bold text-zinc-500">
                          <span><strong className="font-black uppercase text-zinc-400">Task type:</strong> {group.label}</span>
                          <span><strong className="font-black uppercase text-zinc-400">Assigned crew/vendor:</strong> {task.assignedRole || 'Unassigned'}</span>
                          <span><strong className="font-black uppercase text-zinc-400">Scheduled date:</strong> {(task as any).scheduledDate || (task as any).dueDate || 'Unscheduled'}</span>
                          <span><strong className="font-black uppercase text-zinc-400">Required next action:</strong> {task.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase text-jdt-text">No selected tree</p>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">Select or add a tree to see relocation tasks.</p>
                </div>
              )}
            </div>
          </div>
          )}
          </>
          )}
        </aside>
      </div>
    </div>
  );
}

function CoordinateCard({ label, point, tone }: { label: string; point?: TreeRelocationPoint; tone: 'source' | 'destination' }) {
  const Icon = tone === 'source' ? TreePine : Target;
  const className = tone === 'source' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-blue-800 bg-blue-50 border-blue-200';
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-black uppercase text-[10px]">{label}</span>
      </div>
      <p className="mt-2 text-jdt-text font-black">{formatTreeCoordinate(point)}</p>
      {point?.accuracyMeters && <p className="text-[10px] font-bold mt-1">GPS accuracy: +/- {point.accuracyMeters}m</p>}
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg border border-jdt-border bg-white flex items-center justify-center">
        <Icon className="h-5 w-5 text-jdt-primary" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-zinc-400">{label}</p>
        <p className="text-2xl font-black text-jdt-text">{value}</p>
      </div>
    </div>
  );
}

function TreeDetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-jdt-border bg-white px-3 py-2">
      <p className="text-[9px] font-black uppercase text-zinc-400">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-jdt-text">{value || '-'}</p>
    </div>
  );
}

function RelocationPipelineSummary({ pipeline }: { pipeline: ReturnType<typeof buildProjectRelocationPipeline> }) {
  return (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">Project Relocation Pipeline</p>
          <h3 className="text-sm font-black text-jdt-text">Tree status, pin readiness, and cleanup at a glance</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary">Total Trees {pipeline.total}</span>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-900">Source Pinned {pipeline.sourcePinned}</span>
          <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase text-blue-900">Destination Pinned {pipeline.destinationPinned}</span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {treeRelocationPipelineStatuses.map((status) => (
          <div key={status} className={`rounded-lg border px-3 py-2 ${getRelocationStatusTone(status)}`}>
            <p className="text-[9px] font-black uppercase opacity-80">{status}</p>
            <p className="mt-1 text-lg font-black">{pipeline.statusCounts[status] || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildProjectRelocationPipeline(trees: any[]) {
  const statusCounts = treeRelocationPipelineStatuses.reduce<Record<string, number>>((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {});
  trees.forEach((tree) => {
    const status = normalizeTreeRelocationStatus(getTreeRelocationStatus(tree));
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  return {
    total: trees.length,
    sourcePinned: trees.filter((tree) => Boolean(tree.relocationMap?.source)).length,
    destinationPinned: trees.filter((tree) => Boolean(tree.relocationMap?.destination)).length,
    statusCounts,
  };
}

function normalizeTreeRelocationStatus(status: string): string {
  const text = String(status || '').trim();
  if (treeRelocationPipelineStatuses.includes(text)) return text;
  if (/25/.test(text)) return '25% Cut';
  if (/50/.test(text)) return '50% Cut';
  if (/75/.test(text)) return '75% Cut';
  if (/100/.test(text)) return '100% Cut';
  if (/ready/i.test(text)) return 'Ready for Relocation';
  if (/holding/i.test(text)) return 'Moved to Holding';
  if (/relocated/i.test(text)) return 'Relocated';
  return 'Not Started';
}

function treeTaskReadiness(tree: any) {
  const tasks = buildTreeRelocationTasks(tree);
  return {
    ready: tasks.filter((task) => task.status === 'Ready').length,
    waiting: tasks.filter((task) => task.status === 'Waiting').length,
  };
}

function treeMapBadges(tree: any): string[] {
  const badges: string[] = [];
  const status = getTreeRelocationStatus(tree);
  if (!tree.relocationMap?.source) badges.push('Needs Source Pin');
  if (!tree.relocationMap?.destination) badges.push('Needs Destination Pin');
  if (/high risk/i.test(String(tree.priority || tree.risk || tree.notes || ''))) badges.push('High Risk');
  if (/blocked|hold/i.test(status) || /blocked|hold/i.test(String(tree.currentStatus || ''))) badges.push('Blocked');
  if (/care|treatment|follow/i.test(String(tree.nextFollowUpDate || tree.followUpNeeded || tree.status || ''))) badges.push('Care Follow-Up Due');
  if (/ready/i.test(status)) badges.push('Ready to Move');
  return badges;
}

function groupSelectedTreeTasks(tasks: ReturnType<typeof buildTreeRelocationTasks>) {
  const groups = [
    { label: 'Root Pruning', tasks: [] as typeof tasks },
    { label: 'Nutrient Care', tasks: [] as typeof tasks },
    { label: 'Relocation Work', tasks: [] as typeof tasks },
    { label: 'Photos / Documentation', tasks: [] as typeof tasks },
  ];
  tasks.forEach((task) => {
    const text = `${task.label} ${task.detail}`.toLowerCase();
    if (/root|prune|cut/.test(text)) groups[0].tasks.push(task);
    else if (/treatment|water|spray|fertilizer|care|nutrient/.test(text)) groups[1].tasks.push(task);
    else if (/photo|document|confirm/.test(text)) groups[3].tasks.push(task);
    else groups[2].tasks.push(task);
  });
  return groups.filter((group) => group.tasks.length > 0);
}

function mergeMapTreeRecords(baseTrees: any[] = [], relocationTrees: any[] = []) {
  const byId = new Map<string, any>();
  [...baseTrees, ...relocationTrees].forEach((tree) => {
    const id = String(tree.treeId || tree.id || '').trim();
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...tree, treeId: tree.treeId || tree.id });
  });
  return Array.from(byId.values());
}

function treeMapId(tree: any): string {
  return String(tree.treeId || tree.id || tree.tag || tree.title || 'tree').trim();
}

function treeTypeLabel(tree: any): string {
  return String(tree.type || tree.treeType || tree.ranchOakType || tree.species || tree.commonName || 'Unknown tree').trim();
}

function treeTagLabel(tree: any): string {
  const tag = String(tree.tag || tree.treeTag || tree.fieldTag || tree.treeNumber || '').trim();
  return tag ? `Tag #${tag.replace(/^#/, '')}` : 'Tag missing';
}

function treeDbhLabel(tree: any): string {
  const dbh = tree.dbh ?? tree.dbhIn ?? tree.DBH_IN ?? tree.caliperInches;
  const text = String(dbh ?? '').trim();
  return text ? `DBH ${text}` : 'DBH missing';
}

function treeDisplayName(tree: any): string {
  const tag = treeTagLabel(tree);
  const type = treeTypeLabel(tree);
  return tag === 'Tag missing' ? type : `${type} - ${tag}`;
}

function treePinSummary(tree: any): string {
  const source = tree.relocationMap?.source ? 'source' : '';
  const destination = tree.relocationMap?.destination ? 'destination' : '';
  return [source, destination].filter(Boolean).join(' + ') || 'not pinned';
}

function treeMapSubtitle(tree: any): string {
  const parts = [tree.farm, tree.zone, tree.ranchOakType || tree.type || tree.treeType].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Project tree asset';
}

function treeAssetCategoryLabel(tree: any): string {
  return String(tree.assetCategory || tree.asset_category || tree.category || 'Tree Asset').trim();
}

function treeFieldLocationLabel(tree: any): string {
  return String(
    tree.currentFieldLocation
      || tree.current_field_location
      || tree.existingLocationDescription
      || tree.existing_location_description
      || tree.farm
      || tree.zone
      || 'Field location not set',
  ).trim();
}

function treeDestinationLabel(tree: any): string {
  return String(
    tree.relocationDestination
      || tree.proposedFinalLocationDescription
      || tree.proposed_final_location_description
      || tree.destinationLocation
      || 'Destination not set',
  ).trim();
}

function treeHoldingAreaLabel(tree: any): string {
  return String(tree.holdingAreaName || tree.holding_area_name || tree.holdingArea || 'No holding area').trim();
}

function treeFinalOutcomeLabel(tree: any): string {
  return String(tree.treeFinalOutcome || tree.tree_final_outcome || tree.finalOutcome || tree.currentStatus || 'Active in Scope').trim();
}

function treeSourcePinStatus(tree: any): string {
  return tree.relocationMap?.source ? 'Source pinned' : 'Needs Source Pin';
}

function treeDestinationPinStatus(tree: any): string {
  return tree.relocationMap?.destination ? 'Destination pinned' : 'Needs Destination Pin';
}

function groupSavedSiteLocations(locations: any[]) {
  const groups = new Map<string, any[]>();
  locations.forEach((location) => {
    const label = savedLocationGroupLabel(location);
    groups.set(label, [...(groups.get(label) || []), location]);
  });
  return ['Project Address', 'Crew Access', 'Truck Access', 'Holding Area', 'Nursery/Farm', 'Client Meeting Point', 'Other']
    .map((label) => ({ label, locations: groups.get(label) || [] }))
    .filter((group) => group.locations.length > 0);
}

function savedLocationGroupLabel(location: any): string {
  const type = String(location.locationType || location.accessType || location.type || '').toLowerCase();
  const name = String(location.name || location.title || '').toLowerCase();
  const search = `${type} ${name}`;
  if (/main|project|jobsite|address/.test(search)) return 'Project Address';
  if (/crew/.test(search)) return 'Crew Access';
  if (/truck|equipment|construction|load|unload|access/.test(search)) return 'Truck Access';
  if (/holding/.test(search)) return 'Holding Area';
  if (/farm|nursery|acre|janet|home base|shop/.test(search)) return 'Nursery/Farm';
  if (/client|meeting|contact/.test(search)) return 'Client Meeting Point';
  return 'Other';
}

export function resolveMapWorkbenchBounds(inViewOnly: boolean, bounds: MapBounds | null): MapBounds | null {
  return inViewOnly ? bounds : null;
}

export function mapBoundsEqual(
  first: MapBounds | null | undefined,
  second: MapBounds | null | undefined,
  tolerance = 0.000001,
): boolean {
  if (!first && !second) return true;
  if (!first || !second) return false;
  return (
    Math.abs(first.north - second.north) <= tolerance &&
    Math.abs(first.south - second.south) <= tolerance &&
    Math.abs(first.east - second.east) <= tolerance &&
    Math.abs(first.west - second.west) <= tolerance
  );
}

function filterMapWorkbenchTrees(
  trees: any[],
  options: { search: string; statuses: string[]; inViewOnly: boolean; bounds: MapBounds | null },
) {
  const query = options.search.trim().toLowerCase();
  return trees.filter((tree) => {
    const status = getTreeRelocationStatus(tree);
    if (options.statuses.length && !options.statuses.includes(status)) return false;
    if (query && !treeSearchText(tree, status).includes(query)) return false;
    if (options.inViewOnly && options.bounds && !treeHasPointInBounds(tree, options.bounds)) return false;
    return true;
  });
}

function treeSearchText(tree: any, status = getTreeRelocationStatus(tree)): string {
  return [
    treeMapId(tree),
    treeTypeLabel(tree),
    treeTagLabel(tree),
    treeDbhLabel(tree),
    status,
    tree.farm,
    tree.zone,
    tree.projectName,
    tree.jobName,
    tree.clientName,
    tree.existingLocationDescription,
    tree.proposedFinalLocationDescription,
  ].filter(Boolean).join(' ').toLowerCase();
}

function treeHasPointInBounds(tree: any, bounds: MapBounds): boolean {
  return pointInBounds(tree.relocationMap?.source, bounds) || pointInBounds(tree.relocationMap?.destination, bounds);
}

function pointInBounds(point: TreeRelocationPoint | undefined, bounds: MapBounds): boolean {
  if (!point) return false;
  return point.lat <= bounds.north && point.lat >= bounds.south && point.lng <= bounds.east && point.lng >= bounds.west;
}

function treeMarkerLabel(tree: any, pointType: TreeRelocationPointType): string {
  const tag = String(tree.tag || tree.treeTag || tree.fieldTag || '').replace(/^#/, '').trim();
  if (tag) return tag.slice(0, 3);
  const id = treeMapId(tree);
  const trailingNumber = id.match(/(\d+)(?!.*\d)/)?.[1];
  if (trailingNumber) return trailingNumber.slice(-3);
  return pointType === 'source' ? 'S' : 'D';
}

function treeMarkerPinClass(status: string, pointType: TreeRelocationPointType): string {
  if (/relocated|ready/i.test(status)) return 'bg-emerald-700 ring-emerald-200';
  if (/destination|root pruning/i.test(status)) return pointType === 'source' ? 'bg-sky-700 ring-sky-200' : 'bg-blue-700 ring-blue-200';
  if (/source|missing|needs/i.test(status)) return 'bg-amber-600 ring-amber-200';
  return pointType === 'source' ? 'bg-emerald-700 ring-emerald-200' : 'bg-blue-700 ring-blue-200';
}

function buildSelectedTreeCsv(trees: any[]): string {
  const headers = ['Tree Asset ID', 'Tree Type', 'Tag', 'DBH', 'Status', 'Project', 'Source Lat', 'Source Lng', 'Destination Lat', 'Destination Lng'];
  const rows = trees.map((tree) => [
    treeMapId(tree),
    treeTypeLabel(tree),
    treeTagLabel(tree).replace(/^Tag #/, ''),
    treeDbhLabel(tree).replace(/^DBH /, ''),
    getTreeRelocationStatus(tree),
    tree.projectName || tree.jobName || '',
    tree.relocationMap?.source?.lat ?? '',
    tree.relocationMap?.source?.lng ?? '',
    tree.relocationMap?.destination?.lat ?? '',
    tree.relocationMap?.destination?.lng ?? '',
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function slugFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'jdt-map-items';
}

function filterScheduleTasksForMap(tasks: ScheduleTaskRecord[], selectedJob: any): ScheduleTaskRecord[] {
  if (!selectedJob) return [];
  return tasks.filter((task) => scheduleTaskMatchesSelectedJob(task, selectedJob));
}

function scheduleTaskMatchesSelectedJob(task: ScheduleTaskRecord, selectedJob: any): boolean {
  const jobIds = [
    selectedJob.id,
    selectedJob.jobId,
    selectedJob.projectId,
    selectedJob.projectsId,
  ].filter(Boolean).map(String);
  const projectNames = [
    selectedJob.projectName,
    selectedJob.title,
    selectedJob.name,
    selectedJob.jobName,
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  const taskIds = [task.jobId, task.projectId].filter(Boolean).map(String);
  if (taskIds.some((id) => jobIds.includes(id))) return true;
  const taskNames = [task.jobName, task.projectName, task.title, task.locationName].filter(Boolean).map((value) => String(value).toLowerCase());
  return taskNames.some((name) => projectNames.some((projectName) => name.includes(projectName) || projectName.includes(name)));
}

function formatScheduleDateRange(start?: string, end?: string): string {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  if (!startLabel && !endLabel) return 'Unscheduled';
  if (!endLabel || startLabel === endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function formatShortDate(value?: string): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function liveGpsMarkerLabel(category: LiveGpsCategory): string {
  if (category === 'equipment') return 'E';
  if (category === 'freight') return 'F';
  if (category === 'unmatched') return '?';
  return 'V';
}

function liveGpsIcon(category: LiveGpsCategory): any {
  if (category === 'equipment') return Wrench;
  if (category === 'freight') return Route;
  if (category === 'unmatched') return AlertTriangle;
  return Truck;
}

function liveGpsPinClass(category: LiveGpsCategory): string {
  if (category === 'equipment') return 'bg-violet-700 ring-violet-200';
  if (category === 'freight') return 'bg-teal-700 ring-teal-200';
  if (category === 'unmatched') return 'bg-amber-600 ring-amber-200';
  return 'bg-sky-700 ring-sky-200';
}

function liveGpsCategoryButtonClass(category: LiveGpsCategory): string {
  if (category === 'equipment') return 'border-violet-300 bg-violet-50 text-violet-900';
  if (category === 'freight') return 'border-teal-300 bg-teal-50 text-teal-900';
  if (category === 'unmatched') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-sky-300 bg-sky-50 text-sky-900';
}

function liveGpsStatusClass(status: string): string {
  if (/needs match|no signal|stale/i.test(status)) return 'border-amber-200 bg-amber-50 text-amber-900';
  if (/moving|in transit|active/i.test(status)) return 'border-sky-200 bg-sky-50 text-sky-900';
  if (/stopped|idle|scheduled/i.test(status)) return 'border-zinc-200 bg-zinc-50 text-zinc-700';
  if (/delayed|blocked|down/i.test(status)) return 'border-red-200 bg-red-50 text-red-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function liveGpsConflictLabel(asset: LiveGpsAsset): { label: string; tone: string } {
  if (asset.category === 'unmatched') {
    return { label: 'GPS tracker needs to be matched to a JDT vehicle or equipment record.', tone: 'text-amber-900' };
  }
  if (/no signal|stale/i.test(asset.status)) {
    return { label: 'GPS signal is stale or missing; verify before dispatch.', tone: 'text-amber-900' };
  }
  if (!asset.assignedProjectName && asset.category !== 'vehicle') {
    return { label: 'No assigned project is saved for this asset.', tone: 'text-amber-900' };
  }
  return { label: 'No assignment conflict detected.', tone: 'text-emerald-800' };
}

function liveGpsAssetSubtitle(asset: LiveGpsAsset): string {
  const category = liveGpsCategoryOptions.find((option) => option.id === asset.category)?.label || asset.category;
  const details = [
    category,
    asset.assignedDriver,
    asset.assignedProjectName,
    asset.freightMoveTitle,
    asset.currentLocationName,
  ].filter(Boolean);
  return details.join(' - ');
}
