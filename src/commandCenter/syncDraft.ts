import { normalizeProjectImportContext, sheetImportTemplates, type ProjectImportContext, type SheetImportTemplateId } from './sheetImport';

export type DataSyncDraft = {
  templateId: SheetImportTemplateId;
  pastedRows: string;
  savedAtIso?: string;
  projectContext?: ProjectImportContext;
};

export const dataSyncDraftStorageKey = 'jdt-command-center:data-sync-draft:v1';

const validTemplateIds = new Set(sheetImportTemplates.map((template) => template.id));

export function serializeDataSyncDraft(draft: DataSyncDraft): string {
  return JSON.stringify({
    templateId: draft.templateId,
    pastedRows: draft.pastedRows,
    savedAtIso: draft.savedAtIso,
    projectContext: normalizeProjectImportContext(draft.projectContext as ProjectImportContext | undefined),
  });
}

export function parseDataSyncDraft(serialized: string | null): DataSyncDraft | null {
  if (!serialized) return null;

  try {
    return normalizeDataSyncDraft(JSON.parse(serialized));
  } catch {
    return null;
  }
}

function normalizeDataSyncDraft(value: unknown): DataSyncDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string, unknown>;
  const templateId = draft.templateId;
  const pastedRows = draft.pastedRows;
  const savedAtIso = draft.savedAtIso;
  const projectContext = normalizeProjectImportContext(draft.projectContext as ProjectImportContext | undefined);

  if (typeof templateId !== 'string' || !validTemplateIds.has(templateId as SheetImportTemplateId)) return null;
  if (typeof pastedRows !== 'string') return null;
  if (savedAtIso !== undefined && typeof savedAtIso !== 'string') return null;

  return {
    templateId: templateId as SheetImportTemplateId,
    pastedRows,
    savedAtIso,
    ...(projectContext ? { projectContext } : {}),
  };
}
