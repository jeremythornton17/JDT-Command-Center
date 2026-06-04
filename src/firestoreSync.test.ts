import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCollectionSyncOperations, resolveNextCollectionData } from "./firestoreSync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("Firestore sync helpers", () => {
  it("builds merge writes with metadata only for changed records", () => {
    const prev = [
      { id: "job-1", title: "Oak move", status: "Scheduled", createdAt: "old-created", updatedAt: "old-updated" },
      { id: "job-2", title: "Palm move", status: "Scheduled", createdAt: "old-created", updatedAt: "old-updated" },
    ];
    const next = [
      { id: "job-1", title: "Oak move", status: "Complete", createdAt: "old-created", updatedAt: "old-updated" },
      { id: "job-3", title: "New move", status: "Scheduled" },
    ];

    const operations = buildCollectionSyncOperations("jobs", prev, next, "now");

    assert.deepEqual(operations, [
      {
        type: "set",
        collectionName: "jobs",
        id: "job-1",
        data: { id: "job-1", title: "Oak move", status: "Complete", createdAt: "old-created", updatedAt: "now" },
      },
      {
        type: "set",
        collectionName: "jobs",
        id: "job-3",
        data: { id: "job-3", title: "New move", status: "Scheduled", createdAt: "now", updatedAt: "now" },
      },
      {
        type: "delete",
        collectionName: "jobs",
        id: "job-2",
      },
    ]);
  });

  it("strips undefined values from Firestore write payloads", () => {
    const operations = buildCollectionSyncOperations("equipment", [], [
      {
        id: "equipment-loader-komatsu-500-1",
        name: "Komatsu 500 - 1",
        serviceIntervalDays: undefined,
        currentLocationName: "",
        nested: {
          keep: "value",
          drop: undefined,
        },
        list: ["Bucket", undefined, "Forks"],
      },
    ], "now");

    assert.deepEqual(operations, [
      {
        type: "set",
        collectionName: "equipment",
        id: "equipment-loader-komatsu-500-1",
        data: {
          id: "equipment-loader-komatsu-500-1",
          name: "Komatsu 500 - 1",
          currentLocationName: "",
          nested: { keep: "value" },
          list: ["Bucket", "Forks"],
          createdAt: "now",
          updatedAt: "now",
        },
      },
    ]);
  });

  it("resolves React-style collection updater functions outside state side effects", () => {
    const prev = [{ id: "tree-1", status: "Needs Source Pin" }];

    const next = resolveNextCollectionData(prev, records => records.map(record => ({ ...record, status: "Pinned" })));

    assert.deepEqual(next, [{ id: "tree-1", status: "Pinned" }]);
    assert.deepEqual(prev, [{ id: "tree-1", status: "Needs Source Pin" }]);
  });

  it("awaits Firestore batch commits before import screens can clear staged data", () => {
    const hookSource = readProjectFile("src/useFirestoreCollection.ts");

    assert.match(hookSource, /const customSetData = useCallback\(async/);
    assert.match(hookSource, /await batch\.commit\(\)/);
    assert.match(hookSource, /return true/);
    assert.match(hookSource, /return false/);
  });
});
