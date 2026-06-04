# Client Project Job Relationships Design

## Goal

Make Client, Project, and Job relationships explicit so users can tell what belongs to each account and imported spreadsheet rows can be matched to the correct operational records.

## Chosen Approach

Use Option B: rebuild the relationship model inside the current app. Keep the existing app, Cloud Run service, Firebase project, and domain. Add stable relationship IDs and a dedicated `projects` collection while preserving the current `jobs` collection during migration.

## Definitions

- Client: the company, account, owner, golf course, developer, or customer relationship.
- Project: the overall engagement under a client, usually tied to a property, contract, or scope.
- Job: an executable work unit under a project, such as relocation, installation, root pruning, freight, irrigation, or maintenance.

## Data Model

Every related record should store both IDs and readable labels:

- `clientId` and `clientName`
- `projectId` and `projectName`
- `jobId` and `jobName`

The readable labels keep tables easy to scan. The IDs keep Firestore updates, imports, and navigation reliable even when a company or project name is edited.

The app should add a `projects` collection. Existing project-like records in `jobs` can stay in place temporarily, but new normalization helpers should stamp them with `projectId` and `projectName`.

## Import Flow

Imports should not only save isolated rows. They should enrich records with relationship IDs:

- Client imports create or update `clients`.
- Schedule imports should attach `clientId`, `clientName`, `projectId`, `projectName`, `jobId`, and `jobName` when enough source data exists.
- Relocation imports should attach `projectId`, `projectName`, and `jobId` from `JOB ID`.
- Future project/job templates can be added after this relationship layer is stable.

Rows that cannot be matched should still import, but they should be visible as needing relationship review.

## UI Flow

Client cards should show linked project/job counts and clear account details.

Project and job forms should guide users in this order:

1. Choose or create the client.
2. Name the project.
3. Categorize the job or work type.
4. Add dates, crew, site, and operating details.

Drawers should show breadcrumbs in this shape:

`Client > Project > Job`

## Migration Strategy

Do not wipe existing data. Add IDs to records during save/import and let older records continue displaying through text fallback matching. After enough records have IDs, a later migration can backfill existing Firestore data in bulk.

## First Implementation Slice

The first slice should:

- Add `ProjectRecord` and relationship fields to the record types.
- Add `projects` to the app collection model and reset/import wiring.
- Add pure relationship helpers with tests.
- Stamp saved project/job records with stable IDs.
- Enrich imported schedule and relocation rows with relationship fields.
- Show linked project/job counts on client cards.

## Verification

Run the full node test suite, TypeScript, and Vite production build. Browser-check the Clients page, Data Sync preview, and Relocation & Installation board after the changes.
