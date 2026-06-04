import { auditEventForRecordType, stampRecordForSave } from './audit';
import type { CommandRecord, ImportBatchRecord } from './records';
import type { ImportPreview } from './sheetImport';

export type ImportCollections = Record<string, CommandRecord[] | undefined>;

export type ImportBatchContext = {
  actorEmail?: string | null;
  nowIso?: string;
};

export type ApplyImportBatchResult = {
  collections: ImportCollections;
  batch: ImportBatchRecord;
};

export function applyImportBatch(
  preview: ImportPreview,
  currentCollections: ImportCollections,
  context: ImportBatchContext = {},
): ApplyImportBatchResult {
  const nowIso = context.nowIso || new Date().toISOString();
  const actorEmail = context.actorEmail || 'Command Center';
  const nextCollections = cloneCollections(currentCollections);
  const batch: ImportBatchRecord = {
    id: `import-${preview.templateId}-${Date.parse(nowIso) || Date.now()}`,
    title: `${preview.label} import`,
    name: `${preview.label} import`,
    templateId: preview.templateId,
    sourceSheet: preview.sourceSheet,
    actorEmail,
    createdAtIso: nowIso,
    recordCount: 0,
    createdCount: 0,
    updatedCount: 0,
    warningCount: new Set([...preview.warnings, ...preview.targets.flatMap((target) => target.warnings)]).size,
    warnings: Array.from(new Set([...preview.warnings, ...preview.targets.flatMap((target) => target.warnings)])),
    targets: [],
    status: 'Applied',
  };

  for (const target of preview.targets) {
    const existing = nextCollections[target.collectionName] || [];
    const byId = new Map(existing.map((record) => [record.id, record]));
    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    const previousRecords: CommandRecord[] = [];

    for (const record of target.records) {
      const previous = byId.get(record.id);
      const stamped = stampRecordForSave(
        record as CommandRecord,
        previous,
        {
          actorEmail,
          now: nowIso,
          event: auditEventForRecordType(`import ${preview.label}`, Boolean(previous)),
          notes: `Imported from ${preview.sourceSheet}`,
        },
      );

      if (previous) {
        updatedIds.push(record.id);
        previousRecords.push({ ...previous });
      } else {
        createdIds.push(record.id);
      }

      byId.set(record.id, stamped);
    }

    nextCollections[target.collectionName] = Array.from(byId.values());
    batch.recordCount += target.records.length;
    batch.createdCount += createdIds.length;
    batch.updatedCount += updatedIds.length;
    batch.targets.push({
      collectionName: target.collectionName,
      label: target.label,
      recordIds: target.records.map((record) => record.id),
      createdIds,
      updatedIds,
      previousRecords,
    });
  }

  return { collections: nextCollections, batch };
}

export function rollbackImportBatch(currentCollections: ImportCollections, batch: ImportBatchRecord): ImportCollections {
  const nextCollections = cloneCollections(currentCollections);

  for (const target of batch.targets) {
    const existing = nextCollections[target.collectionName] || [];
    const byId = new Map(existing.map((record) => [record.id, record]));

    for (const id of target.createdIds) {
      byId.delete(id);
    }

    for (const record of target.previousRecords) {
      byId.set(record.id, record);
    }

    nextCollections[target.collectionName] = Array.from(byId.values());
  }

  return nextCollections;
}

function cloneCollections(collections: ImportCollections): ImportCollections {
  return Object.fromEntries(
    Object.entries(collections).map(([name, records]) => [
      name,
      records ? records.map((record) => ({ ...record })) : records,
    ]),
  );
}
