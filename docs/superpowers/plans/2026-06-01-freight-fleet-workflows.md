# Freight Fleet Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the useful FleetFlow logistics ideas into JDT Command Center without creating a second app or duplicate fleet data model, and make the current empty Freight page guide setup instead of looking unfinished.

**Architecture:** Keep JDT's existing `equipment`, `loads`, `workOrders`, `locations`, and `documents` collections as the source of truth. Add small workflow helpers in `src/commandCenter/freightWorkflow.ts`, extend existing record types, and surface actions through the current Freight and Equipment cards. Driver mobile mode is explicitly out of scope for this pass.

**Tech Stack:** React 19, TypeScript, Firebase/Firestore sync helpers, Node test runner with `tsx`, Vite build, Cloud Run deployment.

---

## File Structure

- Create `src/commandCenter/freightWorkflow.ts`
  - Owns trailer/vehicle activity mutations, freight stop status transitions, e-POD payload shaping, and maintenance issue to work-order conversion.
- Create `src/commandCenter/freightWorkflow.test.ts`
  - Unit coverage for every new helper before UI wiring.
- Modify `src/commandCenter/records.ts`
  - Add optional typed fields for vehicle activity history, freight stops, proof of delivery, required documents, maintenance issue fields, and odometer/location metadata.
- Modify `src/components/FreightBoard.tsx`
  - Add vehicle activity buttons, location history display, stop progress display, required document flags, e-POD indicators, and a useful fleet setup empty state when no trucks/trailers exist yet.
- Modify `src/components/EquipmentBoard.tsx`
  - Surface open maintenance issue/work order state for truck/trailer cards.
- Modify `src/components/EntityForms.tsx`
  - Add modal fields for `spot_vehicle`, `drop_trailer`, `hook_trailer`, `mark_vehicle_load_state`, `advance_freight_stop`, `complete_freight_pod`, and `report_vehicle_issue`.
- Modify `src/components/UniversalModal.tsx`
  - Register titles/descriptions for new freight/equipment workflow modals.
- Modify `src/App.tsx`
  - Route new modal save types to existing `equipment`, `loads`, `locations`, `clients`, and `workOrders` state setters.
- Modify `src/components/WorkOrdersUi.test.tsx`
  - Server-render UI coverage for Freight card actions and stop/e-POD displays.
- Modify `package.json`
  - Add `src/commandCenter/freightWorkflow.test.ts` to the test script.

## Task 1: Vehicle Activity Helpers

**Files:**
- Create: `src/commandCenter/freightWorkflow.ts`
- Create: `src/commandCenter/freightWorkflow.test.ts`
- Modify: `src/commandCenter/records.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing helper tests**

Add tests that prove activity actions update vehicle state without separate truck/trailer collections:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyVehicleActivity,
  freightVehicleActivityOptions,
  vehicleLocationHistory,
} from "./freightWorkflow";

describe("freight vehicle workflow helpers", () => {
  it("spots a trailer at a named location and records history", () => {
    const updated = applyVehicleActivity({
      id: "equipment-lowboy",
      name: "Black Lowboy",
      category: "Trailer",
      status: "Available",
    }, {
      action: "Spot Location",
      locationName: "Boca West staging area",
      locationAddress: "Boca West Country Club",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T12:00:00.000Z",
      notes: "Dropped empty near maintenance gate",
    });

    assert.equal(updated.currentLocationName, "Boca West staging area");
    assert.equal(updated.currentLocation, "Boca West Country Club");
    assert.equal(updated.currentLocationType, "Job Site");
    assert.equal(updated.status, "Available");
    assert.equal(updated.vehicleLoadState, "Empty");
    assert.equal(updated.vehicleActivityHistory?.[0].action, "Spot Location");
  });

  it("drops and hooks trailers between drivers", () => {
    const dropped = applyVehicleActivity({
      id: "trailer-1",
      name: "black lowboy",
      category: "Trailer",
      assignedCrewName: "Alex Bueno",
      assignedTruck: "Semi 1",
    }, {
      action: "Drop Trailer",
      locationName: "25 Acre Farm",
      actorName: "Alex Bueno",
      occurredAt: "2026-06-01T13:00:00.000Z",
    });

    assert.equal(dropped.assignedCrewName, "");
    assert.equal(dropped.assignedTruck, "");
    assert.equal(dropped.vehicleLoadState, "Empty");

    const hooked = applyVehicleActivity(dropped, {
      action: "Hook Trailer",
      assignedCrewName: "Vince Carreno",
      assignedTruck: "Semi 2",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T14:00:00.000Z",
    });

    assert.equal(hooked.assignedCrewName, "Vince Carreno");
    assert.equal(hooked.assignedTruck, "Semi 2");
    assert.equal(hooked.status, "Assigned");
  });

  it("returns newest vehicle activity history first", () => {
    const vehicle = applyVehicleActivity({
      id: "truck-1",
      name: "Semi 1",
      category: "Truck",
    }, {
      action: "Mark Loaded",
      actorName: "Jennifer Bermudez",
      occurredAt: "2026-06-01T15:00:00.000Z",
    });

    assert.deepEqual(freightVehicleActivityOptions, [
      "Spot Location",
      "Drop Trailer",
      "Hook Trailer",
      "Mark Empty",
      "Mark Loaded",
    ]);
    assert.equal(vehicleLocationHistory(vehicle)[0].action, "Mark Loaded");
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\freightWorkflow.test.ts
```

