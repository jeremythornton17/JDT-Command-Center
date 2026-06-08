# Compliance Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface missing, expired, and expiring driver, CDL medical card, vehicle registration, and vehicle insurance documents on the Command Board.

**Architecture:** Extend the existing `compliance` helper with a reusable queue builder for crew and freight vehicles. Feed the queue into `DashboardSummary`, then render a compact Command Board review panel that opens the correct crew or equipment drawer.

**Tech Stack:** React 19, TypeScript, Node test runner, existing compliance helpers, existing dashboard summary.

---

### Task 1: Add Compliance Queue Helper

**Files:**
- Modify: `src/commandCenter/compliance.ts`
- Modify test: `src/commandCenter/compliance.test.ts`

- [x] **Step 1: Write failing helper test**

Assert `buildComplianceReviewQueue({ crew, equipment, todayIso })` returns missing/expired/expiring driver and vehicle documents, skips non-driving crew, skips non-freight equipment, ranks expired/missing before expiring soon, and routes records to `employee` or `equipment` drawers.

- [x] **Step 2: Run helper test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\compliance.test.ts
```

Expected: FAIL because the queue helper is not exported.

- [x] **Step 3: Implement helper**

Add `ComplianceReviewItem`, `buildComplianceReviewQueue`, and small ranking/label helpers in `src/commandCenter/compliance.ts`.

- [x] **Step 4: Verify helper test passes**

Run the same helper test command.

### Task 2: Wire Queue Into Dashboard

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify test: `src/commandCenter/dashboard.test.ts`

- [x] **Step 1: Write failing dashboard test**

Assert `buildDashboardSummary({ crew, equipment, todayIso })` exposes a `complianceReviewQueue` with driver and vehicle issues.

- [x] **Step 2: Run dashboard test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\dashboard.test.ts
```

Expected: FAIL because `complianceReviewQueue` is missing.

- [x] **Step 3: Implement dashboard wiring**

Import the helper, add the queue to `DashboardSummary`, and compute it from `crew`, `equipment`, and `todayIso`.

- [x] **Step 4: Verify dashboard test passes**

Run the same dashboard test command.

### Task 3: Render Command Board Panel

**Files:**
- Modify: `src/App.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [x] **Step 1: Write failing render test**

Assert the Command Board renders `Compliance Review`, a driver compliance issue, a vehicle compliance issue, and the recommended action.

- [x] **Step 2: Run UI test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the panel is not rendered.

- [x] **Step 3: Implement Command Board panel**

Render the queue beside the other review panels and route each item to its crew or equipment drawer.

- [x] **Step 4: Verify UI test passes**

Run the same UI test command.

### Task 4: Final Verification

**Files:**
- No code changes.

- [x] **Step 1: Run targeted tests**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\compliance.test.ts src\commandCenter\dashboard.test.ts src\components\WorkOrdersUi.test.tsx
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

Expected: no whitespace errors and only compliance queue files changed.

**Verification complete:** Targeted compliance/dashboard/UI tests passed, and the full package test list passed with 232 tests.
