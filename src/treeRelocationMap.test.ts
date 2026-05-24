import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTreeRelocationTasks,
  formatTreeCoordinate,
  getGoogleMapsConfig,
  getTreeRelocationStatus,
  mapPercentToLatLng,
  updateTreeRelocationPoint,
} from "./treeRelocationMap";

describe("tree relocation map helpers", () => {
  it("reads optional Google Maps browser configuration", () => {
    assert.deepEqual(getGoogleMapsConfig({}), { apiKey: "", mapId: "", isReady: false });
    assert.deepEqual(getGoogleMapsConfig({ VITE_GOOGLE_MAPS_API_KEY: "maps-key", VITE_GOOGLE_MAPS_MAP_ID: "map-id" }), {
      apiKey: "maps-key",
      mapId: "map-id",
      isReady: true,
    });
  });

  it("derives a tree relocation status from source and destination pins", () => {
    assert.equal(getTreeRelocationStatus({}), "Needs Source Pin");
    assert.equal(getTreeRelocationStatus({ relocationMap: { source: { lat: 26.1, lng: -80.2 } } }), "Needs Destination Pin");
    assert.equal(
      getTreeRelocationStatus({
        relocationMap: {
          source: { lat: 26.1, lng: -80.2 },
          destination: { lat: 26.2, lng: -80.3 },
        },
      }),
      "Root Pruning",
    );
    assert.equal(getTreeRelocationStatus({ status: "Relocated" }), "Relocated");
  });

  it("creates source and destination relocation points without losing existing map data", () => {
    const tree = updateTreeRelocationPoint(
      { treeId: "LO-101", relocationMap: { destination: { lat: 26.2, lng: -80.3, label: "Final pad" } } },
      "source",
      { lat: 26.1, lng: -80.2, label: "Field Block A", accuracyMeters: 8 },
      "Buck Thornton",
    );

    assert.equal(tree.relocationMap.source.label, "Field Block A");
    assert.equal(tree.relocationMap.source.recordedBy, "Buck Thornton");
    assert.equal(tree.relocationMap.source.accuracyMeters, 8);
    assert.equal(tree.relocationMap.destination.label, "Final pad");
  });

  it("builds task assignments for relocation field work", () => {
    const tasks = buildTreeRelocationTasks({
      treeId: "LO-101",
      rootPruneDate1: "2026-05-01",
      relocationMap: {
        source: { lat: 26.1, lng: -80.2 },
        destination: { lat: 26.2, lng: -80.3 },
      },
    });

    assert.equal(tasks[0].label, "1st root prune");
    assert.equal(tasks[0].status, "Complete");
    assert.equal(tasks[1].assignedRole, "Crew Leader");
    assert.equal(tasks.at(-1)?.label, "Confirm planted location");
  });

  it("converts fallback map click percentages into approximate coordinates", () => {
    const point = mapPercentToLatLng(50, 50);

    assert.equal(formatTreeCoordinate(point), "26.50000, -80.35000");
  });
});
