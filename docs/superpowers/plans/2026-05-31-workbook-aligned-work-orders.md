# Workbook Aligned Work Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build workbook-aligned `workOrders` and `projectMaterialItems` layers so JDT Command Center assignments, project flow, material quantities, tree tasks, freight, equipment, and field updates line up with the `JDT Nurseries` Google Sheet template and supporting `Appsheet-Field Operating System` document.

**Architecture:** Add focused work-order and project-material child models that preserve the existing Client > Project > Job relationship fields and add workbook source metadata. Keep the first slice small: canonical types, workbook tab mapping, repeatable material items, save/import wiring, drawer visibility, and assignment actions from Crews and Relocation & Installation. Existing job, freight, tree, and crew records remain valid during migration.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Vite, Node test runner with `tsx`.

---

## File Structure

- Create `src/commandCenter/workbookProjectFlow.ts`: canonical workbook tab names, ID fields, work-order type mapping, and helpers to convert workbook source rows into app metadata.
- Create `src/commandCenter/workbookProjectFlow.test.ts`: proves the workbook tabs map to the right app purposes and work-order types.
- Modify `src/commandCenter/relationships.ts`: add `workOrderIdFromName` and `normalizeWorkOrderRelationship`.
- Modify `src/commandCenter/relationships.test.ts`: prove work-order IDs are stable and relationship fields survive normalization.
- Modify `src/commandCenter/records.ts`: add `WorkOrderRecord`, `ProjectMaterialItemRecord`, source reference types, and workbook-compatible project fields.
- Modify `src/commandCenter/dataModel.ts` and `src/commandCenter/dataModel.test.ts`: add `workOrders` to app collections, clear groups, import groups, and destructive reset behavior.
- Modify `src/App.tsx`: add Firestore sync state for `workOrders` and `projectMaterialItems`, pass them into boards/drawers/forms, and route `assign_work` / `work_order` / `project_material_item` saves to the new collections.
- Modify `src/components/CommandDrawer.tsx`: show related work orders and material items for job drawers, show work orders for employee drawers, keep client contacts separate from assignment display, and expose quick actions.
- Modify `src/components/CrewsBoard.tsx`: accept `workOrders`, show active assignments, and add `Assign Work`.
- Modify `src/components/EntityForms.tsx`: add work-order/assignment form fields that use real client, job, crew, load, tree, and equipment context.
- Modify `src/components/UniversalModal.tsx`: pass supporting lists into the form if not already forwarded.
- Modify `src/components/FreightBoard.tsx` and the inline `TrackerBoard` in `src/App.tsx`: show work-order context and allow assignment from Relocation & Installation.
- Modify `src/commandCenter/sheetImport.ts` and `src/commandCenter/sheetImport.test.ts`: add a `JDT Project Flow Workbook` import mapping skeleton for workbook headers, material items, and source metadata.
- Modify `package.json`: add new tests to the `test` script.

## Verification Commands

Use these commands from the repo root:

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src/commandCenter/workbookProjectFlow.test.ts src/commandCenter/relationships.test.ts src/commandCenter/dataModel.test.ts src/components/ClientsBoard.test.tsx src/commandCenter/sheetImport.test.ts
```

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src/aiStudioDeployment.test.ts src/authAccess.test.ts src/firestoreSync.test.ts src/components/ClientsBoard.test.tsx src/commandCenter/personnel.test.ts src/commandCenter/dataModel.test.ts src/commandCenter/dashboard.test.ts src/commandCenter/audit.test.ts src/commandCenter/importWorkflow.test.ts src/commandCenter/relationships.test.ts src/commandCenter/relocationInstallation.test.ts src/commandCenter/syncDraft.test.ts src/commandCenter/sheetImport.test.ts src/treeRelocationMap.test.ts src/commandCenter/workbookProjectFlow.test.ts
```

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\typescript\bin\tsc' --noEmit
```

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules\vite\bin\vite.js' build
```

---

### Task 1: Workbook Project Flow Mapping

**Files:**
- Create: `src/commandCenter/workbookProjectFlow.ts`
- Create: `src/commandCenter/workbookProjectFlow.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing mapping tests**

Create `src/commandCenter/workbookProjectFlow.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  jdtProjectFlowWorkbook,
  workbookTabForWorkOrderType,
  workOrderTypeForWorkbookTab,
  sourceRefFromWorkbookRow,
} from "./workbookProjectFlow";

