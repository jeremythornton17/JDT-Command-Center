# Live GPS Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Verizon Reveal-style Live GPS Map inside JDT Command Center with vehicle, equipment, freight, and unmatched GPS layers.

**Architecture:** Add a pure `LiveGpsAsset` normalization layer in `src/commandCenter/liveGpsMap.ts`, then make `MapsBoard` render a dedicated Live GPS mode from that normalized data. Keep Verizon Reveal as the telemetry source and JDT Command Center as the source of truth for equipment, freight, locations, and project context.

**Tech Stack:** React 19, Vite, TypeScript, Google Maps JS API, Firestore-synced records, Node test runner with `tsx`.

---

## File Structure

- Create: `src/commandCenter/liveGpsMap.ts`
  - Owns `LiveGpsAsset` types, category/status normalization, asset filtering, single-asset isolation, and freight/equipment context matching.
- Create: `src/commandCenter/liveGpsMap.test.ts`
  - Unit tests for the GPS normalization layer.
- Modify: `src/commandCenter/telematicsIntelligence.ts`
  - Keep `buildLiveVehicleMapMarkers` for compatibility, but let the new map layer use `buildLiveGpsAssets`.
- Modify: `src/components/MapsBoard.tsx`
  - Add Live GPS mode, filters, asset list, map layer controls, selected asset popup/details, and category-specific actions.
- Modify: `src/components/MapsBoard.test.tsx`
  - Add server-rendered UI coverage for Live GPS mode, category filters, equipment assets, freight context, and unmatched GPS.
- Modify: `src/App.tsx`
  - Pass `loadsWithTelematics` into `MapsBoard`.
  - Add navigation intent for opening the Live GPS map from Freight and Equipment.
- Modify: `src/components/FreightBoard.tsx`
  - Add "Open Live Map" action.
- Modify: `src/components/EquipmentBoard.tsx`
  - Add "Open Live Map" and per-asset "Track Asset" actions.
- Modify: `package.json`
  - Include `src/commandCenter/liveGpsMap.test.ts` in the `test` script.

---

### Task 1: Live GPS Domain Model

