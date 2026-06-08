# JDT Command Center Full Audit Report

Audit date: 2026-06-08  
Auditor role: senior product architect, senior full-stack engineer, UX/UI auditor, workflow analyst, and field-operations consultant  
Scope: repository, deployment configuration, Firebase/Firestore rules, workbook schema, Google Sheets source-of-truth structure, major React views, live app inspection, and operational fit for JD Thornton Nurseries.

Important constraint honored: this audit did not intentionally modify production app source files, Firebase data, Google Sheets data, or Cloud Run configuration. The only file added is this report.

Verification note: the local environment has Node available, but `npm` and local `node_modules` are not available in this shell. The repo's `verify` script could not be executed here because it delegates to `npm run test && npm run lint && npm run build`. I inspected the script list and test inventory, but I could not run the full verification suite in this environment without a package manager.

Live inspection note: I was able to claim the authenticated Chrome tab for `https://app.jdtcommandcenter.com/` and inspect the live Maps view. The deployed app was running, authenticated, and loading Google Maps with real project/tree data. I did not create, save, delete, or alter live records.

---

## 1. Executive Summary

The JDT Command Center is no longer a simple prototype. It has become a real custom React/Firebase operating platform with meaningful coverage across Command Board, Relocation & Installation, Freight, Nursery, Equipment, Crews, Crew View, Clients, Calendar, Maps, Reports, Documents, Data Sync, Settings, permissions, workbook import/export, and Firestore sync.

What is working:

- The app has a strong custom-code foundation using React, TypeScript, Firebase Auth, Firestore, Google Maps, Google Sheets authorization, and Cloud Run.
- The app understands the correct JDT divisions: relocation/install, nursery, freight, equipment/maintenance, crews, clients, reporting, maps, and admin.
- The UI has absorbed many of the real JDT operating lessons: project profiles, client rollups, job/project grouping, freight stop workflows, trailer actions, equipment status, tree lifecycle statuses, project site access pins, Ranch Oaks, propagation, status colors, division icons, and workbook-backed data sync.
- The app already has a meaningful automated test inventory in source, covering deployment assumptions, auth, Firestore sync, maps, forms, calendar, relationships, imports, workbook flow, freight workflow, equipment/freight, tree lifecycle, compliance, and dashboards.
- The live app loads from the correct production domain `app.jdtcommandcenter.com` and Google Maps is active.

What is confusing:

- The operating chain is still not strict enough. The intended chain is:

  `Client -> Project -> Work Order / Job -> Assignment -> Field Update -> Report / Dashboard`

  The app supports this concept, but many records can still exist with loose, optional, or fuzzy relationships.
- "Project", "Job", "Work Order", "Assignment", and "Task" are still used in ways that a first-time user will not immediately understand.
- Some actions are still too generic. Buttons like `New Project`, `Create Job`, `Assign Work`, `Request Freight`, and `Create Freight Move` need context-specific wording and field sets.
- Data Sync is powerful, but it still feels like a developer/admin tool. Jennifer and Regina need a safer guided import path with validation, project selection, required fields, and clear error explanations.
- The app has broad capability, but not every capability is yet tied into the daily operating rhythm.

What is incomplete:

- Crew View is not yet a full communication replacement. It needs photo upload/capture, GPS capture, tree tag checklist updates, end-of-day closeout, issue reporting, and acknowledgement.
- Documents/photos are represented, but the storage model is not yet production-grade. The app needs a clear Firebase Storage or Google Drive file strategy with stable links, metadata, permissions, and relationship fields.
- Equipment and freight workflows are strong visually, but double-booking, scheduling conflicts, downtime impact, and driver mobile workflow are not yet fully enforced.
- Workbook backup/import/export exists conceptually, but current workbook data still has schema drift and inconsistent IDs.
- Permissions are functional but broad. Any authorized `@jdtnurseries.com` field user appears able to read all operational records. That may be acceptable for early testing, but it is too broad for mature production.

What is risky:

- Relationship integrity is the largest production risk. If client/project/job IDs drift, reports, maps, schedules, tree records, field updates, and freight assignments will appear disconnected.
- The current sync pattern is whole-collection state synchronization. That is workable for pilot-size data, but it creates concurrency and performance risk as the app grows.
- Most model fields are optional. That makes migration easier but weakens data quality.
- Workbook and app schemas are close, but not fully disciplined yet. For example, some workbook project tree assets use project names or codes instead of stable project IDs.
- Delete/reset capabilities exist and must stay tightly role-gated with confirmations, audit logs, and backup expectations.

Production testing readiness:

The app is ready for a controlled internal pilot with Jeremy, Jennifer, Regina, and a small number of trusted users. It is not yet ready for broad field rollout across all crews and drivers. The pilot should focus on one or two real projects, one daily schedule workflow, one freight workflow, one equipment issue workflow, and one tree lifecycle workflow.

What should improve first:

1. Enforce the operating spine: Client, Project, Work Order/Job, Assignment, Field Update, Report.
2. Stabilize workbook import/export IDs and add validation before saving to Firestore.
3. Build a mobile-first crew closeout flow.
4. Strengthen project-level address/pin/location relationships.
5. Add real document/photo upload and relationship metadata.
6. Add conflict detection for equipment, crews, trucks, and trailers.
7. Tighten role-based visibility and destructive actions.

---

## 2. Current App Understanding

The current app appears to be a custom command center for JDT operations, not an AppSheet app. It uses the Google Sheet as a backup/bulk-entry source, not as the only live application engine. The custom app is intended to become the daily source of truth for:

- Clients and contacts
- Projects and project profiles
- Relocation and installation work
- Tree assets and tree lifecycle tracking
- Root pruning and nutrient care
- Nursery inventory, Ranch Oaks, and propagation
- Freight moves, trailers, trucks, routes, stops, e-POD, and load progression
- Equipment location, maintenance, downtime, assignments, and vehicle compliance
- Crew profiles, skills, driver compliance, CDL status, assignments, and field updates
- Maps, pins, GPS, project locations, and KML backup/import
- Calendar, daily schedule, weekly look-ahead, readiness, and conflicts
- Reports, KPIs, missing data, project risk, and command brief style summaries
- Documents and imported attachments
- Data Sync/import/export to the JDT Command Center workbook

The app appears intended to operate around one central command pattern:

1. A client exists.
2. A project exists under that client.
3. Work orders/jobs are created under that project.
4. Assignments are given to crews, drivers, equipment, or nursery/freight users.
5. Field users update status, notes, photos, GPS, and issues.
6. Management sees status, risk, conflicts, missing information, and decisions.
7. Data is backed up/exported to the JDT Command Center workbook.

The gap between current state and the intended operating system is mostly not missing screens. The gap is reliability of the operating chain. The app has many of the right pieces, but those pieces need stricter relationships, required fields, validation, audit history, and simplified user paths.

---

## 3. Technical Stack and Architecture

### Framework and platform

- Frontend: React 19, TypeScript, Vite
- Styling/UI: Tailwind CSS 4, lucide-react icons, custom JDT visual language helpers
- Backend/runtime: Express static server for built app
- Hosting: Google Cloud Run
- Auth: Firebase Auth, email/password and Google sign-in
- Database: Firestore named database
- Maps: Google Maps JavaScript API with optional map ID
- Sheets: Google Sheets API through OAuth scope from the Firebase Google provider flow
- PDF/reporting: jsPDF and html2canvas in dependencies
- Deployment source: GitHub/Codex workflow, not AI Studio as the long-term source of truth

### Deployment assumptions found

- Canonical production app: `https://app.jdtcommandcenter.com`
- Cloud Run project: `jdt-command-board`
- Cloud Run service: `jd-thornton-nurseries-command-center`
- Region: `us-west1`
- Firestore database ID: `ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e`
- Runtime config served through `/runtime-config.js`
- HTML is cache-controlled to avoid stale app shells after deployment
- Google Maps key is exposed as a Vite/runtime public key, which is expected for Maps browser usage
- Gemini key should remain server-side only if AI features are added later

### Folder structure observed

- `src/App.tsx`: main state orchestration, Firestore collection wiring, modal/drawer coordination, save/delete/import logic
- `src/components`: main boards, drawers, forms, UI helpers
- `src/commandCenter`: data model, relationships, workbook schema, calendar, operating intelligence, visual language, tree lifecycle, personnel, compliance, imports
- `src/firestoreSync.ts`: collection sync operations and Firestore serialization
- `src/useFirestoreCollection.ts`: React hook for Firestore collection state
- `src/AuthProvider.tsx`: Firebase auth and Google Sheets authorization flow
- `docs`: deployment documentation and Codex/Cloud Run notes
- `firestore.rules`: Firestore security rules
- `firebase-applet-config.json`: Firebase project/database configuration

### Authentication and roles

Roles in code:

- `owner_admin`
- `operations_coordinator`
- `office_admin`
- `field_user`
- `contact_only`
- `unauthorized`

Known users are hardcoded by email in the data model:

- Jeremy and Buck as owners
- Jennifer and Max as operations coordinators
- Regina as office admin
- Any `@jdtnurseries.com` user as field user
- Non-domain users are contact-only or unauthorized depending configuration

### Integrations

- Firebase Auth
- Firestore
- Google Maps JavaScript API
- Google Sheets API via OAuth
- Cloud Run
- Google Drive is indirectly represented through URLs/document fields and workbook connection, but not yet a full file storage integration inside the app
- KML import/export for maps

### Architecture strengths

- The app is custom enough to match JDT operations better than a generic template.
- Core domain concepts are centralized in commandCenter modules.
- Visual language is centralized, which is good for consistent division/status colors.
- Firestore rules exist and are more thoughtful than a wide-open database.
- The workbook schema is explicitly modeled in code, which is the right direction.
- There is a strong test inventory in source.
- The app no longer depends on the AI Studio builder as the canonical app source.

### Architecture weaknesses

