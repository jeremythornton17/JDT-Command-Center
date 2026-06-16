import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arcGisLayerUrlEnvKeys,
  hostedLayerById,
  jdtArcGisHostedLayerConfigs,
  treeRelocationStatusValues,
} from "./arcgisLayerConfig";

describe("JDT ArcGIS hosted layer config", () => {
  it("defines the required hosted feature layers in build order", () => {
    assert.deepEqual(jdtArcGisHostedLayerConfigs.map((layer) => layer.id), [
      "JDT_Project_Boundaries",
      "JDT_Tree_Assets",
      "JDT_Final_Tree_Locations",
      "JDT_Holding_Areas",
      "JDT_Work_Zones",
      "JDT_Root_Prune_Events",
      "JDT_Relocation_Work",
      "JDT_Nutrient_Care_Tasks",
      "JDT_Equipment_Locations",
    ]);
  });

  it("keeps JDT_Tree_Assets aligned to the JDT tree relocation schema", () => {
    const treeLayer = hostedLayerById("JDT_Tree_Assets");

    assert.equal(treeLayer.geometryType, "point");
    assert.equal(treeLayer.primaryStatusField, "Tree_Relocation_Status");
    assert.deepEqual(treeLayer.primaryIdFields, ["Project_ID", "Tree_Asset_ID"]);
    assert.equal(treeLayer.fields.some((field) => field.name === "Tree_Asset_ID"), true);
    assert.equal(treeLayer.fields.some((field) => field.name === "Tree_Relocation_Status"), true);
    assert.equal(treeLayer.fields.some((field) => field.name === "Map_Geometry_Status"), true);
    assert.equal(treeLayer.fields.some((field) => field.name === "Last_Map_Sync_At"), true);
    assert.deepEqual(treeRelocationStatusValues, [
      "Not Started",
      "25% Cut",
      "50% Cut",
      "75% Cut",
      "100% Cut",
      "Ready for Relocation",
      "Moved to Holding",
      "Relocated",
    ]);
  });

  it("maps every hosted layer to a Vite environment URL variable", () => {
    for (const layer of jdtArcGisHostedLayerConfigs) {
      assert.match(arcGisLayerUrlEnvKeys[layer.id], /^VITE_ARCGIS_LAYER_JDT_/);
    }
  });
});
