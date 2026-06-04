# Assignment And Work Orders Design

## Goal

Make projects and jobs actionable across JD Thornton Nurseries by adding a shared assignment/work-order layer. The app should let Jennifer, Regina, Jeremy, or Buck open one client/project/job and immediately see what needs to happen, who is responsible, what equipment or freight is involved, what trees or materials are tied to it, and which source documents or spreadsheets support the work.

## Operating Model

The app should keep the Client > Project > Job structure from the current Option B work, then add Work Orders beneath jobs.

- Client: the customer or account, such as Boca West Country Club.
- Project: the broader engagement under that client, such as Boca West Relocation.
- Job: the operating job under the project, such as a Relocation & Installation job.
- Work Order: the specific actionable task, such as root pruning, digging, loading, delivery, installation, irrigation prep, equipment move, or follow-up visit.

Crews should not be assigned only to a project as plain text. Crews should be assigned to work orders, and those work orders should roll up to the project and job. This gives the app enough detail to answer "what is Carlos doing?", "what freight is needed?", "which trees are tied to this job?", and "what source sheet or Drive folder supports this task?"

## Workbook Alignment

The Google Sheet named `JDT Nurseries` should become the canonical project-flow template for the app's work-order layer:

`https://docs.google.com/spreadsheets/d/1g0_mN-ybgdlVLp7zttGMxS6djVCGw7HkJwq0Tyx2VUg/edit`

The app should mirror this workbook closely so data can move between the spreadsheet and the app without translation confusion. The workbook tabs should map to app records this way:

| Workbook tab | Primary ID | App purpose |
| --- | --- | --- |
| `Companies` | `Companies_ID` | Client/account master record |
| `Company` | `Contacts_ID` | Client contact records under a company |
| `Users` | `User_ID` | Internal app/personnel users |
| `Projects` | `Projects_ID` | Project/job operating header |
| `Project Areas` | `Project_Area_ID` | Controlled list for areas such as hole, phase, yard, or site zone |
| `Project Statuses` | `Project_Status_ID` | Controlled list for project/job status |
| `Tree Assets` | `Tree_Assets_ID` | Trees or material assets tied to a project |
| `Tree Pruning` | `Tree_Prune_ID` | Root-pruning work order details for a tree asset |
| `Treatment / Aftercare` | `Treatment_Aftercare Logs_ID` | Treatment, watering, irrigation, stress, and follow-up work |
| `Tree Photos` | `Tree_Photos_ID` | Photos attached to a tree asset |
| `Move Readiness` | `Move_Readiness_ID` | Site/tree readiness checklist before moving or installing |
| `Change Orders` | `Change_Orders_ID` | Scope, schedule, billing, and equipment-impact changes |
| `Billing Milestones` | `Billing Milestones_ID` | Billing and invoice checkpoints |
| `Daily Field Updates` | `Daily Field Updates_ID` | Field progress notes, delays, equipment needs, crew needs, and next-day priorities |
| `Project_Material_Items` | `Project_Material_Items_ID` | Repeatable child records for installation/nursery/material quantities, source, size, status, price, notes, and photos |

This workbook should be treated as the backup command-center schema while the app is being built. The app can still use friendlier labels in the UI, but the underlying import/export mapping should preserve these tab and ID names.

The supporting Google Doc `Appsheet-Field Operating System` adds one high-priority schema correction: installation material quantities and categories should not live as fixed columns on the `Projects` table. JD Thornton Pines, Container Pines, McArthur Tree Nursery material, relocated trees, JDT Oaks, sizes, and quantities should move into a repeatable child table named `Project_Material_Items`. The app should follow that correction even if the current workbook still has some material columns on the `Projects` tab.

## Divisions

Work orders should support the vertically integrated operating divisions:

- Relocation & Installation
- Nursery
- Freight
- Maintenance / Equipment
- Administration

Crews and personnel are shared resources across these divisions. A crew member can have one or more active work orders, but the app should make it easy to see their current load before assigning more work.

Division and project type should remain separate concepts. Division says which part of JD Thornton owns the work. Project type says what kind of work is being performed. Project type should use controlled values such as installation, relocation, preservation, removal, maintenance, nursery order, freight/delivery, and internal task.

Internal user/personnel roles should also use controlled values. The Appsheet field-operating document recommends admin, operations manager, project manager, crew leader, field crew, nursery/sales, freight driver, mechanic/maintenance, and accounting/office. These can coexist with the current JDT-friendly labels such as Owner, Office Admin, Operations Coordinator, Driver, Mechanic, and Irrigation Tech, but the app should not let role names drift into random one-off text.

## Data Model

Add a new `workOrders` collection, but do not make it a vague free-form task bin. A work order should have a `workOrderType` that lines up with the workbook's operating tabs:

- `tree_pruning`
- `treatment_aftercare`
- `move_readiness`
- `change_order`
- `billing_milestone`
- `daily_field_update`
- `freight`
- `equipment`
- `general_task`

Each work order should carry the same relationship fields already added to projects and jobs:

- `clientId`, `clientName`
- `projectId`, `projectName`
- `jobId`, `jobName`

Each work order should also include:

- `title`: short action title.
- `division`: operating division responsible for the work.
- `workOrderType`: the app category mapped to a workbook tab.
- `sourceSheetName`: the workbook tab or source template this work order came from.
- `sourceRowId`: the workbook row ID, such as `Tree_Prune_ID` or `Move_Readiness_ID`.
- `taskType`: root pruning, dig, load, deliver, install, irrigation, equipment move, service, follow-up, admin, other.
- `status`: draft, ready, scheduled, active, blocked, complete, cancelled.
- `priority`: low, normal, high, urgent.
- `scheduledDate`, `dueDate`, `completedDate`.
- `crewLeadId`, `crewLeadName`.
- `assignedCrewIds`, `assignedCrewNames`.
- `requiredSkills`: skills needed for the task, such as root pruning or irrigation.
- `equipmentIds`, `equipmentNames`.
- `loadIds`, `loadNames`.
- `treeIds`, `treeNames`, `inventoryItemIds`.
- `documentIds`, `documentNames`.
- `sourceRefs`: links back to Google Sheets rows, Drive folders, imported records, or manual sources.
- `origin`, `destination`, and `siteArea` when useful for freight or installation.
- `blockerReason` and `notes`.
- normal audit history fields.

Existing records can keep their current fields, but new saves and imports should stamp related work orders with IDs so every board can find the same action record.

Project/job records should also carry workbook-compatible fields when available:

- `companiesId`
- `projectsId`
- `projectAreaId`
- `projectStatusId`
- `hole`
- `scheduled`
- `completed`

Project/job records should not hard-code material quantity categories as permanent fields. Material quantities should be stored in `projectMaterialItems` records instead.

Add a `projectMaterialItems` collection that mirrors the proposed `Project_Material_Items` child table:

- `projectMaterialItemsId`
- `projectsId`, `projectId`, `projectName`
- `holeNumberOrArea`
- `source`: JD Thornton, Container Pines, McArthur Tree Nursery, Relocated Trees, Client Supplied, Other.
- `materialType`: Pine, Holly, Myrtle, Oak, Palm, Shrub, Groundcover, Other, or a species reference.
- `sizeClass`: 3g, 7g, 15g, 25g, 45g, Medium, Large, Extra Large, B&B, Field Grown, Custom.
- `quantityRequired`
- `quantityInstalled`
- `unitPrice`
- `installStatus`: Needed, Pulled, Loaded, Delivered, Installed, Rejected, Complete, On Hold.
- `notes`
- `photoIds` or `photoNames`

## User Flow: Jennifer Assigning Boca West

Jennifer opens Boca West Country Club from the Command Board or Clients page.

The drawer shows:

- Client and project context.
- Job summary: type, status, location, target date, project manager.
- Next actions: work orders that are ready, scheduled, blocked, or active.
- Crews assigned to each work order.
- Freight actions tied to each work order.
- Trees/materials tied to each work order.
- Documents and source sheets tied to the same relationship IDs.

If Jennifer needs Carlos Reyes for root pruning, she can assign Carlos from either:

- the Crew page, by opening Carlos and choosing "Assign Work"; or
- the Relocation & Installation job drawer, by opening the work order and choosing "Assign Crew".

Both paths write to the same `workOrders` record. Carlos' crew card then shows the assignment, and the Boca West job drawer shows Carlos on the root pruning task.

## Board Changes

### Command Board

Command Board cards should become action-oriented. A job card should show:

- client, project, and job name;
- next work order;
- assigned crew lead and crew count;
- scheduled date or due date;
- freight/equipment/tree indicators;
- blocker state when present.

Clicking a card should open the job drawer with the work order section visible.

### Relocation & Installation

The Relocation & Installation board should show richer rows/cards:

- project/job name;
- job type: relocation, install, or mixed;
- task summary by work order status;
- assigned crew lead or "Unassigned";
- freight/equipment needs;
- tree count or linked tree list;
- next action.

The job drawer should add tabs:

- Overview
- Work Orders
- Crews
- Freight & Equipment
- Trees
- Documents
- History

### Crews

Crew cards should show:

- primary role;
- primary skill;
- availability;
- active work orders;
- scheduled upcoming work;
- assigned equipment;
- quick "Assign Work" action.