Expected: FAIL because `./freightWorkflow` does not exist.

- [ ] **Step 3: Extend record types**

Add optional fields to `EquipmentRecord`:

```ts
vehicleLoadState?: 'Empty' | 'Pre-loading' | 'Loaded' | 'Staged' | 'In Use' | string;
lastSpottedBy?: string;
lastSpottedAt?: string;
vehicleActivityHistory?: Array<{
  action: string;
  actorName?: string;
  occurredAt: string;
  locationName?: string;
  locationAddress?: string;
  assignedCrewName?: string;
  assignedTruck?: string;
  notes?: string;
}>;
```

- [ ] **Step 4: Implement minimal helper**

Create `src/commandCenter/freightWorkflow.ts` with:

```ts
import type { EquipmentRecord } from './records';

export const freightVehicleActivityOptions = ['Spot Location', 'Drop Trailer', 'Hook Trailer', 'Mark Empty', 'Mark Loaded'];

export type FreightVehicleActivityInput = {
  action: string;
  actorName?: string;
  occurredAt?: string;
  locationName?: string;
  locationAddress?: string;
  assignedCrewName?: string;
  assignedTruck?: string;
  notes?: string;
};

export function applyVehicleActivity(vehicle: EquipmentRecord, input: FreightVehicleActivityInput): EquipmentRecord {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const historyEntry = {
    action: input.action,
    actorName: input.actorName,
    occurredAt,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    assignedCrewName: input.assignedCrewName,
    assignedTruck: input.assignedTruck,
    notes: input.notes,
  };
  const base: EquipmentRecord = {
    ...vehicle,
    lastSpottedBy: input.actorName || vehicle.lastSpottedBy,
    lastSpottedAt: occurredAt,
    vehicleActivityHistory: [historyEntry, ...(vehicle.vehicleActivityHistory || [])].slice(0, 25),
  };

  if (input.locationName) {
    base.currentLocationName = input.locationName;
    base.currentLocation = input.locationAddress || input.locationName;
    base.currentLocationType = 'Job Site';
  }
  if (input.action === 'Spot Location') base.vehicleLoadState = 'Empty';
  if (input.action === 'Drop Trailer') {
    base.assignedCrewName = '';
    base.operator = '';
    base.assignedTruck = '';
    base.status = 'Available';
    base.vehicleLoadState = 'Empty';
  }
  if (input.action === 'Hook Trailer') {
    base.assignedCrewName = input.assignedCrewName || vehicle.assignedCrewName;
    base.operator = input.assignedCrewName || vehicle.operator;
    base.assignedTruck = input.assignedTruck || vehicle.assignedTruck;
    base.status = 'Assigned';
  }
  if (input.action === 'Mark Empty') base.vehicleLoadState = 'Empty';
  if (input.action === 'Mark Loaded') base.vehicleLoadState = 'Loaded';

  return base;
}

export function vehicleLocationHistory(vehicle: EquipmentRecord) {
  return vehicle.vehicleActivityHistory || [];
}
```

