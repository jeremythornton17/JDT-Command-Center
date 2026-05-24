import React, { useState } from 'react';
import { MapPin, Truck, Wrench, Leaf, ZoomIn, ZoomOut, Compass, Sparkles, Navigation, Wifi, Activity, AlertTriangle, Info } from 'lucide-react';

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

const mockTelemetry: FleetPosition[] = [
  {
    id: 'tlm-1', provider: 'verizon', providerVehicleId: 'V9001',
    assetName: 'Semi Truck 04 (Heavy)', assetType: 'semi', driverName: 'Christian Dispatch', assignedLoadId: 'FRT-0522-01',
    lat: 34.0522, lng: -118.2437, speedMph: 65, heading: 90, ignitionStatus: 'on', status: 'moving',
    recordedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
    route: 'I-10 E to Waterford Golf Club', eta: '14:30 EST', maintenanceStatus: 'OK - Next PM 14k mi', 
    recentHistory: ['12:15 - Left JDT Yard', '13:00 - Passed weigh station'], dispatchNotes: 'Driver reports heavy traffic on I-10.'
  },
  {
    id: 'tlm-2', provider: 'verizon', providerVehicleId: 'V9022',
    assetName: 'Crew Crane Truck 2', assetType: 'work_truck', driverName: 'John Doe', assignedJobId: 'JOB-992',
    lat: 34.1, lng: -118.3, speedMph: 0, heading: 0, ignitionStatus: 'off', status: 'at_job',
    recordedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), receivedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    route: 'On Site', maintenanceStatus: 'Needs Oil Change (Overdue)',
    recentHistory: ['06:00 - Left yard', '07:30 - Arrived at Bellaire Club'], dispatchNotes: 'Will need fuel on return trip.'
  },
  {
    id: 'tlm-3', provider: 'michelin', providerVehicleId: 'M1105',
    assetName: 'Lowboy Trailer 44', assetType: 'trailer',
    lat: 34.0, lng: -118.2, speedMph: 0, status: 'idle',
    recordedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), receivedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    maintenanceStatus: 'Tire pressure sensor fault (Axle 2)'
  },
  {
    id: 'tlm-4', provider: 'verizon', providerVehicleId: 'V9100',
    assetName: 'Semi Truck 02', assetType: 'semi', driverName: 'Alex Dispatch', assignedLoadId: 'FRT-0522-04',
    lat: 34.2, lng: -118.4, speedMph: 15, heading: 45, ignitionStatus: 'on', status: 'delayed',
    recordedAt: new Date(Date.now() - 1000 * 30).toISOString(), receivedAt: new Date().toISOString(),
    route: 'Hwy 60 to Base', eta: '17:00 EST (Delayed)', maintenanceStatus: 'OK',
    recentHistory: ['10:00 - Loaded at Block B', '11:30 - Stopped at weigh station'], dispatchNotes: 'Running 45m behind schedule.'
  }
];

const mockAlerts = [
  { id: 'al-1', type: 'geofence', message: 'Crew Crane 2 entered Bellaire Club geofence', time: '2 mins ago', severity: 'info' },
  { id: 'al-2', type: 'geofence', message: 'Semi Truck 04 left 25 Acre Block B', time: '18 mins ago', severity: 'info' },
  { id: 'al-3', type: 'delay', message: 'Semi Truck 02 delayed to delivery (45m ETA impact)', time: '25 mins ago', severity: 'warning' },
  { id: 'al-4', type: 'departure', message: 'Lowboy 44 not moving by 08:00 departure', time: '1 hr ago', severity: 'error' },
  { id: 'al-5', type: 'gps', message: 'Semi Truck 03: No GPS update in 30 minutes', time: '30 mins ago', severity: 'error' },
  { id: 'al-6', type: 'mismatch', message: 'Crew Truck 5 at Waterford (Scheduled for Bellaire)', time: '40 mins ago', severity: 'warning' },
  { id: 'al-7', type: 'recommendation', message: '💡 RECOMMENDATION: Dump Truck 8 is 5 miles from Waterford and empty. Reroute to assist?', time: 'Just now', severity: 'info' }
];

