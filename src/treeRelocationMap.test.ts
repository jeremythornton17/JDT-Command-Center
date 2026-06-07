import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProjectGoogleEarthMapPackage,
  buildRelocationJobOptions,
  buildSavedSiteLocationRecord,
  buildTreeRelocationTasks,
  buildTreeRelocationRecordsFromKmlImport,
  filterSavedSiteLocationsForJob,
  filterTreesForRelocationJob,
  formatTreeCoordinate,
  getGoogleMapsConfig,
  googleMapsUrlForSavedSiteLocation,
  relocationContextForJob,
  getTreeRelocationStatus,
  mapPercentToLatLng,
  parseGoogleMapsLocationText,
  parseKmlTreePlacemarks,
  pointFromDevicePosition,
  pointFromSavedSiteLocation,
  searchTextForSavedSiteLocation,
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

  it("parses pasted Google Maps links and plain lat/lng text into saved pin coordinates", () => {
    const mapsUrl = "https://www.google.com/maps/@26.757913,-81.0408413,1039m/data=!3m1!1e3!4m2!10m1!1e1?authuser=0&entry=ttu";
    assert.deepEqual(parseGoogleMapsLocationText(mapsUrl), {
      lat: 26.75791,
      lng: -81.04084,
      sourceText: mapsUrl,
    });
    assert.deepEqual(parseGoogleMapsLocationText("Load pin: 26.387315, -80.1712583"), {
      lat: 26.38732,
      lng: -80.17126,
      sourceText: "Load pin: 26.387315, -80.1712583",
    });
    const earthUrl = "https://earth.google.com/web/@26.85703076,-80.05794282,1.72483545a,1000d,30y,0h,0t,0r/data=CgRCAggB";
    assert.deepEqual(parseGoogleMapsLocationText(earthUrl), {
      lat: 26.85703,
      lng: -80.05794,
      sourceText: earthUrl,
    });
    assert.equal(parseGoogleMapsLocationText("Boca Raton"), null);
  });

  it("builds project-scoped saved site location records from pasted Maps pins", () => {
    const record = buildSavedSiteLocationRecord({
      label: "25 Acre east equipment gate",
      accessType: "Truck / Equipment Access",
      sourceText: "https://www.google.com/maps/@26.757913,-81.0408413,1039m/data=!3m1!1e3",
      job: {
        id: "job-boca",
        title: "Boca West Course 1",
        projectId: "project-boca",
        projectName: "Boca West Course 1",
        clientId: "client-boca",
        clientName: "Boca West Country Club",
      },
      divisionUse: ["Relocation & Installation", "Freight", "Equipment"],
      savedBy: "jennifer@jdtnurseries.com",
      savedAt: "2026-06-07T12:00:00.000Z",
    });

    assert.equal(record.id, "location-project-boca-truck-equipment-access-25-acre-east-equipment-gate");
    assert.equal(record.name, "25 Acre east equipment gate");
    assert.equal(record.locationType, "Truck / Equipment Access");
    assert.equal(record.projectId, "project-boca");
    assert.equal(record.jobId, "job-boca");
    assert.equal(record.clientName, "Boca West Country Club");
    assert.equal(record.latitude, 26.75791);
    assert.equal(record.longitude, -81.04084);
    assert.equal(record.googleMapsUrl, "https://www.google.com/maps/@26.757913,-81.0408413,1039m/data=!3m1!1e3");
    assert.deepEqual(record.divisionUse, ["Relocation & Installation", "Freight", "Equipment"]);
    assert.match(record.notes || "", /Saved from Maps view/);
  });

  it("filters saved site locations to the selected project or job context", () => {
    const locations = [
      { id: "loc-boca-job", name: "Boca gate", jobId: "job-boca" },
      { id: "loc-boca-project", name: "Boca load pin", projectId: "project-boca" },
      { id: "loc-mcarthur", name: "McArthur gate", projectId: "project-mcarthur" },
      { id: "loc-shared", name: "JDT Home Base", locationType: "Farm" },
    ];
    const job = { id: "job-boca", projectId: "project-boca", clientName: "Boca West Country Club" };

    assert.deepEqual(filterSavedSiteLocationsForJob(locations, null).map(location => location.id), ["loc-boca-job", "loc-boca-project", "loc-mcarthur", "loc-shared"]);
    assert.deepEqual(filterSavedSiteLocationsForJob(locations, job).map(location => location.id), ["loc-boca-job", "loc-boca-project", "loc-shared"]);
  });

  it("keeps project pin action buttons useful when records only have Maps links or addresses", () => {
    const linkedLocation = {
      id: "loc-boca-truck-access",
      name: "Boca West truck access",
      googleMapsUrl: "https://www.google.com/maps/@26.757913,-81.0408413,1039m/data=!3m1!1e3",
    };
    const coordinateOnlyLocation = {
      id: "loc-boca-load-pin",
      name: "Boca West load pin",
      coordinateText: "26.387315, -80.1712583",
    };
    const addressOnlyLocation = {
      id: "loc-boca-main",
      name: "Boca West clubhouse",
      mainAddress: "20583 Boca West Dr, Boca Raton, FL 33434",
    };

    assert.deepEqual(pointFromSavedSiteLocation(linkedLocation), {
      lat: 26.75791,
      lng: -81.04084,
      label: "Boca West truck access",
    });
    assert.deepEqual(pointFromSavedSiteLocation(coordinateOnlyLocation), {
      lat: 26.38732,
      lng: -80.17126,
      label: "Boca West load pin",
    });
    assert.equal(
      googleMapsUrlForSavedSiteLocation(coordinateOnlyLocation),
      "https://www.google.com/maps/@26.38732,-80.17126,19z",
    );
    assert.equal(
      googleMapsUrlForSavedSiteLocation(addressOnlyLocation),
      "https://www.google.com/maps/search/?api=1&query=20583%20Boca%20West%20Dr%2C%20Boca%20Raton%2C%20FL%2033434",
    );
    assert.equal(searchTextForSavedSiteLocation(addressOnlyLocation), "20583 Boca West Dr, Boca Raton, FL 33434");
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

  it("parses Waterford-style KML tree placemarks while skipping unnamed view points", () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <name>The Waterford</name>
          <Placemark>
            <Point><coordinates>-80.05873,26.85753,0</coordinates></Point>
          </Placemark>
          <Placemark id="tree-493">
            <name>#493 Live Oak</name>
            <description><![CDATA[Live Oak 6" cal. $2,700.00]]></description>
            <Point><coordinates>-80.05715564588735,26.85712482010362,3.126281602522196</coordinates></Point>
          </Placemark>
          <Placemark id="tree-518">
            <name>#518 Crepe Myrtle</name>
            <description><![CDATA[Crepe Myrtle 7" cal. $3,150.00]]></description>
            <Point><coordinates>-80.05814060988202,26.85653151382946,2.223980773087499</coordinates></Point>
          </Placemark>
        </Document>
      </kml>`;

    const placemarks = parseKmlTreePlacemarks(kml);

    assert.equal(placemarks.length, 2);
    assert.deepEqual(placemarks.map((point) => point.name), ["#493 Live Oak", "#518 Crepe Myrtle"]);
    assert.deepEqual(placemarks[0], {
      id: "tree-493",
      name: "#493 Live Oak",
      treeId: "#493",
      treeType: "Live Oak",
      description: "Live Oak 6\" cal. $2,700.00",
      lat: 26.85712,
      lng: -80.05716,
      altitude: 3.126281602522196,
      caliperInches: 6,
      relocationCost: 2700,
    });
  });

  it("builds project-linked tree source pins from imported KML placemarks", () => {
    const records = buildTreeRelocationRecordsFromKmlImport({
      placemarks: [
        {
          id: "tree-493",
          name: "#493 Live Oak",
          treeId: "#493",
          treeType: "Live Oak",
          description: "Live Oak 6\" cal. $2,700.00",
          lat: 26.85712,
          lng: -80.05716,
          caliperInches: 6,
          relocationCost: 2700,
        },
      ],
      job: {
        id: "job-waterford",
        title: "Waterford tree relocation",
        projectId: "project-waterford",
        projectName: "The Waterford",
        clientName: "Waterford",
      },
      importedBy: "jeremy@jdtnurseries.com",
      importedAt: "2026-06-07T23:00:00.000Z",
      sourceFileName: "The Waterford.kml",
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].id, "kml-project-waterford-493-live-oak");
    assert.equal(records[0].treeId, "#493");
    assert.equal(records[0].treeType, "Live Oak");
    assert.equal(records[0].projectId, "project-waterford");
    assert.equal(records[0].projectName, "The Waterford");
    assert.equal(records[0].sourceSheetName, "KML Import");
    assert.deepEqual((records[0].relocationMap as any).source, {
      lat: 26.85712,
      lng: -80.05716,
      label: "#493 Live Oak",
      recordedAt: "2026-06-07T23:00:00.000Z",
      recordedBy: "jeremy@jdtnurseries.com",
    });
  });
});
