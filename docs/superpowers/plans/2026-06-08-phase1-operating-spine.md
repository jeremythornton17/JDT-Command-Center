# Phase 1 Operating Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the app's first production-hardening slice by surfacing relationship/data-quality issues on the Command Board and Reports, and by making work-order language clearer without changing production data.

**Architecture:** Add a reusable operating-intelligence helper that converts relationship and required-field problems into an actionable admin queue. Feed that queue into the dashboard and reports instead of adding another isolated screen. Keep implementation read-only from a data perspective: no migrations, no Firebase writes, no Cloud changes.

**Tech Stack:** React 19, TypeScript, Node test runner, server-side React render tests, existing `commandCenter` domain helpers.

---

### Task 1: Add Data Quality Action Queue Helper

**Files:**
- Modify: `src/commandCenter/operatingIntelligence.ts`
- Modify test: `src/commandCenter/operatingIntelligence.test.ts`

- [x] **Step 1: Write the failing test**

Add a test that calls `buildDataQualityActionQueue` with a mismatched Boca West client ID, a project missing a client, a work order missing a project, a tree missing a project, and an import batch with warnings. Assert that the queue returns actionable items in priority order.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/commandCenter/operatingIntelligence.test.ts`
Expected: FAIL because `buildDataQualityActionQueue` is not exported.

- [x] **Step 3: Implement helper**

Export `DataQualityActionItem` and `buildDataQualityActionQueue`. The helper should:
- include relationship mismatches from `findRelationshipIssues`
- flag projects missing client context
- flag work orders missing project context
- flag loads missing project/job context
- flag tree records missing project context
- flag documents missing related context
- flag import batches with warnings
- return sorted high-priority items first
- cap default output at 12 items

- [x] **Step 4: Verify test passes**

Run the same targeted test command.

### Task 2: Feed Data Quality Queue Into Dashboard Summary

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify test: `src/commandCenter/dashboard.test.ts`

- [x] **Step 1: Write the failing test**

Add a dashboard test that provides a Boca West client mismatch and asserts `summary.dataQualityQueue` contains a client relationship issue.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/commandCenter/dashboard.test.ts`
Expected: FAIL because `dataQualityQueue` is not on `DashboardSummary`.

- [x] **Step 3: Implement dashboard wiring**

Import `buildDataQualityActionQueue`, add `dataQualityQueue` to `DashboardSummary`, compute it from the same intelligence input, and include it in the returned summary.

- [x] **Step 4: Verify targeted dashboard test passes**

Run the same targeted test command.

### Task 3: Show Data Quality Queue On Command Board

**Files:**
- Modify: `src/App.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [x] **Step 1: Write the failing render test**

Render the `Dashboard` export or available board surface with a dashboard summary containing data quality issues. Assert that the rendered HTML includes `Data Quality Queue`, issue title, and recommended action.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/components/WorkOrdersUi.test.tsx`
Expected: FAIL because the dashboard does not render the new queue.

- [x] **Step 3: Implement UI**

Add a compact `Data Quality Queue` panel to the Command Board near Owner Review Queue. Items should show severity, title, detail, recommended action, and a button that routes to the target tab.

- [x] **Step 4: Verify render test passes**

Run the same targeted test command.

### Task 4: Add Data Quality Details To Reports

**Files:**
- Modify: `src/components/ReportsBoard.tsx`
- Create or modify test: `src/components/ReportsBoard.test.tsx`
- Modify: `package.json` test script if a new test file is created

- [x] **Step 1: Write the failing render test**

Render `ReportsBoard` with relationship issues and import warnings. Assert that `Data Quality Action Queue`, the issue title, and import warning appear.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/components/ReportsBoard.test.tsx`
Expected: FAIL because the Reports board does not render the action queue yet.

- [x] **Step 3: Implement report panel**

Import `buildDataQualityActionQueue`, build the queue from report props, and render top items in Data Readiness.

- [x] **Step 4: Verify targeted test passes**

Run the same targeted test command.

### Task 5: Terminology Cleanup For First Production Slice

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SyncBoard.tsx`
- Modify existing render tests as needed

- [x] **Step 1: Write failing assertions**

Assert that the Command Board quick action says `Create Project`, freight action says `Dispatch Freight Move`, and Data Sync labels include `Import / Backup`.

- [x] **Step 2: Run test to verify failures**

Run targeted render tests.

- [x] **Step 3: Implement copy changes**

Rename only UI copy. Do not change record types or persisted data.

- [x] **Step 4: Verify targeted tests pass**

Run targeted render tests.

### Task 6: Final Verification

**Files:**
- No code changes.

- [x] **Step 1: Run available targeted tests**

Run the targeted tests from Tasks 1 through 5. If package tooling is unavailable, record the exact command failure.

- [x] **Step 2: Check worktree scope**

Run: `git status --short`
Expected: audit report, plan file, and intentional source/test changes only.

- [x] **Step 3: Summarize**

Report what changed, what could not be verified because of local tooling, and what decisions Jeremy still needs to answer.