The assignment modal should let the user choose an existing client/project/job/work order or create a new work order under an existing job.

Main Contact must remain the client/company contact. Internal assignment should come from Project Manager, Crew Lead, Assigned Crew, Work Orders, or later a dedicated assignment table. Do not use the client contact field to determine a user's assigned projects.

### Freight

Freight loads should link to work orders. A load can be created from a work order, and a freight card should show the client/project/job context. This lets "deliver trees" or "move equipment" appear both in Freight and in the job drawer.

### Nursery

Nursery inventory should support linking or reserving trees to a work order. Tree cards should show if an item is available, reserved, assigned, loaded, delivered, installed, or relocated.

Installation material that is not a uniquely tracked tree should be linked through `projectMaterialItems`. Unique relocated trees and tagged assets should remain in `Tree Assets` / inventory records.

### Documents And Data Sync

Documents and imported spreadsheet rows should link to client/project/job/work-order IDs when possible. A source reference should preserve where the data came from:

- spreadsheet ID;
- sheet/tab name;
- row number or imported record ID;
- Drive folder or file URL;
- import batch ID.

Rows that cannot be linked should import as needing review instead of disappearing.

Data Sync should eventually show an import template named `JDT Project Flow Workbook`. That template should read the workbook tabs as first-class sources instead of asking Jennifer or Regina to manually decide which app collection every tab belongs to.

Dropdowns/enums should be favored over free text for field consistency. Free text should be limited to notes, issue descriptions, client instructions, exceptions, and blocker explanations.

Recommended controlled lists from the supporting doc:

- Project Status: Not Started, Active, On Hold, Waiting on Client, Waiting on Site, Scheduled, In Progress, Completed, Closed.
- Tree Difficulty: 1 - Easy, 2 - Moderate, 3 - Difficult, 4 - Very Difficult, 5 - Extreme / Requires Review.
- Tree Condition: Excellent, Good, Fair, Stressed, Declining, Poor, Dead, Needs Review.
- Tree Current Status: Pending Review, Tagged, Root Pruning, Treatment Needed, Ready to Move, Scheduled, Moved, Installed, Aftercare, Complete, Hold.
- Priority: Low, Normal, High, Urgent, Critical.
- Change Type: Added Scope, Removed Scope, Site Condition, Access Issue, Equipment Change, Material Change, Schedule Change, Client Request, Design Change, Damage/Repair, Other.

The first build should expose the most important of these as app dropdowns. The rest can become support/reference tables once the work-order relationships are stable.

## Error Handling

If a user tries to assign crew without a job, the app should ask them to choose or create the job first.

If a work order is missing a crew, equipment, freight, or tree link, the card should show a clear "Needs crew", "Needs equipment", "Needs freight", or "Needs trees" indicator.

If an imported row cannot be matched to a client/project/job, it should be saved with a review status and shown in Data Sync as needing relationship review.

## Migration

Do not wipe existing Firestore data. Existing job fields such as `crew`, `driver`, `equipment`, and `activeJob` should continue to display while new work orders are introduced.

For the first implementation, new actions should create work orders. A later migration can backfill work orders from existing jobs, schedule tasks, relocation tracker rows, and freight loads.

## First Implementation Slice

The first slice should:

1. Add `WorkOrderRecord` and `workOrders` to the canonical data model.
2. Add `ProjectMaterialItemRecord` and `projectMaterialItems` so material quantities are repeatable child records instead of hard-coded project columns.
3. Add a `JDT Project Flow Workbook` mapping that mirrors the workbook tabs and IDs listed above.
4. Add relationship helpers for workbook-aligned work-order IDs.
5. Add save/import wiring so assignments and material items persist in Firestore with workbook source fields.
6. Pass work orders and material items into Command Board, Crews, Relocation & Installation, Freight, Nursery, Documents, and drawers.
7. Upgrade the job drawer to show related work orders, material items, and quick assignment actions.
8. Add an "Assign Work" flow from Crew cards and from the Relocation & Installation drawer.
9. Update tests for data model, relationship stamping, workbook mapping, material items, crew assignment, and drawer display.

## Out Of Scope For First Slice

The first slice should not attempt a full scheduler rebuild, route optimization, automatic Drive sync, or automatic inventory reservation engine. Those can build on the work-order layer after the manual workflow is reliable.

## Verification

Verification should include:

- unit tests for work-order IDs and relationship matching;
- unit tests for `JDT Project Flow Workbook` tab-to-collection mapping;
- data model tests for `workOrders` and `projectMaterialItems`;
- save-flow tests for crew assignment;
- import tests for work-order source references;
- drawer render tests for related work orders;
- full TypeScript check;
- production build;
- local browser smoke check for Command Board, Crews, and Relocation & Installation.