**Files:**
- Create: `src/commandCenter/liveGpsMap.ts`
- Create: `src/commandCenter/liveGpsMap.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for normalized GPS assets**

Create `src/commandCenter/liveGpsMap.test.ts` with tests that cover:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLiveGpsAssets,
  filterLiveGpsAssets,
  isolateLiveGpsAsset,
} from "./liveGpsMap";
import type { EquipmentRecord, FleetTelematicsEventRecord, LoadRecord } from "./records";

const semiOne: EquipmentRecord = {
  id: "equipment-semi-1",
  name: "Semi #1",
  category: "Truck",
  revealVehicleId: "veh-1",
  vehicleNumber: "S1",
  assignedProjectId: "project-boca-west",
  assignedProjectName: "Boca West Course 1 Renovation",
  currentLocationName: "Boca West Course 1 Renovation",
  currentLocation: "20583 Boca W Dr, Boca Raton, FL 33434",
};

const komatsu: EquipmentRecord = {
  id: "equipment-komatsu-500-1",
  name: "Komatsu 500 - 1",
  category: "Machine",
  revealVehicleId: "asset-komatsu-1",
  currentLocationName: "25 Acre",
  currentLocation: "3040 US-27, Clewiston, FL 33440",
  serviceStatus: "Ready",
};

const semiEvent: FleetTelematicsEventRecord = {
  id: "evt-semi-1",
  provider: "Reveal",
  providerVehicleId: "veh-1",
  vehicleName: "Semi #1",
  latitude: 26.387315,
  longitude: -80.171258,
  speedMph: 32,
  heading: 120,
  driverName: "Christian Crespo",
  address: "Boca West truck access",
  eventAt: "2026-06-13T14:00:00.000Z",
};

const equipmentEvent: FleetTelematicsEventRecord = {
  id: "evt-komatsu-1",
  provider: "Reveal",
  providerVehicleId: "asset-komatsu-1",
  vehicleName: "Komatsu 500 - 1",
  latitude: 26.755196,
  longitude: -80.983372,
  speedMph: 0,
  address: "25 Acre Farm",
  eventAt: "2026-06-13T13:40:00.000Z",
};

const freightMove: LoadRecord = {
  id: "load-boca-equipment",
  title: "Christian Crespo - Semi #1 - Boca West equipment moves",
  loadNumber: "FM-20260613-CC-S1-01",
  driver: "Christian Crespo",
  truckId: "equipment-semi-1",
  truck: "Semi #1",
  status: "In Transit",
  projectId: "project-boca-west",
  projectName: "Boca West Course 1 Renovation",
  stops: [{ id: "stop-1", sequence: 1, label: "Boca West truck access", type: "Delivery", status: "InProgress" }],
};

test("buildLiveGpsAssets groups Reveal GPS into vehicles, equipment, freight, and unmatched assets", () => {
  const assets = buildLiveGpsAssets({
    equipment: [semiOne, komatsu],
    events: [
      semiEvent,
      equipmentEvent,
      {
        id: "evt-unmatched",
        provider: "Reveal",
        providerVehicleId: "unknown-9",
        vehicleName: "Unknown Reveal tracker",
        latitude: 26.7539,
        longitude: -80.9166,
        eventAt: "2026-06-13T13:55:00.000Z",
      },
    ],
    loads: [freightMove],
    now: "2026-06-13T14:10:00.000Z",
  });

  assert.deepEqual(assets.map((asset) => [asset.id, asset.category, asset.status]), [
    ["equipment-semi-1", "vehicle", "Moving"],
    ["equipment-komatsu-500-1", "equipment", "Stopped"],
    ["freight-load-boca-equipment", "freight", "In Transit"],
    ["unmatched-unknown-9", "unmatched", "Needs Match"],
  ]);
  assert.equal(assets[0].assignedDriver, "Christian Crespo");
  assert.equal(assets[2].freightMoveId, "load-boca-equipment");
  assert.equal(assets[3].needsAttention, true);
});

test("filterLiveGpsAssets applies category, status, search, and stale filtering", () => {
  const assets = buildLiveGpsAssets({
    equipment: [semiOne, komatsu],
    events: [semiEvent, { ...equipmentEvent, eventAt: "2026-06-12T00:00:00.000Z" }],
    loads: [freightMove],
    now: "2026-06-13T14:10:00.000Z",
  });

  assert.deepEqual(filterLiveGpsAssets(assets, { categories: ["equipment"] }).map((item) => item.name), ["Komatsu 500 - 1"]);
  assert.deepEqual(filterLiveGpsAssets(assets, { statuses: ["Stale"] }).map((item) => item.name), ["Komatsu 500 - 1"]);
  assert.deepEqual(filterLiveGpsAssets(assets, { search: "christian" }).map((item) => item.name), ["Semi #1", "Christian Crespo - Semi #1 - Boca West equipment moves"]);
});

test("isolateLiveGpsAsset returns only the selected asset when an asset is selected", () => {
  const assets = buildLiveGpsAssets({ equipment: [semiOne, komatsu], events: [semiEvent, equipmentEvent], loads: [freightMove] });
  assert.deepEqual(isolateLiveGpsAsset(assets, "equipment-komatsu-500-1").map((item) => item.id), ["equipment-komatsu-500-1"]);
  assert.equal(isolateLiveGpsAsset(assets, "").length, assets.length);
});
```

- [ ] **Step 2: Add the test file to `package.json`**

Add `src/commandCenter/liveGpsMap.test.ts` before `src/commandCenter/telematicsIntelligence.test.ts` in the existing `test` script so `npm run test` executes it.

- [ ] **Step 3: Run the new test and confirm it fails**

Run:

```powershell
$env:Path = "C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;" + $env:Path
npm exec -- node --test --import tsx src/commandCenter/liveGpsMap.test.ts
```

Expected: failure because `src/commandCenter/liveGpsMap.ts` does not exist.

- [ ] **Step 4: Implement the live GPS model**

Create `src/commandCenter/liveGpsMap.ts` with:

- `LiveGpsCategory = "vehicle" | "equipment" | "freight" | "unmatched"`
- `LiveGpsStatus = "Moving" | "Idle" | "Stopped" | "Stale" | "No Signal" | "Needs Match" | string`
- `LiveGpsAsset`
- `buildLiveGpsAssets`
- `filterLiveGpsAssets`
- `isolateLiveGpsAsset`

The helper must:

- Match events to equipment by `revealVehicleId`, `verizonVehicleId`, `vehicleNumber`, or normalized equipment name.
- Classify `Truck`, `Trailer`, and `Support` as `vehicle`.
- Classify `Machine`, `Implement`, and `Tool` as `equipment`.
- Create a `freight` asset when a live vehicle is connected to an active `LoadRecord`.
- Create an `unmatched` asset for Reveal events that do not match equipment.
- Mark GPS as `Stale` when the latest timestamp is older than 12 hours.
- Mark unmatched records as `Needs Match`.
- Use `equipmentDisplayName` and `equipmentCategory` from `src/commandCenter/equipmentFreight.ts`.

