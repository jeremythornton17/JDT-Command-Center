import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import MapsBoard from "./MapsBoard";

describe("MapsBoard relocation pin editing", () => {
  it("shows the all-locations map without tree-specific side panels by default", () => {
    const html = renderToString(
      <MapsBoard
        jobs={[
          {
            id: "job-boca-course-1",
            title: "Boca West Course 1 Renovation",
            division: "Relocation & Installation",
            clientName: "Boca West Country Club",
          },
        ]}
        ranchOaks={[
          {
            id: "tree-1",
            treeId: "inventory-10-acre-2-densa-pine-8",
            ranchOakType: "Densa Pine",
            farm: "10 Acre",
            zone: "2",
            jobId: "job-boca-course-1",
            relocationMap: {
              source: { lat: 26.75505, lng: -80.91809, label: "Current field position" },
              destination: { lat: 26.756, lng: -80.919, label: "Destination" },
            },
          },
        ]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Current Map View/);
    assert.match(html, /All JD Thornton Locations/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Map View/);
    assert.match(html, /Earth View/);
    assert.match(html, /All Saved Locations/);
    assert.match(html, /Google Maps Link \/ Pin/);
    assert.match(html, /Save Site Location/);
    assert.match(html, /Load \/ Unload Pin/);
    assert.doesNotMatch(html, /Tree Pin List/);
    assert.doesNotMatch(html, /Active Tree/);
    assert.doesNotMatch(html, /Pin Editor/);
    assert.doesNotMatch(html, /Selected Tree Tasks/);
    assert.doesNotMatch(html, /Map Backup \/ Earth Export/);
  });

  it("shows tree and project pin panels inside a selected relocation job map", () => {
    const html = renderToString(
      <MapsBoard
        initialSelectedJobId="job-boca-course-1"
        jobs={[
          {
            id: "job-boca-course-1",
            title: "Boca West Course 1 Renovation",
            division: "Relocation & Installation",
            clientName: "Boca West Country Club",
          },
        ]}
        ranchOaks={[
          {
            id: "tree-1",
            treeId: "inventory-10-acre-2-densa-pine-8",
            ranchOakType: "Densa Pine",
            farm: "10 Acre",
            zone: "2",
            jobId: "job-boca-course-1",
            relocationMap: {
              source: { lat: 26.75505, lng: -80.91809, label: "Current field position" },
              destination: { lat: 26.756, lng: -80.919, label: "Destination" },
            },
          },
        ]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Current Map View/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Tree Pin List/);
    assert.match(html, /Active Tree/);
    assert.match(html, /Pin Editor/);
    assert.match(html, /Select a source or destination pin on the map/);
    assert.match(html, /Use Phone GPS/);
    assert.match(html, /GPS accuracy/);
    assert.match(html, /Map Backup \/ Earth Export/);
    assert.match(html, /Export KML Backup/);
    assert.match(html, /Client KML\/KMZ Import/);
    assert.match(html, /Manual pins are the active project record/);
    assert.match(html, /Saved Site Locations/);
    assert.match(html, /Project Pins/);
    assert.doesNotMatch(html, /Google Earth Project Map/);
    assert.doesNotMatch(html, /Download KML/);
    assert.doesNotMatch(html, /Open Google Earth/);
    assert.equal(html.indexOf("Fallback Field Map") < html.indexOf("Active Tree"), true);
    assert.equal(html.indexOf("Active Tree") < html.indexOf("Map Backup / Earth Export"), true);
  });

  it("shows imported relocation tree records as job-scoped map pins", () => {
    const html = renderToString(
      <MapsBoard
        initialSelectedJobId="job-boca-course-1"
        jobs={[
          {
            id: "job-boca-course-1",
            title: "Boca West Course 1 Renovation",
            division: "Relocation & Installation",
            projectId: "project-boca-west",
            clientName: "Boca West Country Club",
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[
          {
            id: "tree-boca-109",
            treeId: "tree-boca-109",
            projectId: "project-boca-west",
            type: "Live Oak",
            relocationMap: {
              source: { lat: 26.37127, lng: -80.16231, label: "Imported source pin" },
            },
          },
        ]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /tree-boca-109/);
    assert.match(html, /Live Oak/);
    assert.match(html, /Needs Destination Pin/);
  });

  it("opens a visible client KML import panel with preview and save controls", () => {
    const html = renderToString(
      <MapsBoard
        initialSelectedJobId="job-waterford"
        jobs={[
          {
            id: "job-waterford",
            title: "The Waterford",
            division: "Relocation & Installation",
            projectId: "project-waterford",
            projectName: "The Waterford",
            clientName: "Waterford",
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
        onImportTreePins={() => true}
        initialKmlImportOpen
      />,
    );

    assert.match(html, /Client KML\/KMZ Import/);
    assert.match(html, /Upload KML File/);
    assert.match(html, /Paste KML Text/);
    assert.match(html, /Preview Imported Tree Pins/);
    assert.match(html, /Save Imported Tree Pins/);
    assert.doesNotMatch(html, /Select a relocation project before saving imported tree pins/);
  });
});
