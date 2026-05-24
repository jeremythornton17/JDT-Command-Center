import { useMemo, useState } from 'react';
import { useFirestoreSyncState } from './useFirestoreCollection';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  ChevronRight,
  Database,
  Folder,
  LayoutGrid,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Settings,
  Truck,
  User,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';

import FreightBoard from './components/FreightBoard';
import NurseryBoard from './components/NurseryBoard';
import EquipmentBoard from './components/EquipmentBoard';
import CommandDrawer from './components/CommandDrawer';
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
import { useAuth } from './AuthProvider';

const mainNav = [
  { id: 'board', label: 'Command Board', icon: LayoutGrid },
  { id: 'tracker', label: 'Relocation', icon: MapPin },
  { id: 'freight', label: 'Freight', icon: Truck },
  { id: 'inventory', label: 'Nursery', icon: Leaf },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'crews', label: 'Crews', icon: UserCheck },
  { id: 'clients', label: 'Clients', icon: User },
];

const secondaryNav = [
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'maps', label: 'Maps', icon: MapPin },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: Folder },
  { id: 'sheets', label: 'Data Sync', icon: Database },
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

function upsertRecord<T extends { id?: string }>(items: T[], record: T, fallbackPrefix: string, matcher?: (item: T) => boolean) {
  const id = record.id || makeId(fallbackPrefix);
  const nextRecord = { ...record, id };
  const hasMatch = items.some((item) => matcher ? matcher(item) : item.id === id);

  if (!hasMatch) return [nextRecord, ...items];
  return items.map((item) => (matcher ? matcher(item) : item.id === id) ? { ...item, ...nextRecord } : item);
}

function appendHistory(record: any, event: string, notes?: string) {
  return {
    ...record,
    history: [
      { date: new Date().toLocaleString(), user: 'Command Center', event, notes: notes || '' },
      ...(record.history || []),
    ],
  };
}

