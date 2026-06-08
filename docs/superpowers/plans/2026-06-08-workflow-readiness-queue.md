# Workflow Readiness Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-readiness queue that tells Jennifer, Regina, and Jeremy which records are missing required workflow fields before dispatch, closeout, reporting, or import trust.

**Architecture:** Extend `operatingIntelligence` with a reusable `buildWorkflowReadinessQueue` helper. Feed the queue into `DashboardSummary`, Command Board, and Reports so readiness warnings share one definition and appear in the existing operating surfaces. Keep this read-only: no Firebase writes, migrations, or Cloud changes until verification.

**Tech Stack:** React 19, TypeScript, Node test runner, server-rendered component tests, existing `commandCenter` helpers.

**Execution Status:** Implemented on `codex/workflow-readiness-queue`. Fresh verification on 2026-06-08 passed:
- Targeted readiness suite: 48 tests, 48 pass, 0 fail.
- Full package test list through bundled Node: 224 tests, 224 pass, 0 fail.
- `git diff --check`: no whitespace errors.

---

### Task 1: Add Workflow Readiness Helper

**Files:**
- Modify: `src/commandCenter/operatingIntelligence.ts`
- Modify test: `src/commandCenter/operatingIntelligence.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test named `builds workflow readiness issues by dispatch and closeout stage`. It should create:
- project missing location
- work order missing crew and schedule
- freight load missing driver/truck/stops
- equipment record marked down without location/service status
- field update marked complete without related record context
- tree record missing project/status

Assert that `buildWorkflowReadinessQueue` returns readable workflow names, stage labels, missing fields, and recommended actions.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\operatingIntelligence.test.ts
```

Expected: FAIL because `buildWorkflowReadinessQueue` is not exported.

- [ ] **Step 3: Implement helper**

Add:
- `WorkflowReadinessStage = "Save" | "Dispatch" | "Closeout" | "Review"`
- `WorkflowReadinessIssue`
- `buildWorkflowReadinessQueue(input, limit = 12)`

Rules:
- Projects need client, project name, division/status, and main location.
- Work orders need project context, task/type, schedule date/range, crew lead or assigned crew, and location/origin/destination.
- Freight moves need project/job context when available, driver, truck, date, and at least one route stop or origin/delivery pair.
- Equipment marked down/repair/maintenance needs equipment identity, location, and service status.
- Field updates need related record context, update type/status, crew/user, and notes or location detail when closeout/review is needed.
- Project trees need project context, tree id/tag/type, relocation status/current status, and source/destination pin when status indicates movement readiness.
- Nursery inventory needs tree/species name, farm/location/zone, and quantity for batch records.

- [ ] **Step 4: Verify test passes**

Run the same targeted test command.

### Task 2: Add Queue To Dashboard Summary

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify test: `src/commandCenter/dashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Add a dashboard test that passes an incomplete freight load and asserts `summary.workflowReadinessQueue` includes `Freight Move`, `Dispatch`, and missing `Driver`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\dashboard.test.ts
```

Expected: FAIL because `workflowReadinessQueue` is not on `DashboardSummary`.

- [ ] **Step 3: Implement dashboard wiring**

Import `buildWorkflowReadinessQueue`, add `workflowReadinessQueue` to `DashboardSummary`, compute it from the same intelligence input, and include it in the returned summary.

- [ ] **Step 4: Verify targeted dashboard test passes**

Run the same command.

### Task 3: Surface Readiness On Command Board

**Files:**
- Modify: `src/App.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [ ] **Step 1: Write the failing render test**

Extend the existing Command Board test to assert it renders:
- `Workflow Readiness`
- incomplete record title
- missing field labels
- recommended action

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the panel is not rendered.

- [ ] **Step 3: Implement UI**

Add a compact `Workflow Readiness` panel near `Data Quality Queue`. Items should show workflow, stage, title, missing fields, and recommended action. Clicking should open the drawer when possible or route to the target tab.

- [ ] **Step 4: Verify render test passes**

Run the same command.

### Task 4: Surface Readiness In Reports

**Files:**
- Modify: `src/components/ReportsBoard.tsx`
- Modify test: `src/components/ReportsBoard.test.tsx`

- [ ] **Step 1: Write the failing render test**

Extend the Reports test so incomplete records render under `Workflow Readiness`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\ReportsBoard.test.tsx
```

Expected: FAIL because Reports does not show workflow readiness yet.

- [ ] **Step 3: Implement report panel**

Use `buildWorkflowReadinessQueue` in Reports and render the top six issues under Data Readiness.

- [ ] **Step 4: Verify targeted test passes**

Run the same command.

### Task 5: Final Verification

**Files:**
- No code changes.

- [ ] **Step 1: Run targeted test set**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\operatingIntelligence.test.ts src\commandCenter\dashboard.test.ts src\components\WorkOrdersUi.test.tsx src\components\ReportsBoard.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test list**

Run the package file list through bundled Node, matching the previous verified path:

```powershell
$script = (Get-Content -Path package.json -Raw | ConvertFrom-Json).scripts.test
$files = ($script -replace '^node --test --import tsx\s*', '').Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx @files
```

Expected: PASS.

- [ ] **Step 3: Check worktree scope**

Run:

```powershell
& 'C:\Program Files\Git\bin\git.exe' status --short
```

Expected: only intended source/test/plan files changed.