export default function MapsBoard({ jobs, loads, openDrawer }: { jobs: any[], loads: any[], openDrawer: (type: string, id: string) => void }) {
  const [zoomLevel, setZoomLevel] = useState(11);
  const [selectedPin, setSelectedPin] = useState<any>(null);

  const pins = [
    { id: 'pin-1', title: 'Waterford Golf Club', type: 'job', category: 'relocation', x: '35%', y: '28%', status: 'Active (8/12 Moved)' },
    { id: 'pin-2', title: 'Bellaire Club', type: 'job', category: 'relocation', x: '68%', y: '45%', status: 'In Prep' },
    { id: 'pin-5', title: 'JDT Yard / Main Office', type: 'nursery', category: 'yard', x: '45%', y: '40%', status: 'Base Station' },
    { id: 'pin-6', title: '25 Acre Block B', type: 'nursery', category: 'farm', x: '42%', y: '32%', status: 'Nursery Stock' },
  ];

  const telemetryNodes = mockTelemetry.map(t => {
    let x = '50%'; let y = '50%';
    if (t.id === 'tlm-1') { x = '52%'; y = '62%'; }
    if (t.id === 'tlm-2') { x = '36%'; y = '29%'; }
    if (t.id === 'tlm-3') { x = '46%'; y = '41%'; }
    if (t.id === 'tlm-4') { x = '18%'; y = '48%'; }

    return {
      id: t.id,
      title: t.assetName,
      type: 'telemetry',
      category: t.assetType,
      x, y,
      status: `${t.status.toUpperCase().replace('_', ' ')} ${t.speedMph ? `(${t.speedMph} mph)` : ''}`,
      data: t
    };
  });

  const allMapNodes = [...pins, ...telemetryNodes];

  const getPinIcon = (type: string, category: string) => {
    if (type === 'telemetry') {
      if (category === 'semi') return <Truck className="h-4 w-4 text-white drop-shadow-md" />;
      if (category === 'work_truck') return <Truck className="h-3 w-3 text-white" />;
      if (category === 'trailer') return <Wrench className="h-3 w-3 text-zinc-900" />;
      return <Navigation className="h-3 w-3 text-white" />;
    }
    switch (type) {
      case 'job': return <MapPin className="h-3 w-3 text-white" />;
      case 'freight': return <Truck className="h-3 w-3 text-white" />;
      case 'nursery': return <Leaf className="h-3 w-3 text-white" />;
      default: return <Compass className="h-3 w-3 text-white" />;
    }
  };

  const getPinBg = (type: string, category: string, statusText: string) => {
    if (type === 'telemetry') {
      const isMoving = statusText.includes('MOVING');
      if (category === 'semi') return isMoving ? 'bg-blue-600 ring-blue-300' : 'bg-blue-900 ring-blue-500';
      if (category === 'work_truck') return 'bg-purple-600 ring-purple-300';
      if (category === 'trailer') return 'bg-zinc-300 ring-zinc-500';
    }
    switch (category) {
      case 'relocation': return 'bg-emerald-600 ring-emerald-200';
      case 'shipping': return 'bg-sky-500 ring-sky-200';
      case 'yard': return 'bg-zinc-800 ring-zinc-200';
      case 'farm': return 'bg-lime-600 ring-lime-200';
      default: return 'bg-orange-500 ring-orange-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Dispatch & Live Telemetry Map</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Real-time normalized GPS tracking from Verizon Reveal & Michelin Fleet Manager</p>
        </div>
        <div className="flex items-center gap-2 bg-jdt-panel border border-jdt-border rounded-lg p-1 shadow-sm">
          <button onClick={() => setZoomLevel(z => Math.max(9, z - 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-xs font-black uppercase text-zinc-700 px-3">ZOOM: {zoomLevel}x</span>
          <button onClick={() => setZoomLevel(z => Math.min(14, z + 1))} className="p-1.5 hover:bg-jdt-sand rounded text-zinc-600" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Map Stage */}
        <div className="relative min-h-[500px] bg-zinc-950 rounded-2xl border border-jdt-border shadow-sm overflow-hidden isolate">
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1400&auto=format&fit=crop" 
            alt="Satellite Map Base" 
            className="absolute inset-0 w-full h-full object-cover opacity-55 mix-blend-luminosity" 
          />
          <div className="absolute inset-0 bg-jdt-dark/15"></div>

          {/* Compass / Orientation */}
          <div className="absolute top-4 right-4 bg-zinc-900/90 text-white rounded-lg p-2.5 border border-zinc-700 flex flex-col items-center gap-1 shadow-md">
            <Compass className="h-6 w-6 text-zinc-300 transform rotate-12" />
            <span className="text-[8px] font-black uppercase text-zinc-400">NORTH</span>
          </div>

          {/* Connected Provider Status Indicator */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-zinc-900/90 backdrop-blur-md rounded-lg py-1.5 px-3 border border-zinc-800 flex items-center gap-2 shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Verizon Reveal API: LIVE</span>
            </div>
            <div className="bg-zinc-900/90 backdrop-blur-md rounded-lg py-1.5 px-3 border border-zinc-800 flex items-center gap-2 shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Michelin Fleet: LIVE</span>
            </div>
          </div>

          {/* Plotting Pins */}
          {allMapNodes.map(pin => {
            const isSelected = selectedPin?.id === pin.id;
            return (
              <button
                key={pin.id}
                onClick={() => setSelectedPin(pin)}
                className={`absolute h-7.5 w-7.5 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-4 transition-all hover:scale-125 z-10 ${getPinBg(pin.type, pin.category, pin.status)} ${isSelected ? 'scale-110 h-9 w-9 ring-amber-300' : ''}`}
                style={{ top: pin.y, left: pin.x }}
              >
                {getPinIcon(pin.type, pin.category)}
                
                {/* Visual ripple for moving vehicles */}
                {pin.status.includes('MOVING') && (
                  <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-45"></span>
                )}
              </button>
            );
          })}

          {/* Selected Pin HUD Drawer */}
          {selectedPin && selectedPin.type === 'telemetry' ? (
            <div className="absolute bottom-4 left-4 right-4 bg-zinc-900/95 text-white p-5 rounded-xl border border-zinc-700 shadow-2xl backdrop-blur-md z-20 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-4">
                <div className="flex gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${getPinBg(selectedPin.type, selectedPin.category, selectedPin.status)}`}>
                    {getPinIcon(selectedPin.type, selectedPin.category)}
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase leading-none flex items-center gap-2">
                      {selectedPin.title}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${selectedPin.data.provider === 'verizon' ? 'bg-red-950/50 border-red-800 text-red-200' : 'bg-blue-950/50 border-blue-800 text-blue-200'}`}>
                        {selectedPin.data.provider.toUpperCase()}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1.5 font-bold uppercase tracking-wider">{selectedPin.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedPin(null)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Driver & Assignment</p>
                  <p className="text-sm font-bold text-zinc-200">{selectedPin.data.driverName || 'Unassigned'}</p>
                  <p className="text-xs font-bold text-zinc-400 mt-0.5">
                    {selectedPin.data.assignedJobId ? `Job: ${selectedPin.data.assignedJobId}` : selectedPin.data.assignedLoadId ? `Load: ${selectedPin.data.assignedLoadId}` : 'No active load/job link'}
                  </p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Route & ETA</p>
                  <p className="text-sm font-bold text-zinc-200">{selectedPin.data.route || 'Unknown Route'}</p>
                  <p className="text-xs font-bold text-blue-400 mt-0.5">ETA: {selectedPin.data.eta || 'N/A'}</p>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Live Telemetry</p>
                  <div className="flex justify-between items-center text-xs font-bold">
                     <span className="text-zinc-400">Speed:</span> <span className="text-emerald-400">{selectedPin.data.speedMph ?? 0} mph</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold mt-0.5">
                     <span className="text-zinc-400">Heading:</span> <span className="text-zinc-200">{selectedPin.data.heading ?? 0}&deg;</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold mt-0.5">
                     <span className="text-zinc-400">Ignition:</span> <span className={selectedPin.data.ignitionStatus === 'on' ? 'text-emerald-400 uppercase' : 'text-zinc-500 uppercase'}>{selectedPin.data.ignitionStatus || 'Unknown'}</span>
                  </div>
                </div>
                <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Maintenance</p>
                  <p className={`text-xs font-bold ${selectedPin.data.maintenanceStatus?.includes('OK') ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {selectedPin.data.maintenanceStatus || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-lg border border-zinc-800/50">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Recent Movement History</p>
                  <ul className="space-y-1.5 text-xs font-bold text-zinc-300">
                    {selectedPin.data.recentHistory?.map((entry: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-zinc-600">&bull;</span> {entry}</li>
                    )) || <li>No recent history points synced.</li>}
                  </ul>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-zinc-800/50">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Active Dispatch Notes</p>
                  <p className="text-xs font-bold text-zinc-300 italic">"{selectedPin.data.dispatchNotes || 'No active notes.'}"</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                <button 
                  onClick={() => openDrawer('freight', selectedPin.data.assignedLoadId || 'Unknown')}
                  className="px-4 py-2 text-[10px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors"
                >
                  View Job/Load Details
                </button>
                <button 
                  className="px-4 py-2 text-[10px] font-black uppercase rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Contact Driver
                </button>
                <button 
                  className="px-4 py-2 text-[10px] font-black uppercase rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  Open in {selectedPin.data.provider === 'verizon' ? 'Verizon Reveal' : 'Michelin Fleet'} ↗
                </button>
              </div>
            </div>
          ) : selectedPin && (
            <div className="absolute bottom-4 left-4 right-4 bg-zinc-900/95 text-white p-4 rounded-xl border border-zinc-700 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md z-20">
              <div className="flex gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${getPinBg(selectedPin.type, selectedPin.category, selectedPin.status)}`}>
                  {getPinIcon(selectedPin.type, selectedPin.category)}
                </div>
                <div>
                  <h4 className="text-base font-black uppercase leading-tight flex items-center gap-2">
                    {selectedPin.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 font-bold">{selectedPin.status} &bull; Map Pin</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setSelectedPin(null)}
                  className="px-3 py-1.5 text-[10px] font-black uppercase rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                >
                  Dismiss
                </button>
                <button 
                  onClick={() => openDrawer(selectedPin.type, selectedPin.title)}
                  className="px-4 py-1.5 text-[10px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark"
                >
                  Action Log
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Lands & Telemetry List */}
        <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 space-y-4 shadow-sm flex flex-col max-h-[800px] overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-orange-500" /> Automated Map Alerts</h3>
            <div className="space-y-2">
              {mockAlerts.map(alert => (
                <div key={alert.id} className={`p-2.5 rounded-lg border flex gap-2 text-xs font-bold leading-snug ${alert.severity === 'error' ? 'bg-red-50/50 border-red-200 text-red-900' : alert.severity === 'warning' ? 'bg-orange-50/50 border-orange-200 text-orange-900' : 'bg-blue-50/50 border-blue-200 text-blue-900'}`}>
                   <div className="shrink-0 mt-0.5">
                     {alert.severity === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                     {alert.severity === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                     {alert.severity === 'info' && <Info className="h-3.5 w-3.5 text-blue-500" />}
                   </div>
                   <div>
                     <p>{alert.message}</p>
                     <p className={`text-[9px] font-black uppercase mt-1 ${alert.severity === 'error' ? 'text-red-500' : alert.severity === 'warning' ? 'text-orange-600' : 'text-blue-500'}`}>
                       {alert.time}
                     </p>
                   </div>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 pt-4 border-t border-jdt-border"><Activity className="h-4 w-4 text-blue-600" /> Active Telemetry Feed</h3>
            <ul className="space-y-2">
              {telemetryNodes.map(pin => (
                <li 
                  key={pin.id} 
                  onClick={() => setSelectedPin(pin)}
                  className={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1.5 transition-colors ${selectedPin?.id === pin.id ? 'bg-jdt-sand border-blue-400 shadow-sm' : 'bg-jdt-panel border-jdt-border hover:bg-jdt-sand'}`}
                >
                  <div className="flex items-center justify-between text-xs font-extrabold text-jdt-text">
                     <div className="flex items-center gap-2 truncate">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${getPinBg(pin.type, pin.category, pin.status)}`}>
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

            <h3 className="text-xs font-black text-jdt-text uppercase flex items-center gap-1.5 pt-4 border-t border-jdt-border"><MapPin className="h-4 w-4 text-jdt-olive" /> Geofences & Nodes</h3>
            <ul className="space-y-2">
              {pins.map(pin => (
                <li 
                  key={pin.id} 
                  onClick={() => setSelectedPin(pin)}
                  className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-3 text-xs transition-colors ${selectedPin?.id === pin.id ? 'bg-jdt-sand border-zinc-400 font-extrabold' : 'bg-jdt-panel border-jdt-border hover:bg-jdt-sand'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${getPinBg(pin.type, pin.category, pin.status)}`}>
                      {getPinIcon(pin.type, pin.category)}
                    </div>
                    <span className="font-bold text-jdt-text truncate">{pin.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 shrink-0">{pin.type.toUpperCase()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