- [ ] **Step 5: Run targeted tests**

Run:

```powershell
npm exec -- node --test --import tsx src/commandCenter/liveGpsMap.test.ts src/commandCenter/telematicsIntelligence.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit Task 1**

Run:

```powershell
git add package.json src/commandCenter/liveGpsMap.ts src/commandCenter/liveGpsMap.test.ts
git commit -m "Add live GPS asset model"
```

---

### Task 2: Live GPS Mode In Maps Board

**Files:**
- Modify: `src/components/MapsBoard.tsx`
- Modify: `src/components/MapsBoard.test.tsx`

- [ ] **Step 1: Add failing MapsBoard render tests**

Extend `src/components/MapsBoard.test.tsx` with tests that assert:

- The map can open in Live GPS mode with `initialMapMode="liveGps"`.
- The sidebar shows Vehicles, Equipment, Freight, and Unmatched GPS filters.
- A tracked machine appears as equipment.
- A freight move connected to a truck appears as freight.
- A selected asset isolation label appears when `initialSelectedGpsAssetId` is provided.

Use this test shape:

```tsx
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
```

- [ ] **Step 2: Run the MapsBoard test and confirm it fails**

Run:

```powershell
npm exec -- node --test --import tsx src/components/MapsBoard.test.tsx
```

Expected: failure because `initialMapMode` and Live GPS UI do not exist yet.

- [ ] **Step 3: Add MapsBoard props and state**

In `src/components/MapsBoard.tsx`:

- Extend `MapsBoardProps` with:
  - `loads?: LoadRecord[]`
  - `initialMapMode?: "locations" | "project" | "liveGps"`
  - `initialSelectedGpsAssetId?: string`
- Replace the current vehicle-only marker memo with `liveGpsAssets`.
- Add state for:
  - `mapMode`
  - `gpsSearch`
  - `activeGpsCategories`
  - `activeGpsStatuses`
  - `selectedGpsAssetId`
  - `isolatedGpsAssetId`

Default `mapMode` should be `"locations"` unless `initialMapMode` is provided.

- [ ] **Step 4: Add Live GPS map controls**

In the top map control panel, add buttons:

- `Locations`
- `Project / Trees`
- `Live GPS`

When Live GPS is selected:

- Hide tree-specific side panels unless a project/tree map is selected.
- Show Live GPS filters and asset list.
- Keep saved locations available as optional map layers.

- [ ] **Step 5: Render Live GPS markers**

Replace vehicle-only marker rendering with category-aware markers:

- Vehicles: blue truck marker label `V`.
- Equipment: lavender machine marker label `E`.
- Freight: teal route marker label `F`.
- Unmatched GPS: amber warning marker label `?`.

Fallback map pins should use the same category colors and icons.

- [ ] **Step 6: Add asset list and layer controls**

Add a right-side Live GPS panel with:

- Search input.
- Category toggle buttons.
- Status toggle buttons.
- Asset cards.
- Map layer checklist labels for Saved Locations, Vehicles, Equipment, Freight, Unmatched GPS.
- "Show All" action when an asset is isolated.

Each asset card should show:

- Asset name.
- Category/status.
- Driver/operator when known.
- Current address or coordinates.
- Last GPS time.
- Project or freight context when known.

- [ ] **Step 7: Add asset actions**

Each asset detail/card should support visible actions:

- `Zoom To`
- `Open In Google Maps`
- `Copy Coordinates`
- `View Equipment` when `equipmentId` exists.
- `View Freight` when `freightMoveId` exists.
- `Match GPS` for unmatched records.

`View Equipment` and `View Freight` should call `openDrawer("equipment", equipmentId)` or `openDrawer("freight", freightMoveId)`.

- [ ] **Step 8: Run targeted UI tests**

Run:

```powershell
npm exec -- node --test --import tsx src/components/MapsBoard.test.tsx src/commandCenter/liveGpsMap.test.ts
```

Expected: all tests pass.

- [ ] **Step 9: Commit Task 2**

Run:

```powershell
git add src/components/MapsBoard.tsx src/components/MapsBoard.test.tsx
git commit -m "Add live GPS map workspace"
```

---

### Task 3: App Wiring And Entry Points

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/FreightBoard.tsx`
- Modify: `src/components/EquipmentBoard.tsx`
- Modify: `src/components/MapsBoard.test.tsx`

- [ ] **Step 1: Add app navigation state**

In `src/App.tsx`, add:

```ts
const [mapsIntent, setMapsIntent] = useState<{ mode?: "locations" | "project" | "liveGps"; selectedGpsAssetId?: string } | null>(null);

const openLiveGpsMap = (selectedGpsAssetId?: string) => {
  setMapsIntent({ mode: "liveGps", selectedGpsAssetId });
  setActiveTab("maps");
};
```

