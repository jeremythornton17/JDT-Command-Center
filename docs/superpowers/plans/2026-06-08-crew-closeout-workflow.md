# Crew Closeout Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first daily closeout layer so crew leaders and drivers can report completed work, tree/material tags, GPS/location notes, issues, and tomorrow notes from Crew View.

**Architecture:** Create a focused `fieldCloseout` helper that turns assigned jobs, work orders, and freight loads into closeout prompts and builds structured `fieldUpdates` payloads. Reuse that helper inside `CrewViewBoard` so UI behavior and operating rules stay aligned.

**Tech Stack:** React 19, TypeScript, Node test runner, server-rendered component tests, existing Firestore-backed `fieldUpdates`.

**Execution Status:** Implemented on `codex/crew-closeout-workflow`. Fresh verification on 2026-06-08 passed:
- Targeted closeout suite: 33 tests, 33 pass, 0 fail.
- Full package test list through bundled Node: 226 tests, 226 pass, 0 fail.

---

### Task 1: Add Closeout Helper

**Files:**
- Create: `src/commandCenter/fieldCloseout.ts`
- Create test: `src/commandCenter/fieldCloseout.test.ts`

- [ ] **Step 1: Write failing helper tests**

Add tests for:
- prompt generation from a crew member's assigned freight move and work order
- existing daily closeout detection by `relatedRecordId`
- closeout payload creation with work completed, tree/material tags, GPS/location note, issue summary, tomorrow plan, and admin-review routing

- [ ] **Step 2: Run helper test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts
```

Expected: FAIL because `fieldCloseout.ts` does not exist.

- [ ] **Step 3: Implement helper**

Implement:
- `recordMatchesCrew`
- `buildCrewCloseoutPrompts`
- `buildDailyCloseoutUpdate`

The prompt should show assignment type, schedule, location, latest status, and whether a closeout has been submitted.

- [ ] **Step 4: Verify helper test passes**

Run the same helper test command.

### Task 2: Wire Closeout Into Crew View

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/components/CrewViewBoard.tsx`
- Modify test: `src/components/WorkOrdersUi.test.tsx`

- [ ] **Step 1: Write failing render test**

Extend the Crew View test to assert it renders:
- `Daily Closeout`
- `Work Completed`
- `Tree Tags / Materials`
- `GPS / Location Note`
- `Issues / Delays`
- `Tomorrow Plan`
- `Submit Closeout`

- [ ] **Step 2: Run Crew View test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because the closeout fields are not rendered.

- [ ] **Step 3: Implement UI wiring**

Add structured closeout state to `CrewViewBoard`, render the closeout fields near the existing notes/status controls, and route `Submit Closeout` through `buildDailyCloseoutUpdate`.

- [ ] **Step 4: Verify Crew View test passes**

Run the same Crew View test command.

### Task 3: Final Verification

**Files:**
- No code changes.

- [ ] **Step 1: Run targeted closeout tests**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts src\components\WorkOrdersUi.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full package test list**

Run:

```powershell
$script = (Get-Content -Path package.json -Raw | ConvertFrom-Json).scripts.test
$files = ($script -replace '^node --test --import tsx\s*', '').Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx @files
```

Expected: PASS.

- [ ] **Step 3: Check worktree scope**

Run:

```powershell
& 'C:\Program Files\Git\cmd\git.exe' diff --check
& 'C:\Program Files\Git\cmd\git.exe' status -sb
```

Expected: no whitespace errors and only closeout workflow files changed.
