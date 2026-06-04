export type CollectionRecord = {
  id: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

export type CollectionDataAction<T> = T[] | ((prev: T[]) => T[]);

export type CollectionSyncOperation<T extends CollectionRecord> =
  | {
      type: "set";
      collectionName: string;
      id: string;
      data: T & { createdAt: unknown; updatedAt: unknown };
    }
  | {
      type: "delete";
      collectionName: string;
      id: string;
    };

export function resolveNextCollectionData<T>(prev: T[], action: CollectionDataAction<T>): T[] {
  if (typeof action === "function") {
    return action(prev.map(item => ({ ...item })));
  }
  return action;
}

export function buildCollectionSyncOperations<T extends CollectionRecord>(
  collectionName: string,
  prev: T[],
  next: T[],
  writeTimestamp: unknown,
): CollectionSyncOperation<T>[] {
  const prevMap = new Map(prev.map(item => [item.id, item]));
  const nextMap = new Map(next.map(item => [item.id, item]));
  const operations: CollectionSyncOperation<T>[] = [];

  for (const item of next) {
    const prevItem = prevMap.get(item.id);
    if (stableStringify(prevItem) === stableStringify(item)) continue;

    operations.push({
      type: "set",
      collectionName,
      id: item.id,
      data: stripUndefinedForFirestore({
        ...item,
        createdAt: item.createdAt ?? prevItem?.createdAt ?? writeTimestamp,
        updatedAt: writeTimestamp,
      }) as T & { createdAt: unknown; updatedAt: unknown },
    });
  }

  for (const item of prev) {
    if (!nextMap.has(item.id)) {
      operations.push({
        type: "delete",
        collectionName,
        id: item.id,
      });
    }
  }

  return operations;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = sortValue((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

export function stripUndefinedForFirestore(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(stripUndefinedForFirestore)
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    const cleaned = stripUndefinedForFirestore(entry);
    if (cleaned !== undefined) acc[key] = cleaned;
    return acc;
  }, {});
}

function isPlainObject(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