- `App.tsx` is doing too much orchestration. It owns collection state, modal routing, drawer routing, imports, deletes, and record-specific save logic.
- The data model is very permissive. Almost every field is optional.
- The app often relies on fuzzy matching by name, title, job name, client name, or fallback IDs. That helps with dirty data, but it can hide bad relationships until reports are wrong.
- Whole-collection state syncing is risky as data grows and multiple users edit at the same time.
- File/photo handling is not yet production-grade.
- Permissions are simple and role-based, but not yet record-scoped.
- The app lacks a true backend command/event service. Important actions happen client-side and write directly to Firestore.

---

## 4. Data Model / Schema Audit

The current model set is broad and operationally ambitious. That is good. The core issue is that the app needs to shift from "accept many shapes of data" to "enforce the clean shape of JDT operations."

### Key schema findings

- `clients`, `projects`, `jobs`, `workOrders`, `loads`, `equipment`, `fieldUpdates`, `treeRelocationRecords`, `documents`, `locations`, `staff`, `crews`, `inventoryItems`, `ranchOaks`, `scheduleTasks`, `alerts`, `species`, `syncSources`, `syncMappings`, and `importBatches` are all represented.
- `jobs` and `projects` overlap heavily. The app enriches project-like records into both. This can work during migration, but it should eventually become clearer:
  - `projects`: long-lived client/project container
  - `workOrders`: actionable jobs assigned to a crew, driver, equipment change, nursery task, maintenance task, or freight run
  - `assignments`: the specific person/resource dispatch unit
- Tree assets currently live as `treeRelocationRecords` with project tree asset support. That is acceptable if the model is made stricter.
- Workbook tabs are now close to the app model, but live workbook samples still show drift.
- `DocumentRecord` is too thin for long-term field photos, driver licenses, medical cards, vehicle registration, insurance, BOLs, e-PODs, tree photos, and project documents.
- `LocationRecord` needs to be promoted into a first-class project location model, not just name/address notes.

### Workbook-specific findings

Workbook: `JDT Command Center`  
Spreadsheet ID: `1hhth3Z9DRnVdDiLNZLvLtIME7N6wSfsd8Qz1xJNM1VY`

Important workbook tabs observed:

- `App Import Setup`
- `Projects_Master`
- `Project_Tree_Assets`
- `Project_Root_Pruning`
- `Project_Nutrient_Care`
- `Project_Tree_Photos`
- `Project_Material_Items`
- `Project_Work_Purposes`
- `Daily Dispatch`
- `JDT Inventory Master List`
- `Ranch Oaks`
- `Client Master List`
- `JDT Equipment Master List`
- `Location Names and Addresses Master List`
- `Tree Species Master List`
- `Staff Master List`

Workbook drift found:

- `Staff Master List` still has Buck's old Gmail address in the sampled rows. The app authorization work now expects `buck@jdtnurseries.com`.
- `Project_Tree_Assets` sample rows show inconsistent `Project_ID` values such as project names or short codes instead of stable project IDs.
- `Client Master List` is contact-row oriented, with repeated client company names. The importer can group this, but the backup schema should eventually separate `Clients` and `Client_Contacts`.
- `Location Names and Addresses Master List` includes title/header rows and Google Maps links, but project access types need normalized fields: main address, crew access, truck/equipment access, construction/equipment access pin, load/unload pin, secondary load/unload pin.
- `JDT Equipment Master List` starts with a broad title/header row and many blank service fields. The app can tolerate blanks now, but the workbook should have clean canonical headers.
- Root pruning, nutrient care, and photos tabs were present but largely empty in sampled ranges. The app should support manual fill-in after initial tree import, which it does conceptually.

### Data model table

| Table / Model | Purpose | Current Issues | Recommended Fix | Priority |
|---|---|---|---|---|
| `clients` | Client accounts, contacts, billing info, linked work | Contact info and client account can blur together; matching uses ID and name fallbacks | Split or logically enforce client account plus contact points; require `clientId`, `clientName`, primary contact; support contacts as child records | Critical |
| `projects` | Long-lived project container under a client | Duplicates with `jobs`; many optional fields; site access fields still need stronger structure | Make project the required parent for relocation/install, major nursery sales, and recurring client work; require stable `projectId`, `clientId`, name, division, status | Critical |
| `jobs` | Currently active job/project-like records | Concept overlaps with projects and work orders | Reframe as `workOrders` or migrate gradually; keep `jobs` only if it means active operational job board items | Critical |
| `workOrders` | Assignable work: crew, equipment, freight, nursery, maintenance | Good concept, but should be the operational "job" action layer; needs required fields and status dictionary | Make work order the standard assignment object with type, purpose, projectId, clientId, assignee/resource IDs, dates, location, status | Critical |
| `treeRelocationRecords` | Project tree inventory, status, DBH, root pruning, pins | Strong domain fit; needs strict project relation and bulk edit; imported assets need ID validation | Require `projectId`, tree asset ID/tag, type, status; add events table for pruning/treatment/move/photo | Critical |
| `projectMaterialItems` | Project material/install items | Useful for MacArthur-style install tracking, but needs tie to project/work order/nursery inventory | Link to projectId, source inventory item, required quantity, staged quantity, delivered/installed quantity | High |
| `loads` | Freight moves, trucks, trailers, stops, e-POD | Good stop workflow; needs resource conflict checks and driver mobile view | Add explicit route stop statuses, required docs, driver acknowledgements, truck/trailer/equipment IDs, and conflict detection | High |
| `equipment` | Equipment, trucks, trailers, service, location, compliance | Strong coverage; trailers included; needs repair lifecycle, parts, downtime impact | Split equipment category/status from maintenance events; add service issues/work orders with estimated return date | High |
| `locations` | Saved locations, farms, project pins, access points | Needs stronger typing and project/client scoping | Add `locationType`, `projectId`, `clientId`, `divisionUse`, `lat`, `lng`, `mapsUrl`, `isDefaultForProject`, `accessInstructions` | Critical |
| `fieldUpdates` | Crew/driver updates, status, issues | Good starting point; too thin for actual field closeout | Add update type, related entity type/id, photos, GPS, tree IDs, quantities, hours, blockers, admin review status | Critical |
| `documents` | Documents and file references | Too thin for production attachments | Add storage provider, fileId/path/url, content type, related entity type/id, uploadedBy, uploadedAt, photo GPS, compliance expiration | Critical |
| `staff` / `crews` | Personnel, roles, skills, driver compliance | Good improvements; source data has stale email risk | Normalize personnel into one canonical collection; make driver compliance conditional but required for drivers | High |
| `inventoryItems` | Nursery inventory | Useful, but sales/load/project material bridge needs work | Add availability, hold/reserved status, customer/project allocations, bulk edit | High |
| `ranchOaks` | Special Ranch Oaks inventory | Good separate tab and images | Add same relation/storage model as inventory photos; allow status/history | Medium |
| `scheduleTasks` | Schedule import and calendar source | Useful, but schedule builder needs authority | Make schedule events generated from work orders/loads/equipment/tree events, not disconnected tasks | High |
| `alerts` | Command notifications | Good concept; needs event source and action resolution | Add source entity, severity, owner, due date, acknowledgement, resolvedAt, generatedBy | High |
| `importBatches` | Import history/rollback | Good and necessary | Add row-level validation results, errors, warnings, source tab, project context, rollback safety | High |
| `syncSources` / `syncMappings` | Data source config | Good admin concept | Hide complexity from daily users; expose guided import templates instead | Medium |
| `species` | Tree species reference | Good reference list | Make species selectable everywhere tree type is entered; support synonyms | Medium |

---

## 5. View-by-View UX/UI Audit

### Command Board

Purpose: executive daily command view.  
Primary users: Jeremy, Jennifer, Regina, managers.

What works:

- The codebase has operating intelligence helpers for command brief, relationship issues, project risk, and KPIs.
- The visual direction is correct: today, tomorrow, risk, resource readiness, field updates, and operational exceptions.
- The dashboard is conceptually the right home screen for Jeremy and Jennifer.

What is confusing:

- The app still needs to make the Command Board the unquestioned daily starting point. A new user may see many navigation choices before understanding the daily rhythm.
- If every module feeds alerts and schedule items, the board needs clearer grouping by "needs decision", "needs assignment", "in progress", "blocked", "completed today", and "tomorrow not ready."

Missing information:

- Jeremy decisions needed
- Jennifer follow-ups
- unacknowledged crew updates
- missing data list
- conflict list
- equipment down impact
- project health rollup
- tomorrow readiness by division

Friction:

- If users must open many modules to understand the day, the board is not doing enough.

Mobile issues:

- Jeremy needs a compressed mobile view: top 5 risks, top 5 decisions, current crew/equipment/freight map/list, and quick calls/actions.

Desktop issues:

- For a shop TV or print board, the view should have a display mode with large type and no edit buttons.

Recommended improvement:

- Build a true Daily Command Brief panel: Today, Tomorrow, Blockers, Jeremy Decisions, Equipment Down, Freight Issues, Crew Updates Pending Review, Missing Data, and Print/TV View.

Priority: Critical.

### Relocation & Installation

Purpose: manage relocation jobs, installation jobs, and mixed projects.  
Primary users: Jennifer, Jeremy, project managers, crew leaders.

What works:

- Correct division name and project grouping direction.
- Project profiles include tabs for overview, work orders, trees, equipment, freight, documents, field updates, financials, and history.
- Job type categories are useful: Relocation Job, Installation Job, Mixed Job.
- Tree asset support has become much stronger.

What is confusing:

- "Create Job" can still confuse users if the real object being created is a work order under a project.
- Project vs job vs work order must be visually explained through hierarchy, not training.
- If all projects are displayed flat, repeat clients like Boca West become harder to navigate over time.

Missing information:

- Project-level required fields and completeness score.
- Client/project/job lineage shown on every card.
- Work order owner and next action.
- Crew/equipment/freight readiness on each project row.

Friction:

- Some profile actions are powerful but not yet standardized by assignment type.

Mobile issues:

- Project profiles are rich, but field users need shorter task-first views.

Desktop issues:

- Good candidate for grouped table/cards by client, then project, then active work orders.

Recommended improvement:

- Organize by client. Under each client show projects. Under each project show active work orders/jobs by type: crew, freight, equipment, nursery, maintenance. Rename action buttons around the work order layer.

