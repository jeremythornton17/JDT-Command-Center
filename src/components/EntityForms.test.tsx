import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import EntityForms from './EntityForms';

test('freight move form suggests saved drivers, trucks, trailers, projects, and clients while allowing manual entry', () => {
  const html = renderToString(
    <EntityForms
      type="create_move"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ title: 'Semi #1 move', truck: 'Semi #1' }}
      crewsList={[
        { id: 'crew-christian', name: 'Christian Crespo', role: 'Driver' },
        { id: 'crew-jeff', name: 'Jeff Swindle', role: 'Crew Leader' },
      ]}
      equipmentList={[
        { id: 'truck-semi-1', name: 'Semi #1', category: 'Truck', truckType: 'Semi' },
        { id: 'trailer-lowboy', name: 'Black Lowboy', category: 'Trailer', trailerType: 'black lowboy' },
        { id: 'loader-komatsu-500-1', name: 'Komatsu 500-1', category: 'Machine' },
      ]}
      jobsList={[{ id: 'project-boca-west', title: 'Boca West Course 1 Renovation' }]}
      clientsList={[{ id: 'client-boca-west', name: 'Boca West Country Club' }]}
    />,
  );

  assert.match(html, /Load Title/);
  assert.match(html, /list="[^"]*driver/);
  assert.match(html, /Christian Crespo/);
  assert.doesNotMatch(html, /Jeff Swindle/);
  assert.match(html, /Semi #1/);
  assert.match(html, /Black Lowboy/);
  assert.match(html, /Boca West Course 1 Renovation/);
  assert.match(html, /Boca West Country Club/);
  assert.match(html, /25 Acre Farm/);
  assert.doesNotMatch(html, /Hook Trailer \| Black Lowboy \| Main Office/);
});

test('freight move form exposes dispatcher stop planning fields from the FleetFlow reference', () => {
  const html = renderToString(
    <EntityForms
      type="load"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ title: 'Christian Crespo - Semi #1 Dispatch' }}
      crewsList={[{ id: 'crew-christian', name: 'Christian Crespo', role: 'Driver' }]}
      equipmentList={[
        { id: 'truck-semi-1', name: 'Semi #1', category: 'Truck', truckType: 'Semi' },
        { id: 'trailer-lowboy', name: 'Black Lowboy', category: 'Trailer', trailerType: 'black lowboy' },
      ]}
    />,
  );

  assert.match(html, /Assign Driver/);
  assert.match(html, /Stops &amp; Schedule/);
  assert.match(html, /Required Trailer Type/);
  assert.match(html, /Driver Instructions/);
  assert.match(html, />Driver Notes<\/span>/);
  assert.match(html, /Rate \(USD\)/);
  assert.match(html, /Outside Network/);
  assert.match(html, /Stop 1 Type/);
  assert.doesNotMatch(html, /Stop 2 Type/);
  assert.match(html, /Load Category/);
  assert.match(html, /Main Address/);
  assert.match(html, /Construction \/ Equipment Access Pin Point/);
  assert.match(html, /Load \/ Unload Pin Point/);
  assert.match(html, /Open Google Maps/);
  assert.match(html, /Add Another Stop/);
  assert.match(html, /Site Contact Name/);
  assert.match(html, /Site Contact Number/);
  assert.match(html, /Save As New Location/);
  assert.match(html, /Save To Contacts/);
  assert.match(html, /Auto-generated from driver, truck, client, and freight details/);
  assert.match(html, /FM-YYYYMMDD-DRIVER-TRUCK-##/);
  assert.doesNotMatch(html, /Location Overview/);
  assert.doesNotMatch(html, /Schedule As Trip/);
  assert.doesNotMatch(html, /Pickup Date/);
  assert.doesNotMatch(html, /Delivery Date/);
  assert.doesNotMatch(html, /Dispatch Run Steps/);
  assert.doesNotMatch(html, />Trailer<\/span>/);
  assert.doesNotMatch(html, />Origin<\/span>/);
  assert.doesNotMatch(html, />Delivery<\/span>/);
  assert.equal(html.indexOf('Add Another Stop') < html.indexOf('Driver Instructions'), true);
});

