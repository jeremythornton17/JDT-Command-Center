import { useState, useMemo, useEffect } from 'react';
import { useFirestoreSyncState } from './useFirestoreCollection';
import { JobCard } from './commandCenter/types';
import { 
  Monitor, ClipboardList, Truck, Leaf, Wrench, Database, Plus, Search, 
  MapPin, Clock, UserCheck, AlertTriangle, ArrowUpRight, CheckCircle, 
  DownloadCloud, Printer, RefreshCcw, LogOut, Edit2, MonitorPlay, Upload, Download, CloudRain,
  Calendar, BarChart2, Folder, Settings, User, LayoutGrid, ChevronRight, Droplets, Droplet, Activity, QrCode, PenTool, ClipboardList as ClipboardListIcon,
  CheckCircle2, FolderSync, AlertOctagon, Settings2, Bell, X, Menu
} from 'lucide-react';

import FreightBoard from './components/FreightBoard';
import NurseryBoard from './components/NurseryBoard';
import EquipmentBoard from './components/EquipmentBoard';
import CommandDrawer from './components/CommandDrawer';
import SyncBoard from './components/SyncBoard';
import UniversalModal from './components/UniversalModal';

// Brand-new board imports
import CrewsBoard from './components/CrewsBoard';
import ClientsBoard from './components/ClientsBoard';
import AlertsBoard from './components/AlertsBoard';
import CalendarBoard from './components/CalendarBoard';
import MapsBoard from './components/MapsBoard';
import ReportsBoard from './components/ReportsBoard';
import DocumentsBoard from './components/DocumentsBoard';
import SettingsBoard from './components/SettingsBoard';
import { getCrewAllocationType, getPersonnelRoleDisplayName, getRoleAuthorization, normalizePersonnelRole } from './personnelRoles';
import { seededOperationsCrew } from './seedData';

const mainNav = [
  { id: "board", label: "Command Board", icon: LayoutGrid },
  { id: "tracker", label: "Relocation", icon: MapPin },
  { id: "freight", label: "Freight", icon: Truck },
  { id: "inventory", label: "Nursery", icon: Leaf },
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "crews", label: "Crews", icon: UserCheck },
  { id: "clients", label: "Clients", icon: User }
];

import { useAuth } from './AuthProvider';