Priority: Critical.

### Project Profile Drawer

Purpose: full project operating profile.  
Primary users: Jennifer, Regina, Jeremy, project managers.

What works:

- This is one of the strongest parts of the app.
- Tabs match the right operating areas.
- Site access section supports main jobsite, crew access, truck/equipment access, construction/equipment access pin, load/unload pin, and additional load/unload pin.
- Project trees tab supports Add Tree, Import Trees To This Project, Root Pruning, Nutrient Care, Photos, filters, and edit actions.
- Equipment On Site and Request Equipment Change are the right workflow direction.

What is confusing:

- It is still not always obvious which records are directly linked versus matched by fallback names.
- "Financials" exists but likely has limited data hooks so far.

Missing information:

- Project completeness checklist
- Project risk score with reasons
- Recent changes/events
- Required documents
- Project contact list
- Active work orders by division
- Map pins scoped to project

Friction:

- Rich tabs can become heavy if every project has hundreds of trees and many updates. Filters and bulk actions are important.

Mobile issues:

- The full profile is better for office/admin than field use.

Desktop issues:

- Strong structure, but should add sticky project header with client/status/next action.

Recommended improvement:

- Make the project profile the single source for project locations, tree assets, related work orders, related freight/equipment, documents, and field updates. Add a "Data Quality" tab or panel for missing required info.

Priority: Critical.

### Freight

Purpose: truck, trailer, equipment move, and delivery tracking.  
Primary users: Jennifer, dispatcher/admin, drivers, Jeremy.

What works:

- Freight board now has a real shape: fleet vehicles/trailers, vehicle cards, current location, service, load state, compliance, linked work, location history.
- Good action set: Spot Location, Drop Trailer, Hook Trailer, Mark Empty/Loaded, Create Dispatch Move, Report Issue.
- Loads support stops, status progression, dispatch run steps, notes, required documents, dispatch history, e-POD actions, and linked work.
- This correctly absorbs the useful parts of FleetFlow without becoming a separate logistics app.

What is confusing:

- The load creation form can still be long and intimidating.
- Some fields may duplicate stop data if origin/delivery are also captured inside the stop schedule.
- "Schedule As Trip" needs to be removed or renamed if it is not meaningful to JDT users.

Missing information:

- Driver mobile route view
- Resource conflict detection
- Live truck/trailer assignment calendar
- Required docs per stop
- Outside carrier/hired driver profile
- Actual arrival/departure timestamps by stop
- Signature/photo/BOL storage implementation

Friction:

- A dispatcher needs an "Add Stop" first workflow rather than starting with a bunch of fixed stop fields.

Mobile issues:

- Drivers need only their current move, next stop, route/address, contact, notes, status buttons, issue report, and document/photo capture.

Desktop issues:

- Good dispatcher surface, but should add timeline and map route display.

Recommended improvement:

- Make freight moves route-first: Assignment header, then a repeatable stop builder. Each stop stores date, stop type, load category, material/equipment/trailer, main address, access pin, load/unload pin, contact, time, notes, status, actual arrival/departure, and proof requirements.

Priority: High.

### Nursery

Purpose: nursery inventory, Ranch Oaks, propagation, availability, and internal plant flow.  
Primary users: nursery/sales, Jeremy, Jennifer, Regina.

What works:

- All inventory, Ranch Oaks, and Propagation are the correct main tabs.
- Ranch Oaks image gallery direction is right because those trees require special handling and visual inspection.
- Propagation has the right internal concept: seed/cutting/liner/air layer, shade house, cells/pots, 3g, field-ready or step-up.
- Inventory table/card editing exists.

What is confusing:

- Nursery/Sales is not yet fully tied to customer pickups, deliveries, project materials, and loading schedule.
- "All Inventory" can become overwhelming without strong filters and bulk edit.

Missing information:

- Availability/reserved/hold/sold/staged/loaded statuses
- Customer/project allocation
- Sales/customer communication hooks
- Pull/load list workflow
- Material readiness by project
- Farm/zone map integration

Friction:

- Large inventory imports require bulk edit and validation.

Mobile issues:

- Field inventory update needs a fast "adjust quantity/status/location/photo" flow.

Desktop issues:

- Needs filters by farm, zone, species, size, status, availability, source project/client, and sales state.

Recommended improvement:

- Add nursery material allocation: inventory can be reserved for a project/work order/load. Add bulk edit for selected trees/plants and a load/pickup planning view.

Priority: High.

### Equipment

Purpose: equipment, trucks, trailers, maintenance, compliance, location, and availability.  
Primary users: Jeremy, maintenance, Jennifer, drivers, crew leaders.

What works:

- Strong category and status grouping: Down, Inspection, Maintenance, Assigned, Available.
- Cards include location, assigned operator, engine hours, service status, implements, trailer maintenance categories, and vehicle compliance.
- Actions include Set Status, Report Issue, Edit, Delete, Print Service Card, QR.
- Equipment and trailer compliance needs are recognized.

What is confusing:

- Equipment assignment and maintenance work orders need to be clearly separate from equipment profile details.
- Repair status should not be just a card field. It should be a timeline/work order with owner, severity, parts, expected return date, and scheduling impact.

Missing information:

- Maintenance issue history
- Parts/materials needed
- Estimated return to service
- Assigned mechanic
- Downtime impact on scheduled work
- Trailer-specific service checklist

Friction:

- If equipment is both in Freight and Equipment, users need confidence that updating one place updates the other.

Mobile issues:

- Maintenance users need quick issue intake with photos, severity, safety status, and "can operate / do not operate."

Desktop issues:

- Need a service calendar and downtime report.

Recommended improvement:

- Create equipment events/work orders. Equipment profile remains identity/location/compliance. Maintenance work order tracks the active issue and timeline.

Priority: High.

### Crews

Purpose: personnel, roles, skills, driver compliance, contact details, work orders.  
Primary users: Jennifer, Regina, Jeremy.

What works:

- Crew cards now identify primary role clearly.
- Primary skill/task go-to is operationally valuable.
- Driver compliance is recognized and can apply to non-driver roles.
- CDL status and documents are part of the right direction.
- Role list includes operations, crew leaders, drivers, mechanic, irrigation tech, nutrient tech, etc.

What is confusing:

- `Crew Allocation`, `Primary Skill`, `Standout Skills`, `Role`, and `App Access` all need consistent meaning.
- Users need to know whether a person is just a contact, an active field user, an app login user, or a driver-compliance user.

Missing information:

- Active assignment today/tomorrow
- App login status
- Driver compliance expiration dates and missing docs
- Preferred language and bilingual status display
- Certifications and insurance driver status

Friction:

- Personnel data spans staff, crews, and default roster. That should eventually normalize.

Mobile issues:

- Crew leader needs a field view, not the full personnel management view.

Desktop issues:

- Good admin cards, but add filters for "needs compliance", "driver eligible", "CDL", "active today", "missing email", "contact only."

Recommended improvement:

- Make Personnel the canonical collection. Use role, access level, driver compliance, CDL, language, status, and assignments as separate visible fields.

Priority: High.

### Crew View

Purpose: simulate and support what field users see.  
Primary users: Jeremy, Jennifer, Regina, Buck, Max testing field flows; later crew leaders and drivers.

What works:

- Testing-as dropdown is a very good internal testing tool.
- Assignments are pulled from loads, work orders, and jobs.
- Quick status buttons exist: Arrived, Started, Delayed, Need Help, Complete.
- Latest updates and escalation rules are visible.

What is confusing:

- It is not yet obvious whether this is a real field portal or an admin simulation mode.
- Status update buttons are helpful but too shallow for JDT tree/freight/equipment workflows.

Missing information:

- Photo capture/upload
- GPS capture
- Tree tag selection/checklist
- Work completed quantities
- Equipment used
- Issue report
- Tomorrow needs
- End-of-day closeout
- Driver stop progression
- Crew acknowledgement

Friction:

- A crew leader should not have to understand the full app to send useful field data.

Mobile issues:

- This should be designed mobile-first. It is the highest-value field workflow.

Desktop issues:

- Admin simulation is good, but it should be visually labeled as test/admin mode when used by office users.

Recommended improvement:

- Build Crew View around daily assignment cards: "What am I doing?", "Where do I go?", "What trees/material/equipment?", "Update status", "Add photos/GPS", "Report issue", "Close day."

Priority: Critical.

### Clients

Purpose: client accounts, contacts, billing details, linked projects/jobs/work history.  
Primary users: Regina, Jennifer, Jeremy.

What works:

- Client cards show account, contact, phone/email, billing address, additional reps, terms, linked work counts, and full profile drawer.
- Selecting a client opens a richer client profile in the drawer.
- This is the right direction for "connect all dots no matter what tab you are in."

What is confusing:

- Linked work depends on relationship matching. If IDs are wrong, the counts and history can be wrong.
- Additional contacts should be first-class child records, not just array fields imported from repeated workbook rows.

Missing information:

- Current, upcoming, completed, unscheduled work grouped by project
- Last contact/update
- Client follow-up needed
- Open documents
- Open decisions
- Active contacts by role

Friction:

- Repeated client rows in workbook can create duplicate risk unless importer continues to group cleanly.

Mobile issues:

- Jeremy needs fast call/email/map buttons from client/project context.

Desktop issues:

- Good card layout; needs stronger filters and relationship diagnostics.

Recommended improvement:

- Client profile should become a true relationship hub: contacts, projects, work orders, freight, documents, field updates, financials, history, follow-ups.

Priority: High.

### Alerts

Purpose: operations alerts and notices.  
Primary users: Jeremy, Jennifer, Regina.

What works:

- Alert severity and acknowledgement exist.
- Visual tone supports high/warning/notice.
- Alerts can eventually receive generated items from tree lifecycle and equipment/freight issues.

What is confusing:

- "Simulate Alert" should not be visible in production except dev/admin mode.
- Alerts need source and required action. Otherwise they become a notification pile.

Missing information:

- Source record
- Owner
- Due date
- Action taken
- Resolved status
- Alert category
- Generated vs manual

Friction:

- Alerts without a next action can create noise.

Mobile issues:

- Jeremy needs a short critical-only view.

Desktop issues:

- Needs filters by source, division, owner, severity, project, due date.

Recommended improvement:

- Make alerts actionable: "Schedule 1st cut", "Confirm completed", "Equipment down affects tomorrow", "Freight missing trailer", "Decision needed."

Priority: High.

### Calendar

Purpose: daily/weekly/monthly planning, readiness, conflicts, color-coded categories.  
Primary users: Jennifer, Jeremy, Regina.

What works:

- Planner/Grid views exist conceptually.
- Calendar model supports day/week/month, multi-day events, category/status filters, readiness, conflicts, resources.
- Visual category/status system is aligned with JDT's requested colors and icons.

What is confusing:

- Calendar should be visibly tied to work orders, loads, equipment events, tree lifecycle dates, and schedule tasks. If users cannot tell where an item came from, trust will drop.

Missing information:

- Direct create/edit from calendar
- Drag/reschedule
- Publish daily schedule
- Crew/driver acknowledgement
- Print/TV schedule board
- Conflict resolution workflow

Friction:

- Calendar can become too dense without grouping by client/project and category filters.

Mobile issues:

- Field users should not see the full calendar; they need their assignments.

Desktop issues:

- Jennifer needs a real weekly planner and tomorrow builder.

Recommended improvement:

- Keep Planner and Grid. Add a "Schedule Builder" mode for Jennifer: assign work, equipment, freight, and nursery tasks, then publish/print tomorrow.

Priority: High.

### Maps

Purpose: all saved JD Thornton locations, project maps, tree pins, project access pins, Google Maps/Earth-like review, KML import/export.  
Primary users: Jeremy, Jennifer, project managers, crew leaders.

What works:

- Live app loads Google Maps with real project/tree data.
- Default map view can show all JD Thornton locations.
- Project-specific views exist for relocation jobs.
- Add Pin, Open Job, map/earth view, source/destination tree pins, phone GPS, KML export/import are all correct ideas.
- Project pins and saved site locations are being tied toward project profiles.

What is confusing:

- Tree pin list should only appear where relevant. This has been recognized, but it must stay consistent.
- Google Earth "inside the app" should be described carefully. The app can show satellite/tilt style Maps and import/export KML, but Google Earth Web project embedding is limited by Google.
- KML/KMZ import button must either open a clear file picker or show why it cannot.

Missing information:

- Canonical location type labels
- Saved Google Maps list import path
- Pin edit/drag/adjust
- Map-to-project sync confirmation
- Field GPS accuracy and timestamp
- Photo GPS support

Live technical warnings:

- Google Maps warns that `google.maps.Marker` is deprecated in favor of `AdvancedMarkerElement`.
- Google Maps warns that 45-degree imagery on raster maps is deprecated in API version 3.65.
- Google Maps warns that custom map styling may not apply when a map ID is present unless styles are controlled through Cloud Console.

Friction:

- Map interactions can become crowded when all locations and all tree pins appear at once.

Mobile issues:

- GPS pin capture must be a one-tap field flow with confirmation.

Desktop issues:

- Office map review needs filters: all locations, farms, projects, one project, tree pins, access pins, freight pins, equipment locations.

Recommended improvement:

- Treat map pins as first-class records: type, projectId, clientId, locationId, lat/lng, source, createdBy, updatedBy, use cases, notes. Make All JDT Locations the default, then scoped views reduce clutter.

Priority: Critical.

### Reports

Purpose: operational KPIs, project health, export/print reports.  
Primary users: Jeremy, Jennifer, Regina.

What works:

- Code supports operating KPI groups: project health, crew communication, freight readiness, equipment readiness, tree lifecycle, data quality.
- jsPDF/html2canvas support exists for report export.
- This is the right direction.

What is confusing:

- Counts alone are not enough. JDT needs actionable reports.

Missing information:

- Daily recap
- Weekly look-ahead
- Project health report
- Missing data report
- Crew productivity
- Freight performance
- Equipment downtime impact
- Tree lifecycle progress
- Client follow-up report
- Change-order risk hooks

Friction:

- Reports should link back to source records, not just summarize.

Mobile issues:

- Jeremy needs short command summaries.

Desktop issues:

- Jennifer/Regina need exportable, printable reports.

Recommended improvement:

- Convert reports from summary counts into management packets: Daily Command Brief, Weekly Look-Ahead, Project Status, Tree Lifecycle, Equipment Downtime, Freight Performance, Missing Data.

Priority: High.

### Documents

Purpose: permits, BOLs, proofs, project files, photos, compliance documents.  
Primary users: Regina, Jennifer, drivers, crew leaders, Jeremy.

What works:

- A Documents board exists.
- Documents can be linked to a project/job by prompt/form.
- Search exists.

What is confusing:

- Current Add Document uses prompts, which is not production-quality UX.
- It is not yet clear where files are actually stored.
- Documents and photos should have different capture/review paths.

Missing information:

- Upload/capture mechanism
- Storage backend
- Related entity type/id
- Expiration dates for compliance docs
- Photo GPS/exif
- Document categories by workflow
- Review/approval state

Friction:

- Prompt-based document entry is too loose for Regina/Jennifer.

Mobile issues:

- Field photo capture must be simple and attached to tree/job/update automatically.

Desktop issues:

- Document library needs filters by project, client, type, status, missing/expired.

Recommended improvement:

- Implement structured file/photo upload with Firebase Storage or a controlled Google Drive integration. Every document needs a relationship: client, project, work order, tree, equipment, vehicle, personnel, load, or field update.

Priority: Critical.

### Data Sync

Purpose: import/export between JDT Command Center workbook and app.  
Primary users: Regina, Jennifer, Jeremy/admin.

What works:

- This is a powerful admin surface.
- It supports staging, preview, save to app, import batch history, rollback, workbook backup export, write to workbook, and write setup.
- It correctly frames the workbook as the single spreadsheet source of truth for backup/bulk-entry.
- It supports project-context imports for project tree assets.

What is confusing:

- It is still too developer-like for everyday users.
- The app should clearly choose one import path based on what the user is doing: master list import, project tree import, schedule import, or workbook backup export.
- "Errors 0" should not be hardcoded. Users need real validation feedback.

Missing information:

- Row-level validation errors
- Required fields before save
- Project selector on imports
- Import target preview by collection
- Relationship repair suggestions
- Export diff before overwriting workbook
- Last sync direction and timestamp per tab

Friction:

- Copy/paste imports are flexible, but they can let dirty headers or bad IDs through unless validated.

Mobile issues:

- Data Sync should be desktop/admin only.

Desktop issues:

- Needs a safer guided wizard.

Recommended improvement:

- Split Data Sync into guided flows:
  - Import Master Lists
  - Import Project Tree Assets
  - Import Schedule / Daily Dispatch
  - Export App Backup to Workbook
  - Validate / Repair Data

Priority: Critical.

### Settings

Purpose: security, API keys, data cleanup, seed cleanup, reset actions.  
Primary users: Jeremy/admin/developer.

What works:

- Seed cleanup exists and is owner-admin gated.
- Data reset is owner-admin gated.
- Settings surfaces API/security/source/data sections.

What is confusing:

- "Open Settings" likely does not yet provide enough operational configuration.
- Reset actions are powerful and dangerous, even when gated.

Missing information:

- Environment status
- Current Firestore database ID
- Current app version/build/deployed commit
- Current Google Maps key status
- Current workbook connection status
- Backup/export status
- User/role administration

Friction:

- Manual seed batch ID entry is useful for developers but risky for non-technical users.

Mobile issues:

- Should not be field-user visible beyond minimal account info.

Desktop issues:

- Good for owner/admin only.

Recommended improvement:

- Add an Admin Health screen: app version, database, domain, user roles, workbook connection, Maps API status, last backup, last import, known data quality issues.

Priority: Medium.

### Auth / Permissions

Purpose: secure sign-in and role access.  
Primary users: all.

What works:

- Firebase Auth is configured.
- Known user roles are mapped.
- Google sign-in and email/password are supported.
- App denies unauthorized users.
- Google Sheets scope is requested through Google provider when needed.

What is confusing:

- New user onboarding/approval is not fully visible from the app perspective.
- Field users may be able to read more than they need.

Missing information:

- User approval workflow
- Role management UI
- Pending users
- Last login
- Disabled users
- Record-level visibility

Friction:

- If Buck or another user is not created in Firebase Auth, they cannot log in with email/password even if their email is allowed in app role logic.

Mobile issues:

- Field users need simple sign-in and stay-signed-in behavior.

Desktop issues:

- Admins need a user access page.

Recommended improvement:

- Add a Users & Access admin screen backed by Firebase users/custom claims or a Firestore user profile collection, with invite/status/role and record visibility expectations.

Priority: High.

---

## 6. Workflow Audit

### Create job / project

Current user path:

- User clicks `New Project` or `Create Job` from a board.
- A project/job form opens.
- App enriches and may save data into both `projects` and `jobs`.
- Work orders can later be assigned from project profile.

Bottlenecks:

- The terminology is not clear enough.
- Work that is really an assignment may be created as a job/project.
- The app does not yet force a clean client -> project -> work order relationship.

Recommended improved path:

1. Create or select client.
2. Create project under client.
3. Add project site addresses/pins.
4. Create work order under project.
5. Assign crew/freight/equipment/nursery/maintenance resources.
6. Publish to calendar/Crew View/Driver View.

Priority: Critical.

### Update job / project

Current user path:

- Open project/job drawer.
- Edit record or use tabs.
- Related work appears through direct IDs and fallback matching.

Bottlenecks:

- Fallback matching is helpful now but dangerous later.
- Users need visible data completeness and relationship health.

Recommended improved path:

- Every project profile shows a relationship health banner:
  - Client linked
  - Project ID valid
  - active work orders linked
  - project locations set
  - tree records linked
  - documents linked
  - missing fields listed

Priority: High.

### Daily schedule

Current user path:

- Command Board, Calendar, work orders, loads, and schedule tasks all contribute.
- Crew View can show assignments.

