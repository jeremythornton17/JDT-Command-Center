import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectGoogleEarthMapPackage,
  buildRelocationJobOptions,
  buildTreeRelocationTasks,
  filterTreesForRelocationJob,
  formatTreeCoordinate,
  getGoogleMapsConfig,
  relocationContextForJob,
  getTreeRelocationStatus,
  mapPercentToLatLng,
  pointFromDevicePosition,
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
    assert.deepEqual(getGoogleMapsConfig({}, { VITE_GOOGLE_MAPS_API_KEY: "runtime-maps-key" }), {
      apiKey: "runtime-maps-key",
      mapId: "",
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

    const source = tree.relocationMap.source;
    const destination = tree.relocationMap.destination;
    assert.ok(source);
    assert.ok(destination);
    assert.equal(source.label, "Field Block A");
    assert.equal(source.recordedBy, "Buck Thornton");
    assert.equal(source.accuracyMeters, 8);
    assert.equal(destination.label, "Final pad");
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

  it("builds relocation job options from relocation and install jobs", () => {
    const options = buildRelocationJobOptions([
      { id: "job-boca", title: "Boca West Course 1", division: "Relocation & Installation", clientName: "Boca West Country Club" },
      { id: "job-nursery", title: "Nursery dig queue", division: "Nursery" },
    ]);

    assert.equal(options.length, 1);
    assert.equal(options[0].id, "job-boca");
    assert.match(options[0].label, /Boca West Course 1/);
    assert.match(options[0].label, /Boca West Country Club/);
  });

  it("filters relocation tree pins to the selected job relationship", () => {
    const jobs = [
      { id: "job-boca", title: "Boca West Course 1", projectId: "project-boca", projectName: "Boca West Course 1" },
      { id: "job-mcarthur", title: "McArthur install", projectId: "project-mcarthur", projectName: "McArthur install" },
    ];
    const trees = [
      { treeId: "LO-101", jobId: "job-boca", relocationMap: { source: { lat: 26.1, lng: -80.1 } } },
      { treeId: "LO-202", projectId: "project-mcarthur", relocationMap: { source: { lat: 26.2, lng: -80.2 } } },
    ];

    assert.deepEqual(filterTreesForRelocationJob(trees, "all", jobs).map(tree => tree.treeId), ["LO-101", "LO-202"]);
    assert.deepEqual(filterTreesForRelocationJob(trees, "job-boca", jobs).map(tree => tree.treeId), ["LO-101"]);
    assert.deepEqual(filterTreesForRelocationJob(trees, "job-mcarthur", jobs).map(tree => tree.treeId), ["LO-202"]);
  });

  it("links saved pins back to the selected relocation job", () => {
    const context = relocationContextForJob({
      id: "job-boca",
      title: "Boca West Course 1",
      projectId: "project-boca",
      projectName: "Boca West Course 1",
      clientId: "client-boca",
      clientName: "Boca West Country Club",
    });

    assert.equal(context.jobId, "job-boca");
    assert.equal(context.projectId, "project-boca");
    assert.equal(context.clientName, "Boca West Country Club");
  });

  it("turns a phone geolocation reading into a tree relocation point", () => {
    const point = pointFromDevicePosition({
      latitude: 26.75505,
      longitude: -80.91809,
      accuracy: 4.6,
    }, "source");

    assert.equal(formatTreeCoordinate(point), "26.75505, -80.91809");
    assert.equal(point.accuracyMeters, 5);
    assert.equal(point.label, "GPS source pin");
  });

  it("builds a Google Earth KML package from project tree source and destination pins", () => {
    const earthPackage = buildProjectGoogleEarthMapPackage({
      job: {
        id: "job-boca-course-1",
        title: "Boca West & Course <1>",
        clientName: "Boca West Country Club",
      },
      trees: [
        {
          treeId: "tree-boca-109",
          type: "Live Oak",
          status: "Ready for Relocation",
          relocationMap: {
            source: { lat: 26.37127, lng: -80.16231, label: "Existing fairway" },
            destination: { lat: 26.37201, lng: -80.16444, label: "New green" },
          },
        },
      ],
      generatedAt: "2026-06-03T21:00:00.000Z",
    });

    assert.equal(earthPackage.fileName, "boca-west-and-course-1-tree-map.kml");
    assert.equal(earthPackage.placemarkCount, 2);
    assert.equal(earthPackage.pathCount, 1);
    assert.equal(earthPackage.pinnedTreeCount, 1);
    assert.match(earthPackage.kml, /<kml xmlns="http:\/\/www\.opengis\.net\/kml\/2\.2">/);
    assert.match(earthPackage.kml, /Boca West &amp; Course &lt;1&gt;/);
    assert.match(earthPackage.kml, /tree-boca-109 Source/);
    assert.match(earthPackage.kml, /-80\.16231,26\.37127,0/);
    assert.match(earthPackage.kml, /-80\.16444,26\.37201,0/);
    assert.match(earthPackage.kml, /<LineString>/);
    assert.match(earthPackage.googleEarthUrl, /^https:\/\/earth\.google\.com\/web\/@26\.37164,-80\.16338/);
  });

  it("keeps empty project Earth exports valid while reporting no pinned trees", () => {
    const earthPackage = buildProjectGoogleEarthMapPackage({
      name: "Empty Project",
      trees: [{ treeId: "tree-without-pins" }],
      fallbackCenter: { lat: 26.75505, lng: -80.91809 },
    });

    assert.equal(earthPackage.placemarkCount, 0);
    assert.equal(earthPackage.pathCount, 0);
    assert.equal(earthPackage.pinnedTreeCount, 0);
    assert.match(earthPackage.kml, /Empty Project/);
    assert.match(earthPackage.googleEarthUrl, /^https:\/\/earth\.google\.com\/web\/@26\.75505,-80\.91809/);
  });
});