export default function App() {
  const { user, signIn, logOut } = useAuth();
  const [activeTab, setActiveTab] = useState('board');
  const [drawerConfig, setDrawerConfig] = useState<DrawerConfig>({ isOpen: false, type: '', itemId: null, defaultTab: 'overview' });
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: string; data?: any }>({ isOpen: false, type: '' });
  const [toasts, setToasts] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [jobs, setJobs] = useFirestoreSyncState<any>('jobs', [], !!user);
  const [loads, setLoads] = useFirestoreSyncState<any>('loads', [], !!user);
  const [ranchOaks, setRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user);
  const [equipment, setEquipment] = useFirestoreSyncState<any>('equipment', [], !!user);
  const [crews, setCrews] = useFirestoreSyncState<any>('crews', [], !!user);
  const [clients, setClients] = useFirestoreSyncState<any>('clients', [], !!user);
  const [alerts, setAlerts] = useFirestoreSyncState<any>('alerts', [], !!user);

  const activeNav = navItems.find((item) => item.id === activeTab) || navItems[0];

  const metrics = useMemo(() => [
    { label: 'Projects', value: jobs.length, tone: 'bg-[#384521]', icon: MapPin },
    { label: 'Freight', value: loads.length, tone: 'bg-[#345B6B]', icon: Truck },
    { label: 'Trees', value: ranchOaks.length, tone: 'bg-[#82995D]', icon: Leaf },
    { label: 'Equipment', value: equipment.length, tone: 'bg-[#935231]', icon: Wrench },
  ], [jobs.length, loads.length, ranchOaks.length, equipment.length]);

  const recentRecords = useMemo(() => [
    ...jobs.map((item) => ({ type: 'job', label: item.title || item.client || 'Untitled project', meta: item.status || item.date || 'Project', id: item.id || item.title })),
    ...loads.map((item) => ({ type: 'freight', label: item.title || item.id || 'Untitled load', meta: item.status || item.eta || 'Freight', id: item.id || item.title })),
    ...ranchOaks.map((item) => ({ type: 'tree', label: item.treeId || item.name || 'Tree record', meta: item.status || item.farm || 'Tree', id: item.id || item.treeId })),
    ...equipment.map((item) => ({ type: 'equipment', label: item.name || item.type || 'Equipment record', meta: item.status || item.operator || 'Equipment', id: item.id || item.name })),
  ].slice(0, 8), [jobs, loads, ranchOaks, equipment]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4000);
  };

  const openDrawer = (type: string, itemId: string, defaultTab = 'overview') => {
    setDrawerConfig({ isOpen: true, type, itemId, defaultTab });
  };

  const openModal = (type: string, data?: any) => {
    setModalConfig({ isOpen: true, type, data });
  };

  const onDeleteRecord = (recordType: string, id: string) => {
    const removeById = (item: any) => item.id !== id && item.title !== id && item.name !== id && item.treeId !== id;

    if (recordType === 'client') setClients((prev) => prev.filter(removeById));
    else if (recordType === 'employee' || recordType === 'crew') setCrews((prev) => prev.filter(removeById));
    else if (recordType === 'freight' || recordType === 'load') setLoads((prev) => prev.filter(removeById));
    else if (recordType === 'equipment') setEquipment((prev) => prev.filter(removeById));
    else if (recordType === 'tree') setRanchOaks((prev) => prev.filter(removeById));
    else setJobs((prev) => prev.filter(removeById));

    addToast('Record deleted', 'info');
  };

  const onSaveRecord = (recordType: string, recordData: any) => {
    const normalizedType = recordType.replace(/^edit_/, '');

    switch (normalizedType) {
      case 'job':
      case 'project':
        setJobs((prev) => upsertRecord(prev, recordData, 'job', (item) => item.id === recordData.id || item.title === recordData.title));
        break;
      case 'client':
        setClients((prev) => upsertRecord(prev, recordData, 'client'));
        break;
      case 'employee':
      case 'crew':
        setCrews((prev) => upsertRecord(prev, recordData, 'crew'));
        break;
      case 'tree':
      case 'add_tree':
      case 'log_prune':
      case 'treatment':
      case 'move_check':
      case 'assign_tree':
        setRanchOaks((prev) => upsertRecord(prev, recordData, 'tree', (item) => item.id === recordData.id || item.treeId === recordData.treeId));
        break;
      case 'load':
      case 'freight':
      case 'create_move':
      case 'set_freight_status':
      case 'complete':
        setLoads((prev) => upsertRecord(prev, recordData, 'load', (item) => item.id === recordData.id || item.title === recordData.title));
        break;
      case 'equipment':
      case 'maintenance':
        setEquipment((prev) => upsertRecord(prev, recordData, 'equipment', (item) => item.id === recordData.id || item.name === recordData.name || item.name === recordData.asset));
        if (normalizedType === 'maintenance') {
          setAlerts((prev) => [{ id: makeId('alert'), title: recordData.asset || 'Maintenance report', body: recordData.notes || '', severity: recordData.severity || 'Info', time: 'Just now' }, ...prev]);
        }
        break;
      case 'change_order':
      case 'delay':
      case 'assign_crew':
        if (drawerConfig.itemId) {
          setJobs((prev) => prev.map((job) => {
            const matches = job.id === drawerConfig.itemId || job.title === drawerConfig.itemId;
            return matches ? appendHistory({ ...job, ...recordData }, normalizedType.replace('_', ' '), recordData.notes || recordData.reason || recordData.description) : job;
          }));
        }
        break;
      default:
        setJobs((prev) => upsertRecord(prev, recordData, 'record'));
        break;
    }

    setModalConfig((current) => ({ ...current, isOpen: false }));
    addToast('Record saved', 'success');
  };

  const handleClearData = () => {
    setJobs([]);
    setLoads([]);
    setRanchOaks([]);
    setEquipment([]);
    setCrews([]);
    setClients([]);
    setAlerts([]);
    addToast('Workspace cleared', 'info');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-jdt-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-jdt-border bg-jdt-panel p-8 shadow-xl text-center">
          <div className="mx-auto mb-5 h-14 w-14 rounded-xl bg-jdt-primary text-white flex items-center justify-center">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-jdt-primary">JDT Command Center</h1>
          <p className="mt-2 text-sm font-bold text-zinc-500">Sign in to manage your live operations workspace.</p>
          <button onClick={signIn} className="mt-6 w-full rounded-lg bg-jdt-primary px-4 py-3 text-sm font-black uppercase text-white hover:bg-jdt-dark transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const renderActiveBoard = () => {
    switch (activeTab) {
      case 'tracker':
        return <TrackerBoard jobs={jobs} openDrawer={openDrawer} openModal={openModal} />;
      case 'freight':
        return <FreightBoard loads={loads} openDrawer={openDrawer} openModal={openModal} />;
      case 'inventory':
        return <NurseryBoard starterRanchOaks={ranchOaks} openDrawer={openDrawer} openModal={openModal} />;
      case 'equipment':
        return <EquipmentBoard starterEquipment={equipment} openDrawer={openDrawer} openModal={openModal} />;
      case 'crews':
        return <CrewsBoard crews={crews} openModal={openModal} openDrawer={openDrawer} />;
      case 'clients':
        return <ClientsBoard clients={clients} openModal={openModal} openDrawer={openDrawer} />;
      case 'alerts':
        return <AlertsBoard alerts={alerts} setAlerts={setAlerts} openModal={openModal} />;
      case 'calendar':
        return <CalendarBoard jobs={jobs} loads={loads} openDrawer={openDrawer} />;
      case 'maps':
        return <MapsBoard jobs={jobs} loads={loads} openDrawer={openDrawer} />;
      case 'reports':
        return <ReportsBoard />;
      case 'documents':
        return <DocumentsBoard openModal={openModal} />;
      case 'sheets':
        return <SyncBoard openModal={openModal} openDrawer={openDrawer} />;
      case 'settings':
        return <SettingsBoard openModal={openModal} />;
      default:
        return <Dashboard metrics={metrics} recentRecords={recentRecords} openModal={openModal} openDrawer={openDrawer} setActiveTab={setActiveTab} />;
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
        jobsList={jobs}
        loadsList={loads}
        ranchOaksList={ranchOaks}
        equipmentList={equipment}
        crewsList={crews}
        clientsList={clients}
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
        ranchOaksList={ranchOaks}
        equipmentList={equipment}
        crewsList={crews}
        clientsList={clients}
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

function Dashboard({ metrics, recentRecords, openModal, openDrawer, setActiveTab }: any) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric: any) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={`rounded-xl p-5 text-white shadow-sm ${metric.tone}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-white/75">{metric.label}</p>
                <Icon className="h-5 w-5 text-white/75" />
              </div>
              <p className="mt-3 text-4xl font-black">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-jdt-border pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-jdt-text">Recent Records</h3>
              <p className="text-xs font-bold text-zinc-500 mt-1">Your latest projects, loads, trees, and equipment</p>
            </div>
            <button onClick={() => openModal('job')} className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive">
              Add Record
            </button>
          </div>

          {recentRecords.length > 0 ? (
            <div className="divide-y divide-jdt-border">
              {recentRecords.map((record: any, index: number) => (
                <button key={`${record.type}-${record.id}-${index}`} onClick={() => openDrawer(record.type, record.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-jdt-sand/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-jdt-text">{record.label}</p>
                    <p className="mt-1 text-xs font-bold text-zinc-500">{record.meta}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border p-10 text-center">
              <Database className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-black text-jdt-text">No operational records yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs font-bold text-zinc-500">This workspace is clean. Add your current projects, tree inventory, freight loads, crews, clients, and equipment to build the live command center.</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-jdt-border bg-jdt-panel p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase text-jdt-text">Quick Actions</h3>
          <div className="mt-4 grid gap-2">
            <button onClick={() => openModal('job')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Create project</button>
            <button onClick={() => openModal('tree')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Add tree</button>
            <button onClick={() => openModal('load')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Add freight load</button>
            <button onClick={() => setActiveTab('maps')} className="rounded-lg border border-jdt-border bg-white px-4 py-3 text-left text-xs font-black uppercase text-jdt-text hover:border-jdt-olive">Open tree map</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function TrackerBoard({ jobs, openDrawer, openModal }: any) {
  const relocationJobs = jobs.filter((job: any) => job.division === 'relocation' || job.division === 'nursery' || !job.division);

  return (
    <div className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-jdt-border bg-jdt-sand/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-jdt-primary">Relocation Project Tracking</h2>
          <p className="text-sm font-bold text-zinc-500">Live tree relocation and planting project records</p>
        </div>
        <button onClick={() => openModal('job')} className="rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">Create Job</button>
      </div>

      {relocationJobs.length > 0 ? (
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-jdt-sand text-zinc-500 border-b border-jdt-border">
              <tr>
                <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Project Name</th>
                <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Client</th>
                <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Status</th>
                <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Target Date</th>
                <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Crew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-jdt-border">
              {relocationJobs.map((job: any) => (
                <tr key={job.id || job.title} className="cursor-pointer hover:bg-jdt-sand transition-colors" onClick={() => openDrawer('job', job.id || job.title)}>
                  <td className="px-5 py-4 font-extrabold text-[#384521]">{job.title || 'Untitled project'}</td>
                  <td className="px-5 py-4 font-bold text-zinc-600">{job.client || '-'}</td>
                  <td className="px-5 py-4 font-bold text-zinc-600">{job.status || '-'}</td>
                  <td className="px-5 py-4 font-bold text-zinc-500">{job.date || 'TBD'}</td>
                  <td className="px-5 py-4 font-bold text-zinc-600">{job.crew || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-black text-jdt-text">No relocation projects yet</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">Create a real project to start tracking active work.</p>
        </div>
      )}
    </div>
  );
}
