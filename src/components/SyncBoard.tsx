import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Columns, Database, FileSpreadsheet, FolderSync, Upload } from 'lucide-react';
import type { ImportBatchRecord, SyncMappingRecord, SyncSourceRecord } from '../commandCenter/records';
import {
  dataSyncDraftStorageKey,
  parseDataSyncDraft,
  serializeDataSyncDraft,
  type DataSyncDraft,
} from '../commandCenter/syncDraft';
import {
  buildImportPreview,
  isProjectWorkbookTemplateId,
  pasteHeadersForTemplate,
  previewDetailsForRecord,
  previewSummary,
  sheetImportTemplates,
  type ImportPreview,
  type ProjectImportContext,
  type SheetImportTemplateId,
} from '../commandCenter/sheetImport';

type SyncBoardProps = {
  sources: SyncSourceRecord[];
  mappings: SyncMappingRecord[];
  importBatches?: ImportBatchRecord[];
  openModal: (type: string, data?: SyncSourceRecord | SyncMappingRecord) => void;
  openDrawer?: (type: string, id: string) => void;
  onImportPreview?: (preview: ImportPreview) => void | Promise<void>;
  onRollbackImport?: (batchId: string) => void;
  canImport?: boolean;
  projectImportContext?: ProjectImportContext | null;
};

function readInitialDataSyncDraft(): DataSyncDraft | null {
  if (typeof window === 'undefined') return null;
  return parseDataSyncDraft(window.localStorage.getItem(dataSyncDraftStorageKey));
}

function clearDataSyncDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(dataSyncDraftStorageKey);
}

function previewFromDraft(draft: DataSyncDraft | null): ImportPreview | null {
  if (!draft?.pastedRows.trim()) return null;

  try {
    return buildImportPreview(draft.templateId, draft.pastedRows, { projectContext: draft.projectContext });
  } catch {
    return null;
  }
}

