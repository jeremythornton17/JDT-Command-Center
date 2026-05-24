import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Compass,
  Crosshair,
  Info,
  Leaf,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Target,
  TreePine,
  Truck,
  Wifi,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  buildTreeRelocationTasks,
  formatTreeCoordinate,
  getGoogleMapsConfig,
  getRelocationStatusTone,
  getTaskStatusTone,
  getTreeRelocationStatus,
  latLngToMapPercent,
  loadGoogleMaps,
  mapPercentToLatLng,
  updateTreeRelocationPoint,
  type TreeRelocationPoint,
  type TreeRelocationPointType,
} from '../treeRelocationMap';
import { useAuth } from '../AuthProvider';
import { useFirestoreSyncState } from '../useFirestoreCollection';

export type FleetPosition = {
  id: string;
  provider: 'verizon' | 'michelin' | 'manual';
  providerVehicleId: string;
  assetName: string;
  assetType: 'work_truck' | 'semi' | 'trailer' | 'equipment';
  driverName?: string;
  assignedJobId?: string;
  assignedLoadId?: string;
  lat: number;
  lng: number;
  speedMph?: number;
  heading?: number;
  ignitionStatus?: 'on' | 'off' | 'unknown';
  odometer?: number;
  engineHours?: number;
  status: 'moving' | 'stopped' | 'idle' | 'at_job' | 'at_farm' | 'delayed' | 'no_signal';
  recordedAt: string;
  receivedAt: string;
  route?: string;
  eta?: string;
  maintenanceStatus?: string;
  recentHistory?: string[];
  dispatchNotes?: string;
};

const defaultFieldCenter = { lat: 26.5, lng: -80.35 };

const mockTelemetry: FleetPosition[] = [
  {
    id: 'tlm-1', provider: 'verizon', providerVehicleId: 'V9001',
    assetName: 'Semi Truck 04 (Heavy)', assetType: 'semi', driverName: 'Unassigned', assignedLoadId: 'FRT-0522-01',
    lat: 26.48, lng: -80.34, speedMph: 65, heading: 90, ignitionStatus: 'on', status: 'moving',
    recordedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
    route: 'I-95 to Waterford Golf Club', eta: '2:30 PM', maintenanceStatus: 'OK - Next PM 14k mi',
    recentHistory: ['12:15 - Left JDT Yard', '1:00 - Passed weigh station'], dispatchNotes: 'Driver reports heavy traffic near delivery gate.'
  },
  {
    id: 'tlm-2', provider: 'verizon', providerVehicleId: 'V9022',
    assetName: 'Crew Crane Truck 2', assetType: 'work_truck', driverName: 'Unassigned', assignedJobId: 'JOB-992',
    lat: 26.56, lng: -80.39, speedMph: 0, heading: 0, ignitionStatus: 'off', status: 'at_job',
    recordedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), receivedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    route: 'On Site', maintenanceStatus: 'Needs Oil Change (Overdue)',
    recentHistory: ['6:00 - Left yard', '7:30 - Arrived at Bellaire Club'], dispatchNotes: 'Will need fuel on return trip.'
  },
  {
    id: 'tlm-3', provider: 'michelin', providerVehicleId: 'M1105',
    assetName: 'Lowboy Trailer 44', assetType: 'trailer',
    lat: 26.43, lng: -80.28, speedMph: 0, status: 'idle',
    recordedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), receivedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    maintenanceStatus: 'Tire pressure sensor fault (Axle 2)'
  },
];

const mockAlerts = [
  { id: 'al-1', type: 'geofence', message: 'Crew Crane 2 entered Bellaire Club geofence', time: '2 mins ago', severity: 'info' },
  { id: 'al-2', type: 'delay', message: 'Semi Truck 04 delayed to delivery gate', time: '25 mins ago', severity: 'warning' },
  { id: 'al-3', type: 'gps', message: 'Lowboy 44 not moving by planned departure', time: '1 hr ago', severity: 'error' },
];

type MapsBoardProps = {
  jobs: any[];
  loads: any[];
  ranchOaks?: any[];
  openDrawer: (type: string, id: string) => void;
  onUpdateTreeLocation?: (treeId: string, relocationMap: any) => void;
};