Bottlenecks:

- No single "publish tomorrow's schedule" workflow yet.
- No acknowledgement loop from crew/drivers.

Recommended improved path:

1. Jennifer opens Tomorrow Builder.
2. App lists all active projects needing work.
3. Jennifer assigns crew/equipment/freight/nursery tasks.
4. App flags missing locations/equipment/trucks/trailers/conflicts.
5. Jennifer publishes schedule.
6. Crew/driver views show assignments.
7. Crew/driver acknowledge or ask for help.

Priority: Critical.

### Weekly look-ahead

Current user path:

- Calendar can display week/month.
- Schedule events come from several record types.

Bottlenecks:

- Weekly planning is not yet its own operating view.
- Equipment conflicts and tree lifecycle dates need stronger surfacing.

Recommended improved path:

- Weekly Look-Ahead view grouped by client/project and division:
  - relocation/install milestones
  - root pruning due dates
  - nutrient care
  - freight moves
  - equipment commitments
  - maintenance downtime
  - nursery pickups/deliveries
  - decisions needed

Priority: High.

### Field crew update

Current user path:

- Crew View user selects/testing-as crew.
- Assignment cards can be updated with quick status buttons.
- Field update records are submitted.

Bottlenecks:

- No tree tag checklist.
- No photo capture/upload.
- No GPS capture attached to update.
- No end-of-day closeout summary.

Recommended improved path:

- Each assignment has:
  - Arrived
  - Started
  - Add tree tags worked
  - Add photos
  - Add GPS note
  - Report issue
  - Request help
  - Close day

Priority: Critical.

### End-of-day closeout

Current user path:

- Not yet a complete dedicated workflow.

Bottlenecks:

- Field updates may be too scattered.
- Jennifer still may need calls/texts to understand what happened.

Recommended improved path:

1. Crew leader opens today's assignment.
2. Taps Closeout.
3. Selects work completed, tree tags, quantities, photos, issues, equipment used, tomorrow needs.
4. App marks update as needs admin review.
5. Command Board shows incomplete closeouts and issues.
6. Jennifer reviews and accepts/updates project records.

Priority: Critical.

### Tree record update

Current user path:

- Project profile Trees tab supports add/import/edit.
- Maps supports source/destination pins and status.
- Tree lifecycle alerts can be generated.

Bottlenecks:

- Tree records must always be tied to stable project IDs.
- Bulk edit is needed for large jobs.
- Tree events should be separated from current tree status.

Recommended improved path:

- Tree asset record stores identity/current state.
- Tree events record root pruning, nutrient care, photos, moves, invoices, payments.
- Bulk select trees and apply status/date/assignment updates.
- Lifecycle rules generate alerts and schedule suggestions.

Priority: Critical.

### Tree photo/GPS capture

Current user path:

- Maps supports GPS and pins.
- Documents can represent photos by URL/category.
- Project tree photos workbook tab exists.

Bottlenecks:

- No production-grade upload/capture flow.
- Photo, GPS, tree tag, project, work order, and field update must remain connected.

Recommended improved path:

- Field user selects tree or assignment.
- Taps Add Photo.
- App captures/uploads file, stores metadata, links to tree/project/work order/update, and records location/time/user.

Priority: Critical.

### Equipment assignment

Current user path:

- Project profile can Request Equipment Change.
- Equipment cards show status/location/assignment.
- Work orders can represent equipment requests.

Bottlenecks:

- Need conflict detection.
- Need JD equipment vs rental equipment flow.
- Need equipment-on-site timeline.

Recommended improved path:

- Equipment request creates a work order with needed equipment type, implement list, date range, project, location, reason, and priority.
- App suggests available equipment and flags conflicts.
- Assignment updates equipment location/status and project equipment list.

Priority: High.

### Maintenance issue

Current user path:

- Equipment/Freight can Report Issue.
- App can create maintenance alerts/work orders.

Bottlenecks:

- Repair lifecycle is not complete enough.

Recommended improved path:

- Issue intake includes severity, can operate/do not operate, photos, notes, reported by, location.
- Maintenance work order tracks mechanic, parts, status, estimated return, and downtime impact.
- Calendar and Command Board show affected assignments.

Priority: High.

### Freight delivery

Current user path:

- Freight board and load form support driver/truck/trailer, stops, route steps, POD, statuses, notes, documents.

Bottlenecks:

- Driver mobile mode is not fully built.
- Stop workflow needs to be the primary form, not an afterthought.

Recommended improved path:

- Dispatcher creates freight move route with repeatable stops.
- Driver sees only current route.
- Driver updates actual arrival/departure/status and uploads BOL/photo/signature.
- App updates dashboard and trailer/equipment locations.

Priority: High.

### Nursery/sales task

Current user path:

- Nursery inventory and propagation exist.
- Project material items exist.

Bottlenecks:

- Material availability is not yet tied strongly to sales/customer pickups, project installs, or freight loads.

Recommended improved path:

- Create nursery material work order: pull/stage/load/deliver/pickup/install.
- Link to inventory item(s), project/client, load, crew, and date.
- Track readiness and quantities.

Priority: High.

### Admin data entry

Current user path:

- Use Data Sync, Clients, Crews, Equipment, Project forms, workbook.

Bottlenecks:

- Too many possible places to enter similar information.
- Workbook can drift from app model.

Recommended improved path:

- Regina/Jennifer use guided admin tasks:
  - Add client/contact
  - Add project
  - Add project locations
  - Import project trees
  - Add equipment/personnel
  - Validate missing data

Priority: Critical.

### Manager review

Current user path:

- Command Board, Reports, Alerts, Field Updates, Project profiles.

Bottlenecks:

- Need an explicit review queue.

Recommended improved path:

- Review Queue: field updates, photos, closeouts, missing data, conflicts, unresolved alerts, documents needing review.

Priority: High.

### Owner command view

Current user path:

- Command Board and other modules.

Bottlenecks:

- Jeremy needs fast answers while moving between sites.

Recommended improved path:

- Owner view:
  - What changed today
  - What is stuck
  - Who needs an answer
  - What equipment is short/down
  - Which job needs attention first
  - Call/text/map shortcuts

Priority: Critical.

---

## 7. First-Time User Audit

Pretend I have never seen the app.

What is intuitive:

- The left navigation makes the main divisions clear.
- Icons and colors help distinguish category types.
- Client, Equipment, Crews, Freight, Nursery, Maps, and Calendar labels mostly make sense.
- Project profile tabs are understandable once a project is opened.
- Crew cards now communicate role and skill better than earlier versions.

What is confusing:

- I do not immediately know the difference between Project, Job, Work Order, Assignment, and Task.
- `New Project` appearing as a top action on many screens can make me think everything starts as a project, even when I need a work order or freight move.
- Data Sync feels like a technical/import tool. I would not know what template to choose without training.
- In Maps, I need to understand when I am looking at all locations, one project, tree pins, project access pins, or farm pins.
- The app has many powerful actions. A first-time user may worry about breaking data.

Terms that need clarification:

- Job
- Work Order
- Assignment
- Dispatch Run Steps
- Schedule As Trip
- Tree Assets
- Field Updates
- Project Material Items
- Source Pin vs Destination Pin
- Nutrient Care vs Aftercare
- Seed batch cleanup

Where onboarding is needed:

- First sign-in: role and what this user should do
- Command Board: "start here"
- Project profile: what each tab means
- Data Sync: when to import vs manually enter
- Crew View: how field users report work
- Maps: what pin types mean

Where labels/buttons should change:

- `Create Job` should often become `Create Work Order`.
- `New Project` should only create a project, not every kind of action.
- `Assign Work` should become `Create Crew Work Order` when used for crews.
- `Request Freight` should become `Create Freight Request` or `Dispatch Freight Move`.
- `Request Equipment Change` is good, but should show whether it creates an equipment work order.
- `Data Sync` could be `Import / Backup` for admin users.

What should be simplified:

- Long forms should use progressive sections.
- Required fields should be visible and minimal.
- Dropdowns should prefer existing data but allow manual entry.
- Field users should never see admin-level complexity.

What a new user would likely do wrong:

- Create a job when they meant to create a project.
- Create a project when they meant to create a work order.
- Enter project names instead of selecting existing project IDs.
- Add a location globally instead of tying it to a project.
- Import tree records without selecting the target project.
- Upload or paste a document link without linking it to the right entity.
- Use the wrong status because status labels are broad.

---

## 8. Experienced JDT User Audit

Pretend I deeply understand JDT operations.

Does the app match real field workflow?

Mostly yes in concept. The app now reflects JDT's actual vertical integration better than a typical CRM or project tracker. It understands that one project can require:

- tree relocation
- installation
- root pruning
- nutrient care
- freight
- trailers
- equipment moves
- nursery material
- maintenance
- crew assignments
- maps/access pins
- daily scheduling
- photos and field updates

What is too slow:

- Opening multiple tabs/boards to understand one project.
- Long forms for freight and assignments.
- Manual selection of project/client/job if context should already be known.
- Data import without a guided project-specific path.
- Field status updates if they require typing.

What is overcomplicated:

- Broad all-purpose forms.
- Multiple overlapping record types.
- Data Sync template list for daily users.
- Any action that makes users decide whether something is a job, project, work order, or assignment.

What is missing for daily use:

- Publishable daily schedule.
- End-of-day closeout.
- Photo/GPS capture.
- Driver mobile workflow.
- Equipment/truck/trailer conflict detection.
- Project missing-data queue.
- Review/approval queue for field updates.
- Real file upload/attachments.
- Strong map pin editing and saved location reuse.

What would frustrate Jeremy:

- Not being able to answer "what changed today" in one screen.
- Having to open several modules to know what is stuck.
- Lack of a short decision-needed list.
- Equipment down status not showing scheduling impact.
- Field updates without photos/tree tags/GPS.
- Relationship issues that make reports unreliable.

What would frustrate Jennifer:

- No single tomorrow schedule builder.
- Missing conflict detection.
- Long forms with repeated project/client data.
- Having to chase crew updates by phone/text.
- Import paths that require remembering the right template.
- Work orders not clearly grouped by client/project.

