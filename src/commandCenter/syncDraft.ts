import { normalizeProjectImportContext, sheetImportTemplates, type ProjectImportContext, type SheetImportTemplateId } from './sheetImport';

export type DataSyncDraft = {
  templateId: SheetImportTemplateId;
  pastedRows: string;
  includedHeaders?: string[];
  savedAtIso?: string;
  projectContext?: ProjectImportContext;
};

export const dataSyncDraftStorageKey = 'jdt-command-center:data-sync-draft:v1';

const validTemplateIds = new Set(sheetImportTemplates.map((template) => template.id));

export function serializeDataSyncDraft(draft: DataSyncDraft): string {
  return JSON.stringify({
    templateId: draft.templateId,
    pastedRows: draft.pastedRows,
    includedHeaders: normalizeIncludedHeaders(draft.includedHeaders),
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
  const includedHeaders = normalizeIncludedHeaders(draft.includedHeaders);
  const savedAtIso = draft.savedAtIso;
  const projectContext = normalizeProjectImportContext(draft.projectContext as ProjectImportContext | undefined);

  if (typeof templateId !== 'string' || !validTemplateIds.has(templateId as SheetImportTemplateId)) return null;
  if (typeof pastedRows !== 'string') return null;
  if (savedAtIso !== undefined && typeof savedAtIso !== 'string') return null;

  return {
    templateId: templateId as SheetImportTemplateId,
    pastedRows,
    ...(includedHeaders.length ? { includedHeaders } : {}),
    savedAtIso,
    ...(projectContext ? { projectContext } : {}),
  };
}

function normalizeIncludedHeaders(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