- [ ] **Step 5: Run test to verify GREEN**

Run the same command as Step 2. Expected: PASS.

- [ ] **Step 6: Add test script entry**

Append `src/commandCenter/freightWorkflow.test.ts` to the `package.json` `test` script.

## Task 2: Vehicle Actions On Freight Cards

**Files:**
- Modify: `src/components/WorkOrdersUi.test.tsx`
- Modify: `src/components/FreightBoard.tsx`
- Modify: `src/components/UniversalModal.tsx`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing UI test**

Add a test that renders a trailer card and expects action buttons plus recent history:

```ts
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
  assert.match(html, /Location History/);
  assert.match(html, /Jennifer Bermudez/);
});
```

- [ ] **Step 2: Run targeted test to verify RED**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the buttons/history are not rendered.

- [ ] **Step 3: Render vehicle actions**

In `FreightBoard.tsx`, import `vehicleLocationHistory` and add action buttons below each vehicle card:

```tsx
<button onClick={() => openModal('spot_vehicle', vehicle)}>Spot Location</button>
<button onClick={() => openModal('drop_trailer', vehicle)}>Drop Trailer</button>
<button onClick={() => openModal('hook_trailer', vehicle)}>Hook Trailer</button>
<button onClick={() => openModal(vehicle.vehicleLoadState === 'Loaded' ? 'mark_vehicle_empty' : 'mark_vehicle_loaded', vehicle)}>
  {vehicle.vehicleLoadState === 'Loaded' ? 'Mark Empty' : 'Mark Loaded'}
</button>
```

Also render the latest three `vehicleLocationHistory(vehicle)` entries under `Location History`.

- [ ] **Step 4: Register modal/form types**

In `UniversalModal.tsx`, add config entries for `spot_vehicle`, `drop_trailer`, `hook_trailer`, `mark_vehicle_empty`, and `mark_vehicle_loaded`, and include them in `isEntityForm`.

In `EntityForms.tsx`, map those types to a new `vehicleActivity` field set:

```ts
vehicleActivity: [
  { key: 'locationName', label: 'Location Name' },
  { key: 'locationAddress', label: 'Address / Site Detail' },
  { key: 'assignedCrewName', label: 'Driver / Crew Member' },
  { key: 'assignedTruck', label: 'Truck' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
],
```

- [ ] **Step 5: Save vehicle actions**

In `App.tsx`, route the new modal types to `setEquipment` with `applyVehicleActivity`.

- [ ] **Step 6: Run targeted tests to verify GREEN**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\freightWorkflow.test.ts src\components\WorkOrdersUi.test.tsx
```

Expected: PASS.

## Task 3: Freight Stop Workflow And e-POD Shape

**Files:**
- Modify: `src/commandCenter/freightWorkflow.ts`
- Modify: `src/commandCenter/freightWorkflow.test.ts`
- Modify: `src/commandCenter/records.ts`
- Modify: `src/components/FreightBoard.tsx`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/UniversalModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests for stop progress and e-POD**

Add tests:

```ts
import { advanceFreightStop, completeFreightWithPod } from "./freightWorkflow";