export default function SyncBoard({ sources, mappings, importBatches = [], openModal, onImportPreview, onRollbackImport, canImport = true, projectImportContext = null }: SyncBoardProps) {
  const [initialDraft] = useState(readInitialDataSyncDraft);
  const [selectedTemplateId, setSelectedTemplateId] = useState<SheetImportTemplateId>(
    initialDraft?.templateId || (projectImportContext ? 'jdt_project_flow_tree_assets' : 'inventory'),
  );
  const [pastedRows, setPastedRows] = useState(initialDraft?.pastedRows || '');
  const [preview, setPreview] = useState<ImportPreview | null>(() => previewFromDraft(initialDraft));
  const [activeProjectContext, setActiveProjectContext] = useState<ProjectImportContext | null>(projectImportContext || initialDraft?.projectContext || null);
  const [error, setError] = useState('');
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.pastedRows.trim()));
  const [isSavingImport, setIsSavingImport] = useState(false);
  const selectedTemplate = useMemo(() => sheetImportTemplates.find((template) => template.id === selectedTemplateId) || sheetImportTemplates[0], [selectedTemplateId]);
  const selectedPasteHeaders = useMemo(() => pasteHeadersForTemplate(selectedTemplate), [selectedTemplate]);
  const selectedProjectContext = isProjectWorkbookTemplateId(selectedTemplateId) ? activeProjectContext : null;
  const previewWarnings = useMemo(() => preview ? Array.from(new Set([...preview.warnings, ...preview.targets.flatMap((target) => target.warnings)])) : [], [preview]);
  const previewRecordCount = preview?.targets.reduce((sum, target) => sum + target.records.length, 0) || 0;

  useEffect(() => {
    if (projectImportContext) {
      setActiveProjectContext(projectImportContext);
      setSelectedTemplateId((current) => isProjectWorkbookTemplateId(current) ? current : 'jdt_project_flow_tree_assets');
      setPreview(null);
      setError('');
    }
  }, [projectImportContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pastedRows.trim()) {
      clearDataSyncDraft();
      return;
    }

    window.localStorage.setItem(dataSyncDraftStorageKey, serializeDataSyncDraft({
      templateId: selectedTemplateId,
      pastedRows,
      savedAtIso: new Date().toISOString(),
      projectContext: selectedProjectContext || undefined,
    }));
  }, [pastedRows, selectedTemplateId, selectedProjectContext]);

  const handlePreview = () => {
    setError('');
    if (!pastedRows.trim()) {
      setPreview(null);
      setError('Paste rows from the selected master list before previewing.');
      return;
    }

    try {
      setPreview(buildImportPreview(selectedTemplateId, pastedRows, { projectContext: selectedProjectContext }));
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Unable to build import preview.');
    }
  };

  const handleSaveImport = async () => {
    if (!preview) {
      handlePreview();
      return;
    }

    if (!canImport) {
      setError('Your account can preview imports, but saving imports is limited to office/admin users.');
      return;
    }

    if (!onImportPreview) {
      setError('Import saving is not connected for this app session.');
      return;
    }

    setIsSavingImport(true);
    setError('');

    try {
      await onImportPreview(preview);
      clearDataSyncDraft();
      setPastedRows('');
      setPreview(null);
      setDraftRestored(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save import.';
      setError(`${message} Your pasted rows are still saved as a local draft.`);
    } finally {
      setIsSavingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Data Sync</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Use the JDT Command Center workbook as the single spreadsheet source of truth.</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('sync_source', { id: `sync-source-${Date.now().toString(36)}`, status: 'Needs Setup' })}
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

      <section className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-jdt-border px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
            <Upload className="h-4 w-4 text-jdt-olive" /> Master List Import Staging
          </h3>
          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
            Source workbook: JDT Command Center / Setup tab: App Import Setup
          </p>
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value as SheetImportTemplateId);
                setPreview(null);
                setError('');
                setDraftRestored(false);
                if (!isProjectWorkbookTemplateId(event.target.value as SheetImportTemplateId)) setActiveProjectContext(null);
              }}
              className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-black uppercase text-jdt-text outline-none focus:border-jdt-olive"
            >
              {sheetImportTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" /> Preview
            </button>
            <button
              type="button"
              onClick={handleSaveImport}
              disabled={isSavingImport || !preview || previewRecordCount === 0 || !onImportPreview || !canImport}
              className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> {isSavingImport ? 'Saving...' : 'Save to App'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-3">
            {selectedProjectContext ? (
              <div className="rounded-lg border border-jdt-border bg-jdt-sand px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">Importing To Project</p>
                <p className="mt-1 text-sm font-black text-jdt-text">
                  {[selectedProjectContext.clientName, selectedProjectContext.projectName || selectedProjectContext.projectId, selectedProjectContext.jobName || selectedProjectContext.jobId].filter(Boolean).join(' > ')}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide text-zinc-500">
              <span className="rounded bg-jdt-sand px-2 py-1">{selectedTemplate.sourceSheet}</span>
              <span className="rounded bg-jdt-sand px-2 py-1">{selectedTemplate.targetCollections.join(', ')}</span>
            </div>
            <textarea
              value={pastedRows}
              onChange={(event) => {
                setPastedRows(event.target.value);
                setPreview(null);
                setError('');
                setDraftRestored(false);
              }}
              placeholder={`${selectedPasteHeaders.join('\t')}\n...`}
              className="min-h-[220px] w-full resize-y rounded-lg border border-jdt-border bg-white p-3 font-mono text-xs text-jdt-text outline-none focus:border-jdt-olive"
            />
            {draftRestored && pastedRows.trim() && (
              <p className="rounded-lg border border-jdt-border bg-jdt-sand px-3 py-2 text-xs font-black text-jdt-primary">Unsaved draft restored from this browser.</p>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{error}</p>
            )}
          </div>

          <aside className="rounded-lg border border-jdt-border bg-white p-4">
            {preview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-400">Preview</p>
                  <p className="mt-1 text-lg font-black text-jdt-primary">{previewSummary(preview)}</p>
                </div>

                {preview.targets.map((target) => (
                  <div key={target.collectionName} className="border-t border-jdt-border pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase text-jdt-text">{target.collectionName}</p>
                      <span className="rounded bg-jdt-sand px-2 py-1 text-[10px] font-black text-zinc-600">{target.records.length}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {target.records.slice(0, 4).map((record) => {
                        const details = previewDetailsForRecord(selectedTemplate, record);
                        return (
                          <div key={record.id} className="rounded-lg border border-jdt-border bg-jdt-panel/60 px-2.5 py-2">
                            <p className="truncate text-xs font-black text-jdt-text">{String(record.name || record.title || record.id)}</p>
                            {details.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {details.map((detail) => (
                                  <span key={`${record.id}-${detail.label}`} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-black uppercase text-zinc-500">
                                    {detail.label}: <span className="text-jdt-text">{detail.value}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {target.records.length > 4 && (
                        <p className="text-[10px] font-black uppercase text-zinc-400">+{target.records.length - 4} more</p>
                      )}
                    </div>
                  </div>
                ))}

                {previewWarnings.length > 0 && (
                  <div className="border-t border-jdt-border pt-3">
                    <p className="text-[10px] font-black uppercase text-amber-700">Warnings</p>
                    <div className="mt-2 space-y-1.5">
                      {previewWarnings.slice(0, 5).map((warning) => (
                        <p key={warning} className="text-xs font-bold leading-snug text-amber-900">{warning}</p>
                      ))}
                      {previewWarnings.length > 5 && <p className="text-[10px] font-black uppercase text-amber-700">+{previewWarnings.length - 5} more</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
                <FileSpreadsheet className="mb-3 h-10 w-10 text-zinc-300" />
                <p className="text-sm font-black text-jdt-text">No import staged</p>
                <p className="mt-1 max-w-xs text-xs font-bold text-zinc-500">Preview keeps the spreadsheet as the working source while the app receives clean Firestore records.</p>
                {!canImport && <p className="mt-2 text-[10px] font-black uppercase text-amber-700">Preview only for this account</p>}
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-jdt-border px-4 py-3">
          <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-jdt-olive" /> Import Batch History
          </h3>
        </div>
        <div className="p-4">
          {importBatches.length > 0 ? (
            <div className="divide-y divide-jdt-border rounded-xl border border-jdt-border bg-white">
              {importBatches.slice(0, 10).map((batch) => (
                <div key={batch.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-jdt-text">{batch.name || batch.title || 'Import batch'}</p>
                    <p className="mt-1 text-xs font-bold text-zinc-500">
                      {batch.recordCount} records | {batch.createdCount} created | {batch.updatedCount} updated | {batch.warningCount} warnings
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{batch.actorEmail || 'Command Center'} | {batch.createdAtIso || 'No timestamp'} | {batch.status || 'Applied'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRollbackImport?.(batch.id)}
                    disabled={!onRollbackImport || batch.status === 'Rolled Back' || !canImport}
                    className="inline-flex items-center justify-center rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Roll Back
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-jdt-border p-8 text-center">
              <p className="text-sm font-black text-jdt-text">No import batches yet</p>
              <p className="mt-1 text-xs font-bold text-zinc-500">Saved imports will appear here with rollback details.</p>
            </div>
          )}
        </div>
      </section>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-jdt-border px-4 py-3">
          <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-jdt-olive" /> Tracker Sources
          </h3>
        </div>
        <div className="p-10 text-center">
          {sources.length > 0 ? (
            <div className="mx-auto max-w-3xl divide-y divide-jdt-border rounded-xl border border-jdt-border bg-white text-left">
              {sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => openModal('sync_source', source)}
                  className="flex w-full items-center justify-between gap-4 p-4 hover:bg-jdt-sand/50"
                >
                  <span>
                    <span className="block text-sm font-black text-jdt-text">{source.name || 'Untitled source'}</span>
                    <span className="mt-1 block text-xs font-bold text-zinc-500">{source.sourceType || 'Source'} - {source.status || 'Needs Setup'}</span>
                  </span>
                  <Database className="h-4 w-4 text-jdt-olive" />
                </button>
              ))}
            </div>
          ) : (
            <>
              <FolderSync className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-black text-jdt-text">No tracker sources connected yet</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">Add your actual Google Sheets or Drive sources to start syncing real operational data.</p>
              <button
                type="button"
                onClick={() => openModal('sync_source', { id: `sync-source-${Date.now().toString(36)}`, status: 'Needs Setup' })}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive transition-colors"
              >
                <Database className="h-4 w-4" /> Add Source
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
