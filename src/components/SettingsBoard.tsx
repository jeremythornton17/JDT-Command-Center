import React from 'react';
import { Settings, Shield, Key, Database, FileSpreadsheet, ArrowUpRight, Trash2 } from 'lucide-react';

type SettingsBoardProps = {
  openModal: (type: string, data?: any) => void;
};

export default function SettingsBoard({ openModal }: SettingsBoardProps) {
  const sections = [
    { icon: Shield, title: 'Security', description: 'Review Firebase rules, user access, and app protection settings.' },
    { icon: Key, title: 'API Keys', description: 'Add your Google Drive, Picker, and Maps credentials from environment variables.' },
    { icon: Database, title: 'Data', description: 'Start with an empty workspace and add your actual operational records.' },
    { icon: FileSpreadsheet, title: 'Sources', description: 'No tracker sources connected yet.' },
  ];
  const clearActions = [
    { type: 'clear_jobs', label: 'Projects' },
    { type: 'clear_freight', label: 'Freight' },
    { type: 'clear_trees', label: 'Trees' },
    { type: 'clear_crews', label: 'Crews' },
    { type: 'clear_equipment', label: 'Equipment' },
    { type: 'clear_clients', label: 'Clients' },
    { type: 'clear_alerts', label: 'Alerts' },
    { type: 'clear_all', label: 'Everything' },
  ];

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

      <section className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-red-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-red-900">Data Reset</h3>
            <p className="mt-1 text-xs font-bold text-red-700">Clear old Firebase records before entering current operating data.</p>
          </div>
          <Database className="h-5 w-5 text-red-700" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {clearActions.map((action) => (
            <button
              key={action.type}
              type="button"
              onClick={() => openModal(action.type)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black uppercase text-red-800 transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Clear {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
