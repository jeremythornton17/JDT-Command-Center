# Field Proof Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let field closeouts and operating records carry structured photo/document proof links so admin review can see what evidence backs a crew update.

**Architecture:** Extend the closeout helper with proof-link parsing and structured attachment metadata on `fieldUpdates`. Surface those proof links in Crew View and project field-update drawers, and expand document metadata/categories for compliance and field proof without changing storage providers yet.

**Tech Stack:** React 19, TypeScript, Node test runner, server-rendered component tests, existing `fieldUpdates` and `documents` collections.

**Execution Status:** Implemented on `codex/field-proof-attachments`. Fresh verification on 2026-06-08 passed:
- Targeted proof tests: `fieldCloseout`, `WorkOrdersUi`, and `EntityForms` passed.
- Full package test list through bundled Node: 228 tests, 228 pass, 0 fail.

---

### Task 1: Add Field Proof Helper Behavior

**Files:**
- Modify: `src/commandCenter/fieldCloseout.ts`
- Modify test: `src/commandCenter/fieldCloseout.test.ts`
- Modify: `src/commandCenter/records.ts`

- [ ] **Step 1: Write failing tests**

Extend closeout tests to assert proof URLs are parsed into `proofLinks`, given stable labels, and included in closeout notes.

- [ ] **Step 2: Run helper test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts
```

Expected: FAIL because proof links are not parsed yet.

- [ ] **Step 3: Implement proof metadata**

Add optional `proofAttachmentText`, `proofLinks`, and `proofDocumentIds` fields to `FieldUpdateRecord`. Parse URLs from pasted Drive/Maps/photo/BOL text into `proofLinks`.

- [ ] **Step 4: Verify helper test passes**

Run the same helper test command.

### Task 2: Surface Proof Links In UI

**Files:**
- Modify: `src/components/CrewViewBoard.tsx`
- Modify: `src/components/CommandDrawer.tsx`
- Modify: `src/components/WorkOrdersUi.test.tsx`

- [ ] **Step 1: Write failing render assertions**

Extend tests to assert Crew View renders `Proof Links / Photos` and project field updates render `Proof Attachments` with a closeout proof link.

- [ ] **Step 2: Run UI test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\WorkOrdersUi.test.tsx
```

Expected: FAIL because proof UI is not rendered.

- [ ] **Step 3: Implement UI rendering**

Add proof textarea to Crew View and render proof links in the latest update cards and related field update drawer cards.

- [ ] **Step 4: Verify UI test passes**

Run the same UI test command.

### Task 3: Expand Document Metadata For Proof Records

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/DocumentsBoard.tsx`
- Modify test: `src/components/EntityForms.test.tsx`

- [ ] **Step 1: Write failing form assertions**

Assert document forms expose proof/compliance categories and relationship fields.

- [ ] **Step 2: Run form test and verify failure**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\components\EntityForms.test.tsx
```

Expected: FAIL because those metadata fields are not present.

- [ ] **Step 3: Implement document metadata**

Add document fields for related entity type/id/title, uploaded by/date, expiration, file provider, file type, and review status. Expand categories for closeout proof, field photo, driver license, medical card, registration, insurance, BOL, POD.

- [ ] **Step 4: Verify form test passes**

Run the same form test command.

### Task 4: Final Verification

**Files:**
- No code changes.

- [ ] **Step 1: Run targeted proof tests**

Run:

```powershell
& 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src\commandCenter\fieldCloseout.test.ts src\components\WorkOrdersUi.test.tsx src\components\EntityForms.test.tsx
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

Expected: no whitespace errors and only proof attachment files changed.