test('project tree asset forms expose editable tree, pruning, aftercare, and photo fields', () => {
  const treeHtml = renderToString(
    <EntityForms
      type="project_tree_asset"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ treeId: '1003', type: 'LIVE OAK' }}
    />,
  );
  const pruningHtml = renderToString(
    <EntityForms
      type="project_tree_pruning"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ treeIds: ['1003'] }}
    />,
  );
  const aftercareHtml = renderToString(
    <EntityForms
      type="project_tree_aftercare"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ treeIds: ['1003'] }}
    />,
  );
  const photoHtml = renderToString(
    <EntityForms
      type="project_tree_photo"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ treeId: '1003' }}
    />,
  );

  assert.match(treeHtml, /Tree Type/);
  assert.match(treeHtml, /Existing Location Description/);
  assert.match(pruningHtml, /Date of 1st Cut/);
  assert.match(pruningHtml, /Readiness Reviews/);
  assert.match(aftercareHtml, /Treatment Action/);
  assert.match(aftercareHtml, /Next Follow-up Date/);
  assert.match(photoHtml, /Photo/);
  assert.match(photoHtml, /Captured Date/);
});

test('project forms expose jobsite access addresses and field pin points', () => {
  const html = renderToString(
    <EntityForms
      type="edit_project"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        title: "Frenchman's Driving Range & Practice Facility",
        location: "13495 Tournament Dr, Palm Beach Gardens, FL 33410",
        crewAccessAddress: "Frenchman's Creek north crew gate",
        truckAccessAddress: "Construction truck access from Hood Road",
        constructionAccessPin: "26.87775, -80.08895",
        loadUnloadPin: "Practice facility laydown pin",
        secondaryLoadUnloadPin: "South range unloading pin",
      }}
    />,
  );

  assert.match(html, /Project Site Addresses/);
  assert.match(html, /Main Jobsite Address/);
  assert.match(html, /Crew Access Address/);
  assert.match(html, /Truck \/ Equipment Access Address/);
  assert.match(html, /Construction \/ Equipment Access Pin/);
  assert.match(html, /Load \/ Unload Pin/);
  assert.match(html, /Additional Load \/ Unload Pin/);
  assert.match(html, /Site Access Notes/);
  assert.match(html, /Paste street address or Google Maps link/);
  assert.match(html, /Paste access address, Google Maps link, or lat,long pin/);
  assert.match(html, /Paste Google Maps URL or lat,long coordinates/);
  assert.match(html, /Frenchman&#x27;s Creek north crew gate/);
  assert.match(html, /Construction truck access from Hood Road/);
});

test('project-scoped assignment forms suggest only the selected project saved addresses', () => {
  const projectSiteAddressOptions = [
    "13495 Tournament Dr, Palm Beach Gardens, FL 33410",
    "Frenchman's Creek north crew gate",
    "Construction truck access from Hood Road",
    "Practice facility laydown pin",
  ];
  const html = renderToString(
    <EntityForms
      type="assign_freight"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        title: "Freight support for Frenchman's",
        clientName: "Frenchman's Creek Country Club",
        projectName: "Frenchman's Driving Range & Practice Facility",
        jobName: "Frenchman's Driving Range & Practice Facility",
        projectSiteAddressOptions,
      }}
      jobsList={[
        { id: 'job-boca', title: 'Boca West Relocation', location: 'Boca West maintenance gate' },
      ]}
      clientsList={[
        { id: 'client-boca', name: 'Boca West Country Club', billingAddress: '20583 Boca West Dr, Boca Raton, FL' },
      ]}
    />,
  );

  assert.match(html, /13495 Tournament Dr, Palm Beach Gardens, FL 33410/);
  assert.match(html, /Frenchman&#x27;s Creek north crew gate/);
  assert.match(html, /Construction truck access from Hood Road/);
  assert.match(html, /Practice facility laydown pin/);
  assert.doesNotMatch(html, /Boca West maintenance gate/);
  assert.doesNotMatch(html, /20583 Boca West Dr/);
  assert.doesNotMatch(html, /25 Acre Farm/);
});

