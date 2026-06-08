# Resource Conflict Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface double-booked crews, drivers, trucks, trailers, and equipment on the Command Board before daily or weekly schedules are sent out.

**Architecture:** Reuse the existing operating calendar conflict engine and add a small dashboard-facing queue. Render the queue beside the other Command Board review panels and route users into Calendar for detailed planning.

**Tech Stack:** React 19, TypeScript, Node test runner, existing `calendar` helpers, existing dashboard summary.

---

### Task 1: Wire Calendar Conflicts Into Dashboard

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify test: `src/commandCenter/dashboard.test.ts`

- [x] **Step 1: Write failing dashboard test**

Assert `buildDashboardSummary({ loads, workOrders, todayIso })` returns a `resourceConflictQueue` when the same driver or truck is assigned to overlapping dated work.

- [x] **Step 2: Run dashboard test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\dashboard.test.ts
```

Expected: FAIL because `resourceConflictQueue` is missing.

- [x] **Step 3: Implement dashboard wiring**

Import `buildOperatingCalendar`, add `resourceConflictQueue` to `DashboardSummary`, and compute it from the same inputs already available to the calendar planner.

- [x] **Step 4: Verify dashboard test passes**

Run the same dashboard test command.

### Task 2: Render Command Board Conflict Panel

**Files:**
- Modify: `src/App.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [x] **Step 1: Write failing render test**

Assert the Command Board renders `Resource Conflicts`, the conflicted resource label, and the overlapping assignments.

- [x] **Step 2: Run UI test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the panel is not rendered.

- [x] **Step 3: Implement conflict panel**

Render the top conflicts with date, resource kind, assignments, and a Calendar action.

- [x] **Step 4: Verify UI test passes**

Run the same UI test command.

### Task 3: Final Verification

**Files:**
- No code changes.

- [x] **Step 1: Run targeted tests**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\dashboard.test.ts src\components\WorkOrdersUi.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run full package test list**

Run:

```powershell
$script = (Get-Content -Path package.json -Raw | ConvertFrom-Json).scripts.test
$files = ($script -replace '^node --test --import tsx\s*', '').Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx @files
```

Expected: PASS.

- [x] **Step 3: Check worktree scope**

Run:

```powershell
& 'C:\Program Files\Git\cmd\git.exe' diff --check
& 'C:\Program Files\Git\cmd\git.exe' status -sb
```

Expected: no whitespace errors and only conflict board files changed.

**Verification complete:** Targeted dashboard/UI tests passed, and the full package test list passed with 233 tests.
