# Admin Closeout Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Jennifer, Regina, Jeremy, Buck, and Max a Command Board queue for submitted crew/driver closeouts that need office review, proof, follow-up, or issue resolution.

**Architecture:** Add a reusable closeout review queue builder to `fieldCloseout`, feed it into `DashboardSummary`, and render it on the Command Board. Keep the queue read-only and connected to the existing field update drawer.

**Tech Stack:** React 19, TypeScript, Node test runner, existing `fieldUpdates` and dashboard summary.

---

### Task 1: Add Closeout Review Queue Helper

**Files:**
- Modify: `src/commandCenter/fieldCloseout.ts`
- Modify test: `src/commandCenter/fieldCloseout.test.ts`

- [x] **Step 1: Write failing helper test**

Assert daily closeouts are classified as `Needs Review`, `Needs Proof`, or `Ready for Review`, sorted with issues and missing proof first.

- [x] **Step 2: Run helper test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts
```

Expected: FAIL because the review queue is not exported yet.

- [x] **Step 3: Implement helper**

Add `buildFieldCloseoutReviewQueue(fieldUpdates, limit = 8)` with review severity, proof count, title, crew, project, and recommended action.

- [x] **Step 4: Verify helper test passes**

Run the same helper test command.

### Task 2: Wire Queue Into Dashboard

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify test: `src/commandCenter/dashboard.test.ts`

- [x] **Step 1: Write failing dashboard test**

Assert `buildDashboardSummary({ fieldUpdates })` returns a `fieldCloseoutReviewQueue` item for a closeout missing proof.

- [x] **Step 2: Run dashboard test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\dashboard.test.ts
```

Expected: FAIL because `fieldCloseoutReviewQueue` is missing.

- [x] **Step 3: Implement dashboard wiring**

Import the helper, add the queue to `DashboardSummary`, and compute it from `fieldUpdates`.

- [x] **Step 4: Verify dashboard test passes**

Run the same dashboard test command.

### Task 3: Render Queue On Command Board

**Files:**
- Modify: `src/App.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [x] **Step 1: Write failing render test**

Assert the Command Board renders `Field Closeout Review`, the closeout title, proof count, and recommended action.

- [x] **Step 2: Run UI test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the panel is not rendered.

- [x] **Step 3: Implement Command Board panel**

Add a compact closeout review panel that routes to the field update drawer.

- [x] **Step 4: Verify UI test passes**

Run the same UI test command.

### Task 4: Final Verification

**Files:**
- No code changes.

- [x] **Step 1: Run targeted tests**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts src\commandCenter\dashboard.test.ts src\components\WorkOrdersUi.test.tsx
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

Expected: no whitespace errors and only closeout review files changed.

**Verification complete:** Targeted closeout/dashboard/UI tests passed, and the full package test list passed with 230 tests.
