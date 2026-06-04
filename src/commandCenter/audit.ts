import type { CommandRecord, HistoryEntry } from './records';

export type AuditContext = {
  actorEmail?: string | null;
  now?: string;
  event: string;
  notes?: string;
};

export function stampRecordForSave<T extends CommandRecord>(
  record: Partial<T> & { id: string },
  existing: T | undefined,
  context: AuditContext,
): T {
  const now = context.now || new Date().toISOString();
  const actor = context.actorEmail || 'Command Center';
  const historyEntry: HistoryEntry = {
    date: now,
    user: actor,
    event: context.event,
    notes: context.notes || '',
  };

  return {
    ...(existing || {}),
    ...record,
    createdAtIso: existing?.createdAtIso || record.createdAtIso || now,
    createdBy: existing?.createdBy || record.createdBy || actor,
    updatedAtIso: now,
    updatedBy: actor,
    history: [historyEntry, ...(existing?.history || [])],
  } as T;
}

export function auditEventForRecordType(recordType: string, isUpdate: boolean) {
  const normalized = recordType.replace(/^edit_/, '').replace(/_/g, ' ');
  return `${isUpdate ? 'Updated' : 'Created'} ${normalized}`;
}
