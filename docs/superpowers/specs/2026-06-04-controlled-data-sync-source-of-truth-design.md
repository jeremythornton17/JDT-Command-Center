# Controlled Data Sync Source Of Truth Design

## Goal

Make JDT Command Center the source of truth for operating data, and make spreadsheets conform to the app instead of letting many spreadsheet formats compete with the app's structure.

The current app has strong operating screens for clients, projects, jobs, crews, freight, equipment, nursery inventory, maps, documents, and field updates. The biggest data risk now is not missing import capability. The risk is too many open-ended import templates that can create overlapping clients, mismatched project/job relationships, orphaned work records, and confusing dashboard results.

## Chosen Approach

Use Option B: Controlled Two-Lane Data Sync.

Data Sync should present two approved import lanes:

1. Master Data Import
2. Project Workbook Import

Existing one-off templates should move behind a Legacy / Admin Only area. They can remain available for owner/admin cleanup, but they should not be the normal path for Jennifer, Regina, or future operators.

## Source Of Truth Rule

The app owns the structure. Spreadsheets are backup, staging, and export tools.

Every import should be judged against the app's operating chain:

`Client -> Project -> Job -> Work Order -> Assignment -> Field Update -> Report`

Records that cannot be tied cleanly into this chain should not silently save as normal live data. They should go to review with clear reasons.

## Approved Import Lanes

### Master Data Import

Master Data Import is for company-wide records that can be reused across many projects and divisions.

Approved master data groups:

- Clients and contact points
- Personnel and crew details
- Equipment, trucks, trailers, and implements
- Locations, addresses, access pins, and saved site contacts
- Nursery inventory
- Ranch Oaks inventory
- Tree species or plant reference lists

Master Data Import should create durable records that future project/job work can reference by ID.

### Project Workbook Import

Project Workbook Import is for one specific client/project/job context at a time.

Before importing, the user must select or create:

- Client
- Project
- Job

The workbook rows should inherit those selected relationship IDs unless a row explicitly provides a stronger matching ID.

Approved project workbook groups:

- Tree assets
- Root pruning
- Nutrient care
- Tree photos and documents
- Project material items
- Project work orders
- Equipment requests or equipment on site
- Freight requests tied to the project
- Field updates tied to the project

This lets project spreadsheets stay useful while preventing each workbook from becoming its own competing database.

## Data Sync UI

The Data Sync page should be simplified into five areas.

### 1. Choose Import Lane

The first choice should be:

- Master Data
- Project Workbook

Users should not start by choosing from a long list of technical template names.

### 2. Choose Destination Context

For Master Data, the user chooses the master data group.

For Project Workbook, the user chooses the client, project, and job before pasting or uploading rows. The app should show the selected context prominently so the user understands where the data will land.

### 3. Paste Or Upload

The app should accept pasted Google Sheet ranges first. File upload can come later after the validation workflow is stable.

The paste area should show the expected headers for the selected lane/group. The UI should make it clear that the app expects JDT-approved headers.

### 4. Validate And Preview

Before Save to App is enabled, the preview should classify rows:

- Ready to Save
- Needs Review
- Duplicate Risk
- Missing Required Field
- Missing Relationship
- Unsupported Column

Rows in review should show the exact problem and suggested fix.

### 5. Save, History, Rollback, Export

Each successful import should create an import batch with:

- Import lane
- Template group
- Source workbook or sheet name
- User who imported it
- Created date
- Destination client/project/job when relevant
- Created records
- Updated records
- Skipped rows
- Review rows

The user should be able to roll back app-owned records from a batch. The user should also be able to export app data back into the approved JDT workbook shape.

## Legacy Templates

Legacy templates should not be deleted immediately. They are useful for converting old workbooks and source material.

Legacy templates should move to an Admin Only section with a warning:

Legacy imports are for cleanup and conversion only. They may require relationship review before records become live.

Normal users should see the two approved import lanes, not the legacy list.

## Spreadsheet Strategy

JDT should maintain two official workbook standards:

1. JDT Master Data Workbook
2. JDT Project Workbook

Old spreadsheets should be treated as source material to convert into those standards.

The spreadsheet should not decide what a client, project, job, tree, freight move, work order, or equipment record means. The app should define those records, and the spreadsheet should mirror the app's fields.

## Relationship Validation

Every imported operating record should store stable relationship fields when relevant:

- `clientId` and `clientName`
- `projectId` and `projectName`
- `jobId` and `jobName`

The app should prefer IDs over readable names. Names can be used as fallback during review, but they should not be the only relationship anchor for live data.

If a row mentions a client/project/job that conflicts with the selected import context, the row should go to Needs Review.

## Review Queue

The review queue should become the safety net for imports.

A row should enter review when:

- Required fields are blank
- A client, project, or job cannot be matched
- A row conflicts with the selected destination context
- A likely duplicate exists
- A location or pin is malformed
- A record type is unsupported for the selected lane

The user should be able to fix a row by selecting the correct client/project/job, editing missing fields, or marking it as skipped.

## Permission Model

Owner/admin users can:

- Use both approved import lanes
- Use legacy/admin templates
- Roll back import batches
- Export full app data

Office/admin users can:

- Use approved import lanes
- Resolve review rows
- Export approved operational workbooks

Crew users should not see Data Sync.

## First Implementation Slice

The first build slice should not rewrite all import mapping at once.

It should:

- Add the two-lane Data Sync shell.
- Group existing templates under Master Data, Project Workbook, or Legacy.
- Require project context before project workbook imports.
- Add review states to the import preview.
- Hide legacy templates from normal office users.
- Keep existing import mapping functions behind the new UI grouping.
- Preserve import history and rollback behavior.

## Later Implementation Slices

After the first slice is stable:

- Add export-to-JDT-workbook formats.
- Add file upload after pasted range validation is mature.
- Add batch-level relationship repair tools.
- Add spreadsheet template download buttons.
- Add stricter duplicate detection.
- Add scheduled backup exports.

## Verification

The implementation should be verified with:

- Unit tests for lane grouping and template visibility.
- Unit tests for project context validation.
- Unit tests for review row classification.
- Existing sheet import tests to ensure mappings still work.
- Full node test suite.
- TypeScript check.
- Vite production build.
- Browser check of Data Sync as owner/admin and office/admin.

## Non-Goals

This design does not remove spreadsheet backup workflows.

This design does not delete legacy import mapping code in the first slice.

This design does not make Google Sheets the live source of truth. Google Sheets remains backup, staging, conversion, and export support.
