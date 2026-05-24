import React from 'react';
import { Database, FolderSync, FileSpreadsheet, AlertTriangle, Columns } from 'lucide-react';

type SyncBoardProps = {
  openModal: (type: string, data?: any) => void;
  openDrawer?: (type: string, id: string) => void;
};

export default function SyncBoard({ openModal }: SyncBoardProps) {
  const sources: any[] = [];
  const mappings: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Data Sync</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Connect real trackers, spreadsheets, and Drive sources when you are ready</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('syncSource')}
          className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors"
        >
          <FolderSync className="h-4 w-4" /> Connect Source
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-jdt-olive" />
            <div>
              <p className="text-xs font-black uppercase text-zinc-400">Sources</p>
              <p className="text-2xl font-black text-jdt-text">{sources.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Columns className="h-5 w-5 text-jdt-olive" />
            <div>
              <p className="text-xs font-black uppercase text-zinc-400">Mappings</p>
              <p className="text-2xl font-black text-jdt-text">{mappings.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs font-black uppercase text-zinc-400">Errors</p>
              <p className="text-2xl font-black text-jdt-text">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-jdt-border px-4 py-3">
          <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-jdt-olive" /> Tracker Sources
          </h3>
        </div>
        <div className="p-10 text-center">
          <FolderSync className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-black text-jdt-text">No tracker sources connected yet</p>
          <p className="text-xs font-bold text-zinc-500 mt-1">Add your actual Google Sheets or Drive sources to start syncing real operational data.</p>
          <button
            type="button"
            onClick={() => openModal('syncSource')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive transition-colors"
          >
            <Database className="h-4 w-4" /> Add Source
          </button>
        </div>
      </div>
    </div>
  );
}