test('employee forms expose driver license and CDL medical card compliance fields', () => {
  const html = renderToString(
    <EntityForms
      type="employee"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        name: 'Christian Crespo',
        role: 'Driver',
        cdlCertified: true,
      }}
    />,
  );

  assert.match(html, /Driver Compliance/);
  assert.match(html, /Drives \/ Insurance Registered/);
  assert.match(html, /CDL Certified/);
  assert.match(html, /Driver License Number/);
  assert.match(html, /Driver License Expiration/);
  assert.match(html, /Driver License Document URL/);
  assert.match(html, /Medical Card Expiration/);
  assert.match(html, /Medical Card Document URL/);
});

test('employee forms keep driver license details optional for non-driving roles', () => {
  const nonDrivingHtml = renderToString(
    <EntityForms
      type="employee"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ name: 'Field Crew Member', role: 'Crew Leader', drivesForCompany: false, cdlCertified: false }}
    />,
  );
  const drivingCrewHtml = renderToString(
    <EntityForms
      type="employee"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ name: 'Jack Belcher', role: 'Crew Leader', drivesForCompany: true, cdlCertified: true }}
    />,
  );

  assert.match(nonDrivingHtml, /Driver Compliance/);
  assert.match(nonDrivingHtml, /Drives \/ Insurance Registered/);
  assert.doesNotMatch(nonDrivingHtml, /Driver License Number/);
  assert.doesNotMatch(nonDrivingHtml, /Medical Card Expiration/);

  assert.match(drivingCrewHtml, /Driver License Number/);
  assert.match(drivingCrewHtml, /Driver License Document URL/);
  assert.match(drivingCrewHtml, /Medical Card Expiration/);
  assert.match(drivingCrewHtml, /Medical Card Document URL/);
});

test('equipment forms expose vehicle registration and insurance compliance fields', () => {
  const html = renderToString(
    <EntityForms
      type="equipment"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ name: 'Semi #1', category: 'Truck' }}
    />,
  );

  assert.match(html, /Vehicle Compliance/);
  assert.match(html, /Registration Number \/ Tag/);
  assert.match(html, /Registration Expiration/);
  assert.match(html, /Registration Document URL/);
  assert.match(html, /Insurance Company/);
  assert.match(html, /Insurance Policy Number/);
  assert.match(html, /Insurance Expiration/);
  assert.match(html, /Insurance Document URL/);
});

test('ranch oak forms expose editable field inventory details', () => {
  const addHtml = renderToString(
    <EntityForms
      type="ranch_oak"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        treeId: 'RO-DEMO-001',
        ranchOakType: 'Single trunk',
        commonName: 'Ranch Oak Live Oak',
        fieldLocation: 'Main Office',
        row: 'A',
        position: '12',
        sourceCollection: 'ranchOaks',
        inventoryClass: 'Ranch Oaks',
      }}
    />,
  );
  const editHtml = renderToString(
    <EntityForms
      type="ranch_oak"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{ treeId: 'RO-DEMO-001', ranchOakType: 'Multi trunk', fieldLocation: '40 Acre' }}
    />,
  );

  assert.match(addHtml, /Tree ID/);
  assert.match(addHtml, /Ranch Oak Type/);
  assert.match(addHtml, /Common Name/);
  assert.match(addHtml, /Field Location/);
  assert.match(addHtml, /Row/);
  assert.match(addHtml, /Position/);
  assert.match(addHtml, /Estimated Weight/);
  assert.match(addHtml, /Root Prune Date/);
  assert.match(addHtml, /Date Harvested/);
  assert.match(addHtml, /Customer \/ Project/);
  assert.match(addHtml, /Main Image URL/);
  assert.match(addHtml, /Additional Image 1 URL/);
  assert.match(addHtml, /Additional Image 4 URL/);
  assert.match(addHtml, /Main Office/);
  assert.match(editHtml, /Ranch Oak Type/);
  assert.match(editHtml, /40 Acre/);
});

