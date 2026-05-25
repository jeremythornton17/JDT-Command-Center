import { useState } from 'react';
import { Settings, Shield, Key, Database, FileSpreadsheet, ArrowUpRight, Trash2 } from 'lucide-react';
import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthProvider';

type SettingsBoardProps = {
  openModal: (type: string, data?: any) => void;
};

export default function SettingsBoard({ openModal }: SettingsBoardProps) {
  const { isAdmin } = useAuth();
  const [clearingType, setClearingType] = useState<string | null>(null);
  const sections = [
    { icon: Shield, title: 'Security', description: 'Review Firebase rules, user access, and app protection settings.' },
    { icon: Key, title: 'API Keys', description: 'Add your Google Drive, Picker, and Maps credentials from environment variables.' },
    { icon: Database, title: 'Data', description: 'Start with an empty workspace and add your actual operational records.' },
    { icon: FileSpreadsheet, title: 'Sources', description: 'No tracker sources connected yet.' },
  ];
  const clearActions = [
    { type: 'clear_jobs', label: 'Projects', collections: ['jobs'] },
    { type: 'clear_freight', label: 'Freight', collections: ['loads'] },
    { type: 'clear_trees', label: 'Trees', collections: ['ranchOaks'] },
    { type: 'clear_crews', label: 'Crews', collections: ['crews'] },
    { type: 'clear_equipment', label: 'Equipment', collections: ['equipment'] },
    { type: 'clear_clients', label: 'Clients', collections: ['clients'] },
    { type: 'clear_alerts', label: 'Alerts', collections: ['alerts'] },
    { type: 'clear_all', label: 'Everything', collections: ['jobs', 'loads', 'ranchOaks', 'equipment', 'crews', 'clients', 'alerts'] },
  ];

  const clearCollections = async (action: typeof clearActions[number]) => {
    const confirmed = window.confirm(`Clear ${action.label.toLowerCase()} from Firebase? This cannot be undone.`);
    if (!confirmed) return;

    setClearingType(action.type);
    try {
      for (const collectionName of action.collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        await Promise.all(snapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));
      }
      window.alert(`${action.label} cleared.`);
    } catch (error) {
      console.error('Unable to clear Firebase data', error);
      window.alert('Firebase data could not be cleared. Check your Firestore rules and try again.');
    } finally {
      setClearingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Settings</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Configure the command center around your real data sources</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('settings')}
          className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors"
        >
          <Settings className="h-4 w-4" /> Open Settings
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(({ icon: Icon, title, description }) => (
          <button
            type="button"
            key={title}
            onClick={() => openModal('settings', { section: title })}
            className="rounded-xl border border-jdt-border bg-jdt-panel p-5 text-left shadow-sm hover:border-jdt-olive transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-jdt-sand border border-jdt-border flex items-center justify-center text-jdt-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase text-jdt-text">{title}</h3>
                  <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                </div>
                <p className="text-xs font-bold text-zinc-500 mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <section className={`rounded-xl border bg-white p-5 shadow-sm ${isAdmin ? 'border-red-200' : 'border-jdt-border'}`}>
        <div className="flex flex-col gap-2 border-b border-red-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className={`text-sm font-black uppercase ${isAdmin ? 'text-red-900' : 'text-jdt-text'}`}>Data Reset</h3>
            <p className={`mt-1 text-xs font-bold ${isAdmin ? 'text-red-700' : 'text-zinc-500'}`}>
              {isAdmin
                ? 'Clear old Firebase records before entering current operating data.'
                : 'Data reset is limited to Jeremy and jdtnurseries.com admin accounts.'}
            </p>
          </div>
          <Database className={`h-5 w-5 ${isAdmin ? 'text-red-700' : 'text-zinc-400'}`} />
        </div>
        {isAdmin && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {clearActions.map((action) => (
              <button
                key={action.type}
                type="button"
                onClick={() => clearCollections(action)}
                disabled={clearingType !== null}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black uppercase text-red-800 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> {clearingType === action.type ? 'Clearing' : 'Clear'} {action.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