it("advances freight stops with actual arrival and departure timestamps", () => {
  const load = {
    id: "load-1",
    title: "Boca West delivery",
    status: "Dispatched",
    stops: [
      { id: "pickup", label: "Pickup", type: "Pickup", location: "JDT Home Base", status: "Pending", saveLocation: true, siteContactName: "Jennifer", siteContactPhone: "239-800-1736" },
      { id: "delivery", label: "Delivery", type: "Delivery", location: "Boca West", status: "Pending", saveLocation: true },
    ],
  };

  const updated = advanceFreightStop(load, {
    stopId: "pickup",
    nextStatus: "Completed",
    actualArrivalAt: "2026-06-01T08:00:00.000Z",
    actualDepartureAt: "2026-06-01T08:30:00.000Z",
    notes: "Loaded two live oaks",
  });

  assert.equal(updated.stops?.[0].status, "Completed");
  assert.equal(updated.stops?.[0].actualDepartureAt, "2026-06-01T08:30:00.000Z");
  assert.equal(updated.status, "In Transit");
  assert.equal(updated.freightRevision, 1);
  assert.equal(updated.freightEvents?.[0].type, "STOP_UPDATED");
});

it("stores proof of delivery details on completed freight", () => {
  const updated = completeFreightWithPod({
    id: "load-1",
    title: "Boca West delivery",
    status: "At Delivery",
  }, {
    receiverName: "Boca West Superintendent",
    completedAt: "2026-06-01T10:00:00.000Z",
    signatureDataUrl: "data:image/png;base64,abc",
    bolPhotoDataUrl: "data:image/png;base64,def",
    notes: "Accepted at gate",
  });

  assert.equal(updated.status, "Completed");
  assert.equal(updated.pod?.receiverName, "Boca West Superintendent");
  assert.equal(updated.requiredDocuments?.some((doc) => doc.type === "BOL"), true);
});
```

- [ ] **Step 2: Run RED**

Run `freightWorkflow.test.ts`. Expected: FAIL because functions are missing.

- [ ] **Step 3: Extend `LoadRecord`**

Add optional fields:

```ts
freightRevision?: number;
freightEvents?: Array<{
  type: string;
  actorName?: string;
  summary: string;
  createdAt: string;
}>;
requiredDocuments?: Array<{ type: string; status?: string; url?: string; notes?: string }>;
pod?: {
  receiverName?: string;
  completedAt?: string;
  signatureDataUrl?: string;
  bolPhotoDataUrl?: string;
  notes?: string;
};
stops?: Array<{
  id?: string;
  label?: string;
  type?: 'Pickup' | 'Delivery' | 'Drop Off' | 'Other' | string;
  location?: string;
  window?: string;
  status?: 'Pending' | 'InProgress' | 'Completed' | 'Skipped' | string;
  completed?: boolean;
  actualArrivalAt?: string;
  actualDepartureAt?: string;
  notes?: string;
  saveLocation?: boolean;
  saveContact?: boolean;
  siteContactName?: string;
  siteContactPhone?: string;
  requiredPhotos?: boolean;
  requiredSignature?: boolean;
}>;
```

- [ ] **Step 4: Implement helpers**

Add `advanceFreightStop`, `completeFreightWithPod`, and `freightEventHistory` to `freightWorkflow.ts`. Keep status transitions simple: completed pickup means `In Transit`; completed final delivery means `Delivered`; e-POD completion means `Completed`. Every helper increments `freightRevision` and prepends one freight event.

- [ ] **Step 5: Add UI display and modal fields**

In `FreightBoard.tsx`, show stop `status`, `actualArrivalAt`, `actualDepartureAt`, `requiredPhotos`, and `requiredSignature`. Add buttons to open `advance_freight_stop` and `complete_freight_pod`.

In `EntityForms.tsx`, add `advanceFreightStop` and `completeFreightPod` field sets with receiver name, timestamps, BOL/photo URL or data URL fields, notes, and document flags.

- [ ] **Step 6: Save stop/e-POD forms**

In `App.tsx`, route `advance_freight_stop` and `complete_freight_pod` to `setLoads` using the helpers. When a stop form has `saveLocation`, also upsert a `locations` record. When it has `saveContact`, upsert the contact into the related client if a client is linked.

- [ ] **Step 7: Run targeted tests**

Run helper and UI tests. Expected: PASS.

## Task 4: Maintenance Issues Become Equipment Work Orders

**Files:**
- Modify: `src/commandCenter/freightWorkflow.ts`
- Modify: `src/commandCenter/freightWorkflow.test.ts`
- Modify: `src/components/EquipmentBoard.tsx`
- Modify: `src/components/FreightBoard.tsx`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/UniversalModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test**

Add test:

```ts
import { createEquipmentWorkOrderFromIssue } from "./freightWorkflow";