What would frustrate Regina:

- Too many places to enter similar data.
- Unclear required fields.
- Data Sync too technical.
- Duplicate client/contact records.
- Project/job terminology.
- No clear "missing data I need to fix" queue.

What would frustrate crew leaders:

- Too many screens.
- Too much text.
- Not enough mobile-first "today's task" focus.
- No simple photo/GPS/tag update.
- Assignment cards without clear address/access notes/equipment needs.

What would frustrate drivers:

- Freight form/data not translated into a clean stop-by-stop route.
- Missing current trailer/truck/load status.
- No easy status updates for arrived/loaded/unloaded/dropped/hooked.
- No e-POD capture that feels like a driver app.

What would frustrate maintenance/equipment users:

- Equipment issue reports not turning into a clear repair workflow.
- No parts/estimated return/downtime impact.
- Trailers not treated with full maintenance detail.

---

## 9. First-Time vs Experienced User Comparison

| Workflow / Screen | First-Time User Experience | Experienced JDT User Experience | Where They Agree | Where They Differ | Best Redesign Choice |
|---|---|---|---|---|---|
| Command Board | Understands it is important but may not know what to act on | Wants immediate decisions, blockers, changes, tomorrow readiness | Needs to be the daily home | Experienced user expects operational depth | Add role-based command brief and action queues |
| Relocation & Installation | Likes project list but gets confused by job/project/work order | Wants client -> project -> work order grouping | Needs clearer hierarchy | Experienced user can tolerate terms but still loses speed | Group by client/project and standardize work order language |
| Project Profile | Tabs make sense but feel dense | Very useful if all data is linked correctly | Needs strong relationship clarity | Experienced user wants more detail | Add completeness/risk banner and sticky project context |
| Freight | Understands trucks/trailers but form is long | Needs route/stop workflow and trailer activity | Needs simpler dispatch | Experienced user wants complex multi-stop support | Route-first freight move builder |
| Equipment | Cards are intuitive | Needs downtime, service, parts, conflicts | Status/location matters | Experienced user needs maintenance depth | Split equipment profile from maintenance work orders |
| Crews | Role/phone/skill easy | Needs driver compliance, skills, active assignments | Personnel cards useful | Experienced user needs filters/compliance | Personnel profile plus active work and compliance filters |
| Crew View | Simple idea, not enough guidance | Must replace calls/texts | Needs mobile simplicity | Experienced user needs tags/photos/GPS/closeout | Daily assignment card and closeout workflow |
| Clients | Cards are understandable | Needs full relationship hub | Client context matters | Experienced user depends on history/current work | Client profile with projects/jobs/docs/updates/follow-ups |
| Calendar | Familiar grid/planner helps | Needs schedule builder and conflicts | Calendar is needed | Experienced user needs resource logic | Planner/Grid plus publishable daily schedule |
| Maps | Impressive but potentially busy | Critical for pins, access, tree locations | Needs scoping/filtering | Experienced user needs project/farm views | First-class pin records and scoped views |
| Documents | Understands document library | Needs real attachment workflow | Needs linking | Experienced user needs BOL/photos/compliance | Structured upload with entity relationships |
| Data Sync | Intimidating | Useful but dangerous if loose | Needs validation | Experienced user may understand templates but not want risk | Guided import/export wizards |

---

## 10. Bottlenecks and Confusion Points

Ranked by operational impact:

1. Relationship integrity is not strict enough. Records can be linked by fallback names instead of stable IDs.
2. Project/job/work order/assignment terminology is still confusing.
3. Crew View is not yet enough to replace phone/text field updates.
4. Photo/document storage and relationship tracking are incomplete.
5. Data Sync and workbook import paths need stronger validation and project context.
6. Equipment/truck/trailer/crew conflict detection is not yet enforceable enough.
7. Maps and project locations need first-class pin records and clear scoping.
8. Command Board needs stronger action queues for decisions, blockers, missing data, and tomorrow readiness.
9. Forms can be too long and too generic.
10. Workbook schema still has drift from app model.
11. Field/mobile workflows need simplification and role-specific views.
12. Permissions are useful but not yet record-scoped.
13. Deletion/reset actions exist and need audit trails plus safer production UX.
14. Reporting is promising but not yet full operational reporting.
15. Whole-collection sync may not scale cleanly with heavy field use.

Confusing navigation:

- Many modules are correct, but the user needs "start here" role homes.
- Project profile and client profile are strong but must be easier to reach from every related card.

Duplicate data entry:

- Client and project names can be entered manually in several places.
- Locations can exist as address text, pin text, project fields, or location records.
- Tree records can come from project tree assets, tree relocation records, map pins, and workbook tabs.

Hidden actions:

- Some of the most important actions are inside drawers or tab-specific buttons.

Unclear statuses:

- Status dictionary is improving, but operational status needs more explicit definitions by entity type.

Unclear ownership:

- Alerts, work orders, field updates, equipment issues, and missing data need an owner.

Missing required fields:

- Client ID, project ID, work order type, assignee/resource, date, location, status, and source entity should be required depending workflow.

Weak mobile flow:

- Field users need task cards, not admin dashboards.

Weak reporting:

- Reports need to become decision tools, not just count summaries.

---

## 11. Streamlining Recommendations

### Fewer clicks

- When creating anything from a project profile, prefill client, project, project locations, division, and job type.
- Add quick actions directly on project/work order cards: Assign Crew, Request Equipment, Request Freight, Add Field Update, Add Photo, Open Map.
- Allow bulk select and bulk edit for project trees and nursery inventory.
- Add one-click "Open client", "Open project", "Open map", and "Call contact" where relevant.

### Better default views

- Jeremy default: Command Brief.
- Jennifer default: Tomorrow Builder / Weekly Look-Ahead.
- Regina default: Data Quality / Admin Entry Queue.
- Crew leader default: My Assignments Today.
- Driver default: My Current Route.
- Maintenance default: Open Equipment Issues.
- Nursery/sales default: Material Readiness and Pickup/Load Schedule.

### Better dashboard layout

- Top section: Today/Tomorrow/Blockers/Decisions.
- Middle section: Crew, Equipment, Freight, Nursery readiness.
- Lower section: Field updates, missing data, recent changes.
- Side panel: urgent alerts and Jeremy decisions.

### Better mobile forms

- Crew form should be no more than:
  - status
  - notes
  - tree tags/material items
  - photos
  - GPS
  - issue/help request
  - closeout
- Driver form should be:
  - next stop
  - route/maps
  - arrived/departed/loaded/unloaded/dropped/hooked
  - notes
  - proof upload
  - issue report

### Role-based home screens

- Field users should not land on full admin navigation.
- Office users need all data tools.
- Owner/admin users need power tools but with clearer destructive-action separation.

### Quick actions

- Project card: Create Work Order, Add Location, Import Trees, Request Equipment, Request Freight, Open Map, Add Document.
- Tree card: Edit, Bulk Select, Mark 1st Cut Scheduled, Mark 1st Cut Complete, Mark 2nd Cut Scheduled, Ready, Relocated, Add Photo, Add Pin.
- Equipment card: Assign, Move, Report Issue, Mark Down, Mark Available, Request Service.
- Trailer card: Spot, Hook, Drop, Mark Empty, Mark Loaded, Report Issue.

### Better status labels

- Define statuses by entity type, not one universal bucket.
- Example: Tree relocation statuses should stay separate from freight statuses and equipment statuses.

### Better filters/search

- Global search across client, project, job/work order, tree tag, equipment unit, truck/trailer, crew member, location.
- Project tree filters: tree asset ID, species, status, DBH, difficulty, priority, relocation required, pruning stage, nutrient care, missing pin, missing photo.
- Calendar filters: client, project, category, status/risk, assignee, resource, location.

### Clearer job cards

Every work order card should answer:

- What is this?
- Who is it for?
- Which client/project?
- Where?
- When?
- Who is assigned?
- What resource is needed?
- What is the next action?
- What is blocking it?

### Stronger required fields

Required fields should depend on record type:

- Project: client, project name, division, status, main location.
- Work order: project, type, purpose, date, assignee/resource, location, status.
- Freight move: driver or outside carrier, truck if internal, trailer if needed, date, stop list.
- Tree: project, tree asset ID/tag, type, status.
- Equipment issue: equipment, severity, can operate/do not operate, location, reported by.

### Better end-of-day workflow

- One daily closeout queue for Jennifer.
- Crew leaders submit closeout.
- App flags incomplete closeouts.
- Jennifer reviews and accepts updates.
- Accepted updates feed project history, tree status, reports, and tomorrow planning.

### Better schedule conflict detection

- Same crew on overlapping assignments.
- Same driver on overlapping freight moves.
- Same truck/trailer on overlapping loads.
- Same equipment on overlapping work orders.
- Equipment down but assigned.
- Project location missing.
- Tree lifecycle due date missed.

### Better print/TV command board

- Large text mode.
- Today and tomorrow.
- Group by division.
- Show crew, location, equipment, freight, blockers.
- No edit controls.
- Print-friendly PDF/export.

---

## 12. Missing Features / Future Features

### Must-have missing or incomplete features

- Daily Command Brief with action queues
- Tomorrow Builder
- Weekly Look-Ahead
- Field closeout workflow
- Photo/GPS capture and upload
- Project location/pin management as first-class records
- Equipment/freight/crew conflict detection
- Data quality and relationship repair dashboard
- Guided import/export wizard
- Real document/file storage
- User/role management screen
- Audit log/change history
- Work order owner and assignment acknowledgement

### Important next features

- Missing-data report
- Review queue for field updates/photos
- Client follow-up queue
- Project status PDF
- Crew productivity summary
- Freight performance summary
- Equipment downtime impact report
- Nursery material readiness
- Bulk edit for tree/project inventory and nursery inventory
- Driver mobile route workflow
- Maintenance parts/timeline tracking
- App version/environment health screen

### Advanced future features