test('equipment change requests offer JD Thornton and rental equipment options', () => {
  const html = renderToString(
    <EntityForms
      type="assign_equipment"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        title: "Equipment change for Boca West Relocation",
        workOrderType: "equipment",
        taskType: "Equipment change request",
        clientName: "Boca West Country Club",
        projectName: "Boca West Relocation",
        jobName: "Boca West Relocation",
      }}
      equipmentList={[
        { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine" },
      ]}
    />,
  );

  assert.match(html, /Equipment Request Type/);
  assert.match(html, /Equipment Request/);
  assert.match(html, /Equipment Source/);
  assert.match(html, /JD Thornton Equipment/);
  assert.match(html, /Rental Equipment/);
  assert.match(html, /Requested Equipment/);
  assert.match(html, /Komatsu 500 - 1/);
  assert.doesNotMatch(html, /Freight Request/);
  assert.doesNotMatch(html, /Dispatch Move/);
});

test('crew work orders are division-first and focus on crew task instructions', () => {
  const html = renderToString(
    <EntityForms
      type="assign_work"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        title: "Root prune Hole 7",
        clientName: "Boca West Country Club",
        projectName: "Boca West Relocation",
        jobName: "Boca West Relocation",
      }}
      crewsList={[
        { id: "personnel-carlos-reyes", name: "Carlos Reyes", role: "Crew Leader" },
        { id: "personnel-christian-crespo", name: "Christian Crespo", role: "Driver" },
      ]}
      equipmentList={[
        { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine" },
        { id: "equipment-root-pruner", name: "Root Pruner", category: "Implement" },
      ]}
    />,
  );

  assert.match(html, /Assignment Context/);
  assert.match(html, /Division/);
  assert.match(html, /Assignment Type/);
  assert.match(html, /Who Is This For/);
  assert.match(html, /Assigned Crew \/ People/);
  assert.match(html, /What They Need To Know/);
  assert.match(html, /Work Location \/ Site Area/);
  assert.match(html, /Crew Instructions/);
  assert.match(html, /Carlos Reyes/);
  assert.match(html, /Komatsu 500 - 1/);
  assert.doesNotMatch(html, /Equipment Request Type/);
  assert.doesNotMatch(html, /Freight Request/);
});

test('freight support requests are distinct from dispatch moves', () => {
  const html = renderToString(
    <EntityForms
      type="assign_freight"
      onClose={() => undefined}
      openModal={() => undefined}
      onSaveRecord={() => undefined}
      data={{
        title: "Freight support for Boca West",
        clientName: "Boca West Country Club",
        projectName: "Boca West Relocation",
        jobName: "Boca West Relocation",
      }}
      equipmentList={[
        { id: "truck-semi-1", name: "Semi #1", category: "Truck" },
        { id: "trailer-lowboy", name: "Black Lowboy", category: "Trailer" },
        { id: "equipment-komatsu-500-1", name: "Komatsu 500 - 1", category: "Machine" },
      ]}
    />,
  );

  assert.match(html, /Freight Request/);
  assert.match(html, /Freight Need/);
  assert.match(html, /Equipment \/ Material To Move/);
  assert.match(html, /Truck Needs/);
  assert.match(html, /Trailer Needs/);
  assert.match(html, /Pickup \/ Start Location/);
  assert.match(html, /Delivery \/ Finish Location/);
  assert.match(html, /Freight Request Notes/);
  assert.match(html, /Use Freight &gt; Create Dispatch Move for the driver route/);
  assert.match(html, /Semi #1/);
  assert.match(html, /Black Lowboy/);
  assert.doesNotMatch(html, /Equipment Request Type/);
  assert.doesNotMatch(html, /Crew Instructions/);
});
