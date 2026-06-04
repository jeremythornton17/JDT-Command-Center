import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { CrewRecord, DocumentRecord, EquipmentRecord, FieldUpdateRecord, JobRecord, LoadRecord, ProjectMaterialItemRecord, TreeRelocationRecord, WorkOrderRecord } from "../commandCenter/records";
import { TrackerBoard } from "../App";
import CommandDrawer, { projectModalContextForRecord, projectSiteMapUrl } from "./CommandDrawer";
import CrewViewBoard from "./CrewViewBoard";
import CrewsBoard from "./CrewsBoard";
import EquipmentBoard from "./EquipmentBoard";
import FreightBoard from "./FreightBoard";

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

  it("shows a client relationship profile with contacts and linked operating records", () => {
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
    assert.match(html, /Root prune Hole 7/);
    assert.match(html, /Lowboy to Boca West/);
    assert.match(html, /Boca West permit/);
    assert.match(html, /Crew delay/);
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

    assert.match(html, /Create Crew Work/);
    assert.match(html, /Request Equipment/);
    assert.match(html, /Request Freight/);
    assert.match(html, /CAT 299D/);
    assert.match(html, /Lowboy move/);
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
    assert.match(html, /Live Oak/);
    assert.match(html, /DBH/);
    assert.match(html, /Aftercare tree-boca-109/);
    assert.match(html, /Before relocation/);
  });

  it("keeps empty tree work sections visible and exposes per-tree edit actions", () => {
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
    assert.match(html, /Edit Tree/);
    assert.match(html, /Root Pruning/);
    assert.match(html, /No root pruning records yet/);
    assert.match(html, /Add Root Pruning/);
    assert.match(html, /Nutrient Care/);
    assert.match(html, /No nutrient care records yet/);
    assert.match(html, /Add Nutrient Care/);
    assert.match(html, /Photos/);
    assert.match(html, /No tree photos yet/);
    assert.match(html, /Add Photo/);
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
    assert.match(html, /Latest Crew Updates/);
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
        compatibleImplementTypes: ["Root Pruner", "Bucket"],
        attachedImplementNames: ["Root Pruner"],
      },
    ];

    const html = renderToString(
      <EquipmentBoard starterEquipment={equipment} openDrawer={() => undefined} openModal={() => undefined} />,
    );

    assert.match(html, /CAT 299D/);
    assert.match(html, /25 Acre Farm/);
    assert.match(html, /Root Pruner/);
    assert.match(html, /Report Issue/);
    assert.match(html, /Edit/);
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