- AI-generated daily command brief
- AI-generated client update emails/texts
- AI change-order risk detection
- AI missing-data cleanup suggestions
- Predictive equipment conflict warnings
- Profitability/margin dashboard
- Weather-aware work planning
- Google Drive folder auto-linking
- KML/KMZ client file processing pipeline
- Spanish-first field view
- Offline-first mobile field mode

---

## 13. Code Quality / Technical Debt

### Strengths

- TypeScript models exist for the operational records.
- Domain logic is not all embedded in UI components; key helpers live in `src/commandCenter`.
- Tests exist for many of the most important workflows.
- Firestore serialization strips undefined values, which fixed a real Firestore write issue.
- Visual language is centralized.
- Tree lifecycle rules are centralized.
- Workbook project flow schema is centralized.
- Deployment docs are clear and specific.
- Firestore rules are present and role-aware.

### Technical debt

- `App.tsx` has too many responsibilities:
  - collection sync
  - modal/drawer state
  - save switch for many record types
  - delete logic
  - imports/rollback
  - enrichment logic
  - seed cleanup
- Whole-collection sync is not ideal for future high-volume edits.
- Many fields are optional, which means the UI must compensate for missing data everywhere.
- Relationship helpers use fallbacks by names/titles. This is useful during migration but risky in production.
- Some encoding artifacts appear in relationship normalization patterns, suggesting a copy/encoding cleanup need.
- Document storage is not yet implemented as a robust service.
- Error handling is uneven. Some flows use alerts/prompts, others use structured forms.
- The app lacks a dedicated backend/API layer for important business actions.
- No evidence of end-to-end browser test automation running in this environment.

### Performance risks

- Loading full collections into app state will become expensive with:
  - thousands of tree records
  - many field updates/photos
  - large document lists
  - real-time multi-user edits
- Calendar and reports derive from many collections client-side, which can become slow.
- Maps with many tree pins need clustering/filtering.

### Security risks

- Field users appear able to read all app collections if authorized by domain.
- Destructive operations exist and need strong UI gating, audit log, and backups.
- Public browser API keys are normal for Maps but must be domain-restricted in Google Cloud.
- Driver license, medical cards, registrations, and insurance documents are sensitive enough to require careful access rules and storage paths.

### Maintainability risks

- As workflows grow, the current modal `type` switch can become brittle.
- Record enrichment should move into domain-specific services.
- Forms need reusable section components and validation schemas.
- The app needs a migration/versioning strategy for Firestore data and workbook schema.

---

## 14. Risk Assessment

| Risk | Why It Matters | Likelihood | Impact | Recommendation |
|---|---|---:|---:|---|
| Data relationship drift | Reports, maps, schedules, and client histories become unreliable | High | Critical | Enforce stable IDs and add relationship validation |
| Duplicate records | Regina/Jennifer may create duplicate clients/projects/equipment | Medium | High | Add duplicate detection and select-existing flows |
| Workbook/app schema drift | Backup/import/export becomes untrustworthy | High | High | Canonical workbook schema validation and setup writer |
| Field user confusion | Crews/drivers stop using the app and return to calls/texts | High | Critical | Mobile-first role views and closeout workflow |
| Missing photo/GPS links | Tree proof and job history become incomplete | High | High | Implement structured file/photo upload with metadata |
| Equipment conflicts | Equipment/trailers get double-booked or unavailable | Medium | High | Add resource conflict detection |
| Freight route mistakes | Drivers receive wrong address/pin/trailer details | Medium | High | Project-scoped locations and route-first stop workflow |
| Broad read permissions | Sensitive data visible to too many users | Medium | High | Record-scoped role visibility |
| Data loss from reset/delete | Production data can be removed accidentally | Low/Medium | Critical | Audit log, backup/export, stricter confirmations |
| Sync/concurrency conflicts | Multi-user edits overwrite each other | Medium | High | Move toward doc-level writes and transactions |
| Poor offline behavior | Field updates may fail in low-signal areas | Medium | Medium/High | Add offline queue strategy or clear online requirement |
| Unreliable reporting | Management loses trust in app | Medium | High | Data quality dashboard and relationship health |
| Sensitive compliance docs | Driver licenses/medical cards need secure storage | High | High | Secure storage rules and restricted views |

---

## 15. Prioritized Improvement Backlog

### Phase 1: Must fix before serious production testing

| Priority | Area | Problem | Recommended Fix | User Impact | Technical Effort | Operational Impact | Suggested Phase |
|---|---|---|---|---|---|---|---|
| Critical | Relationships | Client/project/job/work order links are too loose | Enforce stable IDs and add validation/repair dashboard | All users trust records | High | Critical | 1 |
| Critical | Project workflow | Project/job/work order terms confuse users | Define hierarchy and rename actions accordingly | Jennifer/Regina enter correctly | Medium | Critical | 1 |
| Critical | Data Sync | Imports can accept bad project IDs or dirty rows | Add guided project import wizard and row validation | Regina/Jennifer safer imports | Medium/High | Critical | 1 |
| Critical | Crew View | Field updates do not yet replace calls/texts | Add mobile closeout with status, notes, tags, photos, GPS, issues | Crew leaders and Jennifer | High | Critical | 1 |
| Critical | Documents/photos | Attachment storage is not production-grade | Implement Firebase Storage or controlled Google Drive upload model | All field proof/compliance | High | Critical | 1 |
| Critical | Maps/locations | Pins and addresses need first-class project records | Normalize project locations and map pins | Freight/crew accuracy | Medium/High | Critical | 1 |
| High | Calendar | No publishable tomorrow schedule | Build Tomorrow Builder with readiness/conflicts | Jennifer/Jeremy | High | Critical | 1 |
| High | Equipment/freight | No enforced conflict detection | Detect resource overlaps and down equipment assignments | Scheduling reliability | Medium/High | High | 1 |
| High | Permissions | Field users may see too much | Add user management and record-scoped visibility plan | Security | Medium/High | High | 1 |
| High | Settings | Production health not visible | Add Admin Health screen | Jeremy/developer | Medium | High | 1 |

### Phase 2: Fix during active testing

| Priority | Area | Problem | Recommended Fix | User Impact | Technical Effort | Operational Impact | Suggested Phase |
|---|---|---|---|---|---|---|---|
| High | Freight | Driver workflow not mobile-first | Build driver route mode with stop progression and e-POD | Drivers/Jennifer | High | High | 2 |
| High | Equipment | Maintenance lifecycle shallow | Add repair work orders, parts, ETA, downtime | Jeremy/maintenance | Medium/High | High | 2 |
| High | Reports | KPIs need actionable reporting | Add Daily Recap, Weekly Look-Ahead, Project Status, Missing Data | Jeremy/Jennifer | Medium | High | 2 |
| High | Bulk edits | Tree/inventory updates are too manual | Add bulk select/update for project trees and nursery inventory | Regina/Jennifer | Medium | High | 2 |
| Medium | Clients | Client profile needs full history/follow-ups | Add follow-up queue and work history filters | Jeremy/Regina | Medium | Medium/High | 2 |
| Medium | Alerts | Alerts need owners/actions | Add source, owner, due date, resolution | Jeremy/Jennifer | Medium | High | 2 |
| Medium | Workbook | Backup/export needs diff/review | Add export preview and changed rows summary | Regina/Jeremy | Medium | Medium | 2 |

### Phase 3: Improve after users adopt it

| Priority | Area | Problem | Recommended Fix | User Impact | Technical Effort | Operational Impact | Suggested Phase |
|---|---|---|---|---|---|---|---|
| Medium | Nursery/Sales | Material readiness not fully operational | Add pull/load/pickup/sales allocation workflows | Nursery/sales | Medium/High | High | 3 |
| Medium | Project financials | Financial hooks not mature | Add estimated revenue/cost/change order/invoice fields | Jeremy | Medium/High | High | 3 |
| Medium | Audit history | Changes not fully event-sourced | Add audit/event records for key actions | Admin/management | High | High | 3 |
| Medium | Print/TV | Shop board not dedicated | Add display mode and print views | Field/shop | Medium | Medium/High | 3 |
| Medium | Search | Need cross-app search | Add global search with entity filters | All users | Medium | Medium | 3 |
| Low/Medium | UX polish | Some forms are long | Progressive forms and role-specific forms | All users | Medium | Medium | 3 |

### Phase 4: Advanced automation / AI / reporting

| Priority | Area | Problem | Recommended Fix | User Impact | Technical Effort | Operational Impact | Suggested Phase |
|---|---|---|---|---|---|---|---|
| Medium | AI command brief | Jeremy needs summarized operating picture | Generate daily AI brief from trusted data | Jeremy/Jennifer | High | High | 4 |
| Medium | Client updates | PM/customer updates take time | Generate client update drafts from field updates/photos | Jennifer/Jeremy | High | Medium/High | 4 |
| Medium | Change-order risk | Scope changes may be missed | Flag extra work, delays, material changes | Jeremy | High | High | 4 |
| Medium | Weather planning | Field work depends on weather | Weather-aware scheduling alerts | Jennifer/Jeremy | Medium/High | Medium/High | 4 |
| Low/Medium | Offline mode | Field signal may be weak | Offline queue/sync for field updates | Field users | High | Medium/High | 4 |

---

## 16. Recommended Ideal App Structure

### Ideal navigation

Recommended long-term top-level navigation:

1. Command Board
2. Schedule
3. Projects
4. Work Orders
5. Field Updates
6. Map
7. Inventory
8. Fleet & Equipment
9. Clients
10. Reports
11. Admin

Current navigation is acceptable for now, but the long-term structure should reduce overlap between division pages and work/action pages.

### Ideal home screens by role

Jeremy / Owner:

- Daily Command Brief
- What changed today
- Blockers and decisions
- Equipment down/conflicts
- Freight issues
- High-risk projects
- Client follow-ups
- Quick map

Jennifer / Executive Manager:

- Tomorrow Builder
- Weekly Look-Ahead
- Review queue
- Missing data queue
- Crew/equipment/freight readiness
- Client follow-up list

Regina / Office Admin:

- Data Entry Queue
- Add/edit clients, contacts, projects, personnel, equipment
- Import/validate workbook data
- Missing information fixes
- Documents needing review

Crew leader:

