import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Compass,
  Crosshair,
  Download,
  Globe2,
  LocateFixed,
  MapPin,
  Route,
  Save,
  Target,
  TreePine,
  Upload,
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
import { jdtHomeBase } from '../commandCenter/equipmentFreight';

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

type MapViewMode = 'map' | 'earth';

function applyGoogleMapViewMode(map: any, maps: any, mode: MapViewMode) {
  if (!map || !maps) return;
  map.setMapTypeId(mode === 'earth' ? maps.MapTypeId.SATELLITE : maps.MapTypeId.ROADMAP);
  if (typeof map.setTilt === 'function') map.setTilt(mode === 'earth' ? 45 : 0);
  if (typeof map.setHeading === 'function') map.setHeading(0);
}

type MapsBoardProps = {
  jobs?: any[];
  loads?: any[];
  ranchOaks?: any[];
  treeRelocationRecords?: any[];
  openDrawer?: (type: string, id: string) => void;
  onUpdateTreeLocation?: (treeId: string, relocationMap: any, relocationContext?: any) => void;
  onImportTreePins?: (records: any[]) => boolean | void | Promise<boolean | void>;
  initialKmlImportOpen?: boolean;
};

type SelectedPin = {
  treeId: string;
  pointType: TreeRelocationPointType;
};

