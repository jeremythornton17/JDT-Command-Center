import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Layers, MapPin, Maximize2, Minimize2, Save, TreePine } from 'lucide-react';
import type {
  EquipmentRecord,
  JobRecord,
  LocationRecord,
  ProjectRecord,
  RanchOakRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
} from '../commandCenter/records';
import {
  applyArcGisSyncReference,
  buildArcGisEquipmentLocationFeatures,
  buildArcGisFilterOptions,
  buildArcGisFinalTreeLocationFeatures,
  buildArcGisHoldingAreaFeatures,
  buildArcGisProjectBoundaryFeatures,
  buildArcGisTreeAssetHostedEdit,
  buildArcGisTaskOverlayFeatures,
  buildArcGisTreeAssetFeatures,
  buildArcGisWorkZoneFeatures,
  buildProjectDefinitionExpression,
  buildTreeDefinitionExpression,
  emptyArcGisMapFilters,
  filterArcGisTreeFeatures,
  getArcGisConfig,
  jdtArcGisLayerSchemas,
  normalizeArcGisFeatureLayerUrl,
  treeFeatureToTreeRecord,
  type ArcGisClientLayerId,
  type ArcGisEquipmentFeature,
  type ArcGisFinalTreeLocationFeature,
  type ArcGisMapFilters,
  type ArcGisPolygonFeature,
  type ArcGisTaskFeature,
  type ArcGisTreeAssetFeature,
} from '../commandCenter/arcgisMapping';

type ArcGisMapBoardProps = {
  initialProjectId?: string;
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  ranchOaks?: RanchOakRecord[];
  equipment?: EquipmentRecord[];
  locations?: LocationRecord[];
  workOrders?: WorkOrderRecord[];
  onSaveTreePoint?: (record: TreeRelocationRecord) => void | Promise<void>;
  getAuthToken?: () => Promise<string>;
};

type ArcGisModules = {
  esriConfig: any;
  ArcGISMap: any;
  MapView: any;
  FeatureLayer: any;
  Graphic: any;
};

type LayerRefs = Partial<Record<ArcGisClientLayerId, any>>;
type LayerVisibility = Record<ArcGisClientLayerId, boolean>;
type RightPanelTab = 'layers' | 'selectedTree' | 'workDue' | 'gps';

type TreePointForm = {
  treeId: string;
  projectId: string;
  projectName: string;
  species: string;
  dbh: string;
  status: string;
  rootPruneDate: string;
  finalMoveDate: string;
  crew: string;
  notes: string;
  latitude: string;
  longitude: string;
  arcGisFeatureId: string;
  arcGisLayerUrl: string;
  lastMapSyncAt: string;
};

declare global {
  interface Window {
    $arcgis?: {
      import: (moduleIdOrIds: string | string[]) => Promise<any>;
    };
  }
}

const arcGisSdkUrl = 'https://js.arcgis.com/5.0/';
const arcGisCssUrl = 'https://js.arcgis.com/5.0/esri/themes/light/main.css';
const treeRelocationStatusOrder = [
  'Not Started',
  '25% Cut',
  '50% Cut',
  '75% Cut',
  '100% Cut',
  'Ready for Relocation',
  'Moved to Holding Area',
  'Relocated',
] as const;

const layerMetadata: Array<{ id: ArcGisClientLayerId; hostedName: string; title: string; detail: string }> = [
  { id: 'treeAssets', hostedName: 'JDT_Tree_Assets', title: 'Tree Assets', detail: 'Tree asset ID, type, DBH, status, pins, notes' },
  { id: 'projectBoundary', hostedName: 'JDT_Project_Boundaries', title: 'Project Boundary', detail: 'Project context and operating boundary' },
  { id: 'finalTreeLocations', hostedName: 'JDT_Final_Tree_Locations', title: 'Final Tree Locations', detail: 'Proposed or approved destination points' },
  { id: 'holdingAreas', hostedName: 'JDT_Holding_Areas', title: 'Holding Area', detail: 'Temporary holding and staging polygons' },
  { id: 'workZones', hostedName: 'JDT_Work_Zones', title: 'Work Zones', detail: 'Construction, staging, and active work areas' },
  { id: 'rootPruneEvents', hostedName: 'JDT_Root_Prune_Events', title: 'Root Prune Events', detail: 'Scheduled or completed root-prune work' },
  { id: 'relocationWork', hostedName: 'JDT_Relocation_Work', title: 'Relocation Work', detail: 'Move-day and final relocation tasks' },
  { id: 'nutrientCareTasks', hostedName: 'JDT_Nutrient_Care_Tasks', title: 'Nutrient Care Tasks', detail: 'Treatment, watering, and follow-up points' },
  { id: 'equipmentLocations', hostedName: 'JDT_Equipment_Locations', title: 'Equipment Location', detail: 'Tracked equipment, trucks, trailers, assignments' },
];

let arcGisLoadPromise: Promise<ArcGisModules> | null = null;