test("JDT Project Flow Workbook exposes every canonical tab and ID field", () => {
  assert.equal(jdtProjectFlowWorkbook.title, "JDT Project Flow Workbook");
  assert.equal(jdtProjectFlowWorkbook.spreadsheetId, "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg");

  assert.equal(jdtProjectFlowWorkbook.tabs.Companies.primaryId, "Companies_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Projects.primaryId, "Projects_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Tree Assets"].primaryId, "Tree_Assets_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Tree Pruning"].primaryId, "Tree_Prune_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Move Readiness"].primaryId, "Move_Readiness_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs["Daily Field Updates"].primaryId, "Daily Field Updates_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.primaryId, "Project_Material_Items_ID");
  assert.equal(jdtProjectFlowWorkbook.tabs.Project_Material_Items.appPurpose, "project_material_items");
});

test("maps workbook operating tabs to work-order types", () => {
  assert.equal(workOrderTypeForWorkbookTab("Tree Pruning"), "tree_pruning");
  assert.equal(workOrderTypeForWorkbookTab("Treatment / Aftercare"), "treatment_aftercare");
  assert.equal(workOrderTypeForWorkbookTab("Move Readiness"), "move_readiness");
  assert.equal(workOrderTypeForWorkbookTab("Change Orders"), "change_order");
  assert.equal(workOrderTypeForWorkbookTab("Billing Milestones"), "billing_milestone");
  assert.equal(workOrderTypeForWorkbookTab("Daily Field Updates"), "daily_field_update");
  assert.equal(workbookTabForWorkOrderType("move_readiness"), "Move Readiness");
});

test("builds source references from workbook rows", () => {
  assert.deepEqual(sourceRefFromWorkbookRow("Tree Pruning", {
    Tree_Assets_ID: "tree-boca-001",
    Tree_Prune_ID: "prune-boca-001",
  }, 12), {
    sourceType: "google_sheet",
    spreadsheetId: "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg",
    spreadsheetName: "JDT Nurseries",
    sheetName: "Tree Pruning",
    rowNumber: 12,
    rowId: "prune-boca-001",
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src/commandCenter/workbookProjectFlow.test.ts
```

Expected: fail because `src/commandCenter/workbookProjectFlow.ts` does not exist.

- [ ] **Step 3: Implement the workbook mapping**

Create `src/commandCenter/workbookProjectFlow.ts`:

```ts
export type WorkbookWorkOrderType =
  | "tree_pruning"
  | "treatment_aftercare"
  | "move_readiness"
  | "change_order"
  | "billing_milestone"
  | "daily_field_update"
  | "freight"
  | "equipment"
  | "general_task";

export type WorkbookSourceRef = {
  sourceType: "google_sheet";
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  rowNumber?: number;
  rowId?: string;
};

export type WorkbookTabConfig = {
  sheetName: string;
  primaryId: string;
  appPurpose: string;
  workOrderType?: WorkbookWorkOrderType;
};

export const jdtProjectFlowWorkbook = {
  title: "JDT Project Flow Workbook",
  spreadsheetName: "JDT Nurseries",
  spreadsheetId: "1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg",
  tabs: {
    Users: { sheetName: "Users", primaryId: "User_ID", appPurpose: "users" },
    Companies: { sheetName: "Companies", primaryId: "Companies_ID", appPurpose: "clients" },
    Company: { sheetName: "Company", primaryId: "Contacts_ID", appPurpose: "contacts" },
    Projects: { sheetName: "Projects", primaryId: "Projects_ID", appPurpose: "projects" },
    "Project Areas": { sheetName: "Project Areas", primaryId: "Project_Area_ID", appPurpose: "project_areas" },
    "Project Statuses": { sheetName: "Project Statuses", primaryId: "Project_Status_ID", appPurpose: "project_statuses" },
    "Tree Assets": { sheetName: "Tree Assets", primaryId: "Tree_Assets_ID", appPurpose: "tree_assets" },
    "Tree Pruning": { sheetName: "Tree Pruning", primaryId: "Tree_Prune_ID", appPurpose: "work_orders", workOrderType: "tree_pruning" },
    "Treatment / Aftercare": { sheetName: "Treatment / Aftercare", primaryId: "Treatment_Aftercare Logs_ID", appPurpose: "work_orders", workOrderType: "treatment_aftercare" },
    "Tree Photos": { sheetName: "Tree Photos", primaryId: "Tree_Photos_ID", appPurpose: "tree_photos" },
    "Move Readiness": { sheetName: "Move Readiness", primaryId: "Move_Readiness_ID", appPurpose: "work_orders", workOrderType: "move_readiness" },
    "Change Orders": { sheetName: "Change Orders", primaryId: "Change_Orders_ID", appPurpose: "work_orders", workOrderType: "change_order" },
    "Billing Milestones": { sheetName: "Billing Milestones", primaryId: "Billing Milestones_ID", appPurpose: "work_orders", workOrderType: "billing_milestone" },
    "Daily Field Updates": { sheetName: "Daily Field Updates", primaryId: "Daily Field Updates_ID", appPurpose: "work_orders", workOrderType: "daily_field_update" },
    Project_Material_Items: { sheetName: "Project_Material_Items", primaryId: "Project_Material_Items_ID", appPurpose: "project_material_items" },
  } satisfies Record<string, WorkbookTabConfig>,
};

export function workOrderTypeForWorkbookTab(sheetName: string): WorkbookWorkOrderType {
  const tab = jdtProjectFlowWorkbook.tabs[sheetName as keyof typeof jdtProjectFlowWorkbook.tabs];
  return tab?.workOrderType || "general_task";
}

export function workbookTabForWorkOrderType(type: WorkbookWorkOrderType): string {
  const match = Object.values(jdtProjectFlowWorkbook.tabs).find((tab) => tab.workOrderType === type);
  return match?.sheetName || "Daily Field Updates";
}

export function sourceRefFromWorkbookRow(
  sheetName: string,
  row: Record<string, unknown>,
  rowNumber?: number,
): WorkbookSourceRef {
  const tab = jdtProjectFlowWorkbook.tabs[sheetName as keyof typeof jdtProjectFlowWorkbook.tabs];
  const rowId = tab ? clean(row[tab.primaryId]) : "";

  return {
    sourceType: "google_sheet",
    spreadsheetId: jdtProjectFlowWorkbook.spreadsheetId,
    spreadsheetName: jdtProjectFlowWorkbook.spreadsheetName,
    sheetName,
    ...(rowNumber ? { rowNumber } : {}),
    ...(rowId ? { rowId } : {}),
  };
}

function clean(value: unknown): string {
  return String(value || "").trim();
}
```

- [ ] **Step 4: Add the test to `package.json`**

Update the `test` script so it includes:

```json
"src/commandCenter/workbookProjectFlow.test.ts"
```

- [ ] **Step 5: Verify Task 1**

Run the focused workbook test. Expected: pass.

---

### Task 2: Work Order And Material Item Records

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/commandCenter/dataModel.ts`
- Modify: `src/commandCenter/dataModel.test.ts`

- [ ] **Step 1: Write the failing data model assertions**

In `src/commandCenter/dataModel.test.ts`, add assertions inside the existing canonical model tests:

```ts
assert.deepEqual(
  Object.keys(appCollections).sort(),
  [
    "alerts",
    "clients",
    "crews",
    "documents",
    "equipment",
    "importBatches",
    "inventoryItems",
    "jobs",
    "loads",
    "locations",
    "projectMaterialItems",
    "projects",
    "ranchOaks",
    "scheduleTasks",
    "species",
    "staff",
    "syncMappings",
    "syncSources",
    "treeRelocationRecords",
    "workOrders",
  ].sort(),
);
assert.equal(appCollections.workOrders.label, "Work Orders");
assert.equal(appCollections.workOrders.primaryBoard, "Command Board");
assert.equal(appCollections.workOrders.resetGroup, "projects");
assert.equal(appCollections.projectMaterialItems.label, "Project Material Items");
assert.equal(appCollections.projectMaterialItems.primaryBoard, "Nursery");
assert.equal(appCollections.projectMaterialItems.resetGroup, "projects");
assert.ok(collectionNamesForClear("all").includes("workOrders"));
assert.ok(collectionNamesForClear("all").includes("projectMaterialItems"));
assert.deepEqual(collectionNamesForClear("work_orders"), ["workOrders"]);
assert.deepEqual(collectionNamesForClear("project_material_items"), ["projectMaterialItems"]);
```

Run:

```powershell
$env:NODE_PATH='C:\Users\Public\Documents\Intuit\QuickBooks\Company Files\Company Apps\remix-jdt-ranch-oaks-mobile\node_modules'; & 'C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test --import tsx src/commandCenter/dataModel.test.ts
```

Expected: fail because `workOrders` and `projectMaterialItems` are not in the data model.

- [ ] **Step 2: Add `WorkOrderRecord`**

In `src/commandCenter/records.ts`, import the workbook source types and add:

```ts
import type { WorkbookSourceRef, WorkbookWorkOrderType } from "./workbookProjectFlow";
```

Then add after `ProjectRecord`:

```ts
export type WorkOrderStatus = "Draft" | "Ready" | "Scheduled" | "Active" | "Blocked" | "Complete" | "Cancelled";
export type WorkOrderPriority = "Low" | "Normal" | "High" | "Urgent" | "Critical";

export type WorkOrderRecord = CommandRecord & {
  workOrderType?: WorkbookWorkOrderType;
  sourceSheetName?: string;
  sourceRowId?: string;
  sourceRefs?: WorkbookSourceRef[];
  division?: string;
  taskType?: string;
  priority?: WorkOrderPriority | string;
  scheduledDate?: string;
  dueDate?: string;
  completedDate?: string;
  crewLeadId?: string;
  crewLeadName?: string;
  assignedCrewIds?: string[];
  assignedCrewNames?: string[];
  requiredSkills?: string[];
  equipmentIds?: string[];
  equipmentNames?: string[];
  loadIds?: string[];
  loadNames?: string[];
  treeIds?: string[];
  treeNames?: string[];
  inventoryItemIds?: string[];
  documentIds?: string[];
  documentNames?: string[];
  origin?: string;
  destination?: string;
  siteArea?: string;
  blockerReason?: string;
};
```

Add `ProjectMaterialItemRecord` after `WorkOrderRecord`:

```ts
export type ProjectMaterialItemRecord = CommandRecord & {
  projectMaterialItemsId?: string;
  companiesId?: string;
  projectsId?: string;
  projectId?: string;
  projectName?: string;
  holeNumberOrArea?: string;
  source?: "JD Thornton" | "Container Pines" | "McArthur Tree Nursery" | "Relocated Trees" | "Client Supplied" | "Other" | string;
  materialType?: string;
  sizeClass?: string;
  quantityRequired?: string | number;
  quantityInstalled?: string | number;
  unitPrice?: string | number;
  installStatus?: "Needed" | "Pulled" | "Loaded" | "Delivered" | "Installed" | "Rejected" | "Complete" | "On Hold" | string;
  photoIds?: string[];
  photoNames?: string[];
  sourceSheetName?: string;
  sourceRowId?: string;
  sourceRefs?: WorkbookSourceRef[];
};
```

Also add workbook-compatible optional fields to `ProjectRecord` and `JobRecord`:

```ts
companiesId?: string;
projectsId?: string;
projectAreaId?: string;
projectStatusId?: string;
hole?: string;
scheduled?: string | boolean;
completed?: string | boolean;
```

- [ ] **Step 3: Add `workOrders` to the data model**

In `src/commandCenter/dataModel.ts`, add:

```ts
workOrders: { label: "Work Orders", primaryBoard: "Command Board", resetGroup: "projects" },
projectMaterialItems: { label: "Project Material Items", primaryBoard: "Nursery", resetGroup: "projects" },
```

Add aliases:

```ts
work_orders: ["workOrders"],
assignments: ["workOrders"],
project_material_items: ["projectMaterialItems"],
materials: ["projectMaterialItems"],
```

Make sure the `all` collection list includes `workOrders` and `projectMaterialItems`, and the `projects` / `jobs` clear groups include both so resetting project data removes related assignments and material child records when intentionally clearing that group.

- [ ] **Step 4: Verify Task 2**

Run `src/commandCenter/dataModel.test.ts`. Expected: pass.

---

### Task 3: Work Order Relationship Helpers

**Files:**
- Modify: `src/commandCenter/relationships.ts`
- Modify: `src/commandCenter/relationships.test.ts`

- [ ] **Step 1: Write failing relationship tests**

Add to `src/commandCenter/relationships.test.ts`:

```ts
import { normalizeWorkOrderRelationship, workOrderIdFromName } from "./relationships";

test("builds stable work order ids under a job", () => {
  assert.equal(
    workOrderIdFromName("job-boca-west-relocation", "Root prune Hole 7"),
    "work-order-job-boca-west-relocation-root-prune-hole-7",
  );
});

test("normalizes a workbook-aligned work order without dropping labels", () => {
  assert.deepEqual(normalizeWorkOrderRelationship({
    clientName: "Boca West Country Club",
    projectName: "Boca West Relocation",
    jobName: "Relocation & Installation",
    title: "Root prune Hole 7",
  }), {
    clientId: "client-boca-west-country-club",
    clientName: "Boca West Country Club",
    projectId: "project-boca-west-country-club-boca-west-relocation",
    projectName: "Boca West Relocation",
    jobId: "job-boca-west-relocation-relocation-and-installation",
    jobName: "Relocation & Installation",
    id: "work-order-job-boca-west-relocation-relocation-and-installation-root-prune-hole-7",
    title: "Root prune Hole 7",
  });
});
```

Run the focused relationships test. Expected: fail because functions are missing.

- [ ] **Step 2: Implement helpers**

Add exports to `src/commandCenter/relationships.ts`:

```ts
export function workOrderIdFromName(jobIdOrName: unknown, workOrderName: unknown): string {
  const parts = [jobIdOrName, workOrderName].map(slugifyRelationshipPart).filter(Boolean);
  return parts.length ? `work-order-${parts.join("-")}` : "";
}

export function normalizeWorkOrderRelationship(record: RelationshipInput): RelationshipFields & { id?: string; title?: string } {
  const jobRelationship = normalizeJobRelationship(record);
  const title = cleanString(record.title) || cleanString(record.task) || cleanString(record.name) || cleanString(record.jobName);
  const jobAnchor = cleanString(jobRelationship.jobId) || cleanString(jobRelationship.jobName);

  return compactRelationshipFields({
    ...jobRelationship,
    id: cleanString(record.id) || workOrderIdFromName(jobAnchor, title),
    title,
  }) as RelationshipFields & { id?: string; title?: string };
}
```

If `compactRelationshipFields` and `cleanString` are private and already defined later in the same file, this can call them directly.

- [ ] **Step 3: Verify Task 3**

Run `src/commandCenter/relationships.test.ts`. Expected: pass.

---

### Task 4: Firestore State And Save Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/commandCenter/records.ts`
- Modify: `src/commandCenter/workbookProjectFlow.ts`

- [ ] **Step 1: Import work-order and material item types and helpers**

In `src/App.tsx`, extend imports:

```ts
import type { ProjectMaterialItemRecord, WorkOrderRecord } from "./commandCenter/records";
import { normalizeWorkOrderRelationship } from "./commandCenter/relationships";
import { sourceRefFromWorkbookRow, workbookTabForWorkOrderType } from "./commandCenter/workbookProjectFlow";
```

If `records.ts` is already imported as a grouped type import, add `ProjectMaterialItemRecord` and `WorkOrderRecord` to that list.

- [ ] **Step 2: Add Firestore sync state**

Near the existing `jobs` / `projects` state:

```ts
const [workOrders, setWorkOrders] = useFirestoreSyncState<WorkOrderRecord>("workOrders", [], !!user);
const [projectMaterialItems, setProjectMaterialItems] = useFirestoreSyncState<ProjectMaterialItemRecord>("projectMaterialItems", [], !!user);
```

- [ ] **Step 3: Add work orders and material items to import/clear collection wiring**

In `handleClearData`, add:

```ts
if (collections.has("workOrders")) setWorkOrders([]);
if (collections.has("projectMaterialItems")) setProjectMaterialItems([]);
```

In `currentImportCollections`, add:

```ts
workOrders,
projectMaterialItems,
```

In `applyImportedCollections`, add:

```ts
if (collections.workOrders) writes.push(setWorkOrders(collections.workOrders as WorkOrderRecord[]));
if (collections.projectMaterialItems) writes.push(setProjectMaterialItems(collections.projectMaterialItems as ProjectMaterialItemRecord[]));
```

- [ ] **Step 4: Add enrichment helpers**

Add near `enrichProjectLikeRecord`:

```ts
function enrichWorkOrderRecord(record: WorkOrderRecord): WorkOrderRecord {
  const relationship = normalizeWorkOrderRelationship(record);
  const workOrderType = record.workOrderType || "general_task";
  return {
    ...record,
    ...relationship,
    workOrderType,
    sourceSheetName: record.sourceSheetName || workbookTabForWorkOrderType(workOrderType),
  };
}

function enrichProjectMaterialItemRecord(record: ProjectMaterialItemRecord): ProjectMaterialItemRecord {
  const projectName = String(record.projectName || record.jobName || record.title || "").trim();
  const projectId = String(record.projectId || record.projectsId || "").trim();
  const projectMaterialItemsId = String(record.projectMaterialItemsId || record.sourceRowId || record.id || "").trim();

  return {
    ...record,
    id: record.id || projectMaterialItemsId || [projectId, projectName, record.holeNumberOrArea, record.materialType, record.sizeClass]
      .map((part) => String(part || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
      .filter(Boolean)
      .join("-"),
    projectId,
    projectName,
    projectMaterialItemsId,
    sourceSheetName: record.sourceSheetName || "Project_Material_Items",
    sourceRowId: record.sourceRowId || projectMaterialItemsId,
    sourceRefs: record.sourceRefs || [sourceRefFromWorkbookRow("Project_Material_Items", {
      Project_Material_Items_ID: projectMaterialItemsId,
    })],
  };
}
```

- [ ] **Step 5: Save work-order records**

In `onSaveRecord`, add a case before the default:

```ts
case "work_order":
case "workorder":
case "assign_work":
case "assign_crew":
  {
    const enrichedRecord = enrichWorkOrderRecord(recordData as WorkOrderRecord);
    setWorkOrders((prev) => upsertRecordWithAudit(
      prev,
      enrichedRecord,
      "work-order",
      user?.email,
      normalizedType,
      (item) => item.id === enrichedRecord.id || item.sourceRowId === enrichedRecord.sourceRowId,
    ));
  }
  break;
```

Remove `assign_crew` from the old job-history-only case so assignment saves create real work orders instead of only appending text history to a job.

Add a second case for material items:

```ts
case "project_material_item":
case "projectmaterialitem":
case "material_item":
  {
    const enrichedRecord = enrichProjectMaterialItemRecord(recordData as ProjectMaterialItemRecord);
    setProjectMaterialItems((prev) => upsertRecordWithAudit(
      prev,
      enrichedRecord,
      "project-material-item",
      user?.email,
      normalizedType,
      (item) => item.id === enrichedRecord.id || item.sourceRowId === enrichedRecord.sourceRowId,
    ));
  }
  break;
```

- [ ] **Step 6: Pass workOrders and projectMaterialItems into children**

Pass `workOrders={workOrders}` and `projectMaterialItems={projectMaterialItems}` into:

```tsx
<CrewsBoard ... />
<FreightBoard ... />
<CommandDrawer ... />
<UniversalModal ... />
```

For the inline `Dashboard` and `TrackerBoard`, pass it where needed:

```tsx
<TrackerBoard jobs={jobs} workOrders={workOrders} projectMaterialItems={projectMaterialItems} openDrawer={openDrawer} openModal={openModal} />
<Dashboard recentRecords={recentRecords} dashboardSummary={dashboardSummary} workOrders={workOrders} openModal={openModal} openDrawer={openDrawer} setActiveTab={setActiveTab} />
```

- [ ] **Step 7: Verify Task 4**

Run TypeScript. Expected: any missing prop types are exposed before UI work continues.

---

### Task 5: Crew Assignment UI

**Files:**
- Modify: `src/components/CrewsBoard.tsx`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/UniversalModal.tsx`

- [ ] **Step 1: Update CrewBoard props**

In `src/components/CrewsBoard.tsx`, update the component signature:

```ts
import type { CrewRecord, WorkOrderRecord } from "../commandCenter/records";

export default function CrewsBoard({
  crews,
  workOrders = [],
  openModal,
  openDrawer,
}: {
  crews: CrewRecord[];
  workOrders?: WorkOrderRecord[];
  openModal: (type: string, data?: any) => void;
  openDrawer: (type: string, id: string) => void;
}) {
```

- [ ] **Step 2: Add work-order matching helper**

Add above the component:

```ts
function workOrdersForMember(member: CrewRecord, workOrders: WorkOrderRecord[]) {
  const memberId = String(member.id || member.email || member.name || "").trim();
  const memberName = String(member.name || "").trim().toLowerCase();
  return workOrders.filter((workOrder) => {
    const ids = workOrder.assignedCrewIds || [];
    const names = (workOrder.assignedCrewNames || []).map((name) => name.toLowerCase());
    return Boolean(memberId && ids.includes(memberId)) || Boolean(memberName && names.includes(memberName));
  });
}
```

- [ ] **Step 3: Show active work orders on crew cards**

Inside the `filteredCrews.map` block, add:

```ts
const memberWorkOrders = workOrdersForMember(member, workOrders);
```

Replace the old `member.activeJob` block with:

```tsx
{memberWorkOrders.length > 0 && (
  <div>
    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Active Work Orders</p>
    <div className="space-y-1">
      {memberWorkOrders.slice(0, 3).map((workOrder) => (
        <button
          type="button"
          key={workOrder.id || workOrder.title}
          onClick={() => openDrawer("job", workOrder.jobId || workOrder.jobName || workOrder.projectId || "")}
          className="block w-full rounded-md border border-jdt-border bg-white px-2 py-1.5 text-left text-[10px] font-black text-jdt-primary hover:border-jdt-olive"
        >
          {workOrder.title || "Untitled work order"}
          <span className="block text-[9px] font-bold uppercase text-zinc-400">{workOrder.status || "Active"} · {workOrder.projectName || workOrder.jobName || "No project"}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Make Assign write a work order**

Change the Assign button:

```tsx
onClick={() => openModal("assign_work", member)}
```

- [ ] **Step 5: Add work-order fields in EntityForms**

In `src/components/EntityForms.tsx`, add:

```ts
import { jdtProjectFlowWorkbook } from "../commandCenter/workbookProjectFlow";
```

Add a field set:

```ts
assign_work: [
  { key: "title", label: "Work Order / Task", required: true },
  { key: "clientName", label: "Client" },
  { key: "projectName", label: "Project" },
  { key: "jobName", label: "Job" },
  { key: "division", label: "Division", type: "select", options: [relocationInstallationDivisionLabel, "Nursery", "Freight", "Maintenance / Equipment", "Administration"] },
  { key: "workOrderType", label: "Workbook Layer", type: "select", options: ["tree_pruning", "treatment_aftercare", "move_readiness", "change_order", "billing_milestone", "daily_field_update", "freight", "equipment", "general_task"] },
  { key: "taskType", label: "Task Type" },
  { key: "scheduledDate", label: "Scheduled Date", type: "date" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "crewLeadName", label: "Crew Lead" },
  { key: "assignedCrewNames", label: "Assigned Crew" },
  { key: "requiredSkills", label: "Required Skills" },
  { key: "status", label: "Status", type: "select", options: ["Draft", "Ready", "Scheduled", "Active", "Blocked", "Complete", "Cancelled"] },
  { key: "priority", label: "Priority", type: "select", options: ["Low", "Normal", "High", "Urgent", "Critical"] },
  { key: "sourceSheetName", label: "Workbook Tab", type: "select", options: Object.keys(jdtProjectFlowWorkbook.tabs) },
  { key: "notes", label: "Notes", type: "textarea" },
],
project_material_item: [
  { key: "projectName", label: "Project", required: true },
  { key: "holeNumberOrArea", label: "Hole / Area" },
  { key: "source", label: "Source", type: "select", options: ["JD Thornton", "Container Pines", "McArthur Tree Nursery", "Relocated Trees", "Client Supplied", "Other"] },
  { key: "materialType", label: "Material Type", required: true },
  { key: "sizeClass", label: "Size / Class", type: "select", options: ["3g", "7g", "15g", "25g", "45g", "Medium", "Large", "Extra Large", "B&B", "Field Grown", "Custom"] },
  { key: "quantityRequired", label: "Quantity Required", type: "number" },
  { key: "quantityInstalled", label: "Quantity Installed", type: "number" },
  { key: "unitPrice", label: "Unit Price", type: "number" },
  { key: "installStatus", label: "Install Status", type: "select", options: ["Needed", "Pulled", "Loaded", "Delivered", "Installed", "Rejected", "Complete", "On Hold"] },
  { key: "notes", label: "Notes", type: "textarea" },
],
```

Update `canonicalType`:

```ts
if (["assign_work", "work_order", "workorder"].includes(normalized)) return "assign_work";
if (["project_material_item", "projectmaterialitem", "material_item"].includes(normalized)) return "project_material_item";
```

- [ ] **Step 6: Add modal config for work and material item forms**

In `src/components/UniversalModal.tsx`, add modal labels:

```ts
'assign_work': { title: 'Assign Work', desc: 'Create or update a job work order for a crew, freight action, equipment need, or field task', btn: 'Save Work Order' },
'work_order': { title: 'Work Order', desc: 'Create or update a field work order', btn: 'Save Work Order' },
'project_material_item': { title: 'Project Material Item', desc: 'Add material quantities, source, size, status, and notes for this project', btn: 'Save Material' },
```

Add these types to the `isEntityForm` array:

```ts
'assign_work', 'work_order', 'project_material_item'
```

- [ ] **Step 7: Normalize comma-separated assignment fields on submit**

In `handleSubmit`, before `onSaveRecord`, add:

```ts
const normalizedFormData = {
  ...formData,
  assignedCrewNames: Array.isArray(formData.assignedCrewNames)
    ? formData.assignedCrewNames
    : String(formData.assignedCrewNames || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
  requiredSkills: Array.isArray(formData.requiredSkills)
    ? formData.requiredSkills
    : String(formData.requiredSkills || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
};
onSaveRecord(type, normalizedFormData);
```

Remove or replace the existing direct `onSaveRecord(type, formData);` call.

- [ ] **Step 8: Verify Task 5**

Run TypeScript. Expected: pass after prop forwarding is complete.

---

### Task 6: Job Drawer Work Order Visibility

**Files:**
- Modify: `src/components/CommandDrawer.tsx`

- [ ] **Step 1: Extend props and imports**

Update imports:

```ts
import type { ProjectMaterialItemRecord, WorkOrderRecord } from "../commandCenter/records";
import { sameProject } from "../commandCenter/relationships";
```

Add prop:

```ts
workOrdersList?: WorkOrderRecord[];
projectMaterialItemsList?: ProjectMaterialItemRecord[];
```

- [ ] **Step 2: Add related work-order and material item helpers**

Add above `CommandDrawer`:

```ts
function workOrdersForRecord(type: string, record: any, workOrders: WorkOrderRecord[]) {
  if (!record) return [];
  if (type === "employee") {
    const recordId = String(record.id || record.email || record.name || "");
    const recordName = String(record.name || "").toLowerCase();
    return workOrders.filter((workOrder) => (
      (workOrder.assignedCrewIds || []).includes(recordId)
      || (workOrder.assignedCrewNames || []).map((name) => name.toLowerCase()).includes(recordName)
    ));
  }

  if (type === "job") {
    return workOrders.filter((workOrder) => (
      workOrder.jobId === record.jobId
      || workOrder.jobName === record.jobName
      || workOrder.projectId === record.projectId
      || sameProject(record, workOrder)
    ));
  }

  return [];
}

function materialItemsForRecord(type: string, record: any, materialItems: ProjectMaterialItemRecord[]) {
  if (!record || type !== "job") return [];
  return materialItems.filter((item) => (
    item.projectId === record.projectId
    || item.projectsId === record.projectsId
    || item.projectName === record.projectName
    || item.projectName === record.title
    || sameProject(record, item)
  ));
}
```

- [ ] **Step 3: Add Work Orders tab**

Change tab list:

```tsx
{["overview", "work orders", "materials", "history", "documents"].map((tab) => (
```

- [ ] **Step 4: Render work orders and material item tabs**

Inside the component after `history`:

```ts
const relatedWorkOrders = workOrdersForRecord(type, record, props.workOrdersList || []);
const relatedMaterialItems = materialItemsForRecord(type, record, props.projectMaterialItemsList || []);
```

Add a render branch before `history`:

```tsx
) : activeTab === "work orders" ? (
  <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-black uppercase text-jdt-text flex items-center gap-2">
        <FileText className="h-4 w-4 text-jdt-olive" /> Work Orders
      </h3>
      <button
        type="button"
        onClick={() => openModal("assign_work", {
          clientId: record.clientId,
          clientName: record.clientName || record.client,
          projectId: record.projectId,
          projectName: record.projectName || record.title,
          jobId: record.jobId || record.id,
          jobName: record.jobName || record.title,
          division: record.division,
        })}
        className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
      >
        Add Work
      </button>
    </div>
    {relatedWorkOrders.length > 0 ? (
      <div className="space-y-2">
        {relatedWorkOrders.map((workOrder) => (
          <article key={workOrder.id || workOrder.title} className="rounded-lg border border-jdt-border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-jdt-primary">{workOrder.title || "Untitled work order"}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{workOrder.workOrderType || "general_task"} · {workOrder.sourceSheetName || "Manual"}</p>
              </div>
              <span className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-text">{workOrder.status || "Draft"}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Crew:</span> {(workOrder.assignedCrewNames || []).join(", ") || workOrder.crewLeadName || "Needs crew"}</p>
              <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Due:</span> {workOrder.dueDate || workOrder.scheduledDate || "No due date"}</p>
              <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Equipment:</span> {(workOrder.equipmentNames || []).join(", ") || "None linked"}</p>
              <p className="text-xs font-bold text-zinc-600"><span className="font-black text-zinc-400 uppercase">Trees:</span> {(workOrder.treeNames || []).join(", ") || "None linked"}</p>
            </div>
            {workOrder.blockerReason && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{workOrder.blockerReason}</p>}
          </article>
        ))}
      </div>
    ) : (
      <p className="text-sm font-bold text-zinc-500">No work orders are linked to this record yet.</p>
    )}
  </div>
```

Add a material item branch before `history`:

```tsx
) : activeTab === "materials" ? (
  <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-black uppercase text-jdt-text">Project Material Items</h3>
      <button
        type="button"
        onClick={() => openModal("project_material_item", {
          projectId: record.projectId,
          projectsId: record.projectsId,
          projectName: record.projectName || record.title,
          clientId: record.clientId,
          clientName: record.clientName || record.client,
        })}
        className="rounded-lg bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-jdt-dark"
      >
        Add Material
      </button>
    </div>
    {relatedMaterialItems.length > 0 ? (
      <div className="overflow-hidden rounded-lg border border-jdt-border bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-jdt-sand text-[10px] uppercase text-jdt-muted">
            <tr>
              <th className="px-3 py-2">Area</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2">Installed</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {relatedMaterialItems.map((item) => (
              <tr key={item.id || item.projectMaterialItemsId} className="border-t border-jdt-border">
                <td className="px-3 py-2 font-bold text-jdt-text">{item.holeNumberOrArea || "General"}</td>
                <td className="px-3 py-2 text-zinc-600">{item.source || "Unknown"}</td>
                <td className="px-3 py-2 text-zinc-600">{item.materialType || "Material"}</td>
                <td className="px-3 py-2 text-zinc-600">{item.sizeClass || "Size not set"}</td>
                <td className="px-3 py-2 text-zinc-600">{item.quantityRequired || 0}</td>
                <td className="px-3 py-2 text-zinc-600">{item.quantityInstalled || 0}</td>
                <td className="px-3 py-2 font-black uppercase text-jdt-primary">{item.installStatus || "Needed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-sm font-bold text-zinc-500">No project material items are linked to this job yet.</p>
    )}
  </div>
```

- [ ] **Step 5: Verify Task 6**

Run TypeScript. Expected: pass.

---

### Task 7: Relocation & Installation Board Work Order Context

**Files:**
- Modify: inline `TrackerBoard` in `src/App.tsx`

- [ ] **Step 1: Update signature**

Change:

```ts
function TrackerBoard({ jobs, openDrawer, openModal }: any) {
```

to:

```ts
function TrackerBoard({ jobs, workOrders = [], projectMaterialItems = [], openDrawer, openModal }: any) {
```

- [ ] **Step 2: Add helpers inside `TrackerBoard`**

Inside `TrackerBoard`, add:

```ts
const workOrdersForJob = (job: any) => workOrders.filter((workOrder: WorkOrderRecord) => (
  workOrder.jobId === job.jobId
  || workOrder.jobName === job.jobName
  || workOrder.projectId === job.projectId
  || workOrder.projectName === job.projectName
  || workOrder.projectName === job.title
));

const materialItemsForJob = (job: any) => projectMaterialItems.filter((item: ProjectMaterialItemRecord) => (
  item.projectId === job.projectId
  || item.projectsId === job.projectsId
  || item.projectName === job.projectName
  || item.projectName === job.title
));
```

- [ ] **Step 3: Add table columns**

In the table header, add after `Crew`:

```tsx
<th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Next Work</th>
<th className="px-5 py-3.5 font-black uppercase tracking-wide text-[10px]">Needs</th>
```

In each row:

```tsx
const linkedWorkOrders = workOrdersForJob(job);
const nextWorkOrder = linkedWorkOrders.find((workOrder: WorkOrderRecord) => !["Complete", "Cancelled"].includes(String(workOrder.status || ""))) || linkedWorkOrders[0];
const linkedMaterialItems = materialItemsForJob(job);
const requiredMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityRequired || 0), 0);
const installedMaterialCount = linkedMaterialItems.reduce((sum: number, item: ProjectMaterialItemRecord) => sum + Number(item.quantityInstalled || 0), 0);
```

Add cells:

```tsx
<td className="px-5 py-4 font-bold text-zinc-600">{nextWorkOrder?.title || "No work order"}</td>
<td className="px-5 py-4">
  <div className="flex flex-wrap gap-1">
    {!nextWorkOrder?.assignedCrewNames?.length && <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">Needs crew</span>}
    {!nextWorkOrder?.equipmentNames?.length && <span className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-600">Equipment</span>}
    {!nextWorkOrder?.loadNames?.length && <span className="rounded bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">Freight</span>}
    {requiredMaterialCount > installedMaterialCount && <span className="rounded bg-green-50 px-2 py-1 text-[9px] font-black uppercase text-green-700">{installedMaterialCount}/{requiredMaterialCount} material</span>}
  </div>
</td>
```

- [ ] **Step 4: Add assignment action**

Add a compact action button in the project name cell:

```tsx
<button
  type="button"
  onClick={(event) => {
    event.stopPropagation();
    openModal("assign_work", {
      clientId: job.clientId,
      clientName: job.clientName || job.client,
      projectId: job.projectId,
      projectName: job.projectName || job.title,
      jobId: job.jobId || job.id,
      jobName: job.jobName || job.title,
      division: relocationInstallationDivisionLabel,
    });
  }}
  className="mt-2 rounded bg-jdt-primary px-2 py-1 text-[9px] font-black uppercase text-white"
>
  Assign Work
</button>
```

- [ ] **Step 5: Verify Task 7**

Run TypeScript. Expected: pass.

---

### Task 8: Data Sync Workbook Import Skeleton

**Files:**
- Modify: `src/commandCenter/sheetImport.ts`
- Modify: `src/commandCenter/sheetImport.test.ts`

- [ ] **Step 1: Add failing import mapping test**

In `src/commandCenter/sheetImport.test.ts`, add:

```ts
it("maps JDT project flow workbook tree pruning rows into work orders", () => {
  const preview = buildImportPreview("jdt_project_flow_tree_pruning", [
    ["Tree Assets_ID", "Tree_Prune_ID", "Root Prune Cuts", "Date of 1st Cut", "Prep Checks", "Readiness Reviews"],
    ["tree-boca-001", "prune-boca-001", "2", "2026-06-01", "Access clear", "Ready"],
  ]);
  const workOrders = preview.targets.find((target) => target.collectionName === "workOrders")?.records as any[];

  assert.equal(workOrders?.length, 1);
  assert.equal(workOrders[0].id, "prune-boca-001");
  assert.equal(workOrders[0].workOrderType, "tree_pruning");
  assert.equal(workOrders[0].sourceSheetName, "Tree Pruning");
  assert.equal(workOrders[0].sourceRowId, "prune-boca-001");
  assert.equal(workOrders[0].treeIds?.[0], "tree-boca-001");
});

it("maps JDT project flow material item rows into project material items", () => {
  const preview = buildImportPreview("jdt_project_flow_project_material_items", [
    ["Project_Material_Items_ID", "Projects_ID", "Project Name", "Hole Number / Area", "Source", "Material Type", "Size / Class", "Quantity Required", "Quantity Installed", "Install Status"],
    ["mat-boca-hole-7-pine", "project-boca-west", "Boca West Relocation", "Hole 7", "JD Thornton", "Pine", "Large", "12", "5", "Delivered"],
  ]);
  const materialItems = preview.targets.find((target) => target.collectionName === "projectMaterialItems")?.records as any[];

  assert.equal(materialItems?.length, 1);
  assert.equal(materialItems[0].id, "mat-boca-hole-7-pine");
  assert.equal(materialItems[0].projectName, "Boca West Relocation");
  assert.equal(materialItems[0].holeNumberOrArea, "Hole 7");
  assert.equal(materialItems[0].sourceSheetName, "Project_Material_Items");
  assert.equal(materialItems[0].sourceRowId, "mat-boca-hole-7-pine");
});
```

- [ ] **Step 2: Add import template ID and record type support**

In `src/commandCenter/sheetImport.ts`, add the new record imports:

```ts
import type {
  ProjectMaterialItemRecord,
  WorkOrderRecord,
} from './records';
import { sourceRefFromWorkbookRow } from './workbookProjectFlow';
```

If `records.ts` is already imported as a grouped type import, add `ProjectMaterialItemRecord` and `WorkOrderRecord` to that existing import instead of creating a second import.

Extend `SheetImportTemplateId`:

```ts
export type SheetImportTemplateId =
  | 'inventory'
  | 'clients'
  | 'equipment'
  | 'locations'
  | 'staff'
  | 'species'
  | 'schedule'
  | 'relocation'
  | 'jdt_project_flow_tree_pruning'
  | 'jdt_project_flow_project_material_items';
```

- [ ] **Step 3: Add template registry entries and switch cases**

Add these entries to `sheetImportTemplates`:

```ts
{
  id: "jdt_project_flow_tree_pruning",
  label: "JDT Project Flow - Tree Pruning",
  sourceSheet: "Tree Pruning",
  targetCollections: ["workOrders"],
  requiredHeaders: ["Tree Assets_ID", "Tree_Prune_ID"],
  pasteHeaders: ["Tree Assets_ID", "Tree_Prune_ID", "Root Prune Cuts", "Date of 1st Cut", "Date of 2nd Cut", "Date of 3rd Cut", "Prep Checks", "Readiness Reviews", "Notes"],
  previewFields: [
    { label: "Tree", key: "treeNames" },
    { label: "Status", key: "status" },
    { label: "Scheduled", key: "scheduledDate" },
  ],
},
{
  id: "jdt_project_flow_project_material_items",
  label: "JDT Project Flow - Project Material Items",
  sourceSheet: "Project_Material_Items",
  targetCollections: ["projectMaterialItems"],
  requiredHeaders: ["Project_Material_Items_ID", "Projects_ID", "Material Type"],
  pasteHeaders: ["Project_Material_Items_ID", "Projects_ID", "Project Name", "Hole Number / Area", "Source", "Material Type", "Size / Class", "Quantity Required", "Quantity Installed", "Unit Price", "Install Status", "Notes"],
  previewFields: [
    { label: "Project", key: "projectName" },
    { label: "Area", key: "holeNumberOrArea" },
    { label: "Material", key: "materialType" },
    { label: "Qty", key: "quantityRequired" },
  ],
}
```

Add switch cases in `mapTemplate`:

```ts
case 'jdt_project_flow_tree_pruning':
  return mapJdtProjectFlowTreePruning(template, rows);
case 'jdt_project_flow_project_material_items':
  return mapJdtProjectFlowProjectMaterialItems(template, rows);
```

- [ ] **Step 4: Add the tree-pruning mapper**

Add below `mapRelocation`:

```ts
function mapJdtProjectFlowTreePruning(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const workOrders = records
    .map(({ row, index }) => {
      const treeAssetId = value(row, 'Tree Assets_ID');
      const treePruneId = value(row, 'Tree_Prune_ID');
      const firstCutDate = value(row, 'Date of 1st Cut');
      const rootPruneCuts = value(row, 'Root Prune Cuts');
      const prepChecks = value(row, 'Prep Checks');
      const readinessReview = value(row, 'Readiness Reviews');

      if (!treeAssetId && !treePruneId && !rootPruneCuts && !firstCutDate) {
        warnings.push(`Row ${index} skipped: blank tree pruning row`);
        return null;
      }

      if (!treeAssetId || !treePruneId) {
        warnings.push(`Row ${index} skipped: tree pruning rows need Tree Assets_ID and Tree_Prune_ID`);
        return null;
      }

      return {
        id: treePruneId,
        title: `Root prune ${treeAssetId}`,
        workOrderType: 'tree_pruning',
        division: 'Relocation & Installation',
        taskType: 'Root Pruning',
        status: readinessReview || 'Ready',
        scheduledDate: firstCutDate,
        sourceSheetName: 'Tree Pruning',
        sourceRowId: treePruneId,
        treeIds: [treeAssetId],
        treeNames: [treeAssetId],
        notes: [
          rootPruneCuts && `Root prune cuts: ${rootPruneCuts}`,
          prepChecks && `Prep checks: ${prepChecks}`,
          value(row, 'Notes'),
        ].filter(Boolean).join('\n'),
        sourceRefs: [sourceRefFromWorkbookRow('Tree Pruning', {
          Tree_Assets_ID: treeAssetId,
          Tree_Prune_ID: treePruneId,
        }, index)],
      } satisfies WorkOrderRecord;
    })
    .filter(Boolean) as WorkOrderRecord[];

  return makeTarget(template, workOrders, warnings, 'workOrders');
}
```

- [ ] **Step 5: Add the project-material mapper**

Add below `mapJdtProjectFlowTreePruning`:

```ts
function mapJdtProjectFlowProjectMaterialItems(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const materialItems = records
    .map(({ row, index }) => {
      const materialItemId = value(row, 'Project_Material_Items_ID');
      const projectsId = value(row, 'Projects_ID');
      const materialType = value(row, 'Material Type');

      if (!materialItemId && !projectsId && !materialType) {
        warnings.push(`Row ${index} skipped: blank project material item row`);
        return null;
      }

      if (!projectsId || !materialType) {
        warnings.push(`Row ${index} skipped: material rows need Projects_ID and Material Type`);
        return null;
      }

      const id = materialItemId || `material-${slugify([projectsId, value(row, 'Hole Number / Area'), materialType, value(row, 'Size / Class')].filter(Boolean).join('-') || `row-${index}`)}`;

      return {
        id,
        projectMaterialItemsId: materialItemId,
        projectsId,
        projectId: projectsId,
        projectName: value(row, 'Project Name'),
        holeNumberOrArea: value(row, 'Hole Number / Area'),
        source: value(row, 'Source'),
        materialType,
        sizeClass: value(row, 'Size / Class'),
        quantityRequired: numberFrom(value(row, 'Quantity Required')) ?? cleanOptional(value(row, 'Quantity Required')),
        quantityInstalled: numberFrom(value(row, 'Quantity Installed')) ?? cleanOptional(value(row, 'Quantity Installed')),
        unitPrice: moneyFrom(value(row, 'Unit Price')) ?? cleanOptional(value(row, 'Unit Price')),
        installStatus: value(row, 'Install Status') || 'Needed',
        notes: value(row, 'Notes'),
        sourceSheetName: 'Project_Material_Items',
        sourceRowId: materialItemId || id,
        sourceRefs: [sourceRefFromWorkbookRow('Project_Material_Items', {
          Project_Material_Items_ID: materialItemId || id,
        }, index)],
      } satisfies ProjectMaterialItemRecord;
    })
    .filter(Boolean) as ProjectMaterialItemRecord[];

  return makeTarget(template, materialItems, warnings, 'projectMaterialItems');
}
```

- [ ] **Step 6: Verify Task 8**

Run `src/commandCenter/sheetImport.test.ts`. Expected: pass.

---

### Task 9: Full Verification And Browser Smoke

**Files:**
- Modify only if verification exposes a bug.

- [ ] **Step 1: Run focused tests**

Run the focused test command from the Verification Commands section. Expected: all selected tests pass.

- [ ] **Step 2: Run the full suite**

Run the full node test command from the Verification Commands section. Expected: all tests pass.

- [ ] **Step 3: Run TypeScript**

Run `tsc --noEmit`. Expected: exit code 0.

- [ ] **Step 4: Build production assets**

Run `vite build`. Expected: build succeeds. A chunk-size warning is acceptable if it matches the existing warning pattern.

- [ ] **Step 5: Start or reuse preview**

If `http://127.0.0.1:4182/` responds with 200, reuse it. Otherwise start a preview on the next available port.

- [ ] **Step 6: Browser smoke check**

Open the local preview. Verify:

- sign-in shell loads without console errors;
- Crews board renders after authentication in a browser session with access;
- Relocation & Installation board has work-order columns/actions when data exists;
- job drawer has the Work Orders tab;
- Assign Work modal opens from Crew cards and job rows.

- [ ] **Step 7: Record deployment blocker or deploy**

If local `gcloud` and Cloud Shell transfer remain blocked, report that the implementation is verified locally but not live. If deployment tooling becomes available, deploy to:

```bash
gcloud run deploy jd-thornton-nurseries-command-center \
  --project jdt-command-board \
  --region us-west1 \
  --source . \
  --no-default-url
```

Then verify `https://app.jdtcommandcenter.com/` serves the new bundle.
