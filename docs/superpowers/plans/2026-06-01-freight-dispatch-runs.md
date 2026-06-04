# Freight Dispatch Runs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build multi-step freight dispatch runs so one driver/truck assignment can contain ordered hook, drop, load, unload, spot, hold, and delivery steps.

**Architecture:** Extend existing `loads` records with a `routeSteps` array while preserving the existing `stops` model. Add focused helper functions in `src/commandCenter/freightWorkflow.ts` for parsing driver instructions, completing steps, and applying asset location/load-state updates. Render the run as a numbered timeline inside existing Freight cards and use existing modal/save plumbing for creation and step completion.

**Tech Stack:** React 19, TypeScript, Firestore-backed `loads`/`equipment` collections, Node test runner with `tsx`, Vite.

---

### Task 1: Route Step Data And Helper Tests

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/commandCenter/freightWorkflow.ts`
- Test: `src/commandCenter/freightWorkflow.test.ts`

- [ ] **Step 1: Write failing helper tests**

Add tests that import `parseFreightRouteSteps`, `completeFreightRouteStep`, and `applyCompletedRouteStepToEquipment`. Cover Christian's run with black lowboy, Komatsu 500-1, John Deere 744, dropdeck, 10 Acre Farm, Main Office, and McArthur Golf Course.

- [ ] **Step 2: Run helper tests and confirm red**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\freightWorkflow.test.ts
```

Expected: fail because the new helper exports do not exist.

- [ ] **Step 3: Add route step types**

Add `FreightRouteStep` fields to `LoadRecord`: `routeSteps?: Array<{ id, sequence, actionType, label, status, trailerName, truckName, equipmentName, origin, destination, plannedStart, plannedEnd, actualStart, actualEnd, notes, holdUntil, requiresPod, completed }>` and `stepPlanText?: string`.

- [ ] **Step 4: Implement helper functions**

Implement line-based parsing from `stepPlanText`, step completion with freight revision/event history, and equipment/trailer updates for completed route steps.

- [ ] **Step 5: Run helper tests and confirm green**

Run the same helper test command. Expected: all `freightWorkflow` tests pass.

### Task 2: Creation And Completion Form Wiring

**Files:**
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/UniversalModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a route step text field to freight creation**

Add a multiline `stepPlanText` field to the `load` fieldset with a clear label for one step per line.

- [ ] **Step 2: Add a step completion modal type**

Add `complete_freight_route_step` modal config and a `freightRouteStep` fieldset with `routeStepId`, `routeStepStatus`, `actualStart`, `actualEnd`, and `notes`.

- [ ] **Step 3: Parse route steps when saving loads**

In the `load`, `freight`, `create_move`, `set_freight_status`, and `complete` save branch, call an `enrichLoadRecord` helper before upserting.

- [ ] **Step 4: Complete route steps and update equipment**

Add an `onSaveRecord` branch for `complete_freight_route_step` that updates the target load via `completeFreightRouteStep` and updates matching trucks/trailers/equipment with `applyCompletedRouteStepToEquipment`.

### Task 3: Freight Timeline UI

**Files:**
- Modify: `src/components/FreightBoard.tsx`
- Test: `src/components/WorkOrdersUi.test.tsx`

- [ ] **Step 1: Write failing UI test**

Add a render test with a dispatch run assigned to Christian Crespo and Semi #1. Assert the card shows `Dispatch Run Steps`, `Hook Trailer`, `Black Lowboy`, `Komatsu 500-1`, `25 Acre Farm`, `Dropdeck`, `McArthur Golf Course`, and `Complete Step`.

- [ ] **Step 2: Run UI test and confirm red**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: fail because the Freight card does not render route steps yet.

- [ ] **Step 3: Render route steps timeline**

Add a numbered route-step timeline below freight route stops. Include step type, status, origin/destination, truck/trailer/equipment chips, notes, and a `Complete Step` button that opens `complete_freight_route_step`.

- [ ] **Step 4: Run UI test and confirm green**

Run the same UI test command. Expected: all `WorkOrdersUi` tests pass.

### Task 4: Full Verification And Deploy

**Files:**
- Modify: `package.json` if any new test file is added.

- [ ] **Step 1: Typecheck**

Run TypeScript with bundled Node:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\typescript\bin\tsc' --noEmit
```

- [ ] **Step 2: Full test suite**

Run the package test command manually with bundled Node. Expected: all tests pass.

- [ ] **Step 3: Production build**

Run Vite build with bundled Node. Expected: build succeeds; existing bundle-size warning is acceptable.

- [ ] **Step 4: Deploy to Cloud Run**

Run:

```powershell
$env:CLOUDSDK_PYTHON='C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$gcloud='C:\Users\jerem\AppData\Local\GoogleCloudSdkPortable\google-cloud-sdk\bin\gcloud.cmd'
& $gcloud run deploy jd-thornton-nurseries-command-center --project jdt-command-board --region us-west1 --source . --no-default-url --quiet
```

- [ ] **Step 5: Live domain smoke check**

Run:

```powershell
$response = Invoke-WebRequest -UseBasicParsing 'https://app.jdtcommandcenter.com/' -Headers @{ 'Cache-Control'='no-cache' } -TimeoutSec 30
"Status=$($response.StatusCode)"
($response.Content -match 'assets/index-')
```

Expected: `Status=200` and `True`.

---

## Self-Review

- Spec coverage: dispatch runs, ordered route steps, hook/drop/load/unload/spot/hold/deliver actions, truck/trailer/equipment updates, and Freight card timeline are covered.
- Placeholder scan: no placeholders remain; every task has exact files and commands.
- Type consistency: helper names and record fields are consistent across tasks.