export default function ArcGisMapBoard({
  initialProjectId,
  projects = [],
  jobs = [],
  treeRelocationRecords = [],
  ranchOaks = [],
  equipment = [],
  locations = [],
  workOrders = [],
  onSaveTreePoint,
  getAuthToken,
}: ArcGisMapBoardProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<any>(null);
  const modulesRef = useRef<ArcGisModules | null>(null);
  const layerRefs = useRef<LayerRefs>({});
  const latestTreeFeaturesRef = useRef<ArcGisTreeAssetFeature[]>([]);
  const [mapStatus, setMapStatus] = useState('ArcGIS map is waiting for configuration.');
  const [saveStatus, setSaveStatus] = useState('');
  const [filters, setFilters] = useState<ArcGisMapFilters>(() => ({
    ...emptyArcGisMapFilters,
    projectId: initialProjectId || 'all',
  }));
  const [treeForm, setTreeForm] = useState<TreePointForm>(() => emptyTreePointForm(initialProjectId));
  const [selectedTreeId, setSelectedTreeId] = useState('');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('layers');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(() => defaultLayerVisibility());
  const [isGisWorkbenchCollapsed, setIsGisWorkbenchCollapsed] = useState(false);
  const [isGisMapFullscreen, setIsGisMapFullscreen] = useState(false);

  const arcGisConfig = getArcGisConfig();
  const treeFeatures = useMemo(() => buildArcGisTreeAssetFeatures({
    treeRelocationRecords,
    ranchOaks,
    projects,
    jobs,
    workOrders,
  }), [treeRelocationRecords, ranchOaks, projects, jobs, workOrders]);
  const filteredTreeFeatures = useMemo(
    () => filterArcGisTreeFeatures(treeFeatures, filters),
    [treeFeatures, filters],
  );
  const projectBoundaryFeatures = useMemo(
    () => buildArcGisProjectBoundaryFeatures({ projects, jobs, treeFeatures, locations }),
    [projects, jobs, treeFeatures, locations],
  );
  const finalTreeLocationFeatures = useMemo(
    () => buildArcGisFinalTreeLocationFeatures({ treeRelocationRecords, ranchOaks }),
    [treeRelocationRecords, ranchOaks],
  );
  const holdingAreaFeatures = useMemo(
    () => buildArcGisHoldingAreaFeatures({ locations, projects, jobs }),
    [locations, projects, jobs],
  );
  const workZoneFeatures = useMemo(
    () => buildArcGisWorkZoneFeatures({ locations, projects, jobs }),
    [locations, projects, jobs],
  );
  const equipmentFeatures = useMemo(
    () => buildArcGisEquipmentLocationFeatures(equipment),
    [equipment],
  );
  const taskOverlayFeatures = useMemo(
    () => buildArcGisTaskOverlayFeatures({ workOrders, treeFeatures, projects, jobs }),
    [workOrders, treeFeatures, projects, jobs],
  );
  const visibleProjectBoundaries = useMemo(
    () => filterProjectFeatures(projectBoundaryFeatures, filters.projectId),
    [projectBoundaryFeatures, filters.projectId],
  );
  const visibleFinalTreeLocations = useMemo(
    () => filterPointFeatures(finalTreeLocationFeatures, filters.projectId),
    [finalTreeLocationFeatures, filters.projectId],
  );
  const visibleHoldingAreas = useMemo(
    () => filterProjectFeatures(holdingAreaFeatures, filters.projectId),
    [holdingAreaFeatures, filters.projectId],
  );
  const visibleWorkZones = useMemo(
    () => filterProjectFeatures(workZoneFeatures, filters.projectId),
    [workZoneFeatures, filters.projectId],
  );
  const visibleEquipmentFeatures = useMemo(
    () => filterEquipmentFeatures(equipmentFeatures, filters.projectId),
    [equipmentFeatures, filters.projectId],
  );
  const visibleTaskOverlayFeatures = useMemo(
    () => filterTaskOverlayFeatures(taskOverlayFeatures, filters),
    [taskOverlayFeatures, filters],
  );
  const filterOptions = useMemo(
    () => buildArcGisFilterOptions({ projects, jobs, treeFeatures }),
    [projects, jobs, treeFeatures],
  );
  const selectedProject = useMemo(
    () => [...projects, ...jobs].find((record) => [record.id, record.projectId, record.projectsId, record.jobId].includes(filters.projectId)),
    [projects, jobs, filters.projectId],
  );
  const pipelineTreeFeatures = useMemo(
    () => filters.projectId === 'all' ? treeFeatures : treeFeatures.filter((feature) => feature.projectId === filters.projectId),
    [treeFeatures, filters.projectId],
  );
  const pipelineSummary = useMemo(() => buildPipelineSummary(pipelineTreeFeatures), [pipelineTreeFeatures]);
  const selectedTree = useMemo(
    () => filteredTreeFeatures.find((feature) => treeKey(feature) === selectedTreeId)
      || filteredTreeFeatures.find((feature) => feature.treeId === treeForm.treeId)
      || filteredTreeFeatures[0],
    [filteredTreeFeatures, selectedTreeId, treeForm.treeId],
  );
  const layerPanelItems = useMemo(() => layerMetadata.map((layer) => ({
    ...layer,
    count: countLayerFeatures(layer.id, {
      treeAssets: filteredTreeFeatures,
      projectBoundary: visibleProjectBoundaries,
      finalTreeLocations: visibleFinalTreeLocations,
      holdingAreas: visibleHoldingAreas,
      workZones: visibleWorkZones,
      equipmentLocations: visibleEquipmentFeatures,
      rootPruneEvents: visibleTaskOverlayFeatures.rootPruneEvents,
      relocationWork: visibleTaskOverlayFeatures.relocationWork,
      nutrientCareTasks: visibleTaskOverlayFeatures.nutrientCareTasks,
    }),
    visible: layerVisibility[layer.id],
  })), [
    filteredTreeFeatures,
    visibleProjectBoundaries,
    visibleFinalTreeLocations,
    visibleHoldingAreas,
    visibleWorkZones,
    visibleEquipmentFeatures,
    visibleTaskOverlayFeatures,
    layerVisibility,
  ]);
  const workDueItems = useMemo(
    () => buildWorkDueItems(filteredTreeFeatures, visibleTaskOverlayFeatures),
    [filteredTreeFeatures, visibleTaskOverlayFeatures],
  );

  useEffect(() => {
    latestTreeFeaturesRef.current = treeFeatures;
  }, [treeFeatures]);

  useEffect(() => {
    setTreeForm((current) => {
      if (current.projectId || !initialProjectId) return current;
      return { ...current, projectId: initialProjectId };
    });
  }, [initialProjectId]);

  useEffect(() => {
    let cancelled = false;
    if (!mapContainerRef.current) return;

    if (!arcGisConfig.isReady) {
      setMapStatus('ArcGIS API key missing. Set VITE_ARCGIS_API_KEY in the app environment before using the live ArcGIS basemap.');
      return;
    }

    const initializeArcGisMap = async () => {
      try {
        const modules = await loadArcGisModules();
        if (cancelled || !mapContainerRef.current) return;
        modulesRef.current = modules;
        modules.esriConfig.apiKey = arcGisConfig.apiKey;

        const map = new modules.ArcGISMap({ basemap: 'arcgis/imagery' });
        const layers = createJdtFeatureLayers(modules);
        layerRefs.current = layers;
        map.addMany([
          layers.projectBoundary,
          layers.holdingAreas,
          layers.workZones,
          layers.equipmentLocations,
          layers.finalTreeLocations,
          layers.rootPruneEvents,
          layers.relocationWork,
          layers.nutrientCareTasks,
          layers.treeAssets,
        ]);

        const center = centerFromTreeFeatures(treeFeatures) || [-81.037562, 26.757913];
        const view = new modules.MapView({
          container: mapContainerRef.current,
          map,
          center,
          zoom: 16,
          popup: { dockEnabled: true, dockOptions: { position: 'top-right', breakpoint: false } },
        });
        viewRef.current = view;
        view.on('click', async (event: any) => {
          if (event?.mapPoint?.latitude !== undefined && event?.mapPoint?.longitude !== undefined) {
            setTreeForm((current) => ({
              ...current,
              latitude: Number(event.mapPoint.latitude).toFixed(6),
              longitude: Number(event.mapPoint.longitude).toFixed(6),
            }));
          }

          const response = await view.hitTest(event);
          const treeHit = response?.results?.find((result: any) => result.graphic?.layer?.id === 'treeAssets');
          if (treeHit?.graphic?.attributes) {
            setTreeForm(formFromTreeFeature(treeHit.graphic.attributes));
            setSelectedTreeId(treeKey(treeHit.graphic.attributes));
            setRightPanelTab('selectedTree');
            setSaveStatus(`Editing tree ${treeHit.graphic.attributes.treeId}.`);
          }
        });
        view.popup?.on?.('trigger-action', (event: any) => {
          const attributes = view.popup?.selectedFeature?.attributes;
          if (attributes) handleTreeAction(event.action?.id, attributes);
        });

        await view.when();
        setMapStatus('ArcGIS basemap active with JDT feature layers.');
        syncLayerVisibility(layers, layerVisibility);
        updateArcGisLayerSources(modules, layers, {
          treeFeatures: filteredTreeFeatures,
          projectBoundaryFeatures: visibleProjectBoundaries,
          finalTreeLocationFeatures: visibleFinalTreeLocations,
          holdingAreaFeatures: visibleHoldingAreas,
          workZoneFeatures: visibleWorkZones,
          equipmentFeatures: visibleEquipmentFeatures,
          rootPruneEvents: visibleTaskOverlayFeatures.rootPruneEvents,
          relocationWork: visibleTaskOverlayFeatures.relocationWork,
          nutrientCareTasks: visibleTaskOverlayFeatures.nutrientCareTasks,
          filters,
        });
      } catch (error) {
        setMapStatus(error instanceof Error ? error.message : 'Unable to load ArcGIS Maps SDK.');
      }
    };

    void initializeArcGisMap();

    return () => {
      cancelled = true;
      viewRef.current?.destroy?.();
      viewRef.current = null;
      layerRefs.current = {};
      modulesRef.current = null;
    };
  }, [arcGisConfig.apiKey, arcGisConfig.isReady]);

  useEffect(() => {
    if (!modulesRef.current || !layerRefs.current.treeAssets) return;
    updateArcGisLayerSources(modulesRef.current, layerRefs.current, {
      treeFeatures: filteredTreeFeatures,
      projectBoundaryFeatures: visibleProjectBoundaries,
      finalTreeLocationFeatures: visibleFinalTreeLocations,
      holdingAreaFeatures: visibleHoldingAreas,
      workZoneFeatures: visibleWorkZones,
      equipmentFeatures: visibleEquipmentFeatures,
      rootPruneEvents: visibleTaskOverlayFeatures.rootPruneEvents,
      relocationWork: visibleTaskOverlayFeatures.relocationWork,
      nutrientCareTasks: visibleTaskOverlayFeatures.nutrientCareTasks,
      filters,
    });
  }, [filteredTreeFeatures, visibleProjectBoundaries, visibleFinalTreeLocations, visibleHoldingAreas, visibleWorkZones, visibleEquipmentFeatures, visibleTaskOverlayFeatures, filters]);

  useEffect(() => {
    syncLayerVisibility(layerRefs.current, layerVisibility);
  }, [layerVisibility]);

  const updateFilter = (key: keyof ArcGisMapFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === 'projectId') {
      const project = [...projects, ...jobs].find((record) => [record.id, record.projectId, record.projectsId, record.jobId].includes(value));
      setTreeForm((current) => ({
        ...current,
        projectId: value === 'all' ? '' : value,
        projectName: project ? String(project.projectName || project.title || project.name || '') : current.projectName,
      }));
    }
  };

  const editFirstFilteredTree = () => {
    const feature = filteredTreeFeatures[0];
    if (!feature) {
      setSaveStatus('No filtered tree point is available to edit yet.');
      return;
    }
    setTreeForm(formFromTreeFeature(feature));
    setSelectedTreeId(treeKey(feature));
    setRightPanelTab('selectedTree');
    setSaveStatus(`Editing tree ${feature.treeId}.`);
  };

  const selectTreeForEditing = (feature?: ArcGisTreeAssetFeature) => {
    if (!feature) return;
    setTreeForm(formFromTreeFeature(feature));
    setSelectedTreeId(treeKey(feature));
    setRightPanelTab('selectedTree');
    setSaveStatus(`Editing tree ${feature.treeId}.`);
  };

  const handleTreeAction = (actionId: string, feature = selectedTree) => {
    if (!feature) return;
    selectTreeForEditing(feature);
    if (actionId === 'mark-ready') {
      setTreeForm((current) => ({ ...current, status: 'Ready for Relocation' }));
      setSaveStatus(`Marked ${feature.treeTag || feature.treeId} ready for relocation. Save to apply.`);
      return;
    }
    if (actionId === 'mark-holding') {
      setTreeForm((current) => ({ ...current, status: 'Moved to Holding Area' }));
      setSaveStatus(`Marked ${feature.treeTag || feature.treeId} moved to holding. Save to apply.`);
      return;
    }
    if (actionId === 'mark-relocated') {
      setTreeForm((current) => ({ ...current, status: 'Relocated' }));
      setSaveStatus(`Marked ${feature.treeTag || feature.treeId} relocated. Save to apply.`);
      return;
    }
    const actionLabel = treeActionLabel(actionId);
    setSaveStatus(`${actionLabel} selected for ${feature.treeTag || feature.treeId}. Use the connected task workflow to finish the assignment.`);
  };

  const toggleLayerVisibility = (id: ArcGisClientLayerId) => {
    setLayerVisibility((current) => ({ ...current, [id]: !current[id] }));
  };

  const saveTreePoint = async () => {
    const latitude = Number(treeForm.latitude);
    const longitude = Number(treeForm.longitude);
    if (!treeForm.treeId.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSaveStatus('Tree ID, latitude, and longitude are required before saving an ArcGIS tree point.');
      return;
    }

    const hostedLayerUrl = normalizeArcGisFeatureLayerUrl(treeForm.arcGisLayerUrl || arcGisConfig.layerUrls.JDT_Tree_Assets || '');
    const editedFeature: Partial<ArcGisTreeAssetFeature> = {
      treeId: treeForm.treeId,
      projectId: treeForm.projectId,
      projectName: treeForm.projectName,
      treeType: treeForm.species,
      species: treeForm.species,
      dbh: treeForm.dbh,
      status: treeForm.status,
      rootPruneDate: treeForm.rootPruneDate,
      finalMoveDate: treeForm.finalMoveDate,
      crew: treeForm.crew,
      notes: treeForm.notes,
      latitude,
      longitude,
      arcGisFeatureId: treeForm.arcGisFeatureId,
      arcGisLayerUrl: hostedLayerUrl,
      mapGeometryStatus: treeForm.arcGisFeatureId ? 'Synced' : 'Ready for ArcGIS Sync',
      lastMapSyncAt: treeForm.lastMapSyncAt,
    };

    let record = treeFeatureToTreeRecord(editedFeature, selectedProject);
    if (hostedLayerUrl && getAuthToken) {
      try {
        const synced = await syncHostedTreeAssetFeature(hostedLayerUrl, editedFeature, getAuthToken);
        record = applyArcGisSyncReference(record as Record<string, unknown>, {
          featureId: synced.featureId,
          layerUrl: hostedLayerUrl,
          geometryStatus: 'Synced',
          syncedAt: synced.syncedAt,
        }) as TreeRelocationRecord;
      } catch (error) {
        record = applyArcGisSyncReference(record as Record<string, unknown>, {
          layerUrl: hostedLayerUrl,
          geometryStatus: 'ArcGIS Sync Error',
          syncedAt: new Date().toISOString(),
        }) as TreeRelocationRecord;
        const message = error instanceof Error ? error.message : 'ArcGIS hosted layer sync failed.';
        setSaveStatus(`JDT tree point saved locally, but ArcGIS sync failed: ${message}`);
      }
    } else if (hostedLayerUrl) {
      record = applyArcGisSyncReference(record as Record<string, unknown>, {
        layerUrl: hostedLayerUrl,
        geometryStatus: 'Ready for ArcGIS Sync',
      }) as TreeRelocationRecord;
    }

    await onSaveTreePoint?.(record);
    if (record.mapGeometryStatus === 'ArcGIS Sync Error') return;
    setSaveStatus(`Saved ArcGIS tree point ${record.treeId || record.id}${record.arcGisFeatureId ? ` and synced ArcGIS feature ${record.arcGisFeatureId}` : ''}.`);
  };

  return (
    <div className={`space-y-4 ${isGisMapFullscreen ? 'fixed inset-0 z-[135] overflow-hidden bg-jdt-bg p-3' : ''}`}>
      <header className="flex flex-col gap-4 border-b border-jdt-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">GIS Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-jdt-primary">ArcGIS Operations Map</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">Project tree assets, final locations, boundaries, holding areas, work zones, equipment, and task overlays in one GIS layer stack.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-xs font-black uppercase text-jdt-text shadow-sm">
            {filteredTreeFeatures.length}/{treeFeatures.length} Tree Assets Visible
          </div>
          <button
            type="button"
            onClick={() => setIsGisWorkbenchCollapsed((value) => !value)}
            title={isGisWorkbenchCollapsed ? 'Expand GIS workbench' : 'Collapse GIS workbench'}
            aria-label={isGisWorkbenchCollapsed ? 'Expand GIS workbench' : 'Collapse GIS workbench'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-jdt-border bg-white text-jdt-primary shadow-sm hover:border-jdt-olive"
          >
            {isGisWorkbenchCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsGisMapFullscreen((value) => !value)}
            title={isGisMapFullscreen ? 'Exit full screen GIS map' : 'Expand GIS map workspace'}
            aria-label={isGisMapFullscreen ? 'Exit full screen GIS map' : 'Expand GIS map workspace'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-jdt-border bg-white px-3 text-[10px] font-black uppercase text-jdt-primary shadow-sm hover:border-jdt-olive"
          >
            {isGisMapFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            Fullscreen Map
          </button>
        </div>
      </header>

      <section className="grid gap-3 lg:grid-cols-5">
        <FilterSelect label="Project" value={filters.projectId} onChange={(value) => updateFilter('projectId', value)} options={filterOptions.projects} />
        <FilterSelect label="Tree Relocation Status" value={filters.status} onChange={(value) => updateFilter('status', value)} options={filterOptions.statuses.map((value) => ({ value, label: value }))} />
        <FilterSelect label="Tree Type" value={filters.treeType} onChange={(value) => updateFilter('treeType', value)} options={filterOptions.treeTypes.map((value) => ({ value, label: value }))} />
        <FilterSelect label="DBH" value={filters.dbh} onChange={(value) => updateFilter('dbh', value)} options={filterOptions.dbhValues.map((value) => ({ value, label: value }))} />
        <FilterSelect label="Crew" value={filters.crew} onChange={(value) => updateFilter('crew', value)} options={filterOptions.crews.map((value) => ({ value, label: value }))} />
      </section>

      <PipelineSummary summary={pipelineSummary} />

      <section className={`grid gap-4 ${isGisWorkbenchCollapsed ? 'xl:grid-cols-[minmax(0,1fr)_4.5rem]' : 'xl:grid-cols-[minmax(0,1fr)_390px]'}`}>
        <div className="overflow-hidden rounded-lg border border-jdt-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jdt-border bg-jdt-panel px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-jdt-primary" />
              <span className="text-xs font-black uppercase text-jdt-primary">ArcGIS Basemap</span>
            </div>
            <p className="text-xs font-bold text-zinc-500">{mapStatus}</p>
          </div>
          <div ref={mapContainerRef} className={`relative bg-[#e7e1d2] ${isGisMapFullscreen ? 'h-[calc(100vh-17rem)] min-h-[520px]' : 'h-[calc(100vh-330px)] min-h-[640px] max-h-[calc(100vh-220px)]'}`}>
            {!arcGisConfig.isReady && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-5 text-center shadow-sm">
                  <p className="text-sm font-black uppercase text-amber-900">ArcGIS API key missing</p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-amber-800">Set <code>VITE_ARCGIS_API_KEY</code> in the app environment, then redeploy. The JDT layer schema, filters, and editor are ready now.</p>
                </div>
              </div>
            )}
          </div>
          <TreeStatusLegend />
        </div>

        <aside className={`space-y-4 xl:max-h-[calc(100vh-230px)] xl:overflow-y-auto xl:pr-1 ${isGisWorkbenchCollapsed ? 'xl:overflow-visible xl:pr-0' : ''}`}>
          {isGisWorkbenchCollapsed ? (
            <div className="sticky top-4 flex flex-col items-center gap-2 rounded-xl border border-jdt-border bg-white p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setIsGisWorkbenchCollapsed(false)}
                title="Expand GIS workbench"
                aria-label="Expand GIS workbench"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-jdt-primary text-white hover:bg-jdt-dark"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Layers className="h-5 w-5 text-jdt-primary" />
              <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-wide text-zinc-400">GIS</span>
            </div>
          ) : (
          <>
          <section className="rounded-lg border border-jdt-border bg-white shadow-sm">
            <div className="border-b border-jdt-border px-3 py-2">
              <div className="grid grid-cols-4 gap-1">
                {(['layers', 'selectedTree', 'workDue', 'gps'] as RightPanelTab[]).map((tab) => (
                  <RightPanelTabButton key={tab} tab={tab} activeTab={rightPanelTab} onClick={setRightPanelTab} />
                ))}
              </div>
            </div>
            {rightPanelTab === 'layers' && (
              <div>
                <div className="flex items-center gap-2 border-b border-jdt-border px-4 py-3">
                  <Layers className="h-4 w-4 text-jdt-primary" />
                  <h2 className="text-sm font-black uppercase text-jdt-primary">Feature Layers</h2>
                </div>
                <div className="divide-y divide-jdt-border">
                  {layerPanelItems.map((item) => (
                    <LayerToggleRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleLayerVisibility(item.id)}
                      onZoom={() => setMapStatus(`Zoom requested for ${item.hostedName}.`)}
                      onIsolate={() => {
                        setLayerVisibility((current) => Object.fromEntries(Object.keys(current).map((key) => [key, key === item.id])) as LayerVisibility);
                        setMapStatus(`Isolated ${item.hostedName}.`);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {rightPanelTab === 'selectedTree' && (
              <SelectedTreePanel tree={selectedTree} onAction={handleTreeAction} onEdit={selectTreeForEditing} />
            )}
            {rightPanelTab === 'workDue' && (
              <WorkDuePanel items={workDueItems} />
            )}
            {rightPanelTab === 'gps' && (
              <GpsPanel equipment={visibleEquipmentFeatures} />
            )}
          </section>

          <section className="rounded-lg border border-jdt-border bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-jdt-border px-4 py-3">
              <div className="flex items-center gap-2">
                <TreePine className="h-4 w-4 text-jdt-primary" />
                <h2 className="text-sm font-black uppercase text-jdt-primary">Selected Tree / Map Position</h2>
              </div>
              <button type="button" onClick={editFirstFilteredTree} className="rounded border border-jdt-border px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Edit First</button>
            </div>
            <div className="space-y-4 p-4">
              <FormSection title="Tree Details">
                <TextInput label="Tree ID" value={treeForm.treeId} onChange={(value) => setTreeForm((current) => ({ ...current, treeId: value }))} />
                <SelectInput label="Project" value={treeForm.projectId} onChange={(value) => {
                  const project = [...projects, ...jobs].find((record) => [record.id, record.projectId, record.projectsId, record.jobId].includes(value));
                  setTreeForm((current) => ({ ...current, projectId: value, projectName: String(project?.projectName || project?.title || project?.name || current.projectName || '') }));
                }} options={filterOptions.projects} />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Tree Type" value={treeForm.species} onChange={(value) => setTreeForm((current) => ({ ...current, species: value }))} />
                  <TextInput label="DBH" value={treeForm.dbh} onChange={(value) => setTreeForm((current) => ({ ...current, dbh: value }))} />
                </div>
              </FormSection>

              <FormSection title="Map Position">
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Latitude" value={treeForm.latitude} onChange={(value) => setTreeForm((current) => ({ ...current, latitude: value }))} />
                  <TextInput label="Longitude" value={treeForm.longitude} onChange={(value) => setTreeForm((current) => ({ ...current, longitude: value }))} />
                </div>
                <PinStatusLine tree={selectedTree} />
              </FormSection>

              <FormSection title="Relocation Status">
                <TextInput label="Tree Relocation Status" value={treeForm.status} onChange={(value) => setTreeForm((current) => ({ ...current, status: value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Next Root Prune Event" type="date" value={treeForm.rootPruneDate} onChange={(value) => setTreeForm((current) => ({ ...current, rootPruneDate: value }))} />
                  <TextInput label="Scheduled Move Date" type="date" value={treeForm.finalMoveDate} onChange={(value) => setTreeForm((current) => ({ ...current, finalMoveDate: value }))} />
                </div>
                <TextInput label="Task Crew / Last Assigned Crew" value={treeForm.crew} onChange={(value) => setTreeForm((current) => ({ ...current, crew: value }))} />
              </FormSection>

              <FormSection title="Task Actions">
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton label="Set Source Pin" onClick={() => handleTreeAction('set-source', selectedTree)} />
                  <ActionButton label="Set Destination" onClick={() => handleTreeAction('set-destination', selectedTree)} />
                  <ActionButton label="Create Root Prune Event" onClick={() => handleTreeAction('root-prune', selectedTree)} />
                  <ActionButton label="Create Nutrient Care" onClick={() => handleTreeAction('nutrient-care', selectedTree)} />
                  <ActionButton label="Create Move Task" onClick={() => handleTreeAction('move-task', selectedTree)} />
                  <ActionButton label="Mark Ready" onClick={() => handleTreeAction('mark-ready', selectedTree)} />
                </div>
              </FormSection>

              <FormSection title="Save / Sync">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Notes</span>
                  <textarea value={treeForm.notes} onChange={(event) => setTreeForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 min-h-[74px] w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive" />
                </label>
                <button type="button" onClick={saveTreePoint} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark">
                  <Save className="h-4 w-4" /> Save Tree Point
                </button>
                {saveStatus && <p className="rounded border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-zinc-600">{saveStatus}</p>}
              </FormSection>
            </div>
          </section>
          </>
          )}
        </aside>
      </section>

      <SelectedTreeActionDrawer tree={selectedTree} onAction={handleTreeAction} onSync={saveTreePoint} />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block rounded-lg border border-jdt-border bg-white p-3 shadow-sm">
      <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-jdt-border bg-jdt-panel px-2 py-2 text-xs font-black text-jdt-text outline-none focus:border-jdt-olive">
        <option value="all">All {label}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive">
        <option value="">Select project</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-jdt-olive" />
    </label>
  );
}

function PipelineSummary({ summary }: { summary: ReturnType<typeof buildPipelineSummary> }) {
  const items = [
    { label: 'Total Trees', value: summary.total },
    ...treeRelocationStatusOrder.map((status) => ({ label: status, value: summary.statusCounts[status] || 0 })),
    { label: 'Needs Source Pin', value: summary.needsSourcePin },
    { label: 'Needs Destination Pin', value: summary.needsDestinationPin },
  ];

  return (
    <section className="rounded-lg border border-jdt-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jdt-border px-4 py-3">
        <div>
          <h2 className="text-sm font-black uppercase text-jdt-primary">Relocation Pipeline</h2>
          <p className="mt-1 text-xs font-bold text-zinc-500">Status and pin readiness for the selected map scope.</p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2">
            <p className="text-[9px] font-black uppercase leading-tight text-zinc-400">{item.label}</p>
            <p className="mt-1 text-lg font-black text-jdt-primary">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RightPanelTabButton({ tab, activeTab, onClick }: { tab: RightPanelTab; activeTab: RightPanelTab; onClick: (tab: RightPanelTab) => void }) {
  const label = tab === 'selectedTree' ? 'Selected Tree' : tab === 'workDue' ? 'Work Due' : tab === 'gps' ? 'GPS' : 'Layers';
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={`rounded-md px-2 py-2 text-[10px] font-black uppercase ${activeTab === tab ? 'bg-jdt-primary text-white' : 'border border-jdt-border bg-jdt-panel text-jdt-primary hover:border-jdt-olive'}`}
    >
      {label}
    </button>
  );
}

function LayerToggleRow({
  item,
  onToggle,
  onZoom,
  onIsolate,
}: {
  item: { id: ArcGisClientLayerId; hostedName: string; title: string; detail: string; count: number; visible: boolean };
  onToggle: () => void;
  onZoom: () => void;
  onIsolate: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.visible}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-jdt-primary"
          aria-label={`Toggle ${item.hostedName}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-jdt-text">{item.hostedName}</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">{item.title}</p>
            </div>
            <span className="rounded bg-jdt-panel px-2 py-1 text-[10px] font-black text-jdt-primary">{item.count}</span>
          </div>
          <p className="mt-1 text-[11px] font-bold leading-snug text-zinc-500">{item.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onZoom} className="rounded border border-jdt-border px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Zoom</button>
            <button type="button" onClick={onIsolate} className="rounded border border-jdt-border px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Isolate</button>
            <span className="rounded bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-800">Sync Status: {item.visible ? 'Visible' : 'Hidden'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedTreePanel({ tree, onAction, onEdit }: { tree?: ArcGisTreeAssetFeature; onAction: (actionId: string, tree?: ArcGisTreeAssetFeature) => void; onEdit: (tree?: ArcGisTreeAssetFeature) => void }) {
  if (!tree) {
    return <EmptyPanel title="Selected Tree" detail="Select a tree marker or choose Edit First to review tree relocation details." />;
  }

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
        <p className="text-[10px] font-black uppercase text-zinc-400">Selected Tree</p>
        <h3 className="mt-1 text-lg font-black text-jdt-primary">{tree.treeType || tree.species || 'Tree'} - Tag {tree.treeTag || tree.treeId}</h3>
        <p className="mt-1 text-xs font-bold text-zinc-600">DBH: {tree.dbh || '-'} | Status: {tree.status || 'Not Started'}</p>
      </div>
      <InfoGrid rows={[
        ['Current Field Location', tree.currentFieldLocation || '-'],
        ['Source Pin', hasPin(tree.existingSourcePin) ? tree.existingSourcePin : 'Needs Source Pin'],
        ['Destination Pin', hasPin(tree.destinationPin) ? tree.destinationPin : 'Needs Destination Pin'],
        ['Final Outcome', tree.treeFinalOutcome || '-'],
        ['ArcGIS Feature ID', tree.arcGisFeatureId || '-'],
        ['Map Geometry Status', tree.mapGeometryStatus || '-'],
        ['Last Map Sync At', tree.lastMapSyncAt || '-'],
      ]} />
      <div className="grid grid-cols-2 gap-2">
        <ActionButton label="Open Tree Record" onClick={() => onEdit(tree)} />
        <ActionButton label="Set Source Pin" onClick={() => onAction('set-source', tree)} />
        <ActionButton label="Set Destination" onClick={() => onAction('set-destination', tree)} />
        <ActionButton label="Create Root Prune Event" onClick={() => onAction('root-prune', tree)} />
        <ActionButton label="Create Nutrient Care Task" onClick={() => onAction('nutrient-care', tree)} />
        <ActionButton label="Create Move Task" onClick={() => onAction('move-task', tree)} />
        <ActionButton label="Mark Ready for Relocation" onClick={() => onAction('mark-ready', tree)} />
        <ActionButton label="Mark Relocated" onClick={() => onAction('mark-relocated', tree)} />
      </div>
    </div>
  );
}

function WorkDuePanel({ items }: { items: Array<{ title: string; detail: string; status: string }> }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-black uppercase text-jdt-primary">Work Due</h2>
      {items.length ? items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-lg border border-jdt-border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-jdt-text">{item.title}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">{item.detail}</p>
            </div>
            <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{item.status}</span>
          </div>
        </div>
      )) : <EmptyPanel title="No work due" detail="No root prune, nutrient care, relocation, or missing destination-pin items match this map scope." />}
    </div>
  );
}

function GpsPanel({ equipment }: { equipment: ArcGisEquipmentFeature[] }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-black uppercase text-jdt-primary">GPS</h2>
      {equipment.length ? equipment.map((asset) => (
        <div key={asset.equipmentId || asset.objectId} className="rounded-lg border border-jdt-border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-jdt-text">{asset.equipmentName}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">{asset.category} | {asset.status || 'Status unknown'}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">Assigned Project: {asset.assignedProjectName || '-'}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">Driver / Operator: {asset.crew || '-'}</p>
            </div>
            <span className="rounded bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary">GPS</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton label="Zoom" onClick={() => undefined} />
            <ActionButton label="Isolate" onClick={() => undefined} />
          </div>
        </div>
      )) : <EmptyPanel title="No GPS assets" detail="No equipment or vehicle points match this project filter." />}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-jdt-border bg-jdt-panel p-3">
      <h3 className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">{title}</h3>
      {children}
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded border border-jdt-border bg-white px-2 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive">
      {label}
    </button>
  );
}

function PinStatusLine({ tree }: { tree?: ArcGisTreeAssetFeature }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <PinBadge label="Source pinned" active={hasPin(tree?.existingSourcePin)} />
      <PinBadge label="Destination pinned" active={hasPin(tree?.destinationPin)} />
    </div>
  );
}

function PinBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${active ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
      {label}: {active ? 'Yes' : 'No'}
    </span>
  );
}

function TreeStatusLegend() {
  return (
    <div className="border-t border-jdt-border bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Tree Status Legend</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {treeRelocationStatusOrder.map((status) => (
          <span key={status} className="inline-flex items-center gap-1 rounded-full border border-jdt-border bg-jdt-panel px-2 py-1 text-[10px] font-black text-jdt-text">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusLegendColor(status) }} />
            {status}
          </span>
        ))}
        {['Needs Source Pin', 'Needs Destination Pin', 'Blocked', 'High Risk', 'Care Follow-Up Due'].map((label) => (
          <span key={label} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">{label}</span>
        ))}
      </div>
    </div>
  );
}

function SelectedTreeActionDrawer({ tree, onAction, onSync }: { tree?: ArcGisTreeAssetFeature; onAction: (actionId: string, tree?: ArcGisTreeAssetFeature) => void; onSync: () => void }) {
  if (!tree) return null;
  return (
    <section className="sticky bottom-3 z-10 rounded-lg border border-jdt-border bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">Selected Tree Quick Actions</p>
          <h2 className="text-sm font-black text-jdt-primary">{tree.treeType || tree.species || 'Tree'} - Tag {tree.treeTag || tree.treeId}</h2>
          <p className="text-xs font-bold text-zinc-500">DBH {tree.dbh || '-'} | {tree.status || 'Not Started'} | Destination: {hasPin(tree.destinationPin) ? 'Pinned' : 'Needs Destination Pin'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Set Source Pin" onClick={() => onAction('set-source', tree)} />
          <ActionButton label="Set Destination" onClick={() => onAction('set-destination', tree)} />
          <ActionButton label="Create Root Prune Event" onClick={() => onAction('root-prune', tree)} />
          <ActionButton label="Create Nutrient Care" onClick={() => onAction('nutrient-care', tree)} />
          <ActionButton label="Create Move Task" onClick={() => onAction('move-task', tree)} />
          <ActionButton label="Sync Selected Tree" onClick={onSync} />
        </div>
      </div>
    </section>
  );
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-jdt-border bg-jdt-panel p-4 text-center">
      <p className="text-xs font-black uppercase text-jdt-primary">{title}</p>
      <p className="mt-1 text-[11px] font-bold text-zinc-500">{detail}</p>
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="divide-y divide-jdt-border overflow-hidden rounded-lg border border-jdt-border">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[145px_minmax(0,1fr)] bg-white text-[11px]">
          <span className="bg-jdt-panel px-2 py-2 font-black uppercase text-zinc-400">{label}</span>
          <span className="px-2 py-2 font-bold text-jdt-text">{value || '-'}</span>
        </div>
      ))}
    </div>
  );
}

function buildPipelineSummary(features: ArcGisTreeAssetFeature[]) {
  const statusCounts = Object.fromEntries(treeRelocationStatusOrder.map((status) => [status, 0])) as Record<typeof treeRelocationStatusOrder[number], number>;
  let needsSourcePin = 0;
  let needsDestinationPin = 0;

  features.forEach((feature) => {
    const status = treeRelocationStatusOrder.includes(feature.status as typeof treeRelocationStatusOrder[number])
      ? feature.status as typeof treeRelocationStatusOrder[number]
      : 'Not Started';
    statusCounts[status] += 1;
    if (!hasPin(feature.existingSourcePin)) needsSourcePin += 1;
    if (!hasPin(feature.destinationPin)) needsDestinationPin += 1;
  });

  return {
    total: features.length,
    statusCounts,
    needsSourcePin,
    needsDestinationPin,
  };
}

function buildWorkDueItems(
  trees: ArcGisTreeAssetFeature[],
  tasks: { rootPruneEvents: ArcGisTaskFeature[]; relocationWork: ArcGisTaskFeature[]; nutrientCareTasks: ArcGisTaskFeature[] },
) {
  const taskItems = [
    ...tasks.rootPruneEvents.map((task) => ({
      title: `Root prune: ${task.treeTag || task.treeAssetId || task.taskId}`,
      detail: `${task.crew || 'Crew unassigned'} | ${task.scheduledDate || 'No date'} | ${task.taskType || 'Root pruning'}`,
      status: task.status || 'Scheduled',
    })),
    ...tasks.nutrientCareTasks.map((task) => ({
      title: `Nutrient care: ${task.treeTag || task.treeAssetId || task.taskId}`,
      detail: `${task.crew || 'Crew unassigned'} | ${task.scheduledDate || 'No date'} | ${task.taskType || 'Nutrient care'}`,
      status: task.status || 'Scheduled',
    })),
    ...tasks.relocationWork.map((task) => ({
      title: `Relocation work: ${task.treeTag || task.treeAssetId || task.taskId}`,
      detail: `${task.crew || 'Crew unassigned'} | ${task.scheduledDate || 'No date'} | ${task.taskType || 'Relocation work'}`,
      status: task.status || 'Scheduled',
    })),
  ];
  const missingDestinationItems = trees
    .filter((tree) => !hasPin(tree.destinationPin))
    .map((tree) => ({
      title: `Missing destination pin: ${tree.treeTag || tree.treeId}`,
      detail: `${tree.treeType || tree.species || 'Tree'} | DBH ${tree.dbh || '-'} | ${tree.projectName || 'Project not named'}`,
      status: 'Needs Destination Pin',
    }));
  return [...missingDestinationItems, ...taskItems];
}

function countLayerFeatures(id: ArcGisClientLayerId, data: Record<ArcGisClientLayerId, unknown[]>) {
  return data[id]?.length || 0;
}

function defaultLayerVisibility(): LayerVisibility {
  return Object.fromEntries(layerMetadata.map((layer) => [layer.id, true])) as LayerVisibility;
}

function syncLayerVisibility(layers: LayerRefs, visibility: LayerVisibility) {
  Object.entries(visibility).forEach(([id, visible]) => {
    if (layers[id as ArcGisClientLayerId]) {
      layers[id as ArcGisClientLayerId].visible = visible;
    }
  });
}

function treeKey(feature: Partial<ArcGisTreeAssetFeature>) {
  return String(feature.treeAssetId || feature.treeId || feature.objectId || '').trim();
}

function hasPin(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  return Boolean(text && text !== '-' && !text.includes('not pinned') && !text.includes('needs source') && !text.includes('needs destination'));
}

function treeActionLabel(actionId: string) {
  const labels: Record<string, string> = {
    'open-tree': 'Open Tree Record',
    'open-tree-record': 'Open Tree Record',
    'set-source': 'Set Source Pin',
    'set-destination': 'Set Destination',
    'root-prune': 'Create Root Prune Event',
    'nutrient-care': 'Create Nutrient Care Task',
    'move-task': 'Create Move Task',
    'mark-ready': 'Mark Ready for Relocation',
    'mark-holding': 'Mark Moved to Holding Area',
    'mark-relocated': 'Mark Relocated',
  };
  return labels[actionId] || 'Tree action';
}

function statusLegendColor(status: string) {
  const colors: Record<string, string> = {
    'Not Started': '#BD2B2A',
    '25% Cut': '#DB772D',
    '50% Cut': '#E8BB2A',
    '75% Cut': '#8BB043',
    '100% Cut': '#469146',
    'Ready for Relocation': '#2D8054',
    'Moved to Holding Area': '#3074B7',
    Relocated: '#197046',
  };
  return colors[status] || '#485734';
}

function createJdtFeatureLayers(modules: ArcGisModules): Required<LayerRefs> {
  const treeFields = fieldInfosForSchema('treeAssets');
  return {
    projectBoundary: new modules.FeatureLayer({
      id: 'projectBoundary',
      title: 'Project Boundary',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'polygon',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('projectBoundary'),
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          color: [55, 69, 33, 0.12],
          outline: { color: [55, 69, 33, 0.85], width: 2 },
        },
      },
      popupTemplate: genericPopupTemplate('Project Boundary', fieldInfosForSchema('projectBoundary')),
    }),
    holdingAreas: new modules.FeatureLayer({
      id: 'holdingAreas',
      title: 'Holding Area',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'polygon',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('holdingAreas'),
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          color: [226, 154, 73, 0.22],
          outline: { color: [164, 78, 16, 0.9], width: 2 },
        },
      },
      popupTemplate: genericPopupTemplate('Holding Area', fieldInfosForSchema('holdingAreas')),
    }),
    workZones: new modules.FeatureLayer({
      id: 'workZones',
      title: 'Work Zones',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'polygon',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('workZones'),
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-fill',
          color: [104, 89, 166, 0.16],
          outline: { color: [104, 89, 166, 0.9], width: 2 },
        },
      },
      popupTemplate: genericPopupTemplate('Work Zone', fieldInfosForSchema('workZones')),
    }),
    equipmentLocations: new modules.FeatureLayer({
      id: 'equipmentLocations',
      title: 'Equipment Location',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('equipmentLocations'),
      renderer: {
        type: 'simple',
        symbol: markerSymbol([113, 89, 166, 0.95], 'square', 11),
      },
      popupTemplate: genericPopupTemplate('Equipment Location', fieldInfosForSchema('equipmentLocations')),
    }),
    finalTreeLocations: new modules.FeatureLayer({
      id: 'finalTreeLocations',
      title: 'Final Tree Locations',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('finalTreeLocations'),
      renderer: {
        type: 'simple',
        symbol: markerSymbol([32, 120, 150, 0.95], 'diamond', 10),
      },
      popupTemplate: genericPopupTemplate('Final Tree Location', fieldInfosForSchema('finalTreeLocations')),
    }),
    rootPruneEvents: new modules.FeatureLayer({
      id: 'rootPruneEvents',
      title: 'Root Prune Events',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('rootPruneEvents'),
      renderer: { type: 'simple', symbol: markerSymbol([232, 187, 42, 0.95], 'triangle', 9) },
      popupTemplate: genericPopupTemplate('Root Prune Event', fieldInfosForSchema('rootPruneEvents')),
    }),
    relocationWork: new modules.FeatureLayer({
      id: 'relocationWork',
      title: 'Relocation Work',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('relocationWork'),
      renderer: { type: 'simple', symbol: markerSymbol([48, 116, 183, 0.95], 'circle', 9) },
      popupTemplate: genericPopupTemplate('Relocation Work', fieldInfosForSchema('relocationWork')),
    }),
    nutrientCareTasks: new modules.FeatureLayer({
      id: 'nutrientCareTasks',
      title: 'Nutrient Care Tasks',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: fieldInfosForSchema('nutrientCareTasks'),
      renderer: { type: 'simple', symbol: markerSymbol([103, 166, 72, 0.95], 'circle', 8) },
      popupTemplate: genericPopupTemplate('Nutrient Care Task', fieldInfosForSchema('nutrientCareTasks')),
    }),
    treeAssets: new modules.FeatureLayer({
      id: 'treeAssets',
      title: 'Tree Assets',
      source: [],
      objectIdField: 'objectId',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      fields: treeFields,
      renderer: treeStatusRenderer(),
      popupTemplate: jdtTreePopupTemplate(),
    }),
  };
}

function updateArcGisLayerSources(
  modules: ArcGisModules,
  layers: LayerRefs,
  data: {
    treeFeatures: ArcGisTreeAssetFeature[];
    projectBoundaryFeatures: ArcGisPolygonFeature[];
    finalTreeLocationFeatures: ArcGisFinalTreeLocationFeature[];
    holdingAreaFeatures: ArcGisPolygonFeature[];
    workZoneFeatures: ArcGisPolygonFeature[];
    equipmentFeatures: ArcGisEquipmentFeature[];
    rootPruneEvents: ArcGisTaskFeature[];
    relocationWork: ArcGisTaskFeature[];
    nutrientCareTasks: ArcGisTaskFeature[];
    filters: ArcGisMapFilters;
  },
) {
  replaceLayerSource(layers.treeAssets, data.treeFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'point', longitude: feature.longitude, latitude: feature.latitude },
    attributes: feature,
  })));
  replaceLayerSource(layers.projectBoundary, data.projectBoundaryFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'polygon', rings: feature.rings, spatialReference: { wkid: 4326 } },
    attributes: withoutGeometry(feature),
  })));
  replaceLayerSource(layers.finalTreeLocations, data.finalTreeLocationFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'point', longitude: feature.longitude, latitude: feature.latitude },
    attributes: feature,
  })));
  replaceLayerSource(layers.holdingAreas, data.holdingAreaFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'polygon', rings: feature.rings, spatialReference: { wkid: 4326 } },
    attributes: withoutGeometry(feature),
  })));
  replaceLayerSource(layers.workZones, data.workZoneFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'polygon', rings: feature.rings, spatialReference: { wkid: 4326 } },
    attributes: withoutGeometry(feature),
  })));
  replaceLayerSource(layers.equipmentLocations, data.equipmentFeatures.map((feature) => new modules.Graphic({
    geometry: { type: 'point', longitude: feature.longitude, latitude: feature.latitude },
    attributes: feature,
  })));
  replaceLayerSource(layers.rootPruneEvents, data.rootPruneEvents.map((feature) => taskGraphic(modules, feature)));
  replaceLayerSource(layers.relocationWork, data.relocationWork.map((feature) => taskGraphic(modules, feature)));
  replaceLayerSource(layers.nutrientCareTasks, data.nutrientCareTasks.map((feature) => taskGraphic(modules, feature)));
  if (layers.treeAssets) layers.treeAssets.definitionExpression = buildTreeDefinitionExpression(data.filters);
  const projectExpression = buildProjectDefinitionExpression(data.filters.projectId);
  if (layers.projectBoundary) layers.projectBoundary.definitionExpression = projectExpression;
  if (layers.finalTreeLocations) layers.finalTreeLocations.definitionExpression = projectExpression;
  if (layers.holdingAreas) layers.holdingAreas.definitionExpression = projectExpression;
  if (layers.workZones) layers.workZones.definitionExpression = projectExpression;
  if (layers.equipmentLocations) layers.equipmentLocations.definitionExpression = projectExpression;
  if (layers.rootPruneEvents) layers.rootPruneEvents.definitionExpression = projectExpression;
  if (layers.relocationWork) layers.relocationWork.definitionExpression = projectExpression;
  if (layers.nutrientCareTasks) layers.nutrientCareTasks.definitionExpression = projectExpression;
}

function replaceLayerSource(layer: any, graphics: any[]) {
  if (!layer?.source) return;
  if (layer.loaded && typeof layer.applyEdits === 'function') {
    const currentGraphics = typeof layer.source.toArray === 'function'
      ? layer.source.toArray()
      : Array.isArray(layer.source.items)
        ? layer.source.items
        : [];

    void layer.applyEdits({
      deleteFeatures: currentGraphics,
      addFeatures: graphics,
    }).catch(() => undefined);
    return;
  }

  layer.source.removeAll();
  layer.source.addMany(graphics);
}

function taskGraphic(modules: ArcGisModules, feature: ArcGisTaskFeature) {
  return new modules.Graphic({
    geometry: { type: 'point', longitude: feature.longitude, latitude: feature.latitude },
    attributes: feature,
  });
}

async function syncHostedTreeAssetFeature(
  layerUrl: string,
  feature: Partial<ArcGisTreeAssetFeature>,
  getAuthToken: () => Promise<string>,
): Promise<{ featureId: string; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  const edit = buildArcGisTreeAssetHostedEdit({
    ...feature,
    mapGeometryStatus: 'Synced',
    lastMapSyncAt: syncedAt,
  });
  const idToken = await getAuthToken();
  const response = await fetch('/api/integrations/arcgis/tree-assets/apply-edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      layerUrl,
      edit,
      arcGisFeatureId: feature.arcGisFeatureId,
    }),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.toLowerCase().includes('json')
    ? await response.json().catch(() => ({}))
    : {};
  if (!response.ok || !payload.ok) {
    throw new Error(arcGisHostedSyncResponseMessage({
      ok: response.ok,
      status: response.status,
      contentType,
      payload,
    }));
  }
  const featureId = String(payload.featureId || '');
  if (!featureId) throw new Error('ArcGIS did not return a feature ID for the tree asset edit.');
  return { featureId, syncedAt: String(payload.syncedAt || syncedAt) };
}

export function arcGisHostedSyncResponseMessage({
  ok,
  status,
  contentType,
  payload,
}: {
  ok: boolean;
  status?: number;
  contentType?: string;
  payload?: Record<string, unknown>;
}) {
  const serverMessage = String(payload?.error || payload?.message || '').trim();
  if (serverMessage) return serverMessage;

  const statusLabel = status ? ` (HTTP ${status})` : '';
  if (!ok && /text\/html/i.test(String(contentType || ''))) {
    return `ArcGIS sync API route is not available from this app server${statusLabel}. Use the deployed Cloud Run app with the ArcGIS API endpoint, or deploy the latest server before syncing hosted layers.`;
  }
  if (status === 404) {
    return 'ArcGIS sync API route is not available. Deploy the latest Cloud Run server before syncing hosted layers.';
  }
  return `ArcGIS hosted layer sync failed${statusLabel}.`;
}

function markerSymbol(color: number[], style = 'circle', size = 10) {
  return {
    type: 'simple-marker',
    style,
    color,
    size,
    outline: { color: [255, 255, 255, 1], width: 1.5 },
  };
}

function treeStatusRenderer() {
  const symbol = (value: string, color: number[]) => ({
    value,
    symbol: markerSymbol(color, 'circle', 10),
    label: value,
  });

  return {
    type: 'unique-value',
    field: 'status',
    defaultSymbol: markerSymbol([72, 87, 52, 0.9], 'circle', 10),
    uniqueValueInfos: [
      symbol('Not Started', [189, 43, 42, 0.95]),
      symbol('25% Cut', [219, 119, 45, 0.95]),
      symbol('50% Cut', [232, 187, 42, 0.95]),
      symbol('75% Cut', [139, 176, 67, 0.95]),
      symbol('100% Cut', [70, 145, 70, 0.95]),
      symbol('Ready for Relocation', [45, 128, 84, 0.95]),
      symbol('Moved to Holding Area', [48, 116, 183, 0.95]),
      symbol('Relocated', [25, 112, 70, 0.95]),
    ],
  };
}

function fieldInfosForSchema(id: string) {
  return jdtArcGisLayerSchemas.find((schema) => schema.id === id)?.fields || [];
}

function jdtTreePopupTemplate() {
  return {
    title: '{treeType} - Tag {treeTag}',
    content: [
      {
        type: 'text',
        text: `
          <div class="jdt-arcgis-popup">
            <p><strong>DBH:</strong> {dbh}</p>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Current Location:</strong> {currentFieldLocation}</p>
            <p><strong>Source Pin:</strong> {existingSourcePin}</p>
            <p><strong>Destination:</strong> {destinationPin}</p>
            <p><strong>Final Outcome:</strong> {treeFinalOutcome}</p>
            <p><strong>Notes:</strong> {notes}</p>
          </div>
        `,
      },
    ],
    actions: [
      { title: 'Open Tree Record', id: 'open-tree-record', className: 'esri-icon-description' },
      { title: 'Set Source Pin', id: 'set-source', className: 'esri-icon-locate' },
      { title: 'Set Destination', id: 'set-destination', className: 'esri-icon-map-pin' },
      { title: 'Create Root Prune Event', id: 'root-prune', className: 'esri-icon-calendar' },
      { title: 'Create Nutrient Care Task', id: 'nutrient-care', className: 'esri-icon-notice-round' },
      { title: 'Create Move Task', id: 'move-task', className: 'esri-icon-directions' },
      { title: 'Mark Ready for Relocation', id: 'mark-ready', className: 'esri-icon-check-mark' },
      { title: 'Mark Moved to Holding Area', id: 'mark-holding', className: 'esri-icon-collection' },
      { title: 'Mark Relocated', id: 'mark-relocated', className: 'esri-icon-home' },
    ],
    overwriteActions: true,
    outFields: ['*'],
  };
}

function genericPopupTemplate(title: string, fields: Array<{ name: string; alias: string }>) {
  const titleField = ['equipmentName', 'name', 'treeTag', 'taskId', 'finalLocationId', 'id']
    .find((fieldName) => fields.some((field) => field.name === fieldName)) || fields[0]?.name || 'objectId';
  return {
    title: `${title}: {${titleField}}`,
    content: [{ type: 'fields', fieldInfos: fields.filter((field) => field.name !== 'objectId').map((field) => ({ fieldName: field.name, label: field.alias })) }],
    overwriteActions: false,
    outFields: ['*'],
    dockOptions: { buttonEnabled: true },
    expressionInfos: [{ name: 'layerTitle', title }],
  };
}

function withoutGeometry(feature: ArcGisPolygonFeature) {
  const { rings: _rings, ...attributes } = feature;
  return attributes;
}

function centerFromTreeFeatures(features: ArcGisTreeAssetFeature[]): [number, number] | undefined {
  if (!features.length) return undefined;
  const latitude = features.reduce((sum, feature) => sum + feature.latitude, 0) / features.length;
  const longitude = features.reduce((sum, feature) => sum + feature.longitude, 0) / features.length;
  return [longitude, latitude];
}

function filterProjectFeatures<T extends { projectId: string }>(features: T[], projectId: string): T[] {
  return projectId === 'all' ? features : features.filter((feature) => feature.projectId === projectId);
}

function filterPointFeatures<T extends { projectId: string }>(features: T[], projectId: string): T[] {
  return filterProjectFeatures(features, projectId);
}

function filterEquipmentFeatures(features: ArcGisEquipmentFeature[], projectId: string): ArcGisEquipmentFeature[] {
  return projectId === 'all' ? features : features.filter((feature) => feature.assignedProjectId === projectId || feature.currentLocation.includes(projectId) || feature.assignedProjectName === projectId);
}

function filterTaskOverlayFeatures(features: { rootPruneEvents: ArcGisTaskFeature[]; relocationWork: ArcGisTaskFeature[]; nutrientCareTasks: ArcGisTaskFeature[] }, filters: ArcGisMapFilters) {
  const filterTask = (items: ArcGisTaskFeature[]) => items.filter((feature) => (
    (filters.projectId === 'all' || feature.projectId === filters.projectId) &&
    (filters.crew === 'all' || feature.crew === filters.crew)
  ));
  return {
    rootPruneEvents: filterTask(features.rootPruneEvents),
    relocationWork: filterTask(features.relocationWork),
    nutrientCareTasks: filterTask(features.nutrientCareTasks),
  };
}

function formFromTreeFeature(feature: ArcGisTreeAssetFeature): TreePointForm {
  return {
    treeId: String(feature.treeId || ''),
    projectId: String(feature.projectId || ''),
    projectName: String(feature.projectName || ''),
    species: String(feature.treeType || feature.species || ''),
    dbh: String(feature.dbh || ''),
    status: String(feature.status || ''),
    rootPruneDate: String(feature.rootPruneDate || ''),
    finalMoveDate: String(feature.finalMoveDate || ''),
    crew: String(feature.crew || ''),
    notes: String(feature.notes || ''),
    latitude: feature.latitude !== undefined ? String(feature.latitude) : '',
    longitude: feature.longitude !== undefined ? String(feature.longitude) : '',
    arcGisFeatureId: String((feature as Record<string, unknown>).arcGisFeatureId || feature.objectId || ''),
    arcGisLayerUrl: String((feature as Record<string, unknown>).arcGisLayerUrl || ''),
    lastMapSyncAt: String((feature as Record<string, unknown>).lastMapSyncAt || ''),
  };
}

function emptyTreePointForm(projectId = ''): TreePointForm {
  return {
    treeId: '',
    projectId,
    projectName: '',
    species: '',
    dbh: '',
    status: 'Not Started',
    rootPruneDate: '',
    finalMoveDate: '',
    crew: '',
    notes: '',
    latitude: '',
    longitude: '',
    arcGisFeatureId: '',
    arcGisLayerUrl: '',
    lastMapSyncAt: '',
  };
}

async function loadArcGisModules(): Promise<ArcGisModules> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('ArcGIS Maps SDK can only run in the browser.');
  }
  if (arcGisLoadPromise) return arcGisLoadPromise;
  arcGisLoadPromise = (async () => {
    ensureArcGisCss();
    await ensureArcGisScript();
    if (!window.$arcgis?.import) {
      throw new Error('ArcGIS Maps SDK import loader is not available.');
    }
    const [esriConfig, ArcGISMap, MapView, FeatureLayer, Graphic] = await window.$arcgis.import([
      '@arcgis/core/config.js',
      '@arcgis/core/Map.js',
      '@arcgis/core/views/MapView.js',
      '@arcgis/core/layers/FeatureLayer.js',
      '@arcgis/core/Graphic.js',
    ]);
    return { esriConfig, ArcGISMap, MapView, FeatureLayer, Graphic };
  })();
  return arcGisLoadPromise;
}

function ensureArcGisCss() {
  if (document.getElementById('arcgis-sdk-css')) return;
  const link = document.createElement('link');
  link.id = 'arcgis-sdk-css';
  link.rel = 'stylesheet';
  link.href = arcGisCssUrl;
  document.head.appendChild(link);
}

function ensureArcGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.$arcgis?.import) {
      resolve();
      return;
    }
    const existing = document.getElementById('arcgis-sdk-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load ArcGIS Maps SDK script.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'arcgis-sdk-js';
    script.src = arcGisSdkUrl;
    script.type = 'module';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load ArcGIS Maps SDK script.'));
    document.head.appendChild(script);
  });
}
