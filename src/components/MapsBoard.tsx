import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Compass,
  Crosshair,
  LocateFixed,
  Route,
  Target,
  TreePine,
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

const defaultFieldCenter = { lat: 26.5, lng: -80.35 };

type MapsBoardProps = {
  jobs?: any[];
  loads?: any[];
  ranchOaks?: any[];
  openDrawer?: (type: string, id: string) => void;
  onUpdateTreeLocation?: (treeId: string, relocationMap: any) => void;
};

export default function MapsBoard({ ranchOaks, onUpdateTreeLocation }: MapsBoardProps) {
  const { user } = useAuth();
  const [syncedRanchOaks, setSyncedRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user && !ranchOaks);
  const treeRecords = ranchOaks ?? syncedRanchOaks ?? [];
  const mapsConfig = useMemo(() => getGoogleMapsConfig(), []);
  const [zoomLevel, setZoomLevel] = useState(17);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(() => treeRecords[0]?.treeId ?? treeRecords[0]?.id ?? null);
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
    if (!selectedTreeId && treeRecords[0]) setSelectedTreeId(treeRecords[0].treeId ?? treeRecords[0].id);
  }, [treeRecords, selectedTreeId]);

  const selectedTree = treeRecords.find(tree => tree.treeId === selectedTreeId || tree.id === selectedTreeId);
  const selectedTasks = selectedTree ? buildTreeRelocationTasks(selectedTree) : [];
  const allTreeTasks = treeRecords.flatMap(tree => buildTreeRelocationTasks(tree).map(task => ({ ...task, tree })));
  const readyTasks = allTreeTasks.filter(task => task.status === 'Ready').slice(0, 7);

  const mapInstruction = pinMode
    ? `Click the map to set ${pinMode === 'source' ? 'current field position' : 'relocation destination'} for ${selectedTree?.treeId ?? 'selected tree'}.`
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
  }, [mapsConfig.isReady, mapsConfig.apiKey, mapsConfig.mapId, treeRecords, selectedTreeId, zoomLevel]);

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
          setSelectedTreeId(tree.treeId ?? tree.id);
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

  const renderFallbackTreePins = () => {
    return treeRecords.flatMap(tree => {
      const pins: React.ReactNode[] = [];
      (['source', 'destination'] as TreeRelocationPointType[]).forEach(pointType => {
        const point = tree.relocationMap?.[pointType];
        if (!point) return;

        const percent = latLngToMapPercent(point);
        const isSelected = selectedTreeId === tree.treeId || selectedTreeId === tree.id;
        pins.push(
          <button
            key={`${tree.treeId}-${pointType}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedTreeId(tree.treeId ?? tree.id);
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
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedTreeId === tree.treeId || selectedTreeId === tree.id ? 'bg-jdt-sand border-jdt-primary' : 'bg-white border-jdt-border hover:bg-jdt-sand/60'}`}
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