it("turns a reported vehicle issue into an equipment work order", () => {
  const workOrder = createEquipmentWorkOrderFromIssue({
    assetId: "equipment-semi-1",
    assetName: "Semi 1",
    assetType: "Truck",
    severity: "High",
    description: "Brake warning light came on",
    reportedBy: "Alex Bueno",
    reportedAt: "2026-06-01T11:00:00.000Z",
  });

  assert.equal(workOrder.workOrderType, "equipment");
  assert.equal(workOrder.division, "Maintenance / Equipment");
  assert.equal(workOrder.equipmentIds?.[0], "equipment-semi-1");
  assert.equal(workOrder.priority, "High");
  assert.match(workOrder.notes || "", /Brake warning light/);
});
```

- [ ] **Step 2: Run RED**

Run `freightWorkflow.test.ts`. Expected: FAIL because helper is missing.

- [ ] **Step 3: Implement helper**

Create a `WorkOrderRecord` from an issue report. Use `workOrderType: 'equipment'`, `status: 'Ready'`, `division: 'Maintenance / Equipment'`, and link `equipmentIds`/`equipmentNames`.

- [ ] **Step 4: Wire UI**

Add `Report Issue` from Freight vehicle cards and Equipment cards. Save the issue by updating the equipment status to `Needs Service` or `Down` for critical issues and inserting the generated work order.

- [ ] **Step 5: Run targeted tests**

Run helper and UI tests. Expected: PASS.

## Task 5: Full Verification And Deployment

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\aiStudioDeployment.test.ts src\authAccess.test.ts src\firestoreSync.test.ts src\components\ClientsBoard.test.tsx src\components\WorkOrdersUi.test.tsx src\commandCenter\personnel.test.ts src\commandCenter\dataModel.test.ts src\commandCenter\dashboard.test.ts src\commandCenter\audit.test.ts src\commandCenter\importWorkflow.test.ts src\commandCenter\relationships.test.ts src\commandCenter\relocationInstallation.test.ts src\commandCenter\syncDraft.test.ts src\commandCenter\sheetImport.test.ts src\treeRelocationMap.test.ts src\commandCenter\workbookProjectFlow.test.ts src\commandCenter\equipmentFreight.test.ts src\commandCenter\freightWorkflow.test.ts
```

Expected: PASS with no failures.

- [ ] **Step 2: Type-check**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\typescript\bin\tsc' --noEmit
```

Expected: exit code `0`.

- [ ] **Step 3: Build**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\vite\bin\vite.js' build
```

Expected: exit code `0`.

- [ ] **Step 4: Browser preview**

Start Vite preview on an open port and verify the sign-in screen loads locally. If authenticated live browser access is available, inspect Freight and Equipment pages for the new controls and console errors.

- [ ] **Step 5: Deploy**

Run:

```powershell
$env:CLOUDSDK_PYTHON='C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$gcloud='C:\Users\jerem\AppData\Local\GoogleCloudSdkPortable\google-cloud-sdk\bin\gcloud.cmd'
& $gcloud run deploy jd-thornton-nurseries-command-center --project jdt-command-board --region us-west1 --source . --no-default-url --quiet
```

Expected: new Cloud Run revision serving 100% of traffic.

---

## Self-Review

- Spec coverage: The plan covers vehicle actions, freight stop workflow, e-POD capture, maintenance issue work orders, and keeps driver mobile mode out of scope.
- Placeholder scan: No `TBD`, `TODO`, or "implement later" placeholders remain.
- Type consistency: New helpers use existing `EquipmentRecord`, `LoadRecord`, and `WorkOrderRecord` rather than separate FleetFlow collections.
