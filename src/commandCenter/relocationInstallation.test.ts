import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyRelocationInstallationJob,
  isRelocationInstallationJob,
  relocationInstallationDivisionLabel,
  relocationInstallationJobFilters,
  relocationInstallationJobTypes,
} from "./relocationInstallation";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(__dirname, "..", "..", relativePath), "utf8");
}

describe("Relocation & Installation jobs", () => {
  it("uses the combined division name across navigation and job setup", () => {
    const appSource = readProjectFile("src/App.tsx");
    const formsSource = readProjectFile("src/components/EntityForms.tsx");

    assert.equal(relocationInstallationDivisionLabel, "Relocation & Installation");
    assert.match(appSource, /label: 'Relocation & Installation'/);
    assert.doesNotMatch(appSource, /label: 'Relocation'/);
    assert.match(formsSource, /relocationInstallationDivisionLabel/);
    assert.match(formsSource, /Job Type/);
    assert.match(formsSource, /relocationInstallationJobTypes/);
  });

  it("classifies straight relocation, straight installation, and mixed jobs", () => {
    assert.deepEqual(relocationInstallationJobTypes, ["Relocation Job", "Installation Job", "Mixed Job"]);
    assert.deepEqual(relocationInstallationJobFilters, ["All", "Relocation Job", "Installation Job", "Mixed Job"]);

    assert.equal(classifyRelocationInstallationJob({ division: "Tree Relocation" }), "Relocation Job");
    assert.equal(classifyRelocationInstallationJob({ division: "Installation" }), "Installation Job");
    assert.equal(classifyRelocationInstallationJob({ jobType: "Mixed Job" }), "Mixed Job");
    assert.equal(classifyRelocationInstallationJob({ workTypes: ["Installation", "Relocation"] }), "Mixed Job");
    assert.equal(classifyRelocationInstallationJob({ installItemCount: 18, relocationTreeCount: 3 }), "Mixed Job");
  });

  it("keeps legacy relocation jobs and new install jobs in the combined board", () => {
    assert.equal(isRelocationInstallationJob({ division: "relocation" }), true);
    assert.equal(isRelocationInstallationJob({ division: "Relocation & Installation" }), true);
    assert.equal(isRelocationInstallationJob({ jobType: "Installation Job" }), true);
    assert.equal(isRelocationInstallationJob({ title: "McArthur Frontyard Installation", client: "McArthur GC" }), true);
    assert.equal(isRelocationInstallationJob({ division: "Freight" }), false);
  });
});