const secondaryNav = [
  { id: "alerts", label: "Alerts", icon: AlertTriangle, badge: true },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "maps", label: "Maps", icon: MapPin },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "documents", label: "Documents", icon: Folder },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const { user, signIn, logOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState('board');
  const [tvMode, setTvMode] = useState(false);
  const [drawerConfig, setDrawerConfig] = useState<{isOpen: boolean, type: string, itemId: string | null, defaultTab?: string}>({ isOpen: false, type: '', itemId: null, defaultTab: 'overview' });
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: string, data?: any}>({ isOpen: false, type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States mapped to Firebase using sync hook
  const [jobs, setJobs] = useFirestoreSyncState<any>('jobs', [], !!user);
  const [loads, setLoads] = useFirestoreSyncState<any>('loads', [], !!user);
  const [ranchOaks, setRanchOaks] = useFirestoreSyncState<any>('ranchOaks', [], !!user);
  const [equipment, setEquipment] = useFirestoreSyncState<any>('equipment', [], !!user);
  const [crews, setCrews] = useFirestoreSyncState<any>('crews', seededOperationsCrew, !!user);
  const [clients, setClients] = useFirestoreSyncState<any>('clients', [], !!user);
  const [alerts, setAlerts] = useFirestoreSyncState<any>('alerts', [], !!user);

  // Toast manager
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `t-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const openDrawer = (type: string, itemId: string, defaultTab: string = 'overview') => {
    setDrawerConfig({ isOpen: true, type, itemId, defaultTab });
  };
  
  const openModal = (type: string, data?: any) => {
    setModalConfig({ isOpen: true, type, data });
  };

  // State-altering Record Creators
  const onSaveRecord = (recordType: string, recordData: any) => {
    const newId = `${recordType.slice(0, 3)}-${Date.now().toString().slice(-4)}`;
    const dataWithId = { id: newId, ...recordData };

    switch (recordType) {
      case 'job':
        setJobs(prev => [
          { 
            id: newId, 
            title: recordData.title, 
            client: recordData.client, 
            division: recordData.division || 'relocation', 
            location: recordData.location || 'Delray Beach, FL', 
            pm: recordData.pm || 'Unassigned',
            status: recordData.status || 'onSchedule',
            date: recordData.date || 'TBD',
            notes: recordData.notes || ''
          }, 
          ...prev
        ]);
        addToast(`Successfully created project: ${recordData.title}`, 'success');
        break;

      case 'client':
        if (recordData.id) {
          setClients(prev => prev.map(c => c.id === recordData.id ? {
            ...c,
            name: recordData.name,
            contactName: recordData.contactName,
            phone: recordData.phone,
            email: recordData.email,
            billingAddress: recordData.billingAddress || 'No Address Listed',
            accessNotes: recordData.accessNotes || ''
          } : c));
          addToast(`Updated client partner: ${recordData.name}`, 'success');
        } else {
          setClients(prev => [
            { 
              id: newId, 
              name: recordData.name, 
              contactName: recordData.contactName, 
              phone: recordData.phone, 
              email: recordData.email, 
              billingAddress: recordData.billingAddress || 'No Address Listed',
              activeJobs: [], 
              history: [], 
              billingDetails: 'Net 30',
              accessNotes: recordData.accessNotes || ''
            }, 
            ...prev
          ]);
          addToast(`Welcome partner added: ${recordData.name}`, 'success');
        }
        break;

      case 'employee':
        const normalizedRole = getPersonnelRoleDisplayName(recordData.role);
        const authorizationLevel = getRoleAuthorization(normalizedRole, recordData.authorizationLevel);
        if (recordData.id) {
          setCrews(prev => prev.map(m => m.id === recordData.id ? {
            ...m,
            name: recordData.name,
            role: normalizedRole,
            authorizationLevel,
            type: getCrewAllocationType(normalizedRole),
            phone: recordData.phone || 'N/A',
            language: recordData.language || 'Bilingual',
            skills: [recordData.skill || normalizedRole]
          } : m));
          addToast(`Updated employee profile: ${recordData.name}`, 'success');
        } else {
          setCrews(prev => [
            { 
              id: newId, 
              name: recordData.name, 
              role: normalizedRole, 
              authorizationLevel,
              availability: 'Available', 
              type: getCrewAllocationType(normalizedRole), 
              phone: recordData.phone || 'N/A', 
              activeJob: 'Awaiting dispatch', 
              assignedEquipment: [], 
              language: recordData.language || 'Bilingual', 
              skills: [recordData.skill || normalizedRole] 
            }, 
            ...prev
          ]);
          addToast(`Registered employee card: ${recordData.name}`, 'success');
        }
        break;

      case 'edit_tree':
        setRanchOaks(prev => prev.map(t => t.id === recordData.id || t.treeId === recordData.treeId ? {
          ...t,
          treeId: recordData.treeId,
          ranchOakType: recordData.ranchOakType,
          dbh: recordData.dbh || t.dbh,
          height: recordData.height || t.height,
          spread: recordData.spread || t.spread,
          status: recordData.status || t.status,
          farm: recordData.farm || t.farm,
          zone: recordData.zone || t.zone,
          rootballSize: recordData.rootballSize || t.rootballSize
        } : t));
        addToast(`Successfully updated tree specimen profile: ${recordData.treeId}`, 'success');
        break;

      case 'tree':
        setRanchOaks(prev => [
          { 
            id: newId, 
            treeId: recordData.treeId, 
            ranchOakType: recordData.ranchOakType, 
            dbh: recordData.dbh || 12, 
            height: recordData.height || 22, 
            spread: recordData.spread || 14, 
            status: recordData.status || 'Available', 
            farm: recordData.farm || 'Office', 
            zone: recordData.zone || 'Row A',
            rootball: recordData.rootballSize || '94'
          }, 
          ...prev
        ]);
        addToast(`Added nursery asset tag: ${recordData.treeId}`, 'success');
        break;

      case 'load':
        setLoads(prev => [
          { 
            id: newId, 
            title: recordData.title, 
            driver: recordData.driver, 
            truck: recordData.truck || 'Trailer Flatbed', 
            origin: recordData.origin || 'Office Yard', 
            delivery: recordData.delivery || 'Job Site', 
            status: 'Dispatched', 
            eta: recordData.eta || 'Within 1hr',
            escortRequired: recordData.escortRequired || false
          }, 
          ...prev
        ]);
        addToast(`Freight manifest registered: ${recordData.title}`, 'success');
        break;

      case 'equipment':
        setEquipment(prev => [
          { 
            id: newId, 
            name: recordData.name, 
            type: recordData.eqType || 'Loadders', 
            status: recordData.status || 'Available', 
            operator: recordData.operator || 'None', 
            hours: recordData.hours || 100, 
            serviceDueHours: recordData.serviceDueHours || 250 
          }, 
          ...prev
        ]);
        addToast(`Heavy fleet asset mapped: ${recordData.name}`, 'success');
        break;

      case 'maintenance':
        setEquipment(prev => prev.map(eq => eq.name === recordData.asset ? { ...eq, status: recordData.severity === 'Critical' ? 'Down' : 'Maintenance' } : eq));
        setAlerts(prev => [
          { 
            id: `al-${Date.now()}`, 
            title: `Fleet Red Flag: ${recordData.asset}`, 
            body: `Reported by ${recordData.reporter || 'Hand'}: ${recordData.notes}`, 
            time: 'Just Now', 
            severity: recordData.severity === 'Critical' ? 'High' : 'Warning', 
            location: recordData.asset 
          }, 
          ...prev
        ]);
        addToast(`Mechanic diagnostic logged for ${recordData.asset}`, 'info');
        break;

      case 'change_order':
        setJobs(prev => prev.map(j => j.title === recordData.project ? { ...j, notes: `${j.notes || ''}\n[Change Order $${recordData.amount}] Requested by ${recordData.requester || 'PM'}: ${recordData.description}` } : j));
        addToast(`Change Order applied to project: ${recordData.project}`, 'success');
        break;

      case 'delay':
        if (drawerConfig.itemId) {
          setJobs(prev => prev.map(j => j.title === drawerConfig.itemId ? { ...j, status: 'delayed', notes: `${j.notes || ''}\nLogged delaying roadblock: ${recordData.reason}` } : j));
          setAlerts(prev => [
            { id: `al-${Date.now()}`, title: `Roadblock: ${drawerConfig.itemId}`, body: `System delays reported: ${recordData.reason}. Obs: ${recordData.notes || ''}`, time: 'Just Now', severity: 'Warning', location: drawerConfig.itemId },
            ...prev
          ]);
          addToast(`Delay flag set on ${drawerConfig.itemId}`, 'info');
        }
        break;

      case 'assign_crew':
        if (drawerConfig.itemId) {
          setJobs(prev => prev.map(j => j.title === drawerConfig.itemId ? { 
            ...j, 
            crew: recordData.lead,
            history: [
              { date: new Date().toLocaleDateString(), user: 'Command Center', event: 'Crew Dispatched', notes: `Operations crew led by ${recordData.lead} assigned to site tasks.` },
              ...(j.history || [])
            ]
          } : j));
          addToast(`Crew ${recordData.lead} dispatched to ${drawerConfig.itemId}`, 'success');
        }
        break;

      case 'edit_project':
        setJobs(prev => prev.map(j => j.id === recordData.id || j.title === recordData.title ? { 
          ...j, 
          title: recordData.title,
          client: recordData.client,
          division: recordData.division,
          status: recordData.status,
          pm: recordData.pm,
          date: recordData.date,
          location: recordData.location,
          notes: recordData.notes,
          history: [
            { date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), user: recordData.pm || 'PM', event: 'Project Edited', notes: 'Fields updated via command center.' },
            ...(j.history || [])
          ]
        } : j));
        addToast(`Successfully updated project profile: ${recordData.title}`, 'success');
        break;

      case 'add_tree':
        setRanchOaks(prev => prev.map(t => t.treeId === recordData.treeId ? { 
          ...t, 
          status: 'Assigned',
          history: [
            { date: new Date().toLocaleDateString(), user: 'Operations Manager', event: 'Assigned to Project', notes: `Bound to job: ${modalConfig.data?.title || 'Active Relocation Project'}. Details: ${recordData.notes || ''}` },
            ...(t.history || [])
          ]
        } : t));
        addToast(`Assigned specimen tree ${recordData.treeId} to project list`, 'success');
        break;

      case 'create_move':
        setLoads(prev => [
          {
            id: `mov-${Date.now().toString().slice(-4)}`,
            title: recordData.title,
            driver: recordData.driver,
            truck: recordData.truck || 'Trailer Flatbed',
            origin: recordData.origin || 'Clewiston Farm 1',
            delivery: recordData.delivery || modalConfig.data?.location || 'Job Site',
            status: 'Pending',
            eta: recordData.eta || 'Within 1hr',
            escortRequired: recordData.escortRequired || false,
            history: [
              { date: new Date().toLocaleDateString(), user: recordData.driver, event: 'Freight Initialized', notes: 'Heavy load scheduled for transit.' }
            ]
          },
          ...prev
        ]);
        addToast(`Dispatched freight move: ${recordData.title}`, 'success');
        break;

      case 'log_prune':
        setRanchOaks(prev => prev.map(t => t.treeId === recordData.treeId ? { 
          ...t, 
          history: [
            { date: recordData.pruneDate || new Date().toLocaleDateString(), user: recordData.crewLead, event: `Pruned - ${recordData.pruneType}`, notes: recordData.notes || 'Routine canopy cut and root growth check.' },
            ...(t.history || [])
          ]
        } : t));
        addToast(`Pruning event logged for specimen ${recordData.treeId}`, 'success');
        break;

      case 'treatment':
        setRanchOaks(prev => prev.map(t => t.treeId === recordData.treeId ? { 
          ...t, 
          history: [
            { date: recordData.treatmentDate || new Date().toLocaleDateString(), user: 'Agronomy Crew', event: `Treatment - ${recordData.treatmentType}`, notes: `Applied ${recordData.productUsed} (${recordData.dosage || 'Standard Dosage'})` },
            ...(t.history || [])
          ]
        } : t));
        addToast(`Recorded soil treatment: ${recordData.treatmentType}`, 'success');
        break;

      case 'move_check':
        setRanchOaks(prev => prev.map(t => t.treeId === recordData.treeId ? { 
          ...t, 
          readiness: recordData.readiness,
          history: [
            { date: new Date().toLocaleDateString(), user: recordData.inspectedBy, event: 'Pre-harvest Inspection', notes: `Status: ${recordData.readiness}. Pre-Dig checklists verified.` },
            ...(t.history || [])
          ]
        } : t));
        addToast(`Pre-Dig readiness checklist certified: ${recordData.readiness}`, 'info');
        break;

      case 'assign_tree':
        setRanchOaks(prev => prev.map(t => t.treeId === recordData.treeId ? { 
          ...t, 
          status: 'Assigned',
          history: [
            { date: new Date().toLocaleDateString(), user: 'Sales Dept', event: 'Project Bound', notes: `Specimen assigned to job site: ${recordData.jobTitle}. Spec: ${recordData.notes || 'None'}` },
            ...(t.history || [])
          ]
        } : t));
        addToast(`Successfully assigned specimen tree ${recordData.treeId} to project site`, 'success');
        break;

      case 'set_freight_status':
        setLoads(prev => prev.map(l => l.id === recordData.id || l.title === recordData.title ? { 
          ...l, 
          status: recordData.status,
          transitNotes: recordData.transitNotes,
          history: [
            { date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), user: l.driver, event: `Status updated to ${recordData.status}`, notes: recordData.transitNotes || 'Operational checklist update.' },
            ...(l.history || [])
          ]
        } : l));
        addToast(`Freight status updated to: ${recordData.status}`, 'success');
        break;

      case 'complete':
        setLoads(prev => prev.map(l => l.id === recordData.id || l.title === recordData.title ? { 
          ...l, 
          status: 'Completed',
          receiverName: recordData.receiverName,
          completedAt: recordData.completedAt || new Date().toLocaleTimeString(),
          history: [
            { date: new Date().toLocaleDateString(), user: 'Dispatched Gate', event: 'Delivered Sign-off (POD)', notes: `Signed by client PM: ${recordData.receiverName}. Remarks: ${recordData.notes || 'N/A'}` },
            ...(l.history || [])
          ]
        } : l));
        addToast(`Load completed & signed off by ${recordData.receiverName}`, 'success');
        break;

      case 'edit_freight':
        setLoads(prev => prev.map(l => l.id === recordData.id || l.title === recordData.title ? { 
          ...l, 
          title: recordData.title,
          driver: recordData.driver,
          truck: recordData.truck,
          eta: recordData.eta,
          origin: recordData.origin,
          delivery: recordData.delivery,
          escortRequired: recordData.escortRequired,
          history: [
            { date: new Date().toLocaleDateString(), user: 'Freight Dispatcher', event: 'Load Altered', notes: 'Load route details updated.' },
            ...(l.history || [])
          ]
        } : l));
        addToast(`Freight load updated: ${recordData.title}`, 'success');
        break;

      case 'log_issue':
        setEquipment(prev => prev.map(e => e.name === recordData.name ? { 
          ...e, 
          status: recordData.severity === 'Critical' ? 'Down' : 'Maintenance',
          serviceWarning: true,
          history: [
            { date: new Date().toLocaleDateString(), user: recordData.reporter || 'Mechanic', event: `Issue Flagged: ${recordData.severity}`, notes: recordData.issueText },
            ...(e.history || [])
          ]
        } : e));
        setAlerts(prev => [
          { 
            id: `al-${Date.now()}`, 
            title: `${recordData.severity} Maintenance Red-Flag: ${recordData.name}`, 
            body: `Reported by ${recordData.reporter || 'Mechanic'}: ${recordData.issueText}`, 
            time: 'Just Now', 
            severity: recordData.severity === 'Critical' ? 'High' : 'Warning', 
            location: recordData.name 
          }, 
          ...prev
        ]);
        addToast(`Heavy asset issue registered as ${recordData.severity}`, 'error');
        break;

      case 'set_eq_status':
        setEquipment(prev => prev.map(e => e.name === recordData.name ? { 
          ...e, 
          status: recordData.status,
          hours: recordData.hours || e.hours,
          history: [
            { date: new Date().toLocaleDateString(), user: 'Operations Shop', event: `Status updated to ${recordData.status}`, notes: `Machine hours updated to ${recordData.hours || e.hours} hrs.` },
            ...(e.history || [])
          ]
        } : e));
        addToast(`Asset ${recordData.name} updated to ${recordData.status}`, 'success');
        break;

      case 'edit_equipment':
        setEquipment(prev => prev.map(e => e.id === recordData.id || e.name === recordData.name ? { 
          ...e, 
          name: recordData.name,
          type: recordData.type || e.type,
          hours: recordData.hours || e.hours,
          serviceDueHours: recordData.serviceDueHours || e.serviceDueHours,
          operator: recordData.operator || e.operator,
          history: [
            { date: new Date().toLocaleDateString(), user: 'Asset Manager', event: 'Profile Edited', notes: 'Details altered.' },
            ...(e.history || [])
          ]
        } : e));
        addToast(`Successfully updated machinery configuration`, 'success');
        break;

      case 'schedule_disruption':
        setAlerts(prev => [
          { 
            id: `al-${Date.now()}`, 
            title: `Weather/Service Outage: ${recordData.cause}`, 
            body: recordData.notes || 'Winds gusting over crane limits. Delaying heavy transfers.', 
            time: 'Just Now', 
            severity: 'High', 
            location: 'All Sites' 
          }, 
          ...prev
        ]);
        addToast(`Severe Alert broadcasted: ${recordData.cause}`, 'info');
        break;

      default:
        addToast(`Saved information: ${recordType}`, 'success');
        break;
    }
  };

  // Searching logic across all lists
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    const results: { id: string, name: string, type: 'job' | 'client' | 'crew' | 'equipment', sub: string }[] = [];

    jobs.forEach(j => {
      if (j.title.toLowerCase().includes(query) || (j.client && j.client.toLowerCase().includes(query))) {
        results.push({ id: j.id, name: j.title, type: 'job', sub: `Project &bull; ${j.client || 'JDT'}` });
      }
    });

    clients.forEach(c => {
      if (c.name.toLowerCase().includes(query) || (c.contactName && c.contactName.toLowerCase().includes(query))) {
        results.push({ id: c.id, name: c.name, type: 'client', sub: `Client &bull; ${c.contactName}` });
      }
    });

    crews.forEach(cr => {
      if (cr.name.toLowerCase().includes(query) || cr.skills.some((s: string) => s.toLowerCase().includes(query))) {
        results.push({ id: cr.id, name: cr.name, type: 'crew', sub: `Personnel &bull; ${getPersonnelRoleDisplayName(cr.role)}` });
      }
    });

    equipment.forEach(e => {
      if (e.name.toLowerCase().includes(query)) {
        results.push({ id: e.id, name: e.name, type: 'equipment', sub: `Heavy Fleet &bull; Status: ${e.status}` });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, jobs, clients, crews, equipment]);

  const activeJobsCount = jobs.filter(j => j.status !== 'completed').length;
  const metrics = {
    activeJobs: activeJobsCount,
    activeLoads: loads.filter(l => l.status !== 'Completed').length,
    urgentJobs: jobs.filter(j => j.status === 'urgent').length,
    openTasks: 0,
  };

  const handleSearchResultClick = (res: any) => {
    setSearchQuery('');
    if (res.type === 'job') {
      openDrawer('job', res.name);
    } else if (res.type === 'client') {
      setActiveTab('clients');
    } else if (res.type === 'crew') {
      setActiveTab('crews');
    } else if (res.type === 'equipment') {
      openDrawer('equipment', res.name);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 min-h-screen bg-jdt-sand text-jdt-text font-sans flex items-center justify-center p-6">
         <div className="bg-jdt-panel border border-jdt-border p-10 max-w-sm w-full rounded-2xl shadow-xl flex flex-col items-center">
            <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center p-2 mb-6 shadow-inner">
               <div className="w-full h-full border-2 border-jdt-primary rounded-full flex items-center justify-center relative overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-jdt-primary text-center leading-tight">JD<br/>Thornton<br/>Nurseries</span>
               </div>
            </div>
            <h1 className="text-2xl font-black text-jdt-primary mb-2 text-center uppercase tracking-tight">Command Center</h1>
            <p className="text-zinc-500 font-semibold mb-8 text-center text-sm">Please sign in with your enterprise Google account to continue.</p>
            <button 
              onClick={signIn}
              className="w-full bg-jdt-primary text-white font-black uppercase py-3 rounded-xl hover:bg-jdt-dark transition-colors shadow-sm"
            >
              Sign In
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-jdt-sand text-jdt-text font-sans selection:bg-jdt-olive selection:text-white pointer-events-auto">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-jdt-primary text-white flex flex-col h-screen shrink-0 shadow-xl transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex lg:h-screen lg:sticky lg:top-0 transition-transform duration-200 ease-in-out`}>
        <div className="p-6 flex flex-col items-center border-b border-white/10 relative">
           {/* Mobile close button */}
           <button 
             onClick={() => setIsSidebarOpen(false)} 
             className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 lg:hidden text-white transition-colors"
             aria-label="Close Menu"
           >
             <X className="h-5 w-5" />
           </button>
           <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center p-2 mb-3 shadow-inner cursor-pointer" onClick={() => { setActiveTab('board'); setIsSidebarOpen(false); }}>
             <div className="w-full h-full border-2 border-jdt-primary rounded-full flex items-center justify-center relative overflow-hidden">
                <span className="text-[8px] font-black uppercase text-jdt-primary text-center leading-tight">JD<br/>Thornton<br/>Nurseries</span>
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-6 custom-scrollbar">
           <nav className="space-y-1">
             {mainNav.map(nav => (
               <button
                 key={nav.id}
                 onClick={() => { setActiveTab(nav.id); setSearchQuery(''); setIsSidebarOpen(false); }}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === nav.id ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
               >
                 <nav.icon className="h-5 w-5 opacity-80" />
                 {nav.label}
               </button>
             ))}
           </nav>

           <div className="h-px bg-white/10 mx-4"></div>

           <nav className="space-y-1">
              {secondaryNav.map(nav => (
                <button
                  key={nav.id}
                  onClick={() => { setActiveTab(nav.id); setSearchQuery(''); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold transition-all group ${activeTab === nav.id ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <nav.icon className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                    {nav.label}
                  </div>
                  {nav.badge && alerts.length > 0 && (
                    <span className="bg-[#C77B22] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      {alerts.length}
                    </span>
                  )}
                </button>
              ))}
           </nav>

           <div className="mt-auto pt-6 border-t border-white/10 mx-2">
             <button
               onClick={logOut}
               className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-zinc-300 hover:bg-white/5 hover:text-white"
             >
               <LogOut className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
               Sign Out
             </button>
           </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-jdt-sand sticky top-0 z-40 border-b border-jdt-border">
           <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Hamburger menu trigger */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-1 rounded-lg bg-jdt-panel border border-jdt-border hover:bg-jdt-sand lg:hidden text-jdt-primary shadow-sm hover:scale-105 transition-all"
                  aria-label="Open Menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('board')}>
                  <div>
                     <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-jdt-primary leading-none uppercase">JD Thornton</h1>
                     <h2 className="text-[11px] sm:text-sm font-bold tracking-[0.2em] text-jdt-olive uppercase mt-1">Command Center</h2>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 bg-jdt-panel border border-jdt-border rounded-lg p-2 shadow-sm">
                    <div className="bg-jdt-sand border border-jdt-border rounded p-1.5 hidden sm:block">
                      <Calendar className="h-4 w-4 text-jdt-text" />
                    </div>
                    <div className="hidden sm:block pr-2">
                      <p className="text-xs font-black text-jdt-text">Thu, May 22, 2026</p>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Updated 8:45 AM</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 bg-jdt-panel border border-jdt-border rounded-lg p-2 shadow-sm">
                    <div className="bg-jdt-sand border border-jdt-border rounded p-1.5">
                      <CloudRain className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="pr-2">
                      <p className="text-xs font-black text-jdt-text">79°F</p>
                      <p className="text-[10px] uppercase text-zinc-500 font-bold">Rain after 3PM</p>
                    </div>
                 </div>

                 <div className="flex items-stretch bg-red-50 border border-jdt-urgent rounded-lg cursor-pointer hover:bg-red-100 transition-colors shadow-sm overflow-hidden animate-pulse" onClick={() => setActiveTab('alerts')}>
                    <div className="bg-jdt-urgent px-3 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="p-2 pr-4 flex items-center gap-3">
                      <p className="text-xl font-black text-jdt-urgent">{alerts.filter(al => al.severity === 'High').length}</p>
                      <div className="leading-none">
                        <p className="text-[9px] font-black uppercase text-jdt-urgent">Severe</p>
                        <p className="text-[9px] font-black uppercase text-jdt-urgent">Alerts</p>
                      </div>
                    </div>
                 </div>

                 {/* Smart Search Bar with Active Overlay Results */}
                 <div className="relative hidden xl:block z-50">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Search jobs, clients, crews, machinery..." 
                      className="w-64 bg-jdt-panel border border-jdt-border rounded-lg pl-9 pr-4 py-2 text-sm font-semibold focus:outline-none focus:border-jdt-olive shadow-sm placeholder:text-zinc-400 font-sans"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    
                    {/* Search results overlay */}
                    {searchQuery && (
                      <div className="absolute top-11 left-0 w-80 bg-white border border-jdt-border rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto z-50 divide-y divide-zinc-100 font-sans">
                        <p className="text-[9px] font-black uppercase text-zinc-400 px-3 py-1.5">Matched Records</p>
                        {searchResults.map(res => (
                          <div 
                            key={`${res.type}-${res.id}`} 
                            onClick={() => handleSearchResultClick(res)}
                            className="px-3 py-2 hover:bg-jdt-sand rounded-lg cursor-pointer transition-colors"
                          >
                            <p className="text-xs font-black text-jdt-text">{res.name}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 mt-0.5" dangerouslySetInnerHTML={{ __html: res.sub }}></p>
                          </div>
                        ))}
                        {searchResults.length === 0 && (
                          <p className="text-xs text-zinc-400 font-bold px-3 py-4 text-center">No matching operational profiles found.</p>
                        )}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </header>

        {/* Dynamic Content Switching Panels */}
        <main className="flex-1 overflow-y-auto p-6 pointer-events-auto">
           <div className="max-w-[1800px] mx-auto min-h-full">
              {activeTab === 'board' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-jdt-primary">Today's Command Board</h2>
                        <p className="text-sm font-semibold text-zinc-500 mt-1">Real-time overview of all divisions and active operations</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={() => openModal('add_new')} className="flex items-center gap-2 bg-jdt-primary text-white px-4 py-2.5 rounded-lg text-sm font-black uppercase shadow-sm hover:bg-jdt-dark transition-colors font-sans">
                           <Plus className="h-4 w-4" /> Add New Record
                         </button>
                         <button onClick={() => setActiveTab('tracker')} className="flex items-center gap-2 bg-jdt-panel border border-jdt-border text-jdt-text px-4 py-2.5 rounded-lg text-sm font-black uppercase shadow-sm hover:bg-jdt-sand transition-colors font-sans">
                           <LayoutGrid className="h-4 w-4" /> View All Jobs
                         </button>
                      </div>
                  </div>

                  {/* 4 Divisions Row Linkable cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
                      {/* 1. RELOCATION / INSTALL */}
                      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                         <div onClick={() => setActiveTab('tracker')} className="bg-jdt-dark px-4 py-3 flex items-center justify-between text-white cursor-pointer hover:bg-jdt-primary transition-colors">
                            <div className="flex items-center gap-2">
                               <MapPin className="h-4 w-4 text-jdt-sand" />
                               <h3 className="font-black uppercase tracking-widest text-sm">Relocation / Install</h3>
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-70" />
                         </div>
                         <div className="px-4 py-1.5 bg-jdt-tan/20 flex items-center justify-center border-b border-jdt-border">
                            <span className="text-[10px] font-black uppercase tracking-widest text-jdt-dark flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> High Priority</span>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                            <div className="flex gap-4">
                               <div className="w-24 h-20 bg-zinc-200 rounded-lg overflow-hidden shrink-0 relative border border-zinc-300">
                                 <img src="https://images.unsplash.com/photo-1587140411306-69502b48e3a4?q=80&w=400&auto=format&fit=crop" alt="Golf Course" className="w-full h-full object-cover animate-pulse" />
                                </div>
                               <div>
                                 <h4 className="text-lg font-black uppercase text-jdt-text leading-tight cursor-pointer hover:underline" onClick={() => openDrawer('job', 'Waterford Golf Club')}>Waterford<br/>Golf Club</h4>
                                 <p className="text-xs font-bold text-zinc-500 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Delray Beach, FL</p>
                               </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-jdt-border">
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><Clock className="h-3 w-3"/> Start</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">6:30 AM</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400">Phase</p>
                                 <span className="inline-block px-1.5 py-0.5 bg-[#D4E2CD] text-jdt-primary font-black uppercase text-[10px] rounded mt-0.5 border border-[#B3CBA8] truncate">Root Prune 2</span>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><User className="h-3 w-3"/> Lead</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">Unassigned</p>
                               </div>
                            </div>
                            
                            <div className="mt-4 flex-1">
                               <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">Equipment Assigned</p>
                               <div className="flex gap-4">
                                  <div className="text-center">
                                    <div className="bg-jdt-sand border border-jdt-border p-2 rounded-lg mb-1 h-10 w-16 mx-auto flex items-center justify-center">
                                      <Wrench className="h-5 w-5 text-jdt-olive" />
                                    </div>
                                    <p className="text-[10px] font-black text-jdt-text leading-tight">Komatsu</p>
                                    <p className="text-[9px] font-bold text-zinc-500">Loader</p>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-jdt-sand border border-jdt-border p-2 rounded-lg mb-1 h-10 w-16 mx-auto flex items-center justify-center">
                                      <Truck className="h-5 w-5 text-jdt-olive" />
                                    </div>
                                    <p className="text-[10px] font-black text-jdt-text leading-tight">Semi #4</p>
                                    <p className="text-[9px] font-bold text-zinc-500">Truck</p>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="mt-5 flex items-center justify-between pt-3 border-t border-jdt-border">
                               <div className="flex items-center gap-2">
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jdt-success opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-jdt-success"></span>
                                  </span>
                                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">On Schedule</p>
                               </div>
                               <button onClick={() => openDrawer('job', 'Waterford Golf Club')} className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-3 py-1.5 rounded text-jdt-text hover:bg-jdt-border transition-colors font-sans">Details &rarr;</button>
                            </div>
                         </div>
                      </div>

                      {/* 2. FREIGHT DISPATCH */}
                      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                         <div onClick={() => setActiveTab('freight')} className="bg-jdt-olive px-4 py-3 flex items-center justify-between text-white cursor-pointer hover:bg-[#637243] transition-colors">
                            <div className="flex items-center gap-2">
                               <Truck className="h-4 w-4 text-jdt-sand" />
                               <h3 className="font-black uppercase tracking-widest text-sm">Freight Dispatch</h3>
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-70" />
                         </div>
                         <div className="px-4 py-1.5 bg-yellow-105 bg-yellow-50 flex items-center justify-center border-b border-yellow-250 border-yellow-200">
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-800 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> DOT Permit Check</span>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                            <div className="flex gap-4">
                               <div className="w-24 h-20 bg-zinc-200 rounded-lg overflow-hidden shrink-0 relative border border-zinc-300">
                                 <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=400&auto=format&fit=crop" alt="Semi Truck" className="w-full h-full object-cover" />
                               </div>
                               <div>
                                 <h4 className="text-lg font-black uppercase text-jdt-text leading-tight cursor-pointer hover:underline" onClick={() => openDrawer('freight', 'FRT-0522-01')}>Truck #4<br/>Dispatch</h4>
                                 <p className="text-xs font-bold text-zinc-500 mt-1 leading-snug">Clewiston &rarr;<br/>Boca Raton</p>
                               </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-jdt-border">
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><User className="h-3 w-3"/> Driver</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">Unassigned</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><Clock className="h-3 w-3"/> Depart</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">5:30 AM</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400">ETA</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">11:15 AM</p>
                               </div>
                            </div>
                            
                            <div className="mt-4 flex-1">
                               <p className="text-[10px] font-black uppercase text-zinc-400 mb-2">Transport Equipment</p>
                               <div className="flex gap-4">
                                  <div className="text-center">
                                    <div className="bg-jdt-sand border border-jdt-border p-2 rounded-lg mb-1 h-10 w-16 mx-auto flex items-center justify-center font-bold">
                                      Semi #4
                                    </div>
                                    <p className="text-[9px] font-bold text-zinc-500">Truck Rig</p>
                                  </div>
                                  <div className="text-center">
                                    <div className="bg-jdt-sand border border-jdt-border p-2 rounded-lg mb-1 h-10 w-16 mx-auto flex items-center justify-center font-bold">
                                      Lowboy #2
                                    </div>
                                    <p className="text-[9px] font-bold text-zinc-500">Flatbed</p>
                                  </div>
                               </div>
                            </div>
                            
                            <div className="mt-5 flex items-center justify-between pt-3 border-t border-jdt-border">
                               <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-jdt-success animate-ping"></div>
                                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">On Time</p>
                               </div>
                               <button onClick={() => openDrawer('freight', 'FRT-0522-01')} className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-3 py-1.5 rounded text-jdt-text hover:bg-jdt-border transition-colors font-sans">Dispatch &rarr;</button>
                            </div>
                         </div>
                      </div>

                      {/* 3. NURSERY PRODUCTION */}
                      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                         <div onClick={() => setActiveTab('inventory')} className="bg-[#6B7C4B] px-4 py-3 flex items-center justify-between text-white cursor-pointer hover:bg-[#5C6A40] transition-colors">
                            <div className="flex items-center gap-2">
                               <Leaf className="h-4 w-4 text-jdt-sand" />
                               <h3 className="font-black uppercase tracking-widest text-sm">Nursery Production</h3>
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-70" />
                         </div>
                         <div className="px-4 py-1.5 bg-jdt-tan/10 flex items-center justify-center border-b border-jdt-border">
                            <span className="text-[10px] font-black uppercase tracking-widest text-jdt-dark flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Growth Check</span>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                            <div className="flex gap-4">
                               <div className="w-24 h-full min-h-[140px] bg-zinc-200 rounded-lg overflow-hidden shrink-0 relative border border-zinc-300">
                                 <img src="https://images.unsplash.com/photo-1592424005688-662f55fb84ec?q=80&w=400&auto=format&fit=crop" alt="Tree Farm" className="w-full h-full object-cover" />
                               </div>
                               <div className="flex-1">
                                 <ul className="space-y-4">
                                   <li className="flex gap-2">
                                     <CheckCircle className="h-4 w-4 text-jdt-success shrink-0 mt-0.5" />
                                     <div>
                                        <p className="text-xs font-black text-jdt-text leading-tight">Fertilize Block C</p>
                                        <p className="text-[9px] font-bold text-zinc-500 pt-0.5">6:00 AM</p>
                                     </div>
                                   </li>
                                   <li className="flex gap-2">
                                     <Truck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                                     <div>
                                        <p className="text-xs font-black text-jdt-text leading-tight">Load Seagate Order</p>
                                        <p className="text-[9px] font-bold text-zinc-500 pt-0.5">10:00 AM</p>
                                     </div>
                                   </li>
                                 </ul>
                               </div>
                            </div>
                            
                            <div className="mt-5 flex items-center justify-between pt-3 border-t border-jdt-border">
                               <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-[#82995D]"></div>
                                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">Production</p>
                               </div>
                               <button onClick={() => setActiveTab('inventory')} className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-3 py-1.5 rounded text-jdt-text hover:bg-jdt-border transition-colors font-sans">Nursery &rarr;</button>
                            </div>
                         </div>
                      </div>

                      {/* 4. MAINTENANCE / EQUIPMENT */}
                      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                         <div onClick={() => setActiveTab('equipment')} className="bg-[#935231] px-4 py-3 flex items-center justify-between text-white cursor-pointer hover:bg-[#854523] transition-colors">
                            <div className="flex items-center gap-2">
                               <Wrench className="h-4 w-4 text-jdt-sand" />
                               <h3 className="font-black uppercase tracking-widest text-sm">Maintenance / Equip</h3>
                            </div>
                            <ChevronRight className="h-4 w-4 opacity-70" />
                         </div>
                         <div className="px-4 py-1.5 bg-red-100 flex items-center justify-center border-b border-red-200">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-800 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Diagnostic Warning</span>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                            <div className="flex gap-4">
                               <div className="w-24 h-20 bg-zinc-200 rounded-lg overflow-hidden shrink-0 relative border border-zinc-300 flex items-center justify-center p-2">
                                 <Truck className="h-12 w-12 text-jdt-tan animate-bounce" />
                               </div>
                               <div>
                                 <h4 className="text-lg font-black uppercase text-jdt-text leading-tight cursor-pointer hover:underline" onClick={() => openDrawer('equipment', 'CAT 988G Loader')}>CAT 988G<br/>Loader</h4>
                                 <p className="text-xs font-bold text-zinc-500 mt-1 leading-snug"><MapPin className="h-3 w-3 inline mr-1" />Waterford Jobsite</p>
                               </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 py-3 border-y border-jdt-border">
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><User className="h-3 w-3"/> Lead</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">Unassigned</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><Clock className="h-3 w-3"/> Hours</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">5,430 hrs</p>
                               </div>
                               <div>
                                 <p className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1"><Droplet className="h-3 w-3"/> Fuel</p>
                                 <p className="text-xs font-black text-jdt-text mt-0.5">62%</p>
                               </div>
                            </div>
                            
                            <div className="mt-5 flex items-center justify-between pt-3 border-t border-jdt-border">
                               <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-jdt-alert"></div>
                                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-600">Service Due</p>
                               </div>
                               <button onClick={() => openDrawer('equipment', 'CAT 988G Loader')} className="text-[10px] font-black uppercase bg-jdt-sand border border-jdt-border px-3 py-1.5 rounded text-jdt-text hover:bg-jdt-border transition-colors font-sans font-sans">Details &rarr;</button>
                            </div>
                         </div>
                      </div>
                  </div>

                  {/* Operational Board HUD shortcuts (Fully interactive) */}
                  <div className="grid grid-cols-1 xl:grid-cols-[300px_360px_1fr] gap-4 pt-4">
                     <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-black uppercase text-sm flex items-center gap-2 mb-4 text-jdt-text"><AlertTriangle className="h-4 w-4 text-jdt-urgent" /> Active Alerts</h3>
                          <ul className="space-y-4">
                            {alerts.slice(0, 3).map(al => (
                              <li key={al.id} className="flex items-start justify-between gap-4 border-b border-jdt-border pb-3 last:border-0 last:pb-0">
                                 <div className="flex items-start gap-2">
                                    <div className={`h-2 w-2 mt-1.5 rounded-full shrink-0 ${al.severity === 'High' ? 'bg-jdt-urgent' : 'bg-jdt-alert'}`}></div>
                                    <div>
                                      <p className="text-xs font-black text-jdt-text leading-tight">{al.title}</p>
                                      <p className="text-[10px] font-semibold text-zinc-500 mt-1 lines-2 leading-relaxed">{al.body}</p>
                                    </div>
                                 </div>
                                 <span className="text-[9px] font-black uppercase text-zinc-400 shrink-0">{al.time}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button onClick={() => setActiveTab('alerts')} className="text-[10px] font-black uppercase tracking-wide text-zinc-500 hover:text-jdt-text mt-4 text-left font-sans">View All Alerts &rarr;</button>
                     </div>

                     <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-black uppercase text-sm flex items-center gap-2 mb-4 text-jdt-text"><Calendar className="h-4 w-4 text-jdt-olive" /> Calendar Scheduling</h3>
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3 border-b border-jdt-border pb-2">
                                <span className="text-[11px] font-black text-jdt-primary w-12">May 21</span>
                                <span className="text-xs font-bold text-zinc-700 flex-1 truncate">Bellaire Club Root Prune</span>
                                <span className="bg-jdt-primary text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">REL</span>
                             </div>
                             <div className="flex items-center gap-3 border-b border-jdt-border pb-2">
                                <span className="text-[11px] font-black text-jdt-primary w-12">May 22</span>
                                <span className="text-xs font-bold text-zinc-700 flex-1 truncate">Dispatch FRT-0522-04</span>
                                <span className="bg-sky-700 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">FRT</span>
                             </div>
                             <div className="flex items-center gap-3 border-b border-jdt-border pb-2">
                                <span className="text-[11px] font-black text-jdt-primary w-12">May 23</span>
                                <span className="text-xs font-bold text-zinc-700 flex-1 truncate">Boca West CC Relocate</span>
                                <span className="bg-jdt-primary text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">REL</span>
                             </div>
                             <div className="flex items-center gap-3 pb-2">
                                <span className="text-[11px] font-black text-jdt-primary w-12">May 25</span>
                                <span className="text-xs font-bold text-zinc-700 flex-1 truncate">CAT 988 Check</span>
                                <span className="bg-[#935231] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">EQP</span>
                             </div>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab('calendar')} className="text-[10px] font-black uppercase tracking-wide text-zinc-500 hover:text-jdt-text mt-4 text-left font-sans">View Calendar &rarr;</button>
                     </div>

                     <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-black uppercase text-sm flex items-center gap-2 mb-4 text-jdt-text"><MapPin className="h-4 w-4 text-jdt-olive" /> Operational Land Map</h3>
                          <div className="relative min-h-[140px] flex-1 rounded-lg border border-jdt-border overflow-hidden bg-zinc-900 isolate">
                             <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200&auto=format&fit=crop" alt="Satellite Map View" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                             <div className="absolute inset-0 bg-jdt-dark/30"></div>
                             <div className="absolute top-4 left-1/4 h-5 w-5 bg-jdt-success rounded-full border-2 border-white shadow flex items-center justify-center">
                               <MapPin className="h-2.5 w-2.5 text-white animate-bounce" />
                             </div>
                             <div className="absolute top-12 left-2/3 h-5 w-5 bg-sky-500 rounded-full border-2 border-white shadow flex items-center justify-center animate-pulse">
                               <Truck className="h-2.5 w-2.5 text-white" />
                             </div>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab('maps')} className="text-[10px] font-black uppercase tracking-wide text-zinc-500 hover:text-jdt-text mt-4 text-center font-sans">View Full Lands Map &rarr;</button>
                     </div>
                  </div>
                </div>
              )}

              {activeTab === 'tracker' && (
                <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-jdt-border bg-jdt-sand/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-black text-jdt-primary">Relocation Project Tracking</h2>
                      <p className="text-sm font-bold text-zinc-500">Master tracker of active tree spade moves and onsite plantings</p>
                    </div>
                    <button onClick={() => openModal('job')} className="px-4 py-2.5 text-xs font-black uppercase bg-jdt-primary text-white rounded-lg hover:bg-jdt-dark font-sans shadow-sm">
                      + Create Job
                    </button>
                  </div>
                  <div className="overflow-x-auto text-sm">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-jdt-sand text-zinc-500 border-b border-jdt-border">
                        <tr>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Project Name</th>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Site Client</th>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Status</th>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Target Date</th>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Crew/Contact</th>
                           <th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px] text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-jdt-border">
                        {jobs.filter(j => j.division === 'relocation' || j.division === 'nursery').map(job => (
                          <tr 
                            key={job.id} 
                            className="hover:bg-jdt-sand cursor-pointer transition-colors"
                            onClick={() => openDrawer('job', job.title)}
                          >
                            <td className="px-5 py-4 font-extrabold text-[#384521]">
                              {job.title}
                            </td>
                            <td className="px-5 py-4 font-bold text-zinc-600">
                              {job.client || 'General Client'}
                            </td>
                            <td className="px-5 py-4">
                              {(() => {
                                 const color = job.status === 'urgent' ? 'bg-red-100 text-red-800' : job.status === 'onSchedule' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
                                 return <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-black uppercase ${color}`}>{job.status}</span>
                              })()}
                            </td>
                            <td className="px-5 py-4 font-bold text-zinc-500">
                              {job.date || 'TBD'}
                            </td>
                            <td className="px-5 py-4 font-bold text-zinc-600">
                              {job.crew || 'Unassigned'} &bull; {job.contact || 'PM'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-zinc-500 hover:text-jdt-text border border-jdt-border bg-white rounded shadow-sm">View Profile</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <NurseryBoard starterRanchOaks={ranchOaks} openDrawer={openDrawer} openModal={openModal} />
              )}
              {activeTab === 'freight' && (
                <FreightBoard loads={loads} openDrawer={openDrawer} openModal={openModal} />
              )}
              {activeTab === 'equipment' && (
                <EquipmentBoard starterEquipment={equipment} openDrawer={openDrawer} openModal={openModal} />
              )}
              {activeTab === 'sheets' && (
                <SyncBoard openModal={openModal} openDrawer={openDrawer} />
              )}

              {/* Seamless implementation of missing tabs */}
              {activeTab === 'crews' && (
                <CrewsBoard crews={crews} openModal={openModal} openDrawer={openDrawer} />
              )}
              {activeTab === 'clients' && (
                <ClientsBoard clients={clients} openModal={openModal} openDrawer={openDrawer} />
              )}
              {activeTab === 'alerts' && (
                <AlertsBoard alerts={alerts} setAlerts={setAlerts} openModal={openModal} />
              )}
              {activeTab === 'calendar' && (
                <CalendarBoard jobs={jobs} loads={loads} openDrawer={openDrawer} />
              )}
              {activeTab === 'maps' && (
                <MapsBoard jobs={jobs} loads={loads} openDrawer={openDrawer} />
              )}
              {activeTab === 'reports' && (
                <ReportsBoard />
              )}
              {activeTab === 'documents' && (
                <DocumentsBoard openModal={openModal} />
              )}
              {activeTab === 'settings' && (
                <SettingsBoard openModal={openModal} />
              )}
           </div>
        </main>
      </div>

      {/* Global Toast Overlay Notifications */}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`shadow-2xl rounded-xl p-4 min-w-[300px] text-white flex items-center justify-between border select-none pointer-events-auto transition-transform ${t.type === 'error' ? 'bg-red-800 border-red-900' : t.type === 'info' ? 'bg-[#935231] border-amber-950' : 'bg-[#384521] border-[#293414]'}`}
          >
            <p className="text-xs font-black uppercase tracking-wide">{t.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="ml-3 p-1 rounded hover:bg-white/10 text-white/80 hover:text-white shrink-0">
               <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Detail drawers & Forms */}
      <CommandDrawer 
        isOpen={drawerConfig.isOpen} 
        onClose={() => setDrawerConfig(c => ({...c, isOpen: false}))}
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
        onClose={() => setModalConfig(c => ({...c, isOpen: false}))}
        type={modalConfig.type}
        data={modalConfig.data}
        openModal={openModal}
        onSaveRecord={onSaveRecord}
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

function Metric({ label, value, tone }: { label: string, value: number, tone: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${tone} text-white`}>
      <p className="text-[11px] font-black uppercase tracking-wide opacity-85">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function InfoTag({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </div>
      <p className="mt-1 break-words text-sm font-black text-zinc-950">{value}</p>
    </div>
  );
}

function ListTag({ icon: Icon, label, items }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-500">
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </div>
      <ul className="mt-1 space-y-1">
        {items.map((it: string, i: number) => (
          <li key={i} className="flex gap-2 text-sm font-semibold leading-snug text-zinc-800">
             <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500"></span>
             <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
