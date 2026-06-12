import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, Columns, Database, FileSpreadsheet, FolderSync, Upload } from 'lucide-react';
import type { DocumentRecord, ImportBatchRecord, ProjectMaterialItemRecord, ProjectRecord, SyncMappingRecord, SyncSourceRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import {
  dataSyncDraftStorageKey,
  parseDataSyncDraft,
  serializeDataSyncDraft,
  type DataSyncDraft,
} from '../commandCenter/syncDraft';
import {
  columnTextsToDelimitedRows,
  delimitedRowsToColumnTexts,
  emptyColumnTexts,
  previewRowsFromColumnTexts,
  type ImportPasteGridColumns,
} from '../commandCenter/importPasteGrid';
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
import { writeWorkbookExportTablesToSheets } from '../commandCenter/googleSheetsSync';
import { buildProjectWorkbookExport, buildWorkbookSetupTables, canonicalProjectWorkbookTabNames, workbookExportTableToTsv } from '../commandCenter/workbookProjectFlow';

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
  projects?: ProjectRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  workOrders?: WorkOrderRecord[];
  projectMaterialItems?: ProjectMaterialItemRecord[];
  documents?: DocumentRecord[];
  authorizeGoogleSheetsAccess?: () => Promise<string>;
};

const systemManagedImportColumns = new Set([
  'Tree_Asset_ID',
  'Project_ID',
  'Client_ID',
  'Root_Pruning_ID',
  'Nutrient_Care_ID',
  'Tree_Photo_ID',
  'Material_Item_ID',
  'App_Record_ID',
  'App_Updated_At',
  'Last_Sync_Batch_ID',
  'Schema_Version',
]);

const projectTreeBasicHeaders = ['Tree_Type', 'Tag', 'DBH_IN'];

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
    return buildImportPreview(draft.templateId, draft.pastedRows, { projectContext: draft.projectContext, includedHeaders: draft.includedHeaders });
  } catch {
    return null;
  }
}

function defaultHeadersForTemplate(templateId: SheetImportTemplateId, projectContext?: ProjectImportContext | null): string[] {
  const template = sheetImportTemplates.find((item) => item.id === templateId) || sheetImportTemplates[0];
  const headers = pasteHeadersForTemplate(template);
  if (template.id === 'jdt_project_flow_tree_assets' && projectContext) return projectTreeBasicHeaders;
  const operationalHeaders = headers.filter((header) => !systemManagedImportColumns.has(header));
  return operationalHeaders.length ? operationalHeaders : headers;
}

function normalizeSelectedHeaders(templateId: SheetImportTemplateId, headers: string[]): string[] {
  const template = sheetImportTemplates.find((item) => item.id === templateId) || sheetImportTemplates[0];
  const available = new Set(pasteHeadersForTemplate(template));
  const seen = new Set<string>();
  return headers.filter((header) => {
    if (!available.has(header) || seen.has(header)) return false;
    seen.add(header);
    return true;
  });
}

function exampleValueForHeader(header: string): string {
  const examples: Record<string, string> = {
    'Client Company': 'A Cut Above',
    'Contact Name': 'Damon Rockett',
    Phone: '561-386-1770',
    'JDT Equipment Master List': 'Truck',
    Make: 'Dodge',
    Model: 'Ram 2500',
    'Location Name': 'Main Office',
    'Main Address': '1010 E Sugarland Hwy, Clewiston, FL 33440',
    'Staff Name': 'Christian Crespo',
    Role: 'Driver',
    Tree_Type: 'Live Oak',
    Tag: '1',
    DBH_IN: '33',
    Height: '18 ft',
    Spread: '20 ft',
    Material_Type: 'Pine',
    Quantity_Required: '12',
  };
  return examples[header] || '';
}

function alignColumnTexts(headers: string[], columns: ImportPasteGridColumns): ImportPasteGridColumns {
  return Object.fromEntries(headers.map((header) => [header, columns[header] || '']));
}

