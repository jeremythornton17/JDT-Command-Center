import React, { useMemo, useState } from 'react';
import { X, MapPin, User, Truck, Wrench, Leaf, Clock, History, Edit2, FileText } from 'lucide-react';

type CommandDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  itemId: string | null;
  defaultTab?: string;
  openModal: (type: string, data?: any) => void;
  jobsList?: any[];
  loadsList?: any[];
  ranchOaksList?: any[];
  equipmentList?: any[];
  crewsList?: any[];
  clientsList?: any[];
};

const drawerConfig: Record<string, { title: string; icon: any; editType: string; collection: keyof CommandDrawerProps }> = {
  job: { title: 'Project', icon: MapPin, editType: 'edit_project', collection: 'jobsList' },
  tree: { title: 'Tree', icon: Leaf, editType: 'edit_tree', collection: 'ranchOaksList' },
  freight: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  load: { title: 'Freight', icon: Truck, editType: 'edit_freight', collection: 'loadsList' },
  equipment: { title: 'Equipment', icon: Wrench, editType: 'equipment', collection: 'equipmentList' },
  employee: { title: 'Employee', icon: User, editType: 'employee', collection: 'crewsList' },
  client: { title: 'Client', icon: User, editType: 'client', collection: 'clientsList' },
};

function matchesRecord(record: any, itemId: string | null) {
  if (!record || !itemId) return false;
  const candidates = [record.id, record.title, record.name, record.treeId, record.client, record.email].filter(Boolean).map(String);
  return candidates.includes(itemId);
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function pickSummaryFields(record: any) {
  const preferred = ['status', 'client', 'location', 'date', 'pm', 'crew', 'driver', 'truck', 'origin', 'delivery', 'operator', 'hours', 'phone', 'email', 'farm', 'zone', 'dbh', 'height', 'spread'];
  const entries = preferred
    .filter((key) => record && Object.prototype.hasOwnProperty.call(record, key))
    .map((key) => [key, record[key]] as const);

  if (entries.length > 0) return entries;
  return Object.entries(record || {}).filter(([key, value]) => !['id', 'history'].includes(key) && typeof value !== 'object').slice(0, 12) as [string, any][];
}

export default function CommandDrawer(props: CommandDrawerProps) {
  const {
    isOpen,
    onClose,
    type,
    itemId,
    defaultTab = 'overview',
    openModal,
  } = props;
  const [activeTab, setActiveTab] = useState(defaultTab);

  const config = drawerConfig[type] || drawerConfig.job;
  const Icon = config.icon;

  const record = useMemo(() => {
    const source = (props[config.collection] as any[]) || [];
    return source.find((item) => matchesRecord(item, itemId));
  }, [props, config.collection, itemId]);

  if (!isOpen) return null;

  const heading = record?.title || record?.name || record?.treeId || itemId || config.title;
  const history = Array.isArray(record?.history) ? record.history : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-jdt-bg shadow-2xl border-l border-jdt-border">
        <div className="sticky top-0 z-10 border-b border-jdt-border bg-jdt-panel/95 backdrop-blur px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-lg bg-jdt-sand border border-jdt-border flex items-center justify-center text-jdt-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{config.title} Profile</p>
                <h2 className="text-xl font-black text-jdt-text truncate">{heading}</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-jdt-border bg-white p-2 text-zinc-500 hover:text-jdt-text">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {['overview', 'history', 'documents'].map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wide border ${activeTab === tab ? 'bg-jdt-primary text-white border-jdt-primary' : 'bg-white text-zinc-600 border-jdt-border hover:border-jdt-olive'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {!record ? (
            <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-sm font-black text-jdt-text">No record found</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">This drawer only shows records that exist in your current workspace.</p>
            </div>
          ) : activeTab === 'overview' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {pickSummaryFields(record).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="mt-1 text-sm font-black text-jdt-text break-words">{displayValue(value)}</p>
                  </div>
                ))}
              </div>
              {record.notes && (
                <div className="rounded-lg border border-jdt-border bg-jdt-panel p-4">
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                  <p className="text-sm font-semibold text-zinc-700 whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openModal(config.editType, record)}
                  className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white hover:bg-jdt-dark transition-colors"
                >
                  <Edit2 className="h-4 w-4" /> Edit Record
                </button>
              </div>
            </>
          ) : activeTab === 'history' ? (
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
              <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2 mb-4"><History className="h-4 w-4 text-jdt-olive" /> History</h3>
              {history.length > 0 ? (
                <ul className="space-y-3">
                  {history.map((item: any, index: number) => (
                    <li key={index} className="border-b border-jdt-border pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-black text-jdt-text">{item.event || 'Update'}</p>
                      <p className="text-[10px] font-bold uppercase text-zinc-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {displayValue(item.date)}</p>
                      {item.notes && <p className="text-xs font-semibold text-zinc-600 mt-1">{item.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-bold text-zinc-500">No history has been recorded for this item yet.</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-10 text-center">
              <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
              <p className="text-sm font-black text-jdt-text">No linked documents yet</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">Attach real permits, photos, bills of lading, or proofs from the documents board.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