- Today's assignment
- Location/access notes
- Tree tags/materials
- Equipment needed
- Status buttons
- Photo/GPS
- Issue report
- Closeout

Driver:

- Current route
- Truck/trailer/load
- Stop list
- Contacts
- Map links/access pins
- Arrival/departure/status
- e-POD
- Issue report

Maintenance/equipment:

- Open issues
- Equipment down
- Assigned repairs
- Parts needed
- Estimated return
- Service schedule

Nursery/sales:

- Material readiness
- Pickup/load schedule
- Inventory availability
- Reserved/project material
- Customer follow-ups

### Ideal tables/models

Core:

- `users`
- `clients`
- `clientContacts`
- `projects`
- `projectLocations`
- `workOrders`
- `assignments`
- `fieldUpdates`
- `documents`
- `alerts`
- `auditEvents`

Relocation/install:

- `projectTrees`
- `treeEvents`
- `treePhotos`
- `projectMaterials`

Freight:

- `freightMoves`
- `freightStops`
- `vehicleEvents`
- `proofOfDelivery`

Equipment:

- `equipment`
- `equipmentIssues`
- `maintenanceWorkOrders`
- `equipmentAssignments`

Nursery:

- `inventoryItems`
- `inventoryEvents`
- `ranchOaks`
- `propagationBatches`
- `materialAllocations`

Admin/sync:

- `importBatches`
- `importRows`
- `syncMappings`
- `schemaVersions`

### Ideal daily workflow

1. Jennifer opens Tomorrow Builder.
2. App shows active project needs and unresolved carryovers.
3. Jennifer assigns crew, equipment, freight, nursery work.
4. App flags missing data and conflicts.
5. Jennifer publishes schedule.
6. Crew/driver views update.
7. During the day, crew/drivers submit updates.
8. Command Board shows issues and progress.
9. End of day, closeout review updates records and tomorrow planning.

### Ideal field workflow

1. Field user signs in.
2. Sees today's assignment only.
3. Opens map/access notes.
4. Updates status.
5. Adds tree tags/material quantities/photos/GPS.
6. Reports issues or requests help.
7. Completes closeout.
8. Admin reviews.

### Ideal admin workflow

1. Admin starts on data quality queue.
2. Adds/cleans clients, contacts, projects, personnel, equipment.
3. Imports workbook data through guided import.
4. Fixes validation errors.
5. Links documents.
6. Reviews field updates.
7. Exports backup to workbook.

### Ideal management dashboard

- Active Projects by risk
- Today's work
- Tomorrow readiness
- Crew status
- Freight status
- Equipment down/conflicts
- Tree lifecycle milestones
- Missing data
- Field updates needing review
- Client follow-ups
- Financial watch items

### Ideal report outputs

- Daily Command Brief
- Daily Field Recap
- Weekly Look-Ahead
- Project Status Report
- Tree Lifecycle Report
- Equipment Downtime Report
- Freight Move Report
- Nursery Material Readiness Report
- Missing Data Report
- Client Follow-Up Report

---

## 17. Specific UI Copy / Label Improvements

Recommended label changes:

| Current Label | Recommended Label | Reason |
|---|---|---|
| New Project | Create Project | Use only when creating a long-lived project |
| Create Job | Create Work Order | Most "jobs" are assignable work orders under a project |
| Assign Work | Create Crew Work Order | Clear who and what the assignment is for |
| Request Freight | Create Freight Request | Clear that this starts a freight workflow |
| Create Freight Move | Dispatch Freight Move | More field-operations language |
| Schedule As Trip | Remove or rename to Driver Trip if needed | Current meaning is unclear |
| Dispatch Run Steps | Driver Instructions or Route Notes | One notes field is easier unless it is a structured stop |
| Tree Assets | Project Tree Inventory | Clearer to non-technical users |
| Aftercare | Nutrient Care | Matches JDT language already requested |
| Pruning | Root Pruning | Matches JDT language already requested |
| Data Sync | Import / Backup | More understandable for Regina/Jennifer |
| Master List Import Staging | Import Preview | Shorter and clearer |
| Save to App | Import Selected Rows | Makes the action clearer |
| Roll Back | Undo This Import | More understandable |
| Field Updates | Crew/Driver Updates | Clearer by user type |
| Documents | Files & Photos | More accurate once photos are included |
| Alerts Drawer | Alerts | Simpler |
| Simulate Alert | Developer Test Alert | Hide outside dev/admin |
| Current Map View | Map View | Cleaner |
| All Relocation Jobs | All Relocation Projects | Align with project model |
| Open Job | Open Project | If the map view is project scoped |
| Add Pin | Add Project Pin | If project scoped |

Recommended status naming improvements:

- Use entity-specific statuses.
- Keep tree statuses:
  - Not Started
  - 1st Cut Scheduled
  - 1st Cut Complete
  - 2nd Cut Scheduled
  - 2nd Cut Complete
  - Ready For Relocation
  - Relocated
  - Moved To Holding Area
  - Invoiced
  - Paid
  - In Nutrient Care Phase
- Freight statuses should be stop/load specific:
  - Scheduled
  - At Pickup
  - Loading
  - Loaded
  - In Transit
  - At Delivery
  - Unloaded
  - Trailer Dropped
  - Complete
  - Delayed
  - Issue
- Equipment statuses should be:
  - Available
  - Assigned
  - In Use
  - Needs Inspection
  - Maintenance Scheduled
  - Down
  - In Shop
  - Rental Needed
  - Retired
- Work order statuses should be:
  - Draft
  - Scheduled
  - Assigned
  - In Progress
  - Needs Review
  - Blocked
  - Completed
  - Closed

---

## 18. What I Need From Jeremy / Developer

To complete implementation planning after this audit, the developer/Jeremy should provide or decide:

1. Final business definition of Project vs Work Order vs Assignment.
2. Required fields by workflow:
   - project
   - crew work order
   - freight move
   - equipment request
   - maintenance issue
   - project tree
   - nursery inventory item
   - field closeout
3. Final list of user roles and who belongs in each:
   - owner/admin
   - operations coordinator
   - office admin
   - project manager
   - crew leader
   - driver
   - maintenance
   - nursery/sales
   - read-only/client/project viewer if needed
4. Confirm whether every `@jdtnurseries.com` user should read all app records or only assigned records.
5. Decide where attachments should live:
   - Firebase Storage
   - Google Drive
   - hybrid by document type
6. Provide sample real field closeout examples:
   - relocation crew day
   - installation crew day
   - freight driver day
   - equipment issue day
   - nursery loading day
7. Provide final project location/pin types:
   - main address
   - crew access
   - truck/equipment access
   - construction access
   - load/unload pin
   - staging area
   - tree source
   - tree destination
   - farm zone
8. Decide whether app should support offline queue in first field pilot.
9. Decide first pilot projects. Recommendation:
   - one relocation project with tree pins
   - one freight-heavy project
   - one equipment issue workflow
   - one nursery/material workflow
10. Confirm workbook schema authority:
   - App is source of truth after go-live
   - Workbook is backup and bulk-entry import/export
   - No parallel competing templates
11. Provide service/maintenance rules:
   - service intervals
   - trailer inspection categories
   - CDL/medical card expiration rules
   - registration/insurance renewal rules
12. Confirm notification preferences:
   - in-app alerts only
   - email
   - SMS later
   - daily summary
13. Provide print/TV board layout expectations:
   - shop TV
   - office print
   - crew handout
14. Provide cost/profitability field preferences before financial reporting is built.
15. Provide known bugs list from Jennifer/Regina once they start testing.

---

## 19. Final Conclusion

The JDT Command Center is in a strong but sensitive stage. It is past the toy-prototype stage and has the right custom-app foundation for becoming a real operating system for JD Thornton Nurseries. The app already understands many of the specific things that make JDT different: tree relocation lifecycle, root pruning windows, nutrient care, project tree inventories, farms, equipment and implements, trucks and trailers, freight stop complexity, project access pins, Ranch Oaks, propagation, crew skills, driver compliance, and workbook-backed operations.

The biggest danger now is not lack of features. The biggest danger is allowing too many features to remain loosely connected. JDT does not need more isolated screens first. JDT needs the existing screens to feed one reliable operating brain.

The first fix should be relationship integrity. Every meaningful record should know its client, project, work order/job, assignment, and source entity. If this spine is enforced, the app can reliably answer the questions Jeremy, Jennifer, Regina, crew leaders, drivers, and maintenance users need answered every day.

The second fix should be field communication. Crew View and Driver View should become the replacement for constant calls and texts. That means mobile-first assignments, status updates, photos, GPS, tree tags, issues, and end-of-day closeout.

The third fix should be admin data quality. Regina and Jennifer need guided, safe data entry and imports. The workbook should remain the backup/bulk-entry source, but the app should decide the schema and enforce clean IDs.

The fourth fix should be operational scheduling. The Calendar is in a good direction, but Jennifer needs a real Tomorrow Builder and Weekly Look-Ahead with crew, equipment, freight, nursery, and maintenance conflicts.

The app should not overbuild AI, profitability, or advanced automation yet. Those will be valuable, but only after the operating data is clean and trusted. AI summaries are only useful if the app can trust its relationships, statuses, field updates, and schedule data.

Recommendation on platform direction:

- Continue custom-code expansion.
- Keep Google Sheets as controlled backup, bulk-entry, and export support.
- Do not return to AI Studio as the canonical build surface.
- Do not move this into AppSheet unless the custom app direction is abandoned. The current app has already outgrown what AppSheet would comfortably handle for JDT's cross-division workflows.
- Use a hybrid operating model for now: custom app as the operational system, JDT Command Center workbook as backup/import/export source.

Overall readiness:

- Ready for controlled internal pilot: yes.
- Ready for broad production field rollout: not yet.
- Closest path to real production: enforce the operating spine, simplify role-specific workflows, add real photo/document storage, validate imports, and build the daily schedule/closeout loop.

The app is close enough that the next work should be disciplined production hardening, not another rebuild. The strongest path is to keep the current foundation, tighten the data model, and make the daily JDT operating rhythm unmistakably clear.
