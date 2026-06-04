# Client Project Job Relationships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable Client, Project, and Job relationships to the current JDT Command Center app without wiping existing data.

**Architecture:** Add pure relationship helpers first, then wire them into save/import flows and board displays. Preserve text fallback matching during migration so existing Firestore records continue to render.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Vite, Node test runner with `tsx`.

---

### Task 1: Relationship Helpers

**Files:**
- Create: `src/commandCenter/relationships.ts`
- Create: `src/commandCenter/relationships.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create tests that assert:

```ts
assert.equal(clientIdFromName("McArthur Golf Club"), "client-mcarthur-golf-club");
assert.equal(projectIdFromName("McArthur Golf Club", "Hole 3 Install"), "project-mcarthur-golf-club-hole-3-install");
assert.deepEqual(normalizeProjectRelationship({ title: "Hole 3 Install", client: "McArthur Golf Club" }), {
  clientId: "client-mcarthur-golf-club",
  clientName: "McArthur Golf Club",
  projectId: "project-mcarthur-golf-club-hole-3-install",
  projectName: "Hole 3 Install",
});
```

- [ ] **Step 2: Verify test fails**

Run:

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src/commandCenter/relationships.test.ts
```

Expected: module not found.

- [ ] **Step 3: Implement helper module**

Implement `slugifyRelationshipPart`, `clientIdFromName`, `projectIdFromName`, `jobIdFromName`, `normalizeProjectRelationship`, and `sameClient`.

- [ ] **Step 4: Add test to `package.json` script**

Add `src/commandCenter/relationships.test.ts` to the existing `test` script.

- [ ] **Step 5: Verify**

Run focused test and full test suite.

### Task 2: Record Types And Collections

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/commandCenter/dataModel.ts`
- Modify: `src/commandCenter/dataModel.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing data model test**

Assert that `projects` exists in `appCollections`, belongs to the `projects` reset group, and is included when clearing all data.

- [ ] **Step 2: Add `ProjectRecord` and relationship fields**

Add shared optional relationship fields to `CommandRecord`:

```ts
clientId?: string;
clientName?: string;
projectId?: string;
projectName?: string;
jobId?: string;
jobName?: string;
```

Add `ProjectRecord` with client, division, location, status, date, crew, and PM fields.

- [ ] **Step 3: Wire `projects` state**

Add `useFirestoreSyncState<ProjectRecord>('projects', [], !!user)`, include projects in clear/import collections, pass projects into boards that need relationship awareness, and keep existing `jobs` behavior.

- [ ] **Step 4: Verify**

Run data model tests, full tests, TypeScript.

### Task 3: Save And Import Relationship Stamping

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/commandCenter/sheetImport.ts`
- Modify: `src/commandCenter/sheetImport.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that schedule import rows get `clientId`, `projectId`, and `jobId`, and relocation rows get `projectId` and `jobId`.

- [ ] **Step 2: Stamp form saves**

Before saving `job` or `project`, enrich the record with relationship fields from title/client/project names.

- [ ] **Step 3: Enrich schedule imports**

Schedule row mapping should add:

```ts
clientId: clientIdFromName(clientCompany)
clientName: clientCompany
projectId: projectIdFromName(clientCompany, jobScheduleId || task)
projectName: jobScheduleId || task
jobId: jobIdFromName(projectName, task)
jobName: task
```

- [ ] **Step 4: Enrich relocation imports**

Relocation row mapping should add relationship fields from `JOB ID`.

- [ ] **Step 5: Verify**

Run sheet import tests and full verification.

### Task 4: Client Card Relationship Display

**Files:**
- Modify: `src/components/ClientsBoard.tsx`
- Modify: `src/components/ClientsBoard.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing render test**

Render one client with linked projects/jobs and assert the card includes `1 project` and `1 job`.

- [ ] **Step 2: Add props and matching**

Add `projects` and `jobs` props to `ClientsBoard`. Count linked records by `clientId` first, then by text fallback.

- [ ] **Step 3: Pass data from App**

Pass `projects={projects}` and `jobs={jobs}` to `ClientsBoard`.

- [ ] **Step 4: Verify**

Run ClientsBoard test, full tests, TypeScript, and production build.

### Task 5: Browser And Deployment Verification

**Files:**
- Modify only if verification exposes a bug.

- [ ] **Step 1: Build production assets**

Run:

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\vite\bin\vite.js' build
```

- [ ] **Step 2: Browser-check local app**

Open the local preview, check Clients, Data Sync, and Relocation & Installation.

- [ ] **Step 3: Deploy to Cloud Run**

Deploy to `jd-thornton-nurseries-command-center` in `jdt-command-board/us-west1` with `--no-default-url`.

- [ ] **Step 4: Verify live domain**

Confirm `https://app.jdtcommandcenter.com/` returns the new bundle, root app shell is `Cache-Control: no-store`, and the Clients page does not blank after saving a client.
