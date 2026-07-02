import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyArcGisSyncReference,
  arcGisFeatureIdFromApplyEditsResult,
  buildArcGisFilterOptions,
  buildArcGisFinalTreeLocationFeatures,
  buildArcGisProjectBoundaryFeatures,
  buildArcGisTreeAssetHostedEdit,
  buildArcGisTaskOverlayFeatures,
  buildArcGisTreeAssetFeatures,
  buildArcGisWorkZoneFeatures,
  buildTreeDefinitionExpression,
  emptyArcGisMapFilters,
  filterArcGisTreeFeatures,
  getArcGisConfig,
  jdtArcGisLayerSchemas,
  normalizeArcGisFeatureLayerUrl,
  treeAssetPopupFields,
  treeFeatureToTreeRecord,
} from "./arcgisMapping";

describe("JDT ArcGIS mapping schema", () => {
  it("defines the first JDT GIS layers with the fields operations needs", () => {
    assert.deepEqual(jdtArcGisLayerSchemas.map((layer) => layer.id), [
      "treeAssets",
      "projectBoundary",
      "finalTreeLocations",
      "holdingAreas",
      "workZones",
      "rootPruneEvents",
      "relocationWork",
      "nutrientCareTasks",
      "equipmentLocations",
    ]);
    assert.deepEqual(jdtArcGisLayerSchemas.map((layer) => layer.hostedLayerId), [
      "JDT_Tree_Assets",
      "JDT_Project_Boundaries",
      "JDT_Final_Tree_Locations",
      "JDT_Holding_Areas",
      "JDT_Work_Zones",
      "JDT_Root_Prune_Events",
      "JDT_Relocation_Work",
      "JDT_Nutrient_Care_Tasks",
      "JDT_Equipment_Locations",
    ]);

    const treeLayer = jdtArcGisLayerSchemas.find((layer) => layer.id === "treeAssets");
    assert.equal(treeLayer?.geometryType, "point");
    assert.deepEqual(treeAssetPopupFields, [
      "treeId",
      "treeAssetId",
      "treeTag",
      "assetCategory",
      "species",
      "dbh",
      "status",
      "loadersNeeded",
      "additionalEquipmentRequired",
      "equipmentAccess",
      "issueAlert",
      "currentFieldLocation",
      "existingSourcePin",
      "destinationPin",
      "treeFinalOutcome",
      "rootPruneDate",
      "finalMoveDate",
      "crew",
      "crewNotes",
      "notes",
    ]);
    assert.equal(treeLayer?.fields.some((field) => field.name === "rootPruneDate"), true);
    assert.equal(treeLayer?.fields.some((field) => field.name === "finalMoveDate"), true);
    assert.equal(treeLayer?.fields.some((field) => field.name === "loadersNeeded"), true);
    assert.equal(treeLayer?.fields.some((field) => field.name === "issueAlert"), true);
    assert.equal(jdtArcGisLayerSchemas.find((layer) => layer.id === "projectBoundary")?.geometryType, "polygon");
    assert.equal(jdtArcGisLayerSchemas.find((layer) => layer.id === "holdingAreas")?.geometryType, "polygon");
    assert.equal(jdtArcGisLayerSchemas.find((layer) => layer.id === "equipmentLocations")?.geometryType, "point");
  });

  it("builds tree features with popup fields from JDT project tree records", () => {
    const features = buildArcGisTreeAssetFeatures({
      jobs: [{ id: "job-waterford", projectId: "project-waterford", title: "Waterford Relocation" }],
      workOrders: [{ id: "wo-root-prune", treeIds: ["1003"], crewLeadName: "Carlos Reyes" }],
      treeRelocationRecords: [{
        id: "tree-1003",
        treeId: "1003",
        projectId: "project-waterford",
        projectName: "Waterford Relocation",
        type: "Live Oak",
        dbh: 33,
        relocationStatus: "Ready For Relocation",
        rootPruneDate1: "2026-02-01",
        relocationDate: "2026-06-01",
        loaderNamesNeeded: ["Komatsu 500 - 1", "Caterpillar 988G"],
        additionalEquipmentRequired: "Root ball straps",
        equipmentAccess: "Requires Review",
        issueAlert: "Needs Jeremy Review",
        crewNotes: "Crew should verify access before cutting.",
        notes: "North course tree line",
        relocationMap: { source: { lat: 26.85703, lng: -80.05794 } },
      }],
    });

    assert.equal(features.length, 1);
    assert.equal(features[0].treeId, "1003");
    assert.equal(features[0].species, "Live Oak");
    assert.equal(features[0].dbh, "33");
    assert.equal(features[0].status, "Ready for Relocation");
    assert.equal(features[0].rootPruneDate, "2026-02-01");
    assert.equal(features[0].finalMoveDate, "2026-06-01");
    assert.equal(features[0].crew, "Carlos Reyes");
    assert.equal(features[0].loadersNeeded, "Komatsu 500 - 1; Caterpillar 988G");
    assert.equal(features[0].additionalEquipmentRequired, "Root ball straps");
    assert.equal(features[0].equipmentAccess, "Requires Review");
    assert.equal(features[0].issueAlert, "Needs Jeremy Review");
    assert.equal(features[0].crewNotes, "Crew should verify access before cutting.");
    assert.equal(features[0].latitude, 26.85703);
    assert.equal(features[0].longitude, -80.05794);
  });

  it("builds filters, expressions, and project boundary features around JDT project context", () => {
    const treeFeatures = buildArcGisTreeAssetFeatures({
      projects: [{ id: "project-boca", projectId: "project-boca", projectName: "Boca West Course 1 Renovation" }],
      treeRelocationRecords: [
        { id: "tree-1", treeId: "1", projectId: "project-boca", projectName: "Boca West Course 1 Renovation", species: "Live Oak", dbh: 24, status: "Root Pruning", crew: "Carlos Reyes", relocationMap: { source: { lat: 26.371, lng: -80.162 } } },
        { id: "tree-2", treeId: "2", projectId: "project-boca", projectName: "Boca West Course 1 Renovation", species: "Sabal Palm", dbh: 18, status: "Not Started", crew: "Neftali Euceda", relocationMap: { source: { lat: 26.372, lng: -80.163 } } },
      ],
    });
    const options = buildArcGisFilterOptions({
      projects: [{ id: "project-boca", projectId: "project-boca", projectName: "Boca West Course 1 Renovation" }],
      treeFeatures,
    });
    const filters = { ...emptyArcGisMapFilters, projectId: "project-boca", treeType: "Live Oak", dbh: "24", crew: "Carlos Reyes" };
    const boundary = buildArcGisProjectBoundaryFeatures({
      projects: [{ id: "project-boca", projectId: "project-boca", projectName: "Boca West Course 1 Renovation" }],
      treeFeatures,
    });

    assert.deepEqual(options.projects, [{ value: "project-boca", label: "Boca West Course 1 Renovation" }]);
    assert.deepEqual(options.treeTypes, ["Live Oak", "Sabal Palm"]);
    assert.deepEqual(filterArcGisTreeFeatures(treeFeatures, filters).map((feature) => feature.treeId), ["1"]);
    assert.equal(buildTreeDefinitionExpression(filters), "projectId = 'project-boca' AND treeType = 'Live Oak' AND dbh = '24' AND crew = 'Carlos Reyes'");
    assert.equal(boundary.length, 1);
    assert.equal(boundary[0].name, "Boca West Course 1 Renovation Boundary");
    assert.equal(boundary[0].rings[0].length, 5);
  });

  it("builds final tree locations, work zones, and task overlays from JDT records", () => {
    const treeFeatures = buildArcGisTreeAssetFeatures({
      treeRelocationRecords: [{
        id: "tree-007",
        treeAssetId: "TREE-007",
        treeId: "007",
        treeTag: "7",
        projectId: "project-boca",
        treeType: "Live Oak",
        dbh: 24,
        treeRelocationStatus: "25% Cut",
        relocationMap: {
          source: { lat: 26.371, lng: -80.162 },
          destination: { lat: 26.372, lng: -80.163 },
        },
      }],
    });
    const finalLocations = buildArcGisFinalTreeLocationFeatures({
      treeRelocationRecords: [{
        id: "tree-007",
        treeAssetId: "TREE-007",
        treeId: "007",
        treeTag: "7",
        projectId: "project-boca",
        treeType: "Live Oak",
        relocationMap: { destination: { lat: 26.372, lng: -80.163 } },
      }],
    });
    const workZones = buildArcGisWorkZoneFeatures({
      locations: [{
        id: "zone-hole-2",
        name: "Hole 2 Work Zone",
        accessType: "Work Zone",
        projectId: "project-boca",
        latitude: 26.373,
        longitude: -80.164,
      }],
    });
    const taskOverlays = buildArcGisTaskOverlayFeatures({
      treeFeatures,
      workOrders: [
        { id: "rp-1", workOrderType: "tree_pruning", projectId: "project-boca", treeIds: ["007"], rootPruneTaskStatus: "Scheduled", scheduledDate: "2026-06-15", crewLeadName: "Carlos Reyes" },
        { id: "rw-1", workOrderType: "tree_relocation_work", projectId: "project-boca", treeIds: ["007"], moveTaskStatus: "Assigned", scheduledDate: "2026-07-15", crewLeadName: "Neftali Euceda" },
        { id: "nc-1", workOrderType: "treatment_aftercare", projectId: "project-boca", treeIds: ["007"], careTaskStatus: "Due", scheduledDate: "2026-06-16", crewLeadName: "Carlos Reyes" },
      ],
    });

    assert.equal(finalLocations.length, 1);
    assert.equal(finalLocations[0].finalLocationId, "final-TREE-007");
    assert.equal(finalLocations[0].latitude, 26.372);
    assert.equal(workZones.length, 1);
    assert.equal(workZones[0].name, "Hole 2 Work Zone");
    assert.equal(taskOverlays.rootPruneEvents[0].status, "Scheduled");
    assert.equal(taskOverlays.relocationWork[0].crew, "Neftali Euceda");
    assert.equal(taskOverlays.nutrientCareTasks[0].longitude, -80.162);
  });

  it("uses environment/runtime ArcGIS API keys without hardcoding secrets", () => {
    assert.deepEqual(getArcGisConfig({
      VITE_ARCGIS_API_KEY: "",
      VITE_ARCGIS_ORG_URL: "https://jdtnurseries.maps.arcgis.com",
      VITE_ARCGIS_LAYER_JDT_TREE_ASSETS_URL: "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer",
    }, {
      VITE_ARCGIS_API_KEY: "runtime-key",
      VITE_ARCGIS_WEB_MAP_ID: "web-map-id",
    }), {
      apiKey: "runtime-key",
      orgUrl: "https://jdtnurseries.maps.arcgis.com",
      webMapId: "web-map-id",
      layerUrls: {
        JDT_Tree_Assets: "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer/0",
      },
      isReady: true,
    });
    assert.equal(getArcGisConfig({}, {}).isReady, false);
  });

  it("normalizes ArcGIS FeatureServer service URLs to editable layer URLs", () => {
    assert.equal(
      normalizeArcGisFeatureLayerUrl("https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer"),
      "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer/0",
    );
    assert.equal(
      normalizeArcGisFeatureLayerUrl("https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer/0/"),
      "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer/0",
    );
  });

  it("converts an edited tree point form back into a project tree record", () => {
    const record = treeFeatureToTreeRecord({
      treeId: "1003",
      projectId: "project-waterford",
      projectName: "Waterford Relocation",
      species: "Live Oak",
      dbh: "33",
      status: "Root Pruning",
      loadersNeeded: "Komatsu 500 - 1; Caterpillar 988G",
      additionalEquipmentRequired: "None",
      equipmentAccess: "Good",
      issueAlert: "Stressed",
      crewNotes: "Leaf wilt noted by crew.",
      rootPruneDate: "2026-02-01",
      finalMoveDate: "2026-06-01",
      crew: "Carlos Reyes",
      notes: "Field verified",
      latitude: 26.85703,
      longitude: -80.05794,
      objectId: 321,
    });

    assert.equal(record.id, "tree-project-waterford-1003");
    assert.equal(record.projectId, "project-waterford");
    assert.equal(record.type, "Live Oak");
    assert.deepEqual(record.loaderNamesNeeded, ["Komatsu 500 - 1", "Caterpillar 988G"]);
    assert.equal(record.additionalEquipmentRequired, "None");
    assert.equal(record.equipmentAccess, "Good");
    assert.equal(record.issueAlert, "Stressed");
    assert.equal(record.crewNotes, "Leaf wilt noted by crew.");
    assert.equal(record.arcGisFeatureId, "321");
    assert.deepEqual(record.relocationMap, {
      source: { lat: 26.85703, lng: -80.05794, label: "ArcGIS tree point" },
    });
  });

  it("stamps JDT records with ArcGIS sync references without changing operational fields", () => {
    const stamped = applyArcGisSyncReference({
      id: "tree-1003",
      treeRelocationStatus: "50% Cut",
      notes: "Keep this operational note",
    }, {
      featureId: 789,
      layerUrl: "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer",
      geometryStatus: "Synced",
      syncedAt: "2026-06-15T12:00:00.000Z",
    });

    assert.equal(stamped.treeRelocationStatus, "50% Cut");
    assert.equal(stamped.notes, "Keep this operational note");
    assert.equal(stamped.arcGisFeatureId, "789");
    assert.equal(stamped.arcGisLayerUrl, "https://services.arcgis.com/example/JDT_Tree_Assets/FeatureServer/0");
    assert.equal(stamped.mapGeometryStatus, "Synced");
    assert.equal(stamped.lastMapSyncAt, "2026-06-15T12:00:00.000Z");
  });

  it("builds hosted ArcGIS tree asset edits using JDT schema field names", () => {
    const edit = buildArcGisTreeAssetHostedEdit({
      treeId: "1003",
      treeAssetId: "TREE-BWCC-1003",
      projectId: "BWCC-060426",
      treeTag: "1003",
      treeType: "Live Oak",
      assetCategory: "Relocation",
      dbh: "33",
      status: "50% Cut",
      loadersNeeded: "Komatsu 500 - 1; Caterpillar 988G",
      additionalEquipmentRequired: "Root ball straps",
      equipmentAccess: "Blocked",
      issueAlert: "Blocked Access",
      crewNotes: "Gate was locked this morning.",
      currentFieldLocation: "Hole 3 left side",
      existingSourcePin: "26.85703,-80.05794",
      destinationPin: "26.858,-80.058",
      notes: "Field verified",
      latitude: 26.85703,
      longitude: -80.05794,
      arcGisFeatureId: "321",
    });

    assert.deepEqual(edit.geometry, {
      type: "point",
      latitude: 26.85703,
      longitude: -80.05794,
      spatialReference: { wkid: 4326 },
    });
    assert.equal(edit.attributes.OBJECTID, 321);
    assert.equal(edit.attributes.Tree_Asset_ID, "TREE-BWCC-1003");
    assert.equal(edit.attributes.Project_ID, "BWCC-060426");
    assert.equal(edit.attributes.Tree_Tag, "1003");
    assert.equal(edit.attributes.Tree_Type, "Live Oak");
    assert.equal(edit.attributes.DBH_IN, 33);
    assert.equal(edit.attributes.Tree_Relocation_Status, "50% Cut");
    assert.equal(edit.attributes.Loaders_Needed, "Komatsu 500 - 1; Caterpillar 988G");
    assert.equal(edit.attributes.Additional_Equipment_Required, "Root ball straps");
    assert.equal(edit.attributes.Equipment_Access, "Blocked");
    assert.equal(edit.attributes.Issue_Alert, "Blocked Access");
    assert.equal(edit.attributes.Crew_Notes, "Gate was locked this morning.");
    assert.equal(edit.attributes.Existing_Location_Description, "26.85703,-80.05794");
    assert.equal(edit.attributes.Proposed_Final_Location_Description, "26.858,-80.058");
  });

  it("extracts the ArcGIS feature ID from add or update edit results", () => {
    assert.equal(arcGisFeatureIdFromApplyEditsResult({
      addFeatureResults: [{ objectId: 456, success: true }],
    }), "456");
    assert.equal(arcGisFeatureIdFromApplyEditsResult({
      updateFeatureResults: [{ objectId: 789, success: true }],
    }), "789");
    assert.equal(arcGisFeatureIdFromApplyEditsResult({
      addFeatureResults: [{ success: false, error: { message: "No edit" } }],
    }), "");
  });
});
