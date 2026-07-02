import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import ArcGisMapBoard, { arcGisHostedSyncResponseMessage } from "./ArcGisMapBoard";

describe("ArcGisMapBoard", () => {
  it("renders JDT-specific ArcGIS layers, filters, and tree point editor", () => {
    const html = renderToString(
      <ArcGisMapBoard
        initialProjectId="project-waterford"
        projects={[{ id: "project-waterford", projectId: "project-waterford", projectName: "Waterford Relocation" }]}
        jobs={[]}
        treeRelocationRecords={[{
          id: "tree-1003",
          treeId: "1003",
          projectId: "project-waterford",
          projectName: "Waterford Relocation",
          type: "Live Oak",
          dbh: 33,
          relocationStatus: "25% Cut",
          rootPruneDate1: "2026-02-01",
          crew: "Carlos Reyes",
          relocationMap: {
            source: { lat: 26.85703, lng: -80.05794 },
            destination: { lat: 26.85723, lng: -80.05814 },
          },
        }]}
        equipment={[{
          id: "equipment-komatsu-500-1",
          name: "Komatsu 500 - 1",
          category: "Machine",
          status: "Assigned",
          assignedProjectId: "project-waterford",
          assignedProjectName: "Waterford Relocation",
          lastTelematicsLatitude: 26.8571,
          lastTelematicsLongitude: -80.058,
        }]}
        locations={[{
          id: "holding-waterford",
          name: "Waterford temporary holding area",
          accessType: "Holding Area",
          projectId: "project-waterford",
          latitude: 26.8572,
          longitude: -80.0582,
        }]}
        onSaveTreePoint={() => undefined}
      />,
    );

    assert.match(html, /ArcGIS Operations Map/);
    assert.match(html, /Feature Layers/);
    assert.match(html, /Relocation Pipeline/);
    assert.match(html, /Total Trees/);
    assert.match(html, /Needs Destination Pin/);
    assert.match(html, /Layers/);
    assert.match(html, /Selected Tree/);
    assert.match(html, /Work Due/);
    assert.match(html, /GPS/);
    assert.match(html, /JDT_Tree_Assets/);
    assert.match(html, /Zoom/);
    assert.match(html, /Sync Status/);
    assert.match(html, /Tree Assets/);
    assert.match(html, /Project Boundary/);
    assert.match(html, /Final Tree Locations/);
    assert.match(html, /Holding Area/);
    assert.match(html, /Work Zones/);
    assert.match(html, /Root Prune Events/);
    assert.match(html, /Relocation Work/);
    assert.match(html, /Nutrient Care Tasks/);
    assert.match(html, /Equipment Location/);
    assert.match(html, /Project/);
    assert.match(html, /Tree Relocation Status/);
    assert.match(html, /Tree Type/);
    assert.match(html, /DBH/);
    assert.match(html, /Crew/);
    assert.match(html, /Waterford Relocation/);
    assert.match(html, /25% Cut/);
    assert.match(html, /Live Oak/);
    assert.match(html, /Carlos Reyes/);
    assert.match(html, /Selected Tree \/ Map Position/);
    assert.match(html, /Tree Details/);
    assert.match(html, /Map Position/);
    assert.match(html, /Next Root Prune Event/);
    assert.match(html, /Scheduled Move Date/);
    assert.match(html, /Tree Status Legend/);
    assert.match(html, /Set Destination/);
    assert.match(html, /Create Root Prune Event/);
    assert.match(html, /Sync Selected Tree/);
    assert.match(html, /Tree ID/);
    assert.match(html, /Latitude/);
    assert.match(html, /Longitude/);
    assert.match(html, /ArcGIS API key missing/);
    assert.match(html, /Collapse GIS workbench/);
    assert.match(html, /Expand GIS map workspace/);
    assert.match(html, /Fullscreen Map/);
  });

  it("explains when the ArcGIS sync API route is missing from the served app", () => {
    const message = arcGisHostedSyncResponseMessage({
      ok: false,
      status: 404,
      contentType: "text/html; charset=utf-8",
      payload: {},
    });

    assert.match(message, /ArcGIS sync API route is not available/);
    assert.match(message, /deployed Cloud Run app/);
  });
});