export default function MapsBoard({ jobs, loads, ranchOaks, openDrawer, onUpdateTreeLocation }: MapsBoardProps) {
  const { user } = useAuth();
  const [syncedRanchOaks, setSyncedRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user && !ranchOaks);
  const treeRecords = ranchOaks ?? syncedRanchOaks;
  const mapsConfig = useMemo(() => getGoogleMapsConfig(), []);
  const [viewMode, setViewMode] = useState<'trees' | 'fleet'>('trees');
  const [zoomLevel, setZoomLevel] = useState(17);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(() => treeRecords[0]?.treeId ?? null);
  const [pinMode, setPinMode] = useState<TreeRelocationPointType | null>(null);
  const [fieldStatus, setFieldStatus] = useState('Select a tree, choose a pin type, then click the map.');
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
    if (!selectedTreeId && treeRecords[0]?.treeId) setSelectedTreeId(treeRecords[0].treeId);
  }, [treeRecords, selectedTreeId]);

  const selectedTree = treeRecords.find(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
  const selectedTasks = selectedTree ? buildTreeRelocationTasks(selectedTree) : [];
  const allTreeTasks = treeRecords.flatMap(tree => buildTreeRelocationTasks(tree).map(task => ({ ...task, tree })));
  const readyTasks = allTreeTasks.filter(task => task.status === 'Ready').slice(0, 7);

  const telemetryNodes = mockTelemetry.map(t => {
    const percent = latLngToMapPercent({ lat: t.lat, lng: t.lng });
    return {
      id: t.id,
      title: t.assetName,
      type: 'telemetry',
      category: t.assetType,
      x: `${percent.x}%`,
      y: `${percent.y}%`,
      status: `${t.status.toUpperCase().replace('_', ' ')} ${t.speedMph ? `(${t.speedMph} mph)` : ''}`,
      data: t
    };
  });

  const mapInstruction = pinMode
    ? `Click the map to set ${pinMode === 'source' ? 'current field position' : 'relocation destination'} for ${selectedTree?.treeId ?? 'selected tree'}.`
    : 'Choose Source or Destination before marking a tree pin.';

  useEffect(() => {
    if (viewMode !== 'trees' || !mapsConfig.isReady || !googleMapRef.current) return;
    let cancelled = false;

    const initialize = async () => {
      try {
        const maps = await loadGoogleMaps(mapsConfig.apiKey);
        if (cancelled || !googleMapRef.current) return;

        if (!googleMapInstanceRef.current) {
          googleMapInstanceRef.current = new maps.Map(googleMapRef.current, {
            center: selectedTree?.relocationMap?.source ?? defaultFieldCenter,
            zoom: zoomLevel,
            mapTypeId: 'satellite',
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
        renderGoogleTreeMarkers(maps);
      } catch (error) {
        setFieldStatus(error instanceof Error ? error.message : 'Unable to load Google Maps.');
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, [viewMode, mapsConfig.isReady, mapsConfig.apiKey, mapsConfig.mapId, treeRecords, selectedTreeId, zoomLevel]);

  const renderGoogleTreeMarkers = (maps: any) => {
    const map = googleMapInstanceRef.current;
    if (!map) return;

    googleMarkerRefs.current.forEach(marker => marker.setMap?.(null));
    googleMarkerRefs.current = [];

    treeRecords.forEach(tree => {
      const status = getTreeRelocationStatus(tree);
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const marker = new maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          map,
          title: `${tree.treeId} ${pointType}`,
          label: pointType === 'source' ? 'S' : 'D',
        });
        marker.addListener('click', () => {
          setSelectedTreeId(tree.treeId);
          setFieldStatus(`${tree.treeId} ${pointType} pin selected. Status: ${status}.`);
        });
        googleMarkerRefs.current.push(marker);
      });
    });
  };

  const markTreePoint = (treeId: string, pointType: TreeRelocationPointType, point: TreeRelocationPoint) => {
    const tree = treeRecords.find(candidate => candidate.treeId === treeId || candidate.id === treeId);
    if (!tree) return;

    const nextTree = updateTreeRelocationPoint(tree, pointType, point, 'Field Team');
    if (onUpdateTreeLocation) {
      onUpdateTreeLocation(tree.treeId || tree.id, nextTree.relocationMap);
    } else {
      setSyncedRanchOaks(prev => prev.map(item => (
        item.treeId === treeId || item.id === treeId
          ? { ...item, relocationMap: nextTree.relocationMap }
          : item
      )));
    }
    setFieldStatus(`${pointType === 'source' ? 'Source' : 'Destination'} pin saved for ${tree.treeId}.`);
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
    markTreePoint(selectedTree.treeId, pinMode, {
      ...mapPercentToLatLng(x, y),
      label: pinMode === 'source' ? `${selectedTree.farm || 'Field'} ${selectedTree.zone || ''}`.trim() : 'Relocation destination',
    });
  };

  const useDeviceLocation = () => {
    if (!selectedTree || !pinMode) {
      setFieldStatus('Select a tree and choose Source or Destination before using GPS.');
      return;
    }
    if (!navigator.geolocation) {
      setFieldStatus('GPS is not available in this browser.');
      return;
    }

    setFieldStatus('Reading field GPS position...');
    navigator.geolocation.getCurrentPosition(
      position => {
        markTreePoint(selectedTree.treeId, pinMode, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          label: pinMode === 'source' ? 'GPS source pin' : 'GPS destination pin',
        });
      },
      () => setFieldStatus('Unable to read GPS. You can still click the map to place the pin.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  };

  const getPinIcon = (type: string, category: string) => {
    if (type === 'telemetry') {
      if (category === 'semi') return <Truck className="h-4 w-4 text-white drop-shadow-md" />;
      if (category === 'work_truck') return <Truck className="h-3 w-3 text-white" />;
      if (category === 'trailer') return <Wrench className="h-3 w-3 text-zinc-900" />;
      return <Navigation className="h-3 w-3 text-white" />;
    }
    return <MapPin className="h-3 w-3 text-white" />;
  };

  const getPinBg = (category: string, statusText = '') => {
    if (statusText.includes('MOVING')) return 'bg-blue-600 ring-blue-300';
    if (category === 'semi') return 'bg-blue-900 ring-blue-500';
    if (category === 'work_truck') return 'bg-purple-600 ring-purple-300';
    if (category === 'trailer') return 'bg-zinc-300 ring-zinc-500';
    return 'bg-emerald-600 ring-emerald-200';
  };

  const renderFallbackTreePins = () => {
    return treeRecords.flatMap(tree => {
      const pins: React.ReactNode[] = [];
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const percent = latLngToMapPercent(point);
        const isSelected = selectedTreeId === tree.treeId;
        pins.push(
          <button
            key={`${tree.treeId}-${pointType}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedTreeId(tree.treeId);
              setFieldStatus(`${tree.treeId} ${pointType} pin selected.`);
            }}
            className={`absolute h-8 w-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-4 transition-all hover:scale-110 z-10 ${pointType === 'source' ? 'bg-emerald-700 ring-emerald-200' : 'bg-blue-700 ring-blue-200'} ${isSelected ? 'scale-110 ring-amber-300' : ''}`}
            style={{ left: `${percent.x}%`, top: `${percent.y}%` }}
            title={`${tree.treeId} ${pointType}`}
          >
            {pointType === 'source' ? <TreePine className="h-4 w-4 text-white" /> : <Target className="h-4 w-4 text-white" />}
          </button>
        );
      });
      return pins;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Field Maps & Tree Relocation</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Pin source trees, destination locations, GPS field marks, relocation tasks, and fleet activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-jdt-panel border border-jdt-border rounded-lg p-1 shadow-sm flex">
            <button onClick={() => setViewMode('trees')} className={`px-3 py-2 text-xs font-black uppercase rounded-md flex items-center gap-2 ${viewMode === 'trees' ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:bg-jdt-sand'}`}>
              <TreePine className="h-4 w-4" /> Tree Relocation
            </button>
            <button onClick={() => setViewMode('fleet')} className={`px-3 py-2 text-xs font-black uppercase rounded-md flex items-center gap-2 ${viewMode === 'fleet' ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:bg-jdt-sand'}`}>
              <Truck className="h-4 w-4" /> Fleet
            </button>
          </div>
          <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg p-1 shadow-sm">
            <button onClick={() => setZoomLevel(z => Math.max(9, z - 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
            <span className="text-xs font-black uppercase text-zinc-700 px-3">ZOOM: {zoomLevel}</span>
            <button onClick={() => setZoomLevel(z => Math.min(21, z + 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'trees' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-400">Active Tree</p>
                  <h3 className="text-xl font-black text-jdt-text">{selectedTree?.treeId || 'Select a tree'}</h3>
                  <p className="text-xs font-bold text-zinc-500 mt-1">{mapInstruction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setPinMode('source')} className={`px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 ${pinMode === 'source' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                    <TreePine className="h-4 w-4" /> Source Pin
                  </button>
                  <button onClick={() => setPinMode('destination')} className={`px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 ${pinMode === 'destination' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                    <Target className="h-4 w-4" /> Destination Pin
                  </button>
                  <button onClick={useDeviceLocation} className="px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 bg-jdt-primary text-white">
                    <LocateFixed className="h-4 w-4" /> Use GPS
                  </button>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-jdt-border bg-jdt-sand/40 px-3 py-2 text-xs font-bold text-zinc-600 flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-jdt-primary" />
                {fieldStatus}
              </div>
            </div>

            <div className="relative min-h-[560px] bg-zinc-950 rounded-2xl border border-jdt-border shadow-sm overflow-hidden isolate">
              {mapsConfig.isReady ? (
                <>
                  <div ref={googleMapRef} className="absolute inset-0" />
                  <div className="absolute top-4 left-4 bg-white/95 border border-jdt-border rounded-lg px-3 py-2 shadow-lg text-[10px] font-black uppercase text-jdt-text z-20">
                    Google Maps API Active
                  </div>
                </>
              ) : (
                <div onClick={handleFallbackMapClick} className="absolute inset-0 cursor-crosshair">
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1400&auto=format&fit=crop"
                    alt="Satellite style field map"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
                  />
                  <div className="absolute inset-0 bg-jdt-dark/20" />
                  <div className="absolute top-4 left-4 bg-zinc-900/90 text-white rounded-lg px-3 py-2 border border-zinc-700 shadow-lg text-[10px] font-black uppercase z-20">
                    Fallback Field Map - Add VITE_GOOGLE_MAPS_API_KEY for live Google Maps
                  </div>
                  {renderSelectedTreeLine()}
                  {renderFallbackTreePins()}
                </div>
              )}

              <div className="absolute top-4 right-4 bg-zinc-900/90 text-white rounded-lg p-2.5 border border-zinc-700 flex flex-col items-center gap-1 shadow-md z-20">
                <Compass className="h-6 w-6 text-zinc-300 transform rotate-12" />
                <span className="text-[8px] font-black uppercase text-zinc-400">NORTH</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SummaryTile label="Pinned Sources" value={String(treeRecords.filter(tree => tree.relocationMap?.source).length)} icon={TreePine} />
              <SummaryTile label="Pinned Destinations" value={String(treeRecords.filter(tree => tree.relocationMap?.destination).length)} icon={Target} />
              <SummaryTile label="Ready Tasks" value={String(readyTasks.length)} icon={ClipboardList} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><TreePine className="h-4 w-4 text-emerald-700" /> Tree Pin List</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {treeRecords.map(tree => {
                  const status = getTreeRelocationStatus(tree);
                  return (
                    <button
                      key={tree.id || tree.treeId}
                      type="button"
                      onClick={() => setSelectedTreeId(tree.treeId || tree.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedTreeId === tree.treeId ? 'bg-jdt-sand border-jdt-primary' : 'bg-white border-jdt-border hover:bg-jdt-sand/60'}`}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-black text-sm text-jdt-text">{tree.treeId}</span>
                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${getRelocationStatusTone(status)}`}>{status}</span>
                      </div>
                      <p className="text-[11px] font-bold text-zinc-500 mt-1">{tree.farm || 'Farm'} - {tree.zone || 'Zone'} - {tree.ranchOakType || 'Tree'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><Route className="h-4 w-4 text-blue-700" /> Source / Destination</h3>
              <div className="space-y-3 text-xs font-bold">
                <CoordinateCard label="Current Field Position" point={selectedTree?.relocationMap?.source} tone="source" />
                <CoordinateCard label="Relocation Destination" point={selectedTree?.relocationMap?.destination} tone="destination" />
              </div>
            </div>

            <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 shadow-sm">
              <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 mb-3"><ClipboardList className="h-4 w-4 text-jdt-primary" /> Selected Tree Tasks</h3>
              <div className="space-y-2">
                {selectedTasks.map(task => (
                  <div key={task.id} className="rounded-lg border border-jdt-border bg-white p-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-black text-jdt-text">{task.label}</span>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${getTaskStatusTone(task.status)}`}>{task.status}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 mt-1">Assign: {task.assignedRole}</p>
                    <p className="text-[11px] font-bold text-zinc-500 mt-1">{task.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <FleetTelemetryView
          telemetryNodes={telemetryNodes}
          selectedPin={selectedPin}
          setSelectedPin={setSelectedPin}
          openDrawer={openDrawer}
          getPinIcon={getPinIcon}
          getPinBg={getPinBg}
        />
      )}
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

function FleetTelemetryView({ telemetryNodes, selectedPin, setSelectedPin, openDrawer, getPinIcon, getPinBg }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="relative min-h-[560px] bg-zinc-950 rounded-2xl border border-jdt-border shadow-sm overflow-hidden isolate">
        <img
          src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1400&auto=format&fit=crop"
          alt="Satellite Map Base"
          className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-jdt-dark/15" />

        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <ProviderBadge label="Verizon Reveal API: LIVE" color="blue" />
          <ProviderBadge label="Michelin Fleet: LIVE" color="orange" />
        </div>

        {telemetryNodes.map((pin: any) => (
          <button
            key={pin.id}
            onClick={() => setSelectedPin(pin)}
            className={`absolute h-8 w-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-4 transition-all hover:scale-125 z-10 ${getPinBg(pin.category, pin.status)} ${selectedPin?.id === pin.id ? 'scale-110 h-9 w-9 ring-amber-300' : ''}`}
            style={{ top: pin.y, left: pin.x }}
          >
            {getPinIcon(pin.type, pin.category)}
            {pin.status.includes('MOVING') && <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-45" />}
          </button>
        ))}

        {selectedPin && (
          <div className="absolute bottom-4 left-4 right-4 bg-zinc-900/95 text-white p-5 rounded-xl border border-zinc-700 shadow-2xl backdrop-blur-md z-20">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-black uppercase leading-none">{selectedPin.title}</h4>
                <p className="text-xs text-zinc-400 mt-1.5 font-bold uppercase tracking-wider">{selectedPin.status}</p>
              </div>
              <button onClick={() => setSelectedPin(null)} className="px-3 py-1.5 text-[10px] font-black uppercase rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <TelemetryCard label="Driver" value={selectedPin.data.driverName || 'Unassigned'} />
              <TelemetryCard label="Route" value={selectedPin.data.route || 'Unknown'} />
              <TelemetryCard label="Maintenance" value={selectedPin.data.maintenanceStatus || 'Unknown'} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => openDrawer('freight', selectedPin.data.assignedLoadId || 'Unknown')} className="px-4 py-2 text-[10px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors">
                View Job/Load Details
              </button>
              <button className="px-4 py-2 text-[10px] font-black uppercase rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                Contact Driver
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="bg-jdt-panel rounded-xl border border-jdt-border p-4 space-y-4 shadow-sm max-h-[800px] overflow-y-auto">
        <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-orange-500" /> Automated Map Alerts</h3>
        <div className="space-y-2">
          {mockAlerts.map(alert => (
            <div key={alert.id} className={`p-2.5 rounded-lg border flex gap-2 text-xs font-bold leading-snug ${alert.severity === 'error' ? 'bg-red-50/50 border-red-200 text-red-900' : alert.severity === 'warning' ? 'bg-orange-50/50 border-orange-200 text-orange-900' : 'bg-blue-50/50 border-blue-200 text-blue-900'}`}>
              {alert.severity === 'error' ? <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> : <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />}
              <div>
                <p>{alert.message}</p>
                <p className="text-[9px] font-black uppercase mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 pt-4 border-t border-jdt-border"><Activity className="h-4 w-4 text-blue-600" /> Active Telemetry Feed</h3>
        <ul className="space-y-2">
          {telemetryNodes.map((pin: any) => (
            <li key={pin.id} onClick={() => setSelectedPin(pin)} className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1.5 transition-colors ${selectedPin?.id === pin.id ? 'bg-jdt-sand border-blue-400 shadow-sm' : 'bg-jdt-panel border-jdt-border hover:bg-jdt-sand'}`}>
              <div className="flex items-center justify-between text-xs font-extrabold text-jdt-text">
                <div className="flex items-center gap-2 truncate">
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${getPinBg(pin.category, pin.status)}`}>
                    {getPinIcon(pin.type, pin.category)}
                  </div>
                  <span className="truncate">{pin.title}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-black uppercase pl-6 text-zinc-500">
                <span className={pin.status.includes('MOVING') ? 'text-blue-600' : ''}>{pin.status}</span>
                <span className="flex items-center gap-1"><Wifi className="h-2.5 w-2.5" /> {pin.data.provider}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function ProviderBadge({ label, color }: { label: string; color: 'blue' | 'orange' }) {
  const dot = color === 'blue' ? 'bg-blue-500' : 'bg-orange-500';
  const ping = color === 'blue' ? 'bg-blue-400' : 'bg-orange-400';
  return (
    <div className="bg-zinc-900/90 backdrop-blur-md rounded-lg py-1.5 px-3 border border-zinc-800 flex items-center gap-2 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ping} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
      </span>
      <span className="text-[10px] font-black uppercase text-white tracking-widest">{label}</span>
    </div>
  );
}

function TelemetryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
      <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-zinc-200">{value}</p>
    </div>
  );
}
