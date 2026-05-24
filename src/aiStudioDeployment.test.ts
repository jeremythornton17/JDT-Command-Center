import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("AI Studio deployment source guard", () => {
  it("keeps the Cloud Run server entrypoint in the source branch", () => {
    const packageJson = JSON.parse(readProjectFile("package.json"));

    assert.equal(packageJson.scripts.start, "node server.js");
    assert.equal(existsSync(path.join(repoRoot, "server.js")), true);
    assert.equal(existsSync(path.join(repoRoot, "src/treeRelocationMap.ts")), true);
  });

  it("keeps the maps board on tree relocation instead of removed fleet providers", () => {
    const mapsBoard = readProjectFile("src/components/MapsBoard.tsx");

    assert.match(mapsBoard, /Field Maps & Tree Relocation/);
    assert.doesNotMatch(mapsBoard, /Verizon|Michelin/i);
  });

  it("does not request removed fleet provider credentials", () => {
    const filesToCheck = [
      ".env.example",
      "README.md",
      "src/components/MapsBoard.tsx",
      "package.json",
    ];

    for (const filePath of filesToCheck) {
      assert.doesNotMatch(readProjectFile(filePath), /Verizon|Michelin/i, `${filePath} contains removed fleet provider copy`);
    }
  });

  it("does not seed blank workspaces with mock operational records", () => {
    const firestoreHook = readProjectFile("src/useFirestoreCollection.ts");

    assert.equal(existsSync(path.join(repoRoot, "src/commandCenter/seedData.ts")), false);
    assert.doesNotMatch(firestoreHook, /Seed database|initialData\.forEach|initialData\.map|initialData\.length/);
  });
});