export default function SyncBoard({
  sources,
  mappings,
  importBatches = [],
  openModal,
  onImportPreview,
  onRollbackImport,
  canImport = true,
  projectImportContext = null,
  projects = [],
  treeRelocationRecords = [],
  workOrders = [],
  projectMaterialItems = [],
  documents = [],
  authorizeGoogleSheetsAccess,
}: SyncBoardProps) {
  const [initialDraft] = useState(readInitialDataSyncDraft);
  const initialTemplateId = initialDraft?.templateId || (projectImportContext ? 'jdt_project_flow_tree_assets' : 'inventory');
  const initialImportHeaders = initialDraft?.includedHeaders ? normalizeSelectedHeaders(initialTemplateId, initialDraft.includedHeaders) : [];
  const initialSelectedHeaders = initialImportHeaders.length
    ? initialImportHeaders
    : defaultHeadersForTemplate(initialTemplateId, projectImportContext || initialDraft?.projectContext || null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<SheetImportTemplateId>(initialTemplateId);
  const [selectedImportHeaders, setSelectedImportHeaders] = useState<string[]>(initialSelectedHeaders);
  const [columnPasteValues, setColumnPasteValues] = useState<ImportPasteGridColumns>(() => (
    initialDraft?.pastedRows
      ? delimitedRowsToColumnTexts(initialSelectedHeaders, initialDraft.pastedRows)
      : emptyColumnTexts(initialSelectedHeaders)
  ));
  const [preview, setPreview] = useState<ImportPreview | null>(() => previewFromDraft(initialDraft));
  const [activeProjectContext, setActiveProjectContext] = useState<ProjectImportContext | null>(projectImportContext || initialDraft?.projectContext || null);
  const [error, setError] = useState('');
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft?.pastedRows.trim()));
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [selectedExportSheetName, setSelectedExportSheetName] = useState<string>(canonicalProjectWorkbookTabNames[1]);
  const [copyMessage, setCopyMessage] = useState('');
  const [isWritingWorkbook, setIsWritingWorkbook] = useState(false);
  const [isWritingWorkbookSetup, setIsWritingWorkbookSetup] = useState(false);
  const selectedTemplate = useMemo(() => sheetImportTemplates.find((template) => template.id === selectedTemplateId) || sheetImportTemplates[0], [selectedTemplateId]);
  const workbookColumnOptions = useMemo(() => pasteHeadersForTemplate(selectedTemplate), [selectedTemplate]);
  const selectedPasteHeaders = selectedImportHeaders.length ? selectedImportHeaders : workbookColumnOptions;
  const pastedRows = useMemo(() => columnTextsToDelimitedRows(selectedPasteHeaders, columnPasteValues), [selectedPasteHeaders, columnPasteValues]);
  const gridPreviewRows = useMemo(() => previewRowsFromColumnTexts(selectedPasteHeaders, columnPasteValues), [selectedPasteHeaders, columnPasteValues]);
  const selectedProjectContext = isProjectWorkbookTemplateId(selectedTemplateId) ? activeProjectContext : null;
  const previewWarnings = useMemo(() => preview ? Array.from(new Set([...preview.warnings, ...preview.targets.flatMap((target) => target.warnings)])) : [], [preview]);
  const previewRecordCount = preview?.targets.reduce((sum, target) => sum + target.records.length, 0) || 0;
  const exportTables = useMemo(() => buildProjectWorkbookExport({
    projects,
    treeAssets: treeRelocationRecords,
    workOrders,
    materialItems: projectMaterialItems,
    documents,
  }), [projects, treeRelocationRecords, workOrders, projectMaterialItems, documents]);
  const selectedExportTable = exportTables.find((table) => table.sheetName === selectedExportSheetName) || exportTables[0];
  const selectedExportText = selectedExportTable ? workbookExportTableToTsv(selectedExportTable) : '';
  const exportRecordCount = selectedExportTable?.rows.length || 0;

  useEffect(() => {
    if (projectImportContext) {
      const nextTemplateId = isProjectWorkbookTemplateId(selectedTemplateId) ? selectedTemplateId : 'jdt_project_flow_tree_assets';
      const nextHeaders = defaultHeadersForTemplate(nextTemplateId, projectImportContext);
      setActiveProjectContext(projectImportContext);
      setSelectedTemplateId(nextTemplateId);
      setSelectedImportHeaders(nextHeaders);
      setColumnPasteValues((current) => alignColumnTexts(nextHeaders, current));
      setPreview(null);
      setError('');
    }
  }, [projectImportContext, selectedTemplateId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pastedRows.trim()) {
      clearDataSyncDraft();
      return;
    }

    window.localStorage.setItem(dataSyncDraftStorageKey, serializeDataSyncDraft({
      templateId: selectedTemplateId,
      pastedRows,
      includedHeaders: selectedPasteHeaders,
      savedAtIso: new Date().toISOString(),
      projectContext: selectedProjectContext || undefined,
    }));
  }, [pastedRows, selectedTemplateId, selectedPasteHeaders, selectedProjectContext]);

  const handlePreview = () => {
    setError('');
    if (!pastedRows.trim()) {
      setPreview(null);
      setError('Paste rows from the selected master list before previewing.');
      return;
    }
    if (!selectedPasteHeaders.length) {
      setPreview(null);
      setError('Choose at least one workbook column before previewing.');
      return;
    }

    try {
      setPreview(buildImportPreview(selectedTemplateId, pastedRows, { projectContext: selectedProjectContext, includedHeaders: selectedPasteHeaders }));
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
      setColumnPasteValues(emptyColumnTexts(selectedPasteHeaders));
      setPreview(null);
      setDraftRestored(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save import.';
      setError(`${message} Your pasted rows are still saved as a local draft.`);
    } finally {
      setIsSavingImport(false);
    }
  };

  const handleCopyExport = async () => {
    if (!selectedExportText) return;
    setCopyMessage('');

    try {
      await navigator.clipboard.writeText(selectedExportText);
      setCopyMessage(`Copied ${selectedExportTable.sheetName} backup rows.`);
    } catch {
      setCopyMessage('Copy failed. Select the export text and copy it manually.');
    }
  };

  const handleWriteWorkbook = async () => {
    if (!selectedExportTable || !authorizeGoogleSheetsAccess) return;
    setCopyMessage('');
    setIsWritingWorkbook(true);

    try {
      const accessToken = await authorizeGoogleSheetsAccess();
      await writeWorkbookExportTablesToSheets({
        accessToken,
        tables: [selectedExportTable],
      });
      setCopyMessage(`Wrote ${selectedExportTable.sheetName} to the JDT Command Center workbook.`);
    } catch (err) {
      setCopyMessage(err instanceof Error ? err.message : 'Unable to write the workbook through Google Sheets API.');
    } finally {
      setIsWritingWorkbook(false);
    }
  };

  const handleWriteWorkbookSetup = async () => {
    if (!authorizeGoogleSheetsAccess) return;
    setCopyMessage('');
    setIsWritingWorkbookSetup(true);

    try {
      const accessToken = await authorizeGoogleSheetsAccess();
      const setupTables = buildWorkbookSetupTables();
      const result = await writeWorkbookExportTablesToSheets({
        accessToken,
        tables: [...setupTables, ...exportTables],
      });
      setCopyMessage(`Wrote ${result.sheetNames.length} workbook tabs to the JDT Command Center workbook.`);
    } catch (err) {
      setCopyMessage(err instanceof Error ? err.message : 'Unable to write the workbook setup through Google Sheets API.');
    } finally {
      setIsWritingWorkbookSetup(false);
    }
  };

  const toggleImportHeader = (header: string) => {
    setSelectedImportHeaders((current) => {
      const next = current.includes(header)
        ? current.filter((item) => item !== header)
        : workbookColumnOptions.filter((option) => [...current, header].includes(option));
      setColumnPasteValues((columns) => alignColumnTexts(next.length ? next : workbookColumnOptions, columns));
      return next;
    });
    setPreview(null);
    setError('');
  };

  const useDefaultImportHeaders = () => {
    const nextHeaders = defaultHeadersForTemplate(selectedTemplateId, selectedProjectContext);
    setSelectedImportHeaders(nextHeaders);
    setColumnPasteValues((current) => alignColumnTexts(nextHeaders, current));
    setPreview(null);
    setError('');
  };

  const selectAllImportHeaders = () => {
    setSelectedImportHeaders(workbookColumnOptions);
    setColumnPasteValues((current) => alignColumnTexts(workbookColumnOptions, current));
    setPreview(null);
    setError('');
  };

  const clearPasteGrid = () => {
    setColumnPasteValues(emptyColumnTexts(selectedPasteHeaders));
    setPreview(null);
    setError('');
    setDraftRestored(false);
  };

  const updateGridColumn = (header: string, value: string) => {
    setColumnPasteValues((current) => ({ ...current, [header]: value }));
    setPreview(null);
    setError('');
    setDraftRestored(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Import / Backup</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Use the JDT Command Center workbook for bulk entry, imports, and backup exports.</p>
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
                const nextTemplateId = event.target.value as SheetImportTemplateId;
                const nextProjectContext = isProjectWorkbookTemplateId(nextTemplateId) ? activeProjectContext : null;
                const nextHeaders = defaultHeadersForTemplate(nextTemplateId, nextProjectContext);
                setSelectedTemplateId(nextTemplateId);
                setSelectedImportHeaders(nextHeaders);
                setColumnPasteValues(emptyColumnTexts(nextHeaders));
                setPreview(null);
                setError('');
                setDraftRestored(false);
                if (!isProjectWorkbookTemplateId(nextTemplateId)) setActiveProjectContext(null);
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
            <div className="rounded-lg border border-jdt-border bg-white p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">Workbook Columns</p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Paste only the selected columns in this order. App generated columns can stay unchecked unless you are restoring a full backup row.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={useDefaultImportHeaders}
                    className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive"
                  >
                    Basics
                  </button>
                  <button
                    type="button"
                    onClick={selectAllImportHeaders}
                    className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive"
                  >
                    All Columns
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {workbookColumnOptions.map((header) => {
                  const checked = selectedPasteHeaders.includes(header);
                  const systemManaged = systemManagedImportColumns.has(header);
                  return (
                    <label
                      key={header}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-black uppercase transition-colors ${checked ? 'border-jdt-olive bg-jdt-sand text-jdt-primary' : 'border-jdt-border bg-jdt-panel text-zinc-500 hover:border-jdt-olive'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleImportHeader(header)}
                        className="h-3.5 w-3.5 accent-jdt-primary"
                      />
                      <span>{header}</span>
                      {systemManaged && <span className="rounded bg-white px-1.5 py-0.5 text-[9px] text-zinc-400">App generated</span>}
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg bg-jdt-sand px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Selected Paste Order</p>
                <p className="mt-1 break-words font-mono text-xs font-bold text-jdt-text">{selectedPasteHeaders.join(' | ') || 'Choose at least one workbook column'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-jdt-border bg-white">
              <div className="flex flex-col gap-2 border-b border-jdt-border px-3 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">Spreadsheet Paste Grid</p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">Paste each workbook column separately. Rows line up by line number, then Preview assembles the import rows.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-jdt-sand px-2 py-1 text-[10px] font-black uppercase text-zinc-500">{gridPreviewRows.length} rows staged</span>
                  <button
                    type="button"
                    onClick={clearPasteGrid}
                    className="rounded-lg border border-jdt-border bg-jdt-panel px-3 py-1.5 text-[10px] font-black uppercase text-jdt-text hover:border-jdt-olive"
                  >
                    Clear Grid
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div
                  className="grid min-w-[680px] border-b border-jdt-border"
                  style={{ gridTemplateColumns: `repeat(${selectedPasteHeaders.length}, minmax(180px, 1fr))` }}
                >
                  {selectedPasteHeaders.map((header) => {
                    const example = exampleValueForHeader(header);
                    return (
                      <div key={header} className="border-r border-jdt-border last:border-r-0">
                        <div className="border-b border-jdt-border bg-jdt-sand px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">{header}</p>
                          <p className="mt-0.5 text-[10px] font-bold text-zinc-500">{example ? `Example: ${example}` : 'Paste one value per line'}</p>
                        </div>
                        <textarea
                          aria-label={`${header} column values`}
                          value={columnPasteValues[header] || ''}
                          onChange={(event) => updateGridColumn(header, event.target.value)}
                          placeholder={`${header} column values${example ? `\n${example}\n${example}` : ''}`}
                          rows={10}
                          className="block h-56 w-full resize-y border-0 bg-white p-3 font-mono text-xs leading-6 text-jdt-text outline-none focus:bg-jdt-panel"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Row Preview</p>
                  {gridPreviewRows.length > 6 && <p className="text-[10px] font-black uppercase text-zinc-400">Showing 6 of {gridPreviewRows.length}</p>}
                </div>
                {gridPreviewRows.length > 0 ? (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-jdt-border">
                    <table className="min-w-full divide-y divide-jdt-border text-left text-xs">
                      <thead className="bg-jdt-sand">
                        <tr>
                          <th className="w-12 px-2 py-2 text-[10px] font-black uppercase text-zinc-500">Row</th>
                          {selectedPasteHeaders.map((header) => (
                            <th key={header} className="px-2 py-2 text-[10px] font-black uppercase text-jdt-primary">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-jdt-border bg-white">
                        {gridPreviewRows.slice(0, 6).map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-2 py-2 font-black text-zinc-400">{row.rowNumber}</td>
                            {row.cells.map((cell, index) => (
                              <td key={`${row.rowNumber}-${selectedPasteHeaders[index]}`} className="px-2 py-2 font-mono text-jdt-text">{cell || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg border border-dashed border-jdt-border bg-jdt-panel px-3 py-4 text-center text-xs font-bold text-zinc-500">
                    Paste values into one or more selected columns to stage rows.
                  </p>
                )}
              </div>
            </div>
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
        <div className="border-b border-jdt-border px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
              <ClipboardCopy className="h-4 w-4 text-jdt-olive" /> Workbook Backup Export
            </h3>
            <p className="mt-1 text-xs font-bold text-zinc-500">Copy app records back into the matching JDT Command Center workbook tab by stable ID.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedExportTable?.sheetName || selectedExportSheetName}
              onChange={(event) => {
                setSelectedExportSheetName(event.target.value);
                setCopyMessage('');
              }}
              className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-xs font-black uppercase text-jdt-text outline-none focus:border-jdt-olive"
            >
              {exportTables.map((table) => (
                <option key={table.sheetName} value={table.sheetName}>{table.sheetName}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCopyExport}
              className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy Export
            </button>
            <button
              type="button"
              onClick={handleWriteWorkbook}
              disabled={!authorizeGoogleSheetsAccess || !canImport || isWritingWorkbook || isWritingWorkbookSetup}
              className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" /> {isWritingWorkbook ? 'Writing...' : 'Write to Workbook'}
            </button>
            <button
              type="button"
              onClick={handleWriteWorkbookSetup}
              disabled={!authorizeGoogleSheetsAccess || !canImport || isWritingWorkbook || isWritingWorkbookSetup}
              className="inline-flex items-center gap-2 rounded-lg bg-jdt-olive px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" /> {isWritingWorkbookSetup ? 'Writing Setup...' : 'Write Setup'}
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <textarea
            value={selectedExportText}
            readOnly
            className="min-h-[180px] w-full resize-y rounded-lg border border-jdt-border bg-white p-3 font-mono text-xs text-jdt-text outline-none"
          />
          <aside className="rounded-lg border border-jdt-border bg-white p-4">
            <p className="text-[10px] font-black uppercase text-zinc-400">Selected Tab</p>
            <p className="mt-1 text-lg font-black text-jdt-primary">{selectedExportTable?.sheetName}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                <p className="text-[10px] font-black uppercase text-zinc-400">Rows</p>
                <p className="text-xl font-black text-jdt-text">{exportRecordCount}</p>
              </div>
              <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                <p className="text-[10px] font-black uppercase text-zinc-400">Columns</p>
                <p className="text-xl font-black text-jdt-text">{selectedExportTable?.columns.length || 0}</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-bold leading-relaxed text-zinc-500">
              Export rows include durable project backup details. Temporary dispatch details like which truck a crew used stay in the app event history unless they belong to the permanent record.
            </p>
            {copyMessage && <p className="mt-3 rounded-lg border border-jdt-border bg-jdt-sand px-3 py-2 text-xs font-black text-jdt-primary">{copyMessage}</p>}
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
