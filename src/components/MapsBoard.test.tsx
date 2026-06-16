import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import MapsBoard, { mapBoundsEqual, resolveMapWorkbenchBounds } from "./MapsBoard";

describe("MapsBoard relocation pin editing", () => {
  it("does not let passive Google Maps bounds updates churn tree markers unless In View is enabled", () => {
    const firstBounds = { north: 26.9, south: 26.7, east: -80.1, west: -80.3 };
    const sameBounds = { north: 26.9000004, south: 26.6999998, east: -80.1000003, west: -80.3000001 };

    assert.equal(resolveMapWorkbenchBounds(false, firstBounds), null);
    assert.equal(resolveMapWorkbenchBounds(false, sameBounds), null);
    assert.deepEqual(resolveMapWorkbenchBounds(true, firstBounds), firstBounds);
    assert.equal(mapBoundsEqual(firstBounds, sameBounds), true);
    assert.equal(mapBoundsEqual(firstBounds, { ...sameBounds, east: -80.2 }), false);
  });

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
    assert.match(html, /Satellite View/);
    assert.match(html, /All Saved Locations/);
    assert.match(html, /Add Pin/);
    assert.match(html, /Main Office/);
    assert.match(html, /25 Acre/);
    assert.match(html, /10 Acre/);
    assert.match(html, /40 Acre/);
    assert.match(html, /26.757913, -81.037562/);
    assert.doesNotMatch(html, /Google Maps Link \/ Pin/);
    assert.doesNotMatch(html, /Save Site Location/);
    assert.doesNotMatch(html, /Tree Pin List/);
    assert.doesNotMatch(html, /Active Tree/);
    assert.doesNotMatch(html, /Pin Editor/);
    assert.doesNotMatch(html, /Selected Tree Tasks/);
    assert.doesNotMatch(html, /Online GIS Import \/ KML Backup/);
  });

  it("renders the dedicated JDT Locations page without tree, GPS, or import controls", () => {
    const html = renderToString(
      <MapsBoard
        pagePurpose="locations"
        jobs={[
          {
            id: "job-boca-course-1",
            title: "Boca West Course 1 Renovation",
            division: "Relocation & Installation",
            clientName: "Boca West Country Club",
            crewAccessAddress: "Boca West crew gate",
            truckAccessAddress: "Boca West truck gate",
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /JDT Locations/);
    assert.match(html, /Google Maps-style client, project, jobsite, farm, and saved access pins/);
    assert.match(html, /Add Location/);
    assert.match(html, /All JD Thornton Locations/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Saved Site Locations/);
    assert.match(html, /Crew Access/);
    assert.match(html, /Truck \/ Equipment Access/);
    assert.match(html, /Open Maps/);
    assert.match(html, /Copy GPS/);
    assert.match(html, /Assign to Project/);
    assert.doesNotMatch(html, /Map Mode/);
    assert.doesNotMatch(html, /Tree Map Workbench/);
    assert.doesNotMatch(html, /ArcGIS Layers/);
    assert.doesNotMatch(html, /Live GPS Assets/);
    assert.doesNotMatch(html, /Online GIS Import \/ KML Backup/);
    assert.doesNotMatch(html, /Tree_Relocation_Status/);
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
    assert.match(html, /Tree Map Workbench/);
    assert.match(html, /Project Relocation Pipeline/);
    assert.match(html, /ArcGIS Layers/);
    assert.match(html, /Sync ArcGIS/);
    assert.match(html, /Export KML/);
    assert.match(html, /Import KML\/KMZ/);
    assert.match(html, /Print Field Map/);
    assert.match(html, /Fullscreen Map/);
    assert.match(html, /Search by tree type, tag, asset ID, or status/);
    assert.match(html, /In View/);
    assert.match(html, /Multi-Select/);
    assert.match(html, /Bulk Actions/);
    assert.match(html, /Assign Work/);
    assert.match(html, /Create Root Prune Events/);
    assert.match(html, /Create Nutrient Care Tasks/);
    assert.match(html, /Create Relocation Move Tasks/);
    assert.match(html, /Assign Crew/);
    assert.match(html, /Assign Equipment/);
    assert.match(html, /Set Holding Area/);
    assert.match(html, /Set Tree_Relocation_Status/);
    assert.match(html, /Export Selected/);
    assert.match(html, /Print Field Map/);
    assert.match(html, /Selected Tree Command/);
    assert.match(html, /Open Full Tree Record/);
    assert.match(html, /Create Root Prune Event/);
    assert.match(html, /Create Nutrient Care Task/);
    assert.match(html, /Create Move Task/);
    assert.match(html, /Mark Ready for Relocation/);
    assert.match(html, /Mark Moved to Holding/);
    assert.match(html, /Mark Relocated/);
    assert.match(html, /Pin Editor/);
    assert.match(html, /Select a source or destination pin on the map/);
    assert.match(html, /Use Phone GPS/);
    assert.match(html, /GPS accuracy/);
    assert.match(html, /Online GIS Import \/ KML Backup/);
    assert.match(html, /Export KML Backup/);
    assert.match(html, /KML\/KMZ Bridge Import/);
    assert.match(html, /ArcGIS Online remains the GIS record/);
    assert.match(html, /Manual pins are the active project record/);
    assert.match(html, /Saved Site Locations/);
    assert.match(html, /Project Pins/);
    assert.match(html, /Add Pin/);
    assert.doesNotMatch(html, /Google Earth Project Map/);
    assert.doesNotMatch(html, /Download KML/);
    assert.doesNotMatch(html, /Open Google Earth/);
    assert.equal(html.indexOf("Fallback Field Map") < html.indexOf("Selected Tree Command"), true);
    assert.equal(html.indexOf("Selected Tree Command") < html.indexOf("Online GIS Import / KML Backup"), true);
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

    assert.match(html, /Tree Map Workbench/);
    assert.match(html, /tree-boca-109/);
    assert.match(html, /Live Oak/);
    assert.match(html, /Needs Destination Pin/);
  });

  it("shows tree asset row summaries with tag, DBH, status, and schedule context", () => {
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
        scheduleTasks={[
          {
            id: "schedule-root-prune",
            title: "Root prune tree group 100",
            task: "Root prune tree group 100",
            jobId: "job-boca-course-1",
            projectId: "project-boca-west",
            startDate: "2026-06-15",
            endDate: "2026-06-18",
            assignee: "Carlos Reyes",
            activityType: "Root Pruning",
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[
          {
            id: "tree-boca-109",
            treeId: "tree-boca-109",
            projectId: "project-boca-west",
            jobId: "job-boca-course-1",
            type: "Live Oak",
            tag: "109",
            dbh: 33,
            status: "Root Pruning",
            relocationMap: {
              source: { lat: 26.37127, lng: -80.16231, label: "Imported source pin" },
            },
          },
        ]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Tree Type/);
    assert.match(html, /Live Oak/);
    assert.match(html, /Tag #109/);
    assert.match(html, /DBH 33/);
    assert.match(html, /Asset tree-boca-109/);
    assert.match(html, /Map Schedule/);
    assert.match(html, /Root prune tree group 100/);
    assert.match(html, /Carlos Reyes/);
    assert.match(html, /Jun 15 - Jun 18/);
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

    assert.match(html, /KML\/KMZ Bridge Import/);
    assert.match(html, /Upload KML File/);
    assert.match(html, /Paste KML Text/);
    assert.match(html, /Preview Imported Tree Pins/);
    assert.match(html, /Save Imported Tree Pins/);
    assert.doesNotMatch(html, /Select a relocation project before saving imported tree pins/);
  });

  it("shows selected project profile addresses and saved pins as editable map locations", () => {
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
            location: "Palm Beach Gardens, FL",
            crewAccessAddress: "Waterford crew gate from Hood Road",
            truckAccessAddress: "Waterford truck entrance",
            loadUnloadPin: "26.85703076,-80.05794282",
          },
        ]}
        initialSavedLocations={[
          {
            id: "location-project-waterford-load-unload-pin-waterford-practice-green-load-zone",
            name: "Waterford practice green load zone",
            title: "Waterford practice green load zone",
            locationType: "Load / Unload Pin",
            accessType: "Load / Unload Pin",
            sourceText: "26.85715,-80.05811",
            coordinateText: "26.85715, -80.05811",
            latitude: 26.85715,
            longitude: -80.05811,
            projectId: "project-waterford",
            jobId: "job-waterford",
            divisionUse: ["Relocation & Installation", "Freight"],
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
      />,
    );

    assert.match(html, /Saved Site Locations/);
    assert.match(html, /Project Pins/);
    assert.match(html, /Waterford crew gate from Hood Road/);
    assert.match(html, /Waterford practice green load zone/);
    assert.match(html, /Load \/ Unload Pin/);
    assert.match(html, /Edit Pin/);
    assert.match(html, /Adjust Pin/);
    assert.match(html, /Focus/);
    assert.match(html, /Open Maps/);
  });

  it("opens the add pin form with selected project context when requested", () => {
    const html = renderToString(
      <MapsBoard
        initialSelectedJobId="job-waterford"
        initialAddPinOpen
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
      />,
    );

    assert.match(html, /Add Project Pin/);
    assert.match(html, /Saved to The Waterford/);
    assert.match(html, /Click the map, paste a Google Maps link, enter lat\/long, or paste a street address/);
    assert.match(html, /Location Label/);
    assert.match(html, /Save Site Location/);
  });

  it("shows the live Reveal vehicle map layer from equipment GPS", () => {
    const html = renderToString(
      <MapsBoard
        jobs={[]}
        equipment={[
          {
            id: "equipment-semi-1",
            name: "Semi #1",
            category: "Truck",
            telematicsProvider: "Reveal",
            revealVehicleId: "veh-1",
            vehicleNumber: "S1",
            lastTelematicsLatitude: 26.387315,
            lastTelematicsLongitude: -80.171258,
            lastTelematicsAt: "2026-06-12T12:00:00.000Z",
          },
        ]}
        fleetTelematicsEvents={[
          {
            id: "reveal-veh-1",
            provider: "Reveal",
            providerVehicleId: "veh-1",
            vehicleName: "Semi #1",
            vehicleNumber: "S1",
            latitude: 26.387315,
            longitude: -80.171258,
            address: "Boca West truck access",
            eventAt: "2026-06-12T12:05:00.000Z",
            driverName: "Christian Crespo",
          },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
      />,
    );

    assert.match(html, /Live Vehicle Layer/);
    assert.match(html, /Semi #1/);
    assert.match(html, /Christian Crespo/);
    assert.match(html, /Boca West truck access/);
  });

  it("shows the Live GPS map with vehicles, equipment, freight, and unmatched GPS filters", () => {
    const html = renderToString(
      <MapsBoard
        initialMapMode="liveGps"
        jobs={[]}
        loads={[{
          id: "load-boca-equipment",
          title: "Christian Crespo - Semi #1 - Boca West equipment moves",
          truckId: "equipment-semi-1",
          truck: "Semi #1",
          driver: "Christian Crespo",
          status: "In Transit",
        }]}
        equipment={[
          { id: "equipment-semi-1", name: "Semi #1", category: "Truck", revealVehicleId: "veh-1" },
          { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine", revealVehicleId: "asset-komatsu-1" },
        ]}
        fleetTelematicsEvents={[
          { id: "evt-semi", providerVehicleId: "veh-1", vehicleName: "Semi #1", latitude: 26.38, longitude: -80.17, speedMph: 18, driverName: "Christian Crespo", eventAt: "2026-06-13T14:00:00.000Z" },
          { id: "evt-komatsu", providerVehicleId: "asset-komatsu-1", vehicleName: "Komatsu 500 - 1", latitude: 26.75, longitude: -80.98, speedMph: 0, eventAt: "2026-06-13T14:00:00.000Z" },
          { id: "evt-unmatched", providerVehicleId: "unknown-9", vehicleName: "Unknown Reveal tracker", latitude: 26.76, longitude: -80.91, eventAt: "2026-06-13T14:00:00.000Z" },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Live GPS Map/);
    assert.match(html, /Vehicles/);
    assert.match(html, /Equipment/);
    assert.match(html, /Freight/);
    assert.match(html, /Unmatched GPS/);
    assert.match(html, /Semi #1/);
    assert.match(html, /Komatsu 500 - 1/);
    assert.match(html, /Christian Crespo - Semi #1 - Boca West equipment moves/);
    assert.match(html, /Unknown Reveal tracker/);
  });

  it("renders the dedicated Fleet GPS page without tree relocation or import editing", () => {
    const html = renderToString(
      <MapsBoard
        pagePurpose="fleetGps"
        jobs={[]}
        loads={[{
          id: "load-boca-equipment",
          title: "Christian Crespo - Semi #1 - Boca West equipment moves",
          truckId: "equipment-semi-1",
          truck: "Semi #1",
          driver: "Christian Crespo",
          status: "In Transit",
        }]}
        equipment={[
          { id: "equipment-semi-1", name: "Semi #1", category: "Truck", revealVehicleId: "veh-1" },
          { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine", revealVehicleId: "asset-komatsu-1" },
        ]}
        fleetTelematicsEvents={[
          { id: "evt-semi", providerVehicleId: "veh-1", vehicleName: "Semi #1", latitude: 26.38, longitude: -80.17, speedMph: 18, driverName: "Christian Crespo", eventAt: "2026-06-13T14:00:00.000Z" },
          { id: "evt-komatsu", providerVehicleId: "asset-komatsu-1", vehicleName: "Komatsu 500 - 1", latitude: 26.75, longitude: -80.98, speedMph: 0, eventAt: "2026-06-13T14:00:00.000Z" },
        ]}
        canSyncRevealLiveLocations
        onSyncRevealLiveLocations={() => undefined}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Fleet GPS/);
    assert.match(html, /Verizon Reveal vehicle, equipment, freight, and unmatched GPS tracking/);
    assert.match(html, /Sync GPS/);
    assert.match(html, /Open in Verizon Reveal/);
    assert.match(html, /Live GPS Assets/);
    assert.match(html, /Semi #1/);
    assert.match(html, /Komatsu 500 - 1/);
    assert.match(html, /Christian Crespo - Semi #1 - Boca West equipment moves/);
    assert.doesNotMatch(html, /Map Mode/);
    assert.doesNotMatch(html, /Add Pin/);
    assert.doesNotMatch(html, /Tree Map Workbench/);
    assert.doesNotMatch(html, /Online GIS Import \/ KML Backup/);
  });

  it("can isolate a single live GPS asset from the map entry point", () => {
    const html = renderToString(
      <MapsBoard
        initialMapMode="liveGps"
        initialSelectedGpsAssetId="equipment-komatsu-500-1"
        jobs={[]}
        loads={[]}
        equipment={[
          { id: "equipment-semi-1", name: "Semi #1", category: "Truck", revealVehicleId: "veh-1" },
          { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine", revealVehicleId: "asset-komatsu-1" },
        ]}
        fleetTelematicsEvents={[
          { id: "evt-semi", providerVehicleId: "veh-1", vehicleName: "Semi #1", latitude: 26.38, longitude: -80.17, speedMph: 18, eventAt: "2026-06-13T14:00:00.000Z" },
          { id: "evt-komatsu", providerVehicleId: "asset-komatsu-1", vehicleName: "Komatsu 500 - 1", latitude: 26.75, longitude: -80.98, speedMph: 0, eventAt: "2026-06-13T14:00:00.000Z" },
        ]}
        ranchOaks={[]}
        treeRelocationRecords={[]}
        onUpdateTreeLocation={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Isolating Komatsu 500 - 1/);
    assert.match(html, /Show All GPS Assets/);
  });

  it("renders the dedicated Map Imports page as an admin file-processing workspace", () => {
    const html = renderToString(
      <MapsBoard
        pagePurpose="imports"
        initialSelectedJobId="job-waterford"
        initialKmlImportOpen
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
      />,
    );

    assert.match(html, /Map Imports/);
    assert.match(html, /KML, KMZ, DWG, CAD, survey, and imported pin staging/);
    assert.match(html, /Import KML\/KMZ/);
    assert.match(html, /Export KML/);
    assert.match(html, /Upload Survey \/ CAD File/);
    assert.match(html, /Preview Import/);
    assert.match(html, /Match Tree IDs/);
    assert.match(html, /Create Draft Tree Assets/);
    assert.match(html, /Sync to ArcGIS/);
    assert.match(html, /KML\/KMZ Bridge Import/);
    assert.match(html, /The Waterford/);
    assert.doesNotMatch(html, /Map Mode/);
    assert.doesNotMatch(html, /Live GPS Assets/);
    assert.doesNotMatch(html, /Tree Map Workbench/);
    assert.doesNotMatch(html, /Saved Site Locations/);
  });
});
