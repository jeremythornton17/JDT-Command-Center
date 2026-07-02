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

  it("shows the operating board with readiness filters, pipeline, and division-specific work order actions", () => {
    const appSource = readProjectFile("src/App.tsx");

    assert.match(appSource, /relocationReadinessFilters/);
    assert.match(appSource, /Needs Scheduling/);
    assert.match(appSource, /Needs Map Cleanup/);
    assert.match(appSource, /Tree Relocation Pipeline/);
    assert.match(appSource, /Readiness \/ Blockers/);
    assert.match(appSource, /Create Work Order/);
    assert.match(appSource, /Root Pruning/);
    assert.match(appSource, /Relocation Move/);
    assert.match(appSource, /Installation/);
    assert.match(appSource, /Nutrient Care/);
  });

  it("adds project profile readiness, map, contracts, and field update tabs for relocation projects", () => {
    const drawerSource = readProjectFile("src/components/CommandDrawer.tsx");

    assert.match(drawerSource, /\['overview', 'readiness', 'work orders', 'trees', 'map', 'equipment', 'freight', 'contracts', 'documents', 'field updates', 'financials', 'history'\]/);
    assert.match(drawerSource, /ProjectReadinessPanel/);
    assert.match(drawerSource, /ProjectMapReadinessPanel/);
    assert.match(drawerSource, /Project Readiness/);
    assert.match(drawerSource, /Map \/ GIS Readiness/);
    assert.match(drawerSource, /Contracts/);
    assert.match(drawerSource, /Create Move Work/);
    assert.match(drawerSource, /Request Freight/);
  });
});
