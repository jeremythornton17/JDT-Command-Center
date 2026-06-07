import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import NurseryBoard from './NurseryBoard';

const inventoryItems = [
  {
    id: 'inventory-25-acre-1-podocarpus-weeping',
    treeId: 'inventory-25-acre-1-podocarpus-weeping',
    species: 'Podocarpus Weeping',
    ranchOakType: 'Podocarpus Weeping',
    farm: '25 Acre',
    zone: '1',
    quantity: 18,
    height: '12 ft',
    spread: '5 ft',
    status: 'Available',
  },
];

const ranchOaks = [
  {
    id: 'ranch-oak-ro-1001',
    treeId: 'RO-1001',
    ranchOakType: 'Single trunk',
    commonName: 'Ranch Oak Live Oak',
    farm: 'Main Office',
    fieldLocation: 'Main Office',
    zone: 'A',
    row: '1',
    position: '4',
    status: 'Available',
    dbh: 18,
    height: 30,
    spread: 20,
    rootballSize: '7 ft',
    rootPruneDate: '2026-05-10',
    dateHarvested: '',
    price: 4200,
    projectId: '',
    customerName: '',
    mainImageUrl: 'https://example.com/live-oak-main.jpg',
    imageUrls: [
      'https://example.com/live-oak-2.jpg',
      'https://example.com/live-oak-3.jpg',
      'https://example.com/live-oak-4.jpg',
      'https://example.com/live-oak-5.jpg',
    ],
  },
  {
    id: 'ranch-oak-ro-1002',
    treeId: 'RO-1002',
    ranchOakType: 'Multi trunk',
    commonName: 'Ranch Oak Live Oak',
    farm: '40 Acre',
    fieldLocation: '40 Acre',
    zone: 'C',
    row: '2',
    position: '9',
    status: 'Sold',
    dbh: 22,
    height: 32,
    spread: 24,
    rootballSize: '8 ft',
    rootPruneDate: '2026-05-12',
    dateHarvested: '2026-05-30',
    price: 5600,
    projectId: 'project-boca-west',
    customerName: 'Boca West Country Club',
  },
];

const propagationItems = [
  {
    id: 'propagation-podocarpus-cuttings-001',
    treeId: 'PROP-001',
    species: 'Podocarpus',
    commonName: 'Podocarpus Cuttings',
    propagationSource: 'Cutting',
    propagationStage: 'Shade House',
    propagationBatchId: 'PROP-20260607-PODO',
    quantity: 240,
    farm: 'Main Office',
    fieldLocation: 'Shade House',
    zone: 'Bench 4',
    startDate: '2026-06-07',
    targetMoveUpDate: '2026-07-15',
    waterNeeds: 'Mist twice daily',
    nutrientNeeds: 'Light feed after rooting',
    plantHealthStatus: 'Rooting',
    internalUseOnly: true,
    inventoryClass: 'Propagation',
    sourceCollection: 'inventoryItems',
    notes: 'Hold for field planting only',
  },
];

test('NurseryBoard separates general inventory from the Ranch Oaks subtab', () => {
  const html = renderToString(
    <NurseryBoard
      starterRanchOaks={[...inventoryItems, ...ranchOaks]}
      inventoryItems={inventoryItems}
      ranchOaks={ranchOaks}
      defaultInventoryTab="all"
      openDrawer={() => undefined}
      openModal={() => undefined}
    />,
  );

  assert.match(html, /All Nursery Inventory/);
  assert.match(html, /Ranch Oaks/);
  assert.match(html, /Add Tree/);
  assert.match(html, /Podocarpus Weeping/);
  assert.match(html, /RO-1001/);
  assert.match(html, /RO-1002/);
  assert.match(html, /Edit/);
  assert.match(html, /Delete/);
});

test('NurseryBoard renders Propagation as an internal nursery workflow', () => {
  const html = renderToString(
    <NurseryBoard
      starterRanchOaks={[...inventoryItems, ...ranchOaks, ...propagationItems]}
      inventoryItems={[...inventoryItems, ...propagationItems]}
      ranchOaks={ranchOaks}
      defaultInventoryTab="propagation"
      openDrawer={() => undefined}
      openModal={() => undefined}
    />,
  );

  assert.match(html, /Propagation/);
  assert.match(html, /Propagation Inventory/);
  assert.match(html, /Internal nursery stock for shade house, starter material, pot step-ups, and field-ready plantings/);
  assert.match(html, /Add Propagation Batch/);
  assert.match(html, /Podocarpus Cuttings/);
  assert.match(html, /PROP-20260607-PODO/);
  assert.match(html, /Cutting/);
  assert.match(html, /Shade House/);
  assert.match(html, /Mist twice daily/);
  assert.match(html, /Light feed after rooting/);
  assert.match(html, /Rooting/);
  assert.match(html, /Internal Only/);
  assert.doesNotMatch(html, /Boca West Country Club/);
});

test('NurseryBoard renders Ranch Oaks as a dedicated location and type workflow', () => {
  const html = renderToString(
    <NurseryBoard
      starterRanchOaks={[...inventoryItems, ...ranchOaks]}
      inventoryItems={inventoryItems}
      ranchOaks={ranchOaks}
      defaultInventoryTab="ranchOaks"
      openDrawer={() => undefined}
      openModal={() => undefined}
    />,
  );

  assert.match(html, /Ranch Oaks Inventory/);
  assert.match(html, /Main Office/);
  assert.match(html, /40 Acre/);
  assert.match(html, /Single trunk/);
  assert.match(html, /Multi trunk/);
  assert.match(html, /Available/);
  assert.match(html, /Sold/);
  assert.match(html, /Root Prune/);
  assert.match(html, /Row \/ Position/);
  assert.match(html, /Boca West Country Club/);
  assert.match(html, /Add Ranch Oak/);
  assert.match(html, /Tap image to view gallery/);
  assert.match(html, /RO-1001 main image/);
  assert.match(html, /5(?:<!-- -->)? photos/);
  assert.match(html, /Edit/);
  assert.match(html, /Delete/);
  assert.match(html, /Assign/);
  assert.match(html, /QR Code/);
  assert.match(html, /Map/);
  assert.doesNotMatch(html, /Podocarpus Weeping/);
});