- [ ] **Step 2: Pass loads and map intent into MapsBoard**

Change the Maps render to pass:

- `loads={loadsWithTelematics}`
- `initialMapMode={mapsIntent?.mode}`
- `initialSelectedGpsAssetId={mapsIntent?.selectedGpsAssetId}`

After MapsBoard receives the intent, keep it usable even if the user switches map modes inside the component.

- [ ] **Step 3: Add FreightBoard entry point**

Extend `FreightBoard` props with:

```ts
onOpenLiveMap?: () => void;
```

Add a header button labeled `Open Live Map` with a map/truck icon. It should call `onOpenLiveMap`.

- [ ] **Step 4: Add EquipmentBoard entry points**

Extend `EquipmentBoard` props with:

```ts
onOpenLiveMap?: (assetId?: string) => void;
```

Add:

- Header action: `Open Live Map`.
- Equipment card action: `Track Asset`, shown for records with `revealVehicleId`, `verizonVehicleId`, `lastTelematicsLatitude`, or `lastTelematicsLongitude`.

`Track Asset` should call `onOpenLiveMap(equipment.id)`.

- [ ] **Step 5: Wire the callbacks from App**

In `App.tsx`:

- Pass `onOpenLiveMap={() => openLiveGpsMap()}` to `FreightBoard`.
- Pass `onOpenLiveMap={openLiveGpsMap}` to `EquipmentBoard`.

- [ ] **Step 6: Add render tests**

Add tests or extend existing component tests to assert:

- FreightBoard renders `Open Live Map` when callback exists.
- EquipmentBoard renders `Open Live Map`.
- EquipmentBoard renders `Track Asset` for GPS-capable equipment.

- [ ] **Step 7: Run targeted tests**

Run:

```powershell
npm exec -- node --test --import tsx src/components/MapsBoard.test.tsx src/components/WorkOrdersUi.test.tsx src/components/EntityForms.test.tsx
```

Expected: all tests pass. If no existing FreightBoard/EquipmentBoard render test file exists, create focused tests only for the new buttons.

- [ ] **Step 8: Commit Task 3**

Run:

```powershell
git add src/App.tsx src/components/FreightBoard.tsx src/components/EquipmentBoard.tsx src/components/MapsBoard.test.tsx
git commit -m "Wire live GPS map entry points"
```

---

### Task 4: Verification, Browser Review, And Deployment

**Files:**
- All touched files

- [ ] **Step 1: Run full test suite**

Run:

```powershell
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript lint**

Run:

```powershell
npm run lint
```

Expected: `tsc --noEmit` exits successfully.

- [ ] **Step 3: Build production bundle**

Run:

```powershell
npm run build
```

Expected: Vite builds `dist` successfully.

- [ ] **Step 4: Start local preview**

Run:

```powershell
npm run build
npm run preview -- --host 127.0.0.1
```

Open the preview URL in the in-app browser.

- [ ] **Step 5: Browser-check the Live GPS experience**

Verify:

- Maps page opens.
- Live GPS mode is visible.
- Category toggles do not overlap.
- Asset list is readable on desktop.
- Selecting a single asset isolates it.
- Equipment and freight cards include the correct context.
- Empty/no GPS state is readable.
- Existing Tree Relocation map still shows tree pins and project saved locations.

- [ ] **Step 6: Deploy through Cloud Run**

Use the established Cloud Run deployment path for this repository. After deployment, verify:

- `https://app.jdtcommandcenter.com/` loads.
- Maps page opens.
- Live GPS mode appears.
- Existing Equipment/Freight pages still render.

- [ ] **Step 7: Commit and push final verification notes**

If verification fixes were needed, commit them. Then push the branch:

```powershell
git status --short
git push
```

Expected: branch is pushed with all Live GPS Map implementation commits.

---

## Self-Review Checklist

- Spec requirement "vehicles, equipment, freight, unmatched GPS" is covered by Task 1 and Task 2.
- Spec requirement "category filters and individual isolation" is covered by Task 1 and Task 2.
- Spec requirement "Freight and Equipment entry points" is covered by Task 3.
- Spec requirement "JDT source of truth, Verizon as telemetry source" is covered by the `LiveGpsAsset` model and map rendering from JDT records.
- Spec requirement "error and stale states" is covered by stale/no signal/needs match statuses and UI panels.
- Existing Tree Relocation, saved site locations, Google Earth/KML, and Add Pin behavior stay in `MapsBoard` and are not removed.
