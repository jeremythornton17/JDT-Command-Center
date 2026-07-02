import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { CrewRecord, DocumentRecord, EquipmentRecord, FieldUpdateRecord, FleetTelematicsEventRecord, JobRecord, LoadRecord, ProjectMaterialItemRecord, TreeRelocationRecord, WorkOrderRecord } from "../commandCenter/records";
import { Dashboard, TrackerBoard } from "../App";
import { buildDashboardSummary } from "../commandCenter/dashboard";
import CommandDrawer, { filterTreeAssets, projectModalContextForRecord, projectSiteMapUrl } from "./CommandDrawer";
import CrewViewBoard from "./CrewViewBoard";
import CrewsBoard from "./CrewsBoard";
import EquipmentBoard from "./EquipmentBoard";
import FreightBoard from "./FreightBoard";
import NurseryBoard from "./NurseryBoard";
import SyncBoard from "./SyncBoard";

describe("work order UI wiring", () => {
  const bocaJob: JobRecord = {
    id: "job-boca-relocation",
    title: "Boca West Relocation",
    clientId: "client-boca-west-country-club",
    clientName: "Boca West Country Club",
    projectId: "project-boca-west-country-club-boca-west-relocation",
    projectName: "Boca West Relocation",
  };

  const rootPruneOrder: WorkOrderRecord = {
    id: "work-order-job-boca-relocation-root-prune-hole-7",
    title: "Root prune Hole 7",
    clientId: bocaJob.clientId,
    clientName: bocaJob.clientName,
    projectId: bocaJob.projectId,
    projectName: bocaJob.projectName,
    jobId: bocaJob.id,
    jobName: bocaJob.title,
    status: "Scheduled",
    workOrderType: "tree_pruning",
    assignedCrewIds: ["personnel-carlos-reyes"],
    assignedCrewNames: ["Carlos Reyes"],
    equipmentNames: ["CAT 299D"],
    implementNames: ["Root Pruner"],
    loadNames: ["Lowboy move"],
  };

  const revealSemi: EquipmentRecord = {
    id: "equipment-semi-1",
    name: "Semi #1",
    category: "Truck",
    telematicsProvider: "Reveal",
    revealVehicleId: "veh-1",
    vehicleNumber: "S1",
    assignedProjectName: "Boca West Relocation",
    currentLocationName: "Boca West Relocation",
    currentLocation: "20583 Boca W Dr, Boca Raton, FL 33434",
    lastTelematicsLatitude: 26.387315,
    lastTelematicsLongitude: -80.171258,
    lastTelematicsAt: "2026-06-12T12:00:00.000Z",
  };

  const revealGpsEvent: FleetTelematicsEventRecord = {
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
  };

  it("shows project-specific site access addresses and pins inside the project overview", () => {
    const frenchmansJob = {
      id: "job-frenchmans-driving-range",
      title: "Frenchman's Driving Range & Practice Facility",
      clientName: "Frenchman's Creek Country Club",
      location: "13495 Tournament Dr, Palm Beach Gardens, FL 33410",
      crewAccessAddress: "Frenchman's Creek north crew gate",
      truckAccessAddress: "Construction truck access from Hood Road",
      constructionAccessPin: "26.87775, -80.08895",
      loadUnloadPin: "Practice facility laydown pin",
      secondaryLoadUnloadPin: "South range unloading pin",
      siteAccessNotes: "Use truck gate only. Do not send crews through the clubhouse entrance.",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={frenchmansJob.id}
        defaultTab="overview"
        openModal={() => undefined}
        jobsList={[frenchmansJob]}
      />,
    );

    assert.match(html, /Project Site Access/);
    assert.match(html, /Main Jobsite Address/);
    assert.match(html, /Crew Access Address/);
    assert.match(html, /Truck \/ Equipment Access Address/);
    assert.match(html, /Construction \/ Equipment Access Pin/);
    assert.match(html, /Load \/ Unload Pin/);
    assert.match(html, /Additional Load \/ Unload Pin/);
    assert.match(html, /Frenchman&#x27;s Creek north crew gate/);
    assert.match(html, /Construction truck access from Hood Road/);
    assert.match(html, /Do not send crews through the clubhouse entrance/);
  });

  it("shows an expand control for project profile drawers", () => {
    const carmaxJob = {
      id: "job-carmax",
      title: "Carmax",
      clientName: "A Cut Above",
      location: "15920 Corporate Rd N, Jupiter, FL 33478",
      status: "Active",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={carmaxJob.id}
        defaultTab="overview"
        openModal={() => undefined}
        jobsList={[carmaxJob]}
      />,
    );

    assert.match(html, /Expand project profile/);
    assert.match(html, /Close profile/);
  });

  it("shows the executive command center overview without field action clutter", () => {
    const dashboardSummary = buildDashboardSummary({
      clients: [{ id: "cli-2275", name: "Boca West Country Club" }],
      jobs: [{
        id: "job-boca-course-1",
        title: "Boca West Course 1 Renovation",
        clientId: "client-boca-west-country-club",
        clientName: "Boca West Country Club",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
      }],
      loads: [{
        id: "load-boca-lowboy",
        title: "Boca West lowboy move",
        projectId: "project-boca-course-1",
        projectName: "Boca West Course 1 Renovation",
        jobId: "job-boca-course-1",
        jobName: "Boca West Course 1 Renovation",
        status: "Scheduled",
      }, {
        id: "load-boca-equipment",
        title: "Boca West equipment move",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Black Lowboy",
        pickupDate: "2026-06-05",
        status: "Scheduled",
      }, {
        id: "load-waterford-trees",
        title: "Waterford tree delivery",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Dropdeck",
        pickupDate: "2026-06-05",
        status: "Scheduled",
      }],
      crew: [{
        id: "crew-christian",
        name: "Christian Crespo",
        role: "Driver",
      }],
      equipment: [{
        id: "truck-semi-1",
        name: "Semi #1",
        category: "Truck",
        registrationDocumentUrl: "https://drive/registration.pdf",
        registrationExpirationDate: "2026-06-20",
        insuranceDocumentUrl: "https://drive/insurance.pdf",
        insuranceExpirationDate: "2026-08-15",
      }],
      fieldUpdates: [{
        id: "closeout-boca-root-prune",
        relatedTitle: "Boca West root prune closeout",
        crewName: "Carlos Reyes",
        projectName: "Boca West Course 1 Renovation",
        updateType: "Daily Closeout",
        fieldStatus: "Closeout Submitted",
      }],
    });

    const html = renderToString(
      <Dashboard
        recentRecords={[]}
        dashboardSummary={dashboardSummary}
        openModal={() => undefined}
        openDrawer={() => undefined}
        setActiveTab={() => undefined}
      />,
    );

    assert.match(html, /Command Center Overview/);
    assert.match(html, /Fleet GPS Quick Glance/);
    assert.match(html, /Project Snapshots/);
    assert.match(html, /Relocated Trees/);
    assert.match(html, /Across active projects/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Freight Today/);
    assert.match(html, /Crew at a Glance/);
    assert.match(html, /Nursery Snapshot/);
    assert.match(html, /Equipment Status/);
    assert.match(html, /Alerts \/ Needs Attention/);
    assert.match(html, /Open Fleet Map/);
    assert.match(html, /View all projects/);
    assert.match(html, /Boca West lowboy move/);
    assert.match(html, /Driver/);
    assert.doesNotMatch(html, />Assign Work</);
    assert.doesNotMatch(html, />Dispatch Freight Move</);
    assert.doesNotMatch(html, />Start</);
    assert.doesNotMatch(html, />Complete</);
    assert.doesNotMatch(html, />Add Photo</);
    assert.doesNotMatch(html, />Blocker</);
  });

  it("shows Reveal telematics exceptions on the command board", () => {
    const dashboardSummary = buildDashboardSummary({
      jobs: [bocaJob],
      loads: [{
        id: "load-boca-west",
        title: "Boca West delivery",
        truck: "Semi #1",
        truckId: "equipment-semi-1",
        status: "In Transit",
        delivery: "Boca West Relocation",
      }],
      equipment: [{
        ...revealSemi,
        currentLocationName: "25 Acre Farm",
        currentLocation: "25 Acre Farm",
        lastTelematicsAddress: "25 Acre Farm",
        lastTelematicsAt: "2026-06-12T06:00:00.000Z",
      }],
      fleetTelematicsEvents: [],
      todayIso: "2026-06-12",
    });

    const html = renderToString(
      <Dashboard
        recentRecords={[]}
        dashboardSummary={dashboardSummary}
        workOrders={[]}
        openModal={() => undefined}
        openDrawer={() => undefined}
        setActiveTab={() => undefined}
      />,
    );

    assert.match(html, /Semi #1 away from assigned project/);
    assert.match(html, /Semi #1 stale GPS/);
  });

  it("builds project modal context from project records that only have a project id", () => {
    assert.deepEqual(projectModalContextForRecord({
      id: "project-waterford",
      title: "Waterford Relocation",
      clientId: "cli-waterford",
      clientName: "Waterford",
    }), {
      clientId: "cli-waterford",
      clientName: "Waterford",
      projectId: "project-waterford",
      projectsId: "project-waterford",
      projectName: "Waterford Relocation",
      jobId: "project-waterford",
      jobName: "Waterford Relocation",
      division: undefined,
      projectSiteAddressOptions: [],
    });
  });

  it("shows the selected project context in Data Sync when importing project trees", () => {
    const html = renderToString(
      <SyncBoard
        sources={[]}
        mappings={[]}
        openModal={() => undefined}
        projectImportContext={{
          clientName: "Waterford",
          projectId: "project-waterford",
          projectName: "Waterford Relocation",
          jobId: "job-waterford-relocation",
          jobName: "Tree relocation",
        }}
      />,
    );

    assert.match(html, /Importing To Project/);
    assert.match(html, /Import \/ Backup/);
    assert.match(html, /JDT Command Center/);
    assert.match(html, /App Import Setup/);
    assert.match(html, /Waterford/);
    assert.match(html, /Waterford Relocation/);
    assert.match(html, /Tree relocation/);
  });

  it("shows fixed workbook column choices for selected-column Data Sync imports", () => {
    const html = renderToString(
      <SyncBoard
        sources={[]}
        mappings={[]}
        openModal={() => undefined}
        projectImportContext={{
          clientName: "A Cut Above",
          projectId: "ACA-061126-CARMAX",
          projectName: "Carmax",
        }}
      />,
    );

    assert.match(html, /Workbook Columns/);
    assert.match(html, /Paste only the selected columns in this order/);
    assert.match(html, /Tree_Type/);
    assert.match(html, /Tag/);
    assert.match(html, /DBH_IN/);
    assert.match(html, /App generated/);
  });

  it("shows a spreadsheet-style paste grid for selected import columns", () => {
    const html = renderToString(
      <SyncBoard
        sources={[]}
        mappings={[]}
        openModal={() => undefined}
        projectImportContext={{
          clientName: "A Cut Above",
          projectId: "ACA-061126-CARMAX",
          projectName: "Carmax",
        }}
      />,
    );

    assert.match(html, /Spreadsheet Paste Grid/);
    assert.match(html, /Paste each workbook column separately/);
    assert.match(html, /Tree_Type column values/);
    assert.match(html, /Tag column values/);
    assert.match(html, /DBH_IN column values/);
    assert.doesNotMatch(html, /placeholder="Tree_Type\\tTag\\tDBH_IN/);
  });

  it("builds project-scoped address options for assignment forms launched from a project profile", () => {
    const context = projectModalContextForRecord({
      id: "job-frenchmans-driving-range",
      title: "Frenchman's Driving Range & Practice Facility",
      clientName: "Frenchman's Creek Country Club",
      location: "13495 Tournament Dr, Palm Beach Gardens, FL 33410",
      crewAccessAddress: "Frenchman's Creek north crew gate",
      truckAccessAddress: "Construction truck access from Hood Road",
      constructionAccessPin: "26.87775, -80.08895",
      loadUnloadPin: "Practice facility laydown pin",
      secondaryLoadUnloadPin: "South range unloading pin",
    });

    assert.deepEqual(context.projectSiteAddressOptions, [
      "13495 Tournament Dr, Palm Beach Gardens, FL 33410",
      "Frenchman's Creek north crew gate",
      "Construction truck access from Hood Road",
      "26.87775, -80.08895",
      "Practice facility laydown pin",
      "South range unloading pin",
    ]);
  });

  it("turns pasted project addresses and Google Maps pins into open-map links", () => {
    const googleMapsUrl = "https://www.google.com/maps/@26.387315,-80.1712583,260m/data=!3m1!1e3!4m3!11m2!2s9hIPxsbmI8gHyk_b09HUxQ!3e3?authuser=0&entry=ttu";
    assert.equal(projectSiteMapUrl(googleMapsUrl), googleMapsUrl);
    assert.equal(
      projectSiteMapUrl("26.387315, -80.1712583"),
      "https://www.google.com/maps/search/?api=1&query=26.387315%2C%20-80.1712583",
    );
    assert.equal(
      projectSiteMapUrl("13495 Tournament Dr, Palm Beach Gardens, FL 33410"),
      "https://www.google.com/maps/search/?api=1&query=13495%20Tournament%20Dr%2C%20Palm%20Beach%20Gardens%2C%20FL%2033410",
    );

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId="job-boca"
        defaultTab="overview"
        openModal={() => undefined}
        jobsList={[{
          id: "job-boca",
          title: "Boca West Relocation",
          location: "Boca Raton",
          truckAccessAddress: googleMapsUrl,
          loadUnloadPin: "26.387315, -80.1712583",
        }]}
      />,
    );

    assert.match(html, /Open Map/);
    assert.match(html, /https:\/\/www\.google\.com\/maps\/@26\.387315,-80\.1712583/);
    assert.match(html, /query=26.387315%2C%20-80.1712583/);
  });

  it("shows a client account profile focused on contacts, projects, jobs, documents, and history", () => {
    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="client"
        itemId="cli-2275"
        defaultTab="overview"
        openModal={() => undefined}
        clientsList={[{
          id: "cli-2275",
          name: "Boca West Country Club",
          contactName: "Travis Wehrs",
          phone: "(239) 340-9223",
          email: "TWehrs@bocawestcc.org",
          billingAddress: "20583 Boca West Dr, Boca Raton, FL 33434",
          billingDetails: "Net 30",
          members: [{ name: "Net 30 Account", role: "Billing", phone: "561-555-0100", email: "billing@bocawestcc.org" }],
        }]}
        projectsList={[
          { id: "project-boca-course-1", title: "Boca West Course 1 Renovation", clientId: "cli-2275", clientName: "Boca West Country Club", status: "Active" },
          { id: "project-boca-past", title: "Boca West Past Install", clientId: "cli-2275", status: "Complete" },
        ]}
        jobsList={[
          { id: "job-boca-active", title: "Course 1 Relocation", clientId: "cli-2275", projectId: "project-boca-course-1", status: "Active" },
          { id: "job-boca-upcoming", title: "North Course Install", clientName: "Boca West Country Club", status: "Scheduled" },
          { id: "job-boca-complete", title: "Completed Root Prune", clientId: "cli-2275", status: "Complete" },
        ]}
        workOrdersList={[
          { id: "wo-boca-root-prune", title: "Root prune Hole 7", clientId: "cli-2275", status: "Scheduled", assignedCrewNames: ["Carlos Reyes"] },
        ]}
        loadsList={[
          { id: "load-boca-lowboy", title: "Lowboy to Boca West", clientId: "cli-2275", status: "In Transit", driver: "Christian Crespo" },
        ]}
        documentsList={[
          { id: "doc-boca-permit", title: "Boca West permit", clientId: "cli-2275", category: "Permit", url: "https://drive.google.com/boca-permit" },
        ]}
        fieldUpdatesList={[
          { id: "field-boca-delay", title: "Crew delay", clientId: "cli-2275", crewName: "Carlos Reyes", updateType: "Delayed" },
        ]}
      />,
    );

    assert.match(html, /Client Operating Profile/);
  assert.match(html, /Client \/ Project \/ Job/);
    assert.match(html, /Primary Contact/);
    assert.match(html, /Additional Contacts/);
    assert.match(html, /Travis Wehrs/);
    assert.match(html, /Net 30 Account/);
    assert.match(html, /Current &amp; Active/);
    assert.match(html, /Upcoming \/ Unscheduled/);
    assert.match(html, /Completed \/ Prior/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /North Course Install/);
    assert.match(html, /Completed Root Prune/);
    assert.match(html, /Boca West permit/);
    assert.doesNotMatch(html, /Client Work Orders/);
    assert.doesNotMatch(html, /Client Freight Moves/);
    assert.doesNotMatch(html, /Client Field Updates/);
    assert.doesNotMatch(html, /Root prune Hole 7/);
    assert.doesNotMatch(html, /Lowboy to Boca West/);
    assert.doesNotMatch(html, /Crew delay/);
  });

  it("groups client documents into account folders with contract context", () => {
    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="client"
        itemId="cli-2275"
        defaultTab="documents"
        openModal={() => undefined}
        clientsList={[{
          id: "cli-2275",
          name: "Boca West Country Club",
          contactName: "Travis Wehrs",
        }]}
        projectsList={[{
          id: "project-boca-course-1",
          title: "Boca West Course 1 Renovation",
          clientId: "cli-2275",
          clientName: "Boca West Country Club",
        }]}
        jobsList={[{
          id: "job-boca-root-prune",
          title: "Course 1 Root Pruning",
          clientId: "cli-2275",
          projectId: "project-boca-course-1",
          projectName: "Boca West Course 1 Renovation",
        }]}
        documentsList={[
          {
            id: "doc-boca-contract",
            name: "Boca West Course 1 signed contract",
            category: "Signed Contract",
            clientId: "cli-2275",
            projectId: "project-boca-course-1",
            projectName: "Boca West Course 1 Renovation",
            status: "Approved",
            reviewStatus: "Filed",
            signedDate: "2026-06-01",
            scopeOfWork: "Root prune, relocate, and provide nutrient care for scoped trees.",
            scopeTreeCount: 42,
          } as DocumentRecord,
          {
            id: "doc-boca-proposal",
            name: "Course 1 proposal",
            category: "Proposal",
            clientId: "cli-2275",
            projectId: "project-boca-course-1",
          },
          {
            id: "doc-boca-coi",
            name: "Boca West COI",
            category: "COI",
            clientId: "cli-2275",
          },
          {
            id: "doc-boca-map",
            name: "Truck access map",
            category: "Site Map",
            clientId: "cli-2275",
            jobId: "job-boca-root-prune",
          },
        ]}
      />,
    );

    assert.match(html, /Client Document Library/);
    assert.match(html, /Signed Contracts/);
    assert.match(html, /Proposals \/ Estimates/);
    assert.match(html, /Insurance \/ COI \/ W-9/);
    assert.match(html, /Site Maps \/ Access Docs/);
    assert.match(html, /Contract Status/);
    assert.match(html, /Contract Date/);
    assert.match(html, /Linked Project/);
    assert.match(html, /Scope Summary/);
    assert.match(html, /Tree Assets Covered/);
    assert.match(html, /42 trees/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Client-level docs/);
    assert.match(html, /Project-level docs/);
    assert.match(html, /Job-level docs/);
  });

  it("shows related work orders inside a job drawer", () => {
    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="work orders"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        workOrdersList={[rootPruneOrder]}
      />,
    );

    assert.match(html, /Work Orders/);
    assert.match(html, /Root prune Hole 7/);
    assert.match(html, /Carlos Reyes/);
    assert.match(html, /CAT 299D/);
    assert.match(html, /Root Pruner/);
    assert.match(html, /Lowboy move/);
  });

  it("groups project tree work into batched work-order sections instead of one card per tree", () => {
    const treeAssets: TreeRelocationRecord[] = Array.from({ length: 12 }, (_, index) => {
      const tag = String(index + 41);
      return {
        id: `tree-bellaire-${tag}`,
        treeId: tag,
        treeTag: tag,
        projectId: "project-bellaire-course-renovation",
        projectName: "Bellaire CC Course Renovation",
        type: "Live Oak",
        dbh: index % 2 ? 31 : 16,
        relocationStatus: "Ready for Relocation",
      };
    });

    const rootPruningOrders: WorkOrderRecord[] = treeAssets.map((tree) => ({
      id: `rp-bellaire-${tree.treeId}`,
      title: `Tree #${tree.treeId} Root Pruning`,
      projectId: "project-bellaire-course-renovation",
      projectName: "Bellaire CC Course Renovation",
      workOrderType: "tree_pruning",
      rootPruneCycleId: "rp-bellaire-50-batch-1",
      scheduledDate: "2026-06-18",
      assignedCrewNames: ["Carlos Crew"],
      plannedCutPercent: 50,
      rootPruneTaskStatus: "Scheduled",
      treeIds: [String(tree.treeId)],
      treeNames: [String(tree.treeId)],
    }));

    const nutrientCareOrders: WorkOrderRecord[] = treeAssets.slice(0, 6).map((tree) => ({
      id: `nc-bellaire-${tree.treeId}`,
      title: `Tree #${tree.treeId} Nutrient Care`,
      projectId: "project-bellaire-course-renovation",
      projectName: "Bellaire CC Course Renovation",
      workOrderType: "treatment_aftercare",
      carePhase: "After 50% Cut",
      scheduledDate: "2026-06-19",
      vendor: "Burrow",
      treatmentType: "Injection / Nutrient",
      careTaskStatus: "Scheduled",
      treeIds: [String(tree.treeId)],
      treeNames: [String(tree.treeId)],
    }));

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId="job-bellaire-renovation"
        defaultTab="work orders"
        openModal={() => undefined}
        jobsList={[{
          id: "job-bellaire-renovation",
          title: "Bellaire CC Course Renovation",
          projectId: "project-bellaire-course-renovation",
          projectName: "Bellaire CC Course Renovation",
        }]}
        treeRelocationRecordsList={treeAssets}
        workOrdersList={[...rootPruningOrders, ...nutrientCareOrders]}
      />,
    );

    assert.match(html, /Root Pruning Work Orders/);
    assert.match(html, /Nutrient Care Work Orders/);
    assert.match(html, /Relocation Work Orders/);
    assert.match(html, /Freight \/ Equipment Support/);
    assert.match(html, /Root Pruning - 50% Cut - Batch 1/);
    assert.match(html, /12 trees/);
    assert.match(html, /Carlos Crew/);
    assert.match(html, /Print Tree List/);
    assert.match(html, /Complete Batch/);
    assert.match(html, /Nutrient Care - After 50% Cut - Injection \/ Nutrient/);
    assert.match(html, /6 trees/);
    assert.doesNotMatch(html, /Tree #41 Root Pruning/);
    assert.doesNotMatch(html, /Tree #41 Nutrient Care/);
  });

  it("shows project equipment currently on site with an equipment change request action", () => {
    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="work orders"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        workOrdersList={[rootPruneOrder]}
        equipmentList={[
          {
            id: "equipment-komatsu-500-1",
            name: "Komatsu 500 - 1",
            category: "Machine",
            status: "In Use",
            currentLocationType: "Job Site",
            currentLocationName: "Boca West Relocation",
            assignedProjectId: bocaJob.projectId,
            assignedProjectName: bocaJob.projectName,
            assignedJobId: bocaJob.id,
            assignedJobName: bocaJob.title,
            assignedCrewName: "Carlos Reyes",
            attachedImplementNames: ["Root Pruner"],
          },
        ]}
      />,
    );

    assert.match(html, /Equipment On Site/);
    assert.match(html, /Komatsu 500 - 1/);
    assert.match(html, /In Use/);
    assert.match(html, /Boca West Relocation/);
    assert.match(html, /Carlos Reyes/);
    assert.match(html, /Root Pruner/);
    assert.match(html, /Request Equipment Change/);
  });

  it("exposes division-specific work, equipment, and freight request actions from the relocation board", () => {
    const html = renderToString(
      <TrackerBoard
        jobs={[{ ...bocaJob, division: "Relocation & Installation", status: "Active" }]}
        workOrders={[rootPruneOrder]}
        projectMaterialItems={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Root Pruning/);
    assert.match(html, /Equipment/);
    assert.match(html, /Freight/);
    assert.match(html, /CAT 299D/);
    assert.match(html, /Lowboy move/);
  });

  it("renders division category icons on operating board surfaces", () => {
    const trackerHtml = renderToString(
      <TrackerBoard
        projects={[]}
        jobs={[{ ...bocaJob, division: "Relocation & Installation", status: "Active" }]}
        workOrders={[]}
        projectMaterialItems={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );
    assert.match(trackerHtml, /data-category="relocation"/);
    assert.match(trackerHtml, /data-category="crew"/);
    assert.match(trackerHtml, /data-category="equipment"/);
    assert.match(trackerHtml, /data-category="freight"/);

    const freightHtml = renderToString(
      <FreightBoard loads={[]} equipment={[]} workOrders={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );
    assert.match(freightHtml, /data-category="freight"/);

    const equipmentHtml = renderToString(
      <EquipmentBoard starterEquipment={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );
    assert.match(equipmentHtml, /data-category="equipment"/);

    const nurseryHtml = renderToString(
      <NurseryBoard starterRanchOaks={[]} inventoryItems={[]} ranchOaks={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );
    assert.match(nurseryHtml, /data-category="nursery"/);
  });

  it("groups relocation projects by client and shows project-specific work orders", () => {
    const html = renderToString(
      <TrackerBoard
        projects={[
          {
            id: "BWCC-060426",
            projectId: "BWCC-060426",
            title: "Boca West Course 1 Renovation",
            clientId: "cli-2275",
            clientName: "Boca West Country Club",
            division: "Relocation & Installation",
            jobType: "Relocation Job",
            status: "Active",
            date: "2026-06-04",
          },
          {
            id: "BWCC-060127",
            projectId: "BWCC-060127",
            title: "Boca West Course 2 Renovation",
            clientId: "cli-2275",
            clientName: "Boca West Country Club",
            division: "Relocation & Installation",
            jobType: "Mixed Job",
            status: "Scheduled",
            date: "2027-06-01",
          },
          {
            id: "FCC-060426",
            projectId: "FCC-060426",
            title: "Frenchman's Driving Range",
            clientName: "Frenchman's Creek Country Club",
            division: "Relocation & Installation",
            jobType: "Installation Job",
          },
        ]}
        jobs={[]}
        workOrders={[{
          ...rootPruneOrder,
          id: "BWCC-060426-ROOTPRUNE-CR-060526-01",
          jobId: "BWCC-060426-ROOTPRUNE-CR-060526-01",
          title: "Root prune Course 1",
          projectId: "BWCC-060426",
          projectName: "Boca West Course 1 Renovation",
        }]}
        projectMaterialItems={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Boca West Country Club/);
    assert.match(html, /2 projects/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Boca West Course 2 Renovation/);
    assert.match(html, /BWCC-060426/);
    assert.match(html, /Root prune Course 1/);
    assert.match(html, /Root Pruning/);
    assert.match(html, /Relocation Move/);
    assert.match(html, /Nutrient Care/);
    assert.match(html, /Frenchman&#x27;s Creek Country Club/);
    assert.match(html, /Frenchman&#x27;s Driving Range/);
  });

  it("shows project material items inside a job drawer", () => {
    const materialItem: ProjectMaterialItemRecord = {
      id: "mat-boca-hole-7-pine",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      holeNumberOrArea: "Hole 7",
      source: "JD Thornton",
      materialType: "Pine",
      sizeClass: "Large",
      quantityRequired: 12,
      quantityInstalled: 5,
      installStatus: "Delivered",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="materials"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        projectMaterialItemsList={[materialItem]}
      />,
    );

    assert.match(html, /Project Material Items/);
    assert.match(html, /Hole 7/);
    assert.match(html, /Pine/);
    assert.match(html, /Delivered/);
  });

  it("shows tree assets, tree work, and photos inside a job drawer", () => {
    const treeAsset: TreeRelocationRecord = {
      id: "tree-boca-109",
      treeId: "tree-boca-109",
      title: "Live Oak tree-boca-109",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      type: "Live Oak",
      dbh: 31,
      relocationCost: 12732.5,
      relocationStatus: "Invoiced",
      status: "Root Pruning",
    };
    const treatmentOrder: WorkOrderRecord = {
      id: "treat-boca-109-1",
      title: "Aftercare tree-boca-109",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      workOrderType: "treatment_aftercare",
      sourceSheetName: "Treatment or Aftercare",
      treeIds: ["tree-boca-109"],
      treeNames: ["tree-boca-109"],
      status: "Ready",
    };
    const photo: DocumentRecord = {
      id: "photo-boca-109",
      title: "Before relocation",
      category: "Tree Photo",
      url: "https://drive.google.com/file/d/photo",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      treeId: "tree-boca-109",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="tree assets"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        treeRelocationRecordsList={[treeAsset]}
        workOrdersList={[rootPruneOrder, treatmentOrder]}
        documentsList={[photo]}
      />,
    );

    assert.match(html, /Tree Assets/);
    assert.match(html, /Compact Tree List/);
    assert.match(html, /Live Oak/);
    assert.match(html, /DBH/);
    assert.match(html, /\$12,732\.50/);
    assert.match(html, /Destination/);
    assert.match(html, /Actions/);
    assert.doesNotMatch(html, /Aftercare tree-boca-109/);
    assert.doesNotMatch(html, /Before relocation/);
  });

  it("shows signed contracts and scope-to-tree comparison inside a job profile", () => {
    const contract = {
      id: "contract-boca-west-course-1",
      name: "Boca West Course 1 signed relocation contract",
      category: "Contract",
      status: "Approved",
      reviewStatus: "Filed",
      url: "https://drive.google.com/file/d/contract",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      jobId: bocaJob.id,
      jobName: bocaJob.title,
      signedDate: "2026-06-01",
      contractValue: 95000,
      scopeOfWork: "Root prune, relocate, and provide nutrient care for scoped Boca West trees.",
      scopeTreeCount: 4,
      scopeTreeDetails: "Live Oak: 3\nSabal Palm: 1",
    } as DocumentRecord & {
      signedDate: string;
      contractValue: number;
      scopeOfWork: string;
      scopeTreeCount: number;
      scopeTreeDetails: string;
    };
    const permit: DocumentRecord = {
      id: "permit-boca-west",
      name: "Boca West tree permit",
      category: "Permit",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
    };
    const treeAssets: TreeRelocationRecord[] = ["1001", "1002", "1003"].map((treeId) => ({
      id: `tree-boca-${treeId}`,
      treeId,
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      type: "Live Oak",
    }));

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="contracts"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        treeRelocationRecordsList={treeAssets}
        documentsList={[contract, permit]}
      />,
    );

    assert.match(html, /Contracts/);
    assert.match(html, /Add Contract/);
    assert.match(html, /Boca West Course 1 signed relocation contract/);
    assert.match(html, /Scope of Work \/ Tree Details/);
    assert.match(html, /Root prune, relocate, and provide nutrient care/);
    assert.match(html, /Live Oak: 3/);
    assert.match(html, /Sabal Palm: 1/);
    assert.match(html, /3 of 4 contract trees linked/);
    assert.match(html, /1 tree still needs to be reconciled/);
    assert.doesNotMatch(html, /Boca West tree permit/);
  });

  it("keeps project tree assets compact by default and expands tree work only after a row is selected", () => {
    const treeAsset: TreeRelocationRecord = {
      id: "tree-boca-1003",
      treeId: "1003",
      title: "LIVE OAK",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      type: "LIVE OAK",
      dbh: 33,
      status: "Ready for Relocation",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="tree assets"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        treeRelocationRecordsList={[treeAsset]}
        workOrdersList={[]}
        documentsList={[]}
      />,
    );

    assert.match(html, /LIVE OAK/);
    assert.match(html, /Compact Tree List/);
    assert.match(html, /Edit Tree/);
    assert.match(html, /Add Root Pruning/);
    assert.match(html, /Add Nutrient Care/);
    assert.match(html, /Add Photo/);
    assert.doesNotMatch(html, /No root pruning records yet/);
    assert.doesNotMatch(html, /No nutrient care records yet/);
    assert.doesNotMatch(html, /No tree photos yet/);
  });

  it("defaults project tree assets from lowest tree asset id to highest", () => {
    const treeAssets: TreeRelocationRecord[] = [
      {
        id: "tree-boca-1003",
        treeId: "1003",
        title: "Live Oak 1003",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Live Oak",
      },
      {
        id: "tree-boca-1001",
        treeId: "1001",
        title: "Live Oak 1001",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Live Oak",
      },
      {
        id: "tree-boca-1002",
        treeId: "1002",
        title: "Live Oak 1002",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Live Oak",
      },
    ];

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="tree assets"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        treeRelocationRecordsList={treeAssets}
      />,
    );

    assert.ok(html.indexOf(">1001<") < html.indexOf(">1002<"));
    assert.ok(html.indexOf(">1002<") < html.indexOf(">1003<"));
  });

  it("shows tree asset filters for searchable project tree criteria", () => {
    const treeAsset: TreeRelocationRecord = {
      id: "tree-boca-1003",
      treeId: "1003",
      title: "LIVE OAK",
      projectId: bocaJob.projectId,
      projectName: bocaJob.projectName,
      type: "LIVE OAK",
      dbh: 33,
      difficulty: "Hard",
      status: "Ready for Relocation",
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="job"
        itemId={bocaJob.id}
        defaultTab="tree assets"
        openModal={() => undefined}
        jobsList={[bocaJob]}
        treeRelocationRecordsList={[treeAsset]}
      />,
    );

    assert.match(html, /Filter Tree Assets/);
    assert.match(html, /Tree ID, name, location/);
    assert.match(html, /Tree Type/);
    assert.match(html, /Status/);
    assert.match(html, /Priority/);
    assert.match(html, /Difficulty/);
  });

  it("filters project tree assets by search text and selected criteria", () => {
    const treeAssets: TreeRelocationRecord[] = [
      {
        id: "tree-boca-1001",
        treeId: "1001",
        title: "Live Oak 1001",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Live Oak",
        status: "Ready for Relocation",
        priority: "Normal",
        difficulty: "Medium",
        existingLocationDescription: "Hole 4 fairway",
      },
      {
        id: "tree-boca-1002",
        treeId: "1002",
        title: "Live Oak 1002",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Live Oak",
        status: "Root Pruning",
        priority: "High",
        difficulty: "Hard",
        existingLocationDescription: "Hole 7 green",
      },
      {
        id: "tree-boca-1003",
        treeId: "1003",
        title: "Sabal Palm 1003",
        projectId: bocaJob.projectId,
        projectName: bocaJob.projectName,
        type: "Sabal Palm",
        status: "Installed",
        priority: "Low",
        difficulty: "Easy",
        existingLocationDescription: "Clubhouse",
      },
    ];

    const results = filterTreeAssets(treeAssets, {
      query: "hole 7",
      treeType: "Live Oak",
      status: "Root Pruning",
      priority: "High",
      difficulty: "Hard",
    });

    assert.deepEqual(results.map((tree) => tree.treeId), ["1002"]);
  });

  it("shows active work orders on crew cards", () => {
    const crews: CrewRecord[] = [
      {
        id: "personnel-carlos-reyes",
        name: "Carlos Reyes",
        role: "Crew Leader",
        phone: "863-228-1031",
        skill: "Root pruning",
      },
    ];

    const html = renderToString(
      <CrewsBoard
        crews={crews}
        workOrders={[rootPruneOrder]}
        openModal={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Active Work Orders/);
    assert.match(html, /Root prune Hole 7/);
    assert.match(html, /Assign Crew Work/);
  });

  it("defaults the crews page to a compact dispatch roster with expandable personnel detail", () => {
    const crews: CrewRecord[] = [
      {
        id: "personnel-carlos-reyes",
        name: "Carlos Reyes",
        role: "Crew Leader",
        phone: "863-228-1031",
        skill: "Root pruning",
        type: "Operations Leadership",
        availability: "Available",
        assignedEquipment: ["Kubota SVL97-1"],
      },
      {
        id: "personnel-christian-crespo",
        name: "Christian Crespo",
        role: "Driver",
        phone: "863-228-0351",
        skill: "Semi transport",
        type: "Transportation",
        availability: "Active",
        cdlCertified: true,
      },
    ];

    const html = renderToString(
      <CrewsBoard
        crews={crews}
        workOrders={[rootPruneOrder]}
        openModal={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Roster View/);
    assert.match(html, /Card View/);
    assert.match(html, /Available Today/);
    assert.match(html, /Driver Compliance Issues/);
    assert.match(html, /Crew Leaders Available/);
    assert.match(html, /Today(?:&#x27;|')s Assignment Count/);
    assert.match(html, /Compliance Status/);
    assert.match(html, /Equipment Assigned/);
    assert.match(html, /Personnel Detail/);
    assert.match(html, /Active Work Orders/);
    assert.match(html, /Root prune Hole 7/);
    assert.match(html, /View Schedule/);
    assert.match(html, /View Map/);
    assert.match(html, /Call \/ Phone/);
    assert.doesNotMatch(html, /grid gap-4 md:grid-cols-2 lg:grid-cols-3/);
  });

  it("shows driver license and CDL medical card compliance on driver crew cards", () => {
    const crews: CrewRecord[] = [
      {
        id: "personnel-christian-crespo",
        name: "Christian Crespo",
        role: "Driver",
        phone: "863-228-0351",
        cdlCertified: true,
        driverLicenseDocumentUrl: "https://drive/license.pdf",
        driverLicenseExpirationDate: "2026-06-20",
        medicalCardDocumentUrl: "https://drive/medical.pdf",
        medicalCardExpirationDate: "2026-05-01",
      },
    ];

    const html = renderToString(
      <CrewsBoard
        crews={crews}
        workOrders={[]}
        openModal={() => undefined}
        openDrawer={() => undefined}
        todayIso="2026-06-01"
      />,
    );

    assert.match(html, /Driver Compliance/);
    assert.match(html, /License/);
    assert.match(html, /Expiring Soon/);
    assert.match(html, /CDL/);
    assert.match(html, /Medical Card/);
    assert.match(html, /Expired/);
  });

  it("shows driver compliance for insured non-driver personnel", () => {
    const crews: CrewRecord[] = [
      {
        id: "personnel-jack-belcher",
        name: "Jack Belcher",
        role: "Crew Leader",
        phone: "863-261-2470",
        drivesForCompany: true,
        cdlCertified: true,
      },
    ];

    const html = renderToString(
      <CrewsBoard
        crews={crews}
        workOrders={[]}
        openModal={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Jack Belcher/);
    assert.match(html, /Driver Compliance/);
    assert.match(html, /License/);
    assert.match(html, /Missing/);
    assert.match(html, /CDL/);
    assert.match(html, /Medical Card/);
  });

  it("renders a crew user perspective with assignments and status actions", () => {
    const driver: CrewRecord = {
      id: "personnel-christian-crespo",
      name: "Christian Crespo",
      role: "Driver",
      email: "christian@jdtnurseries.com",
      phone: "863-228-0351",
    };
    const loads: LoadRecord[] = [
      {
        id: "load-semi-1",
        title: "Semi #1 Dispatch",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Black Lowboy",
        status: "Scheduled",
        routeSteps: [
          { id: "step-1", sequence: 1, actionType: "Hook Trailer", label: "Hook Black Lowboy", status: "Pending" },
        ],
      },
    ];
    const equipment: EquipmentRecord[] = [
      { id: "equipment-black-lowboy", name: "Black Lowboy", category: "Trailer", trailerMaintenanceCategories: ["Trailer Tires", "Brake Lines / Hoses"] },
    ];
    const fieldUpdates: FieldUpdateRecord[] = [
      {
        id: "field-update-1",
        crewName: "Christian Crespo",
        relatedTitle: "Semi #1 Dispatch",
        updateType: "Arrived",
        fieldStatus: "Arrived",
      },
    ];

    const html = renderToString(
      <CrewViewBoard
        crews={[driver]}
        loads={loads}
        workOrders={[rootPruneOrder]}
        jobs={[bocaJob]}
        equipment={equipment}
        fieldUpdates={fieldUpdates}
        currentUserEmail="christian@jdtnurseries.com"
        canSubmitFieldUpdates
        onSaveFieldUpdate={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Crew View/);
    assert.match(html, /Testing As/);
    assert.match(html, /Christian Crespo/);
    assert.match(html, /Semi #1 Dispatch/);
    assert.match(html, /Black Lowboy/);
    assert.match(html, /Trailer Tires/);
    assert.match(html, /Update Status/);
    assert.match(html, /Arrived/);
    assert.match(html, /Need Help/);
    assert.match(html, /Complete/);
    assert.match(html, /Daily Closeout/);
    assert.match(html, /Work Completed/);
    assert.match(html, /Tree Tags \/ Materials/);
    assert.match(html, /GPS \/ Location Note/);
    assert.match(html, /Issues \/ Delays/);
    assert.match(html, /Tomorrow Plan/);
    assert.match(html, /Proof Links \/ Photos/);
    assert.match(html, /Submit Closeout/);
    assert.match(html, /Latest Crew Updates/);
  });

  it("shows proof attachments on project field updates", () => {
    const proofUpdate: FieldUpdateRecord = {
      id: "field-waterford-proof",
      title: "Waterford closeout proof",
      projectId: "project-waterford",
      projectName: "Waterford Relocation",
      relatedRecordType: "workOrder",
      relatedRecordId: "workorder-root-prune",
      relatedTitle: "Root prune Waterford trees",
      crewName: "Carlos Reyes",
      updateType: "Daily Closeout",
      fieldStatus: "Closeout Submitted",
      notes: "Completed tags 1003 and 1004.",
      proofLinks: [
        { label: "Root prune photo", url: "https://drive.google.com/file/d/waterford-root-prune-photo" },
      ],
    };

    const html = renderToString(
      <CommandDrawer
        isOpen
        onClose={() => undefined}
        type="project"
        itemId="project-waterford"
        defaultTab="field updates"
        openModal={() => undefined}
        projectsList={[{ id: "project-waterford", title: "Waterford Relocation", projectName: "Waterford Relocation", status: "Active" }]}
        fieldUpdatesList={[proofUpdate]}
      />,
    );

    assert.match(html, /Field Updates/);
    assert.match(html, /Root prune Waterford trees/);
    assert.match(html, /Proof Attachments/);
    assert.match(html, /Root prune photo/);
    assert.match(html, /waterford-root-prune-photo/);
  });

  it("gives freight an operating empty state with a create action", () => {
    const html = renderToString(
      <FreightBoard loads={[]} workOrders={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Fleet Vehicles.*Trailers/);
    assert.match(html, /No trucks or trailers saved yet/);
    assert.match(html, /No freight moves yet/);
    assert.match(html, /Create Freight Move/);
  });

  it("shows freight vehicles as editable fleet cards with home-base defaults", () => {
    const equipment: EquipmentRecord[] = [
      {
        id: "equipment-peterbilt-semi",
        name: "Peterbilt Semi",
        category: "Truck",
        truckType: "Semi",
        status: "Available",
      },
      {
        id: "equipment-lowboy",
        name: "Black Lowboy",
        category: "Trailer",
        trailerType: "black lowboy",
        status: "Assigned",
        currentLocationName: "Boca West",
        currentLocationType: "Job Site",
      },
      {
        id: "equipment-loader",
        name: "Komatsu 500 - 1",
        type: "Loader",
        status: "Available",
      },
    ];

    const html = renderToString(
      <FreightBoard
        loads={[]}
        equipment={equipment}
        workOrders={[{ ...rootPruneOrder, truckNames: ["Peterbilt Semi"], trailerNames: ["Black Lowboy"] }]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Fleet Vehicles.*Trailers/);
    assert.match(html, /Peterbilt Semi/);
    assert.match(html, /JD Thornton Nurseries Home Base/);
    assert.match(html, /Boca West/);
    assert.match(html, /Root prune Hole 7/);
    assert.doesNotMatch(html, /Komatsu 500 - 1/);
    assert.match(html, /Add Truck \/ Trailer/);
    assert.match(html, /Create Dispatch Move/);
    assert.match(html, /Edit/);
  });

  it("shows vehicle registration and insurance compliance on freight vehicle cards", () => {
    const equipment: EquipmentRecord[] = [
      {
        id: "equipment-peterbilt-semi",
        name: "Peterbilt Semi",
        category: "Truck",
        truckType: "Semi",
        status: "Available",
        registrationDocumentUrl: "https://drive/registration.pdf",
        registrationExpirationDate: "2026-08-15",
        insuranceDocumentUrl: "https://drive/insurance.pdf",
        insuranceExpirationDate: "2026-05-15",
      },
    ];

    const html = renderToString(
      <FreightBoard
        loads={[]}
        equipment={equipment}
        workOrders={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Vehicle Compliance/);
    assert.match(html, /Registration/);
    assert.match(html, /Insurance/);
    assert.match(html, /On File/);
    assert.match(html, /Expired/);
  });

  it("shows trailer activity actions and location history on freight vehicle cards", () => {
    const html = renderToString(
      <FreightBoard
        loads={[]}
        equipment={[{
          id: "equipment-lowboy",
          name: "Black Lowboy",
          category: "Trailer",
          trailerType: "black lowboy",
          currentLocationName: "25 Acre Farm",
          vehicleLoadState: "Empty",
          vehicleActivityHistory: [{
            action: "Spot Location",
            actorName: "Jennifer Bermudez",
            occurredAt: "2026-06-01T12:00:00.000Z",
            locationName: "25 Acre Farm",
          }],
        }]}
        workOrders={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Spot Location/);
    assert.match(html, /Drop Trailer/);
    assert.match(html, /Hook Trailer/);
    assert.match(html, /Mark Loaded/);
    assert.match(html, /Report Issue/);
    assert.match(html, /Location History/);
    assert.match(html, /Jennifer Bermudez/);
  });

  it("shows editable equipment cards with location and implement context", () => {
    const equipment: EquipmentRecord[] = [
      {
        id: "equipment-cat-299d",
        name: "CAT 299D",
        type: "Skid Steer",
        status: "Available",
        currentLocationName: "25 Acre Farm",
        currentLocation: "3040 US-27, Clewiston, FL 33440",
        currentLocationType: "Farm",
        compatibleImplementTypes: ["Root Pruner", "Bucket"],
        attachedImplementNames: ["Root Pruner"],
      },
    ];

    const html = renderToString(
      <EquipmentBoard starterEquipment={equipment} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /CAT 299D/);
    assert.match(html, /Current Location/);
    assert.match(html, /25 Acre Farm/);
    assert.match(html, /3040 US-27, Clewiston, FL 33440/);
    assert.match(html, /Farm/);
    assert.match(html, /Root Pruner/);
    assert.match(html, /Report Issue/);
    assert.match(html, /Edit/);
  });

  it("shows the Reveal vehicle sync action only when source-management access is available", () => {
    const allowedHtml = renderToString(
      <EquipmentBoard
        starterEquipment={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
        canSyncRevealVehicles
        revealVehicleSyncStatus="Ready to sync Verizon Reveal vehicles"
        onSyncRevealVehicles={async () => undefined}
        revealRecommendedSyncStatus="Ready to sync Reveal driver, asset, geofence, inspection, GPS history, and segment APIs"
        onSyncRevealRecommendedApis={async () => undefined}
        revealMatchReviewStatus="2 Reveal vehicles need review before live GPS is trusted"
        onPreviewRevealMatches={async () => undefined}
        onApproveRevealMatches={async () => undefined}
        revealMatchCandidates={[
          {
            revealVehicleId: "veh-123",
            revealVehicleName: "Semi #1",
            revealVehicleNumber: "S1",
            jdtEquipmentId: "equipment-semi-1",
            jdtEquipmentName: "Semi #1",
            confidence: "High",
            status: "needsReview",
            matchField: "vehicleNumber",
            matchValue: "S1",
            recommendedAction: "Review and approve this match before allowing Reveal to update this JDT equipment record.",
          },
        ]}
      />,
    );

    assert.match(allowedHtml, /Reveal Vehicle Sync/);
    assert.match(allowedHtml, /Sync Verizon Vehicles/);
    assert.match(allowedHtml, /Sync Reveal APIs/);
    assert.match(allowedHtml, /Review Reveal Matches/);
    assert.match(allowedHtml, /Approve All Safe Matches/);
    assert.match(allowedHtml, /Approve Match/);
    assert.match(allowedHtml, /2 Reveal vehicles need review/);
    assert.match(allowedHtml, /Reveal Match Review/);
    assert.match(allowedHtml, /Semi #1/);
    assert.match(allowedHtml, /vehicleNumber/);
    assert.match(allowedHtml, /driver, asset, geofence, inspection, GPS history, and segment APIs/);
    assert.match(allowedHtml, /Ready to sync Verizon Reveal vehicles/);

    const blockedHtml = renderToString(
      <EquipmentBoard
        starterEquipment={[]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.doesNotMatch(blockedHtml, /Sync Verizon Vehicles/);
    assert.doesNotMatch(blockedHtml, /Sync Reveal APIs/);
    assert.doesNotMatch(blockedHtml, /Review Reveal Matches/);
    assert.doesNotMatch(blockedHtml, /Approve All Safe Matches/);
  });

  it("shows Reveal GPS freshness on the equipment page", () => {
    const html = renderToString(
      <EquipmentBoard
        starterEquipment={[revealSemi, { ...revealSemi, id: "equipment-semi-2", name: "Semi #2", revealVehicleId: "veh-2", lastTelematicsAt: "2026-06-10T06:00:00.000Z" }]}
        fleetTelematicsEvents={[revealGpsEvent]}
        openDrawer={() => undefined}
        openModal={() => undefined}
      />,
    );

    assert.match(html, /Reveal Telematics Status/);
    assert.match(html, /1 live, 1 stale/);
    assert.match(html, /Latest GPS/);
  });

  it("shows Reveal-compatible tracking readiness for vehicles, equipment, and trailers", () => {
    const html = renderToString(
      <EquipmentBoard
        starterEquipment={[
          {
            id: "equipment-colorado",
            name: "Chevy Colorado",
            category: "Truck",
            revealVehicleId: "6358051",
            vehicleNumber: "4",
          },
          {
            id: "equipment-loader",
            name: "Komatsu 500 - 1",
            category: "Machine",
            revealTrackingStatus: "Requested",
            currentLocationName: "Main Office",
            currentLocation: "1010 E Sugarland Hwy, Clewiston, FL 33440",
          },
          {
            id: "equipment-lowboy",
            name: "Black Lowboy",
            category: "Trailer",
            currentLocationName: "Main Office",
            currentLocation: "1010 E Sugarland Hwy, Clewiston, FL 33440",
          },
        ]}
        openDrawer={() => undefined}
        openModal={() => undefined}
        canSyncRevealVehicles
        onSyncRevealVehicles={async () => undefined}
      />,
    );

    assert.match(html, /Reveal-Compatible Asset Setup/);
    assert.match(html, /Matched To Reveal/);
    assert.match(html, /Tracker Requested/);
    assert.match(html, /Ready For Tracker Request/);
    assert.match(html, /Unit-1.0/);
    assert.match(html, /NonPoweredAsset-1.0/);
    assert.match(html, /Black Lowboy/);
    assert.match(html, /Tracking Status/);
  });

  it("groups the equipment page by equipment category instead of status", () => {
    const equipment: EquipmentRecord[] = [
      { id: "equipment-mini-x", name: "Kubota Mini X", category: "Machine", status: "Inspection" },
      { id: "equipment-semi", name: "International Sleeper Cab", category: "Truck", status: "Available" },
      { id: "equipment-lowboy", name: "Black Lowboy", category: "Trailer", status: "Available" },
      { id: "equipment-root-pruner", name: "Root Pruner", category: "Implement", status: "Available" },
      { id: "equipment-chainsaw", name: "Chainsaw", category: "Tool", status: "Available" },
    ];

    const html = renderToString(
      <EquipmentBoard starterEquipment={equipment} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Equipment Categories/);
    assert.match(html, />All<\/button>/);
    assert.match(html, />Machine<\/button>/);
    assert.match(html, />Truck<\/button>/);
    assert.match(html, />Trailer<\/button>/);
    assert.match(html, />Implement<\/button>/);
    assert.match(html, />Tool<\/button>/);
    assert.match(html, /Machine assets/);
    assert.match(html, /Truck assets/);
    assert.match(html, /Trailer assets/);
    assert.match(html, /Implement assets/);
    assert.match(html, /Tool assets/);
    assert.doesNotMatch(html, /<h3[^>]*>Inspection<\/h3>/);
  });

  it("shows category-specific equipment card details instead of machine fields on every asset", () => {
    const equipment: EquipmentRecord[] = [
      {
        id: "equipment-komatsu-500",
        name: "Komatsu 500 - 1",
        category: "Machine",
        eqType: "Loader",
        status: "Available",
        hours: 3200,
        serviceDueHours: 75,
        compatibleTruckTypes: ["Semi #1"],
        compatibleTrailerTypes: ["Black Lowboy"],
      },
      {
        id: "equipment-chevy-colorado",
        name: "Chevy Colorado",
        category: "Truck",
        truckType: "Pickup",
        status: "Assigned",
        operator: "Max Norman",
        compatibleTrailerTypes: ["Small Utility Trailer"],
      },
      {
        id: "equipment-black-lowboy",
        name: "Black Lowboy",
        category: "Trailer",
        trailerType: "black lowboy",
        status: "Available",
        vehicleLoadState: "Empty",
        assignedTruck: "Semi #1",
        compatibleTruckTypes: ["Semi #1"],
        trailerMaintenanceCategories: ["Trailer Tires"],
      },
      {
        id: "equipment-root-pruner",
        name: "Root Pruner",
        category: "Implement",
        implementType: "Cutter Blade",
        status: "Available",
        compatibleMachineTypes: ["Komatsu 500 - 1"],
        assignedTruck: "Service Truck",
      },
      {
        id: "equipment-chainsaw",
        name: "Chainsaw",
        category: "Tool",
        toolType: "Saw",
        status: "Available",
        assignedCrewName: "Carlos Reyes",
      },
      {
        id: "equipment-fuel-tank",
        name: "Fuel Tank",
        category: "Support",
        supportType: "Fuel / Water Support",
        status: "In Use",
        assignedProjectName: "Boca West Course 1 Renovation",
      },
    ];

    const html = renderToString(
      <EquipmentBoard starterEquipment={equipment} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Driver \/ Operator/);
    assert.match(html, /Driver \/ Truck/);
    assert.match(html, /Attached \/ Assigned To/);
    assert.match(html, /Responsible Crew/);
    assert.match(html, /Asset Support/);
    assert.match(html, /Engine Hours/);
    assert.match(html, /Load State/);
    assert.match(html, /Dispatch Compatibility/);
    assert.match(html, /Compatible Machines/);
    assert.match(html, /Tool Details/);
    assert.match(html, /Support Details/);
    assert.match(html, /Fuel \/ Water Support/);
  });

  it("shows vehicle registration and insurance compliance on equipment cards", () => {
    const equipment: EquipmentRecord[] = [
      {
        id: "equipment-lowboy",
        name: "Black Lowboy",
        category: "Trailer",
        trailerType: "black lowboy",
        status: "Available",
        registrationDocumentUrl: "https://drive/registration.pdf",
        registrationExpirationDate: "2026-08-15",
        insuranceDocumentUrl: "https://drive/insurance.pdf",
        insuranceExpirationDate: "2026-05-15",
      },
    ];

    const html = renderToString(
      <EquipmentBoard starterEquipment={equipment} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Vehicle Compliance/);
    assert.match(html, /Registration/);
    assert.match(html, /Insurance/);
    assert.match(html, /On File/);
    assert.match(html, /Expired/);
  });

  it("shows linked work orders on freight move cards", () => {
    const loads: LoadRecord[] = [
      {
        id: "load-lowboy-move",
        title: "Lowboy move",
        loadNumber: "FM-1001",
        status: "Scheduled",
        driver: "Alex Bueno",
        truck: "Semi Tractor",
        trailer: "Lowboy Trailer",
        projectId: bocaJob.projectId,
      },
    ];

    const html = renderToString(
      <FreightBoard loads={loads} workOrders={[rootPruneOrder]} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Lowboy move/);
    assert.match(html, /Semi Tractor/);
    assert.match(html, /Lowboy Trailer/);
    assert.match(html, /Linked Work/);
  });

  it("shows ordered driver dispatch run steps on freight move cards", () => {
    const loads: LoadRecord[] = [
      {
        id: "dispatch-christian-semi-1",
        title: "Christian Crespo - Semi #1 - Monday Dispatch",
        status: "Scheduled",
        driver: "Christian Crespo",
        truck: "Semi #1",
        trailer: "Black Lowboy",
        routeSteps: [
          { id: "route-step-1-hook-trailer", sequence: 1, actionType: "Hook Trailer", label: "Hook Trailer: Black Lowboy", trailerName: "Black Lowboy", origin: "Main Office", destination: "Main Office", status: "Pending" },
          { id: "route-step-2-load-equipment", sequence: 2, actionType: "Load Equipment", label: "Load Equipment: Komatsu 500-1", equipmentName: "Komatsu 500-1", origin: "Main Office", destination: "Main Office", status: "Pending" },
          { id: "route-step-3-unload-equipment", sequence: 3, actionType: "Unload Equipment", label: "Unload Equipment: Komatsu 500-1", equipmentName: "Komatsu 500-1", origin: "Main Office", destination: "25 Acre Farm", status: "Pending" },
          { id: "route-step-4-move-equipment", sequence: 4, actionType: "Move Equipment", label: "Move Equipment: John Deere 744", equipmentName: "John Deere 744", origin: "25 Acre Farm", destination: "40 Acre Farm", status: "Pending" },
          { id: "route-step-5-hook-trailer", sequence: 5, actionType: "Hook Trailer", label: "Hook Trailer: Dropdeck", trailerName: "Dropdeck", origin: "Main Office", destination: "Main Office", status: "Pending" },
          { id: "route-step-6-deliver-trees", sequence: 6, actionType: "Deliver Trees", label: "Deliver Trees: Pine Trees", materialName: "Pine Trees", origin: "Main Office", destination: "McArthur Golf Course", status: "Pending" },
        ],
      },
    ];

    const html = renderToString(
      <FreightBoard loads={loads} workOrders={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Christian Crespo - Semi #1 - Monday Dispatch/);
    assert.match(html, /Dispatch Run Steps/);
    assert.match(html, /Hook Trailer/);
    assert.match(html, /Black Lowboy/);
    assert.match(html, /Komatsu 500-1/);
    assert.match(html, /25 Acre Farm/);
    assert.match(html, /Dropdeck/);
    assert.match(html, /McArthur Golf Course/);
    assert.match(html, /Complete Step/);
  });

  it("shows freight stop progress, required proof, and e-POD details", () => {
    const loads: LoadRecord[] = [
      {
        id: "load-boca-delivery",
        title: "Boca West delivery",
        status: "At Delivery",
        driver: "Alex Bueno",
        truck: "Semi Tractor",
        trailer: "Lowboy Trailer",
        stops: [
          {
            id: "pickup",
            label: "Pickup",
            type: "Pickup",
            location: "JDT Home Base",
            status: "Completed",
            actualArrivalAt: "2026-06-01T08:00:00.000Z",
            actualDepartureAt: "2026-06-01T08:30:00.000Z",
          },
          {
            id: "delivery",
            label: "Delivery",
            type: "Delivery",
            location: "Boca West",
            status: "InProgress",
            requiredPhotos: true,
            requiredSignature: true,
          },
        ],
        requiredDocuments: [{ type: "BOL", status: "Needed" }],
        pod: {
          receiverName: "Boca West Superintendent",
          completedAt: "2026-06-01T10:00:00.000Z",
        },
        freightRevision: 2,
        freightEvents: [{ type: "STOP_UPDATED", summary: "Delivery started", createdAt: "2026-06-01T09:30:00.000Z" }],
      },
    ];

    const html = renderToString(
      <FreightBoard loads={loads} workOrders={[]} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /Stop Progress/);
    assert.match(html, /Actual Arrival/);
    assert.match(html, /Actual Departure/);
    assert.match(html, /Photo Required/);
    assert.match(html, /Signature Required/);
    assert.match(html, /Required Documents/);
    assert.match(html, /BOL/);
    assert.match(html, /Proof of Delivery/);
    assert.match(html, /Boca West Superintendent/);
    assert.match(html, /Revision 2/);
  });
});