export default function MapsBoard({
  jobs = [],
  ranchOaks,
  treeRelocationRecords = [],
  onUpdateTreeLocation,
  onImportTreePins,
  openDrawer,
  initialKmlImportOpen = false,
}: MapsBoardProps) {
  const { user } = useAuth();
  const [syncedRanchOaks, setSyncedRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user && !ranchOaks);
  const [savedLocations, setSavedLocations] = useFirestoreSyncState<any>('locations', [], !!user);
  const treeRecords = useMemo(
    () => mergeMapTreeRecords(ranchOaks ?? syncedRanchOaks ?? [], treeRelocationRecords),
    [ranchOaks, syncedRanchOaks, treeRelocationRecords],
  );
  const relocationJobOptions = useMemo(() => buildRelocationJobOptions(jobs), [jobs]);
  const [selectedJobId, setSelectedJobId] = useState('all');
  const filteredTreeRecords = useMemo(
    () => filterTreesForRelocationJob(treeRecords, selectedJobId, jobs),
    [treeRecords, selectedJobId, jobs],
  );
  const selectedJob = jobs.find(job => String(job.id || job.jobId || job.projectId) === selectedJobId);
  const mapsConfig = useMemo(() => getGoogleMapsConfig(), []);
  const [zoomLevel, setZoomLevel] = useState(17);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('earth');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(() => filteredTreeRecords[0]?.treeId ?? filteredTreeRecords[0]?.id ?? null);
  const [pinMode, setPinMode] = useState<TreeRelocationPointType | null>(null);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [fieldStatus, setFieldStatus] = useState('Select a tree, choose a pin type, then click the map.');
  const [kmlImportOpen, setKmlImportOpen] = useState(Boolean(initialKmlImportOpen));
  const [kmlImportText, setKmlImportText] = useState('');
  const [kmlImportFileName, setKmlImportFileName] = useState('');
  const [kmlImportStatus, setKmlImportStatus] = useState('');
  const googleMapRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const googleMarkerRefs = useRef<any[]>([]);
  const pinModeRef = useRef<TreeRelocationPointType | null>(pinMode);
  const selectedTreeIdRef = useRef<string | null>(selectedTreeId);

  useEffect(() => {
    pinModeRef.current = pinMode;
    selectedTreeIdRef.current = selectedTreeId;
  }, [pinMode, selectedTreeId]);

  useEffect(() => {
    const selectedStillVisible = filteredTreeRecords.some(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
    if (!selectedTreeId || !selectedStillVisible) {
      setSelectedTreeId(filteredTreeRecords[0]?.treeId ?? filteredTreeRecords[0]?.id ?? null);
      setSelectedPin(null);
      setPinMode(null);
    }
  }, [filteredTreeRecords, selectedTreeId]);

  const selectedTree = filteredTreeRecords.find(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
  const selectedTasks = selectedTree ? buildTreeRelocationTasks(selectedTree) : [];
  const allTreeTasks = filteredTreeRecords.flatMap(tree => buildTreeRelocationTasks(tree).map(task => ({ ...task, tree })));
  const readyTasks = allTreeTasks.filter(task => task.status === 'Ready').slice(0, 7);
  const earthMapPackage = useMemo(() => buildProjectGoogleEarthMapPackage({
    job: selectedJob,
    name: selectedJob ? undefined : 'All Relocation Jobs',
    trees: filteredTreeRecords,
    fallbackCenter: defaultFieldCenter,
  }), [selectedJob, filteredTreeRecords]);
  const selectedPinPoint = selectedPin
    ? selectedTree?.relocationMap?.[selectedPin.pointType]
    : undefined;
  const scopedSavedLocations = useMemo(
    () => filterSavedSiteLocationsForJob(savedLocations, selectedJob),
    [savedLocations, selectedJob],
  );
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
            if (!event.latLng || !pinModeRef.current || !selectedTreeIdRef.current) return;
            markTreePoint(selectedTreeIdRef.current, pinModeRef.current, {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
              label: pinModeRef.current === 'source' ? 'Field source pin' : 'Relocation destination pin',
            });
          });
        }

        googleMapInstanceRef.current.setZoom(zoomLevel);
        applyGoogleMapViewMode(googleMapInstanceRef.current, maps, mapViewMode);
        renderGoogleTreeMarkers(maps);
      } catch (error) {
        setFieldStatus(error instanceof Error ? error.message : 'Unable to load Google Maps.');
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [mapsConfig.isReady, mapsConfig.apiKey, mapsConfig.mapId, filteredTreeRecords, scopedSavedLocations, selectedTreeId, zoomLevel, mapViewMode]);

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

    filteredTreeRecords.forEach(tree => {
      const status = getTreeRelocationStatus(tree);
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const marker = new maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          map,
          title: `${tree.treeId || tree.id} ${pointType}`,
          label: pointType === 'source' ? 'S' : 'D',
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

    scopedSavedLocations.forEach((location) => {
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

  const handleFallbackMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedTree || !pinMode) {
      setFieldStatus('Select a tree and choose Source or Destination before marking the map.');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
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

    const record = buildSavedSiteLocationRecord({
      label,
      accessType: siteLocationForm.accessType,
      sourceText,
      job: selectedJob,
      divisionUse: siteLocationForm.divisionUse,
      savedBy: user?.email || 'Command Center',
    });

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
    setFieldStatus(`Saved ${record.name} as ${record.locationType}${selectedJob ? ` for ${selectedJob.title || selectedJob.projectName || 'this project'}` : ''}.`);
  };

  const focusSavedLocation = (location: any) => {
    const point = pointFromSavedSiteLocation(location);
    if (point && googleMapInstanceRef.current) {
      setMapViewMode('earth');
      googleMapInstanceRef.current.setCenter({ lat: point.lat, lng: point.lng });
      googleMapInstanceRef.current.setZoom(Math.max(zoomLevel, 18));
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
      map.setZoom(Math.max(zoomLevel, 19));
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
        map.setZoom(Math.max(zoomLevel, 19));
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

  const downloadProjectKml = () => {
    if (!earthMapPackage.pinnedTreeCount) {
      setFieldStatus('Add at least one source or destination pin before exporting this project to Google Earth.');
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
    setFieldStatus('Switched to in-app Earth View. Tree and project pins stay inside JDT Command Center.');
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
      setKmlImportStatus('KMZ files need to be exported as KML for this first import path. Upload the .kml export from Google Earth.');
      return;
    }

    try {
      const text = await file.text();
      const points = parseKmlTreePlacemarks(text);
      setKmlImportText(text);
      setKmlImportStatus(`Loaded ${file.name}. Preview found ${points.length} named tree point${points.length === 1 ? '' : 's'}.`);
    } catch {
      setKmlImportStatus('Unable to read that KML file. Try exporting the Google Earth project again as KML.');
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
    return filteredTreeRecords.flatMap(tree => {
      const pins: React.ReactNode[] = [];
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const percent = latLngToMapPercent(point);
        const isSelected = selectedTreeId === tree.treeId || selectedTreeId === tree.id;
        pins.push(
          <button
            key={`${tree.treeId || tree.id}-${pointType}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectExistingPin(tree, pointType);
            }}
            className={`absolute h-8 w-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-4 transition-all hover:scale-110 z-10 ${pointType === 'source' ? 'bg-emerald-700 ring-emerald-200' : 'bg-blue-700 ring-blue-200'} ${isSelected ? 'scale-110 ring-amber-300' : ''}`}
            style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
            title={`${tree.treeId || tree.id} ${pointType}`}
          >
            {pointType === 'source' ? <TreePine className="h-4 w-4 text-white" /> : <Target className="h-4 w-4 text-white" />}
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

  const activeTreeCard = (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">Active Tree</p>
          <h3 className="text-xl font-black text-jdt-text">{selectedTree?.treeId || 'Select a tree'}</h3>
          <p className="text-xs font-bold text-zinc-500 mt-1">{mapInstruction}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => beginPinEdit('source')} className={`px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 ${pinMode === 'source' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
            <TreePine className="h-4 w-4" /> Source Pin
          </button>
          <button onClick={() => beginPinEdit('destination')} className={`px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 ${pinMode === 'destination' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            <Target className="h-4 w-4" /> Destination Pin
          </button>
          <button onClick={useDeviceLocation} className="px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 bg-jdt-primary text-white">
            <LocateFixed className="h-4 w-4" /> Use Phone GPS
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-jdt-border bg-jdt-sand/40 px-3 py-2 text-xs font-bold text-zinc-600 flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-jdt-primary" />
        {fieldStatus}
      </div>
    </div>
  );

  const googleEarthCard = (
    <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-jdt-border bg-white">
            <Globe2 className="h-5 w-5 text-jdt-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400">Map Backup / Earth Export</p>
            <h3 className="text-sm font-black text-jdt-text">{earthMapPackage.documentName}</h3>
            <p className="mt-1 text-[11px] font-bold text-zinc-500">
              Manual pins are the active project record. {earthMapPackage.pinnedTreeCount} trees, {earthMapPackage.placemarkCount} pins, and {earthMapPackage.pathCount} move paths are available for backup export.
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
            <Upload className="h-4 w-4" /> Client KML/KMZ Import
          </button>
          <button
            type="button"
            onClick={openGoogleEarthProjectView}
            className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive flex items-center gap-2"
          >
            <Globe2 className="h-4 w-4" /> Earth View
          </button>
        </div>
      </div>
      <p className="mt-3 rounded-lg border border-jdt-border bg-white px-3 py-2 text-[11px] font-bold text-zinc-500">
        Use map click, pasted coordinates, or phone GPS to build project pins. KML is for backup, sharing, or importing client files that already have tree positions marked.
      </p>
    </div>
  );

  const kmlImportPanel = kmlImportOpen ? (
    <div id="kml-import-panel" className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400">Client KML/KMZ Import</p>
          <h3 className="text-lg font-black text-jdt-text">Import Marked Tree Positions</h3>
          <p className="mt-1 text-xs font-bold text-zinc-500">
            Use this for Google Earth files that already have tree placemarks labeled. KML is read directly; for KMZ, export the project as KML first.
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
            placeholder="Paste exported Google Earth KML here"
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Field Maps & Tree Relocation</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Pin source trees, destination locations, GPS field marks, and relocation tasks</p>
        </div>
        <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg p-1 shadow-sm">
          <button onClick={() => setZoomLevel(z => Math.max(9, z - 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs font-black uppercase text-zinc-700 px-3">ZOOM: {zoomLevel}</span>
          <button onClick={() => setZoomLevel(z => Math.min(21, z + 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5">Relocation Job Map</span>
                <select
                  value={selectedJobId}
                  onChange={(event) => {
                    setSelectedJobId(event.target.value);
                    setSelectedPin(null);
                    setPinMode(null);
                    setFieldStatus(event.target.value === 'all' ? 'Showing all relocation tree pins.' : 'Map filtered to the selected relocation job.');
                  }}
                  className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-black text-jdt-text outline-none focus:border-jdt-olive"
                >
                  <option value="all">All Relocation Jobs</option>
                  {relocationJobOptions.map((job) => (
                    <option key={job.id} value={job.id}>{job.label}</option>
                  ))}
                </select>
              </label>
              {selectedJob && openDrawer && (
                <button
                  type="button"
                  onClick={() => openDrawer('job', selectedJob.id || selectedJob.jobId || selectedJob.projectId)}
                  className="rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-primary hover:border-jdt-olive"
                >
                  Open Job
                </button>
              )}
            </div>
          </div>

          <div className="relative min-h-[560px] bg-zinc-950 rounded-2xl border border-jdt-border shadow-sm overflow-hidden isolate">
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
                {renderSelectedTreeLine()}
                {renderFallbackTreePins()}
                {renderFallbackSiteLocationPins()}
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
                  Earth View
                </button>
              </div>
            </div>

            <div className="absolute top-4 right-4 bg-zinc-900/90 text-white rounded-lg p-2.5 border border-zinc-700 flex flex-col items-center gap-1 shadow-md z-20">
              <Compass className="h-6 w-6 text-zinc-300 transform rotate-12" />
              <span className="text-[8px] font-black uppercase text-zinc-400">NORTH</span>
            </div>
          </div>

          {activeTreeCard}

          {googleEarthCard}

          {kmlImportPanel}

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryTile label="Pinned Sources" value={String(filteredTreeRecords.filter(tree => tree.relocationMap?.source).length)} icon={TreePine} />
            <SummaryTile label="Pinned Destinations" value={String(filteredTreeRecords.filter(tree => tree.relocationMap?.destination).length)} icon={Target} />
            <SummaryTile label="Ready Tasks" value={String(readyTasks.length)} icon={ClipboardList} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><TreePine className="h-4 w-4 text-emerald-700" /> Tree Pin List</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredTreeRecords.length > 0 ? filteredTreeRecords.map(tree => {
                const status = getTreeRelocationStatus(tree);
                return (
                  <button
                    key={tree.id || tree.treeId}
                    type="button"
                    onClick={() => setSelectedTreeId(tree.treeId || tree.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedTreeId === tree.treeId || selectedTreeId === tree.id ? 'bg-jdt-sand border-jdt-primary' : 'bg-white border-jdt-border hover:bg-jdt-sand/60'}`}
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-black text-sm text-jdt-text">{tree.treeId}</span>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${getRelocationStatusTone(status)}`}>{status}</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-500 mt-1">{treeMapSubtitle(tree)}</p>
                  </button>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase text-jdt-text">No tree records yet</p>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">Add tree inventory to start placing relocation pins.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><MapPin className="h-4 w-4 text-amber-700" /> Saved Site Locations</h3>
            <div className="space-y-3">
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

            <div className="mt-4 border-t border-jdt-border pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase text-zinc-400">Project Pins</p>
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{scopedSavedLocations.length}</span>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {scopedSavedLocations.length > 0 ? scopedSavedLocations.map((location) => {
                  const point = pointFromSavedSiteLocation(location);
                  return (
                    <div key={location.id} className="rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-jdt-text">{location.name || location.title}</p>
                          <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{location.locationType || 'Site Location'}</p>
                        </div>
                        <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">{point ? 'Pinned' : 'Address'}</span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-zinc-500">{location.coordinateText || (point ? formatTreeCoordinate(point) : '') || location.mainAddress || location.sourceText || '-'}</p>
                      {Array.isArray(location.divisionUse) && location.divisionUse.length > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-zinc-400">{location.divisionUse.join(' / ')}</p>
                      )}
                      <div className="mt-3 flex gap-2">
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
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                    <p className="text-xs font-black uppercase text-jdt-text">No saved locations</p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-500">Save access pins for the selected project or job.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

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

          <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><ClipboardList className="h-4 w-4 text-jdt-primary" /> Selected Tree Tasks</h3>
            <div className="space-y-2">
              {selectedTasks.length > 0 ? selectedTasks.map(task => (
                <div key={task.id} className="rounded-lg border border-jdt-border bg-white p-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-black text-jdt-text">{task.label}</span>
                    <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${getTaskStatusTone(task.status)}`}>{task.status}</span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-zinc-400 mt-1">Assign: {task.assignedRole}</p>
                  <p className="text-[11px] font-bold text-zinc-500 mt-1">{task.detail}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-center">
                  <p className="text-xs font-black uppercase text-jdt-text">No selected tree</p>
                  <p className="mt-1 text-[11px] font-bold text-zinc-500">Select or add a tree to see relocation tasks.</p>
                </div>
              )}
            </div>
          </div>
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

function mergeMapTreeRecords(baseTrees: any[] = [], relocationTrees: any[] = []) {
  const byId = new Map<string, any>();
  [...baseTrees, ...relocationTrees].forEach((tree) => {
    const id = String(tree.treeId || tree.id || '').trim();
    if (!id) return;
    byId.set(id, { ...(byId.get(id) || {}), ...tree, treeId: tree.treeId || tree.id });
  });
  return Array.from(byId.values());
}

function treeMapSubtitle(tree: any): string {
  const parts = [tree.farm, tree.zone, tree.ranchOakType || tree.type || tree.treeType].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'Project tree asset';
}
