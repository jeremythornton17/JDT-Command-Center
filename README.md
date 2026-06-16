# JDT Command Center

Internal command center for JD Thornton Nurseries operations.

Canonical live app: https://app.jdtcommandcenter.com

## Source Of Truth

This source package is now intended to be maintained through Codex/GitHub and deployed to the existing Google Cloud Run service. Google AI Studio can remain a reference view, but it should not be used to publish or redeploy the app because that can recreate stale AI Studio deployment metadata.

## Google Cloud Targets

- Project: `jdt-command-board`
- Cloud Run service: `jd-thornton-nurseries-command-center`
- Region: `us-west1`
- Custom domain: `app.jdtcommandcenter.com`
- Firestore database: `ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e`

The default Cloud Run `run.app` URLs should remain disabled. Public users should use the custom domain only.

## Local Development

Prerequisite: Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Run checks before deploying:

```bash
npm run verify
```

## Environment

Copy `.env.example` to `.env.local` for local development. Keep real secrets out of source control.

Required hosted environment values are managed in Cloud Run:

- `APP_URL`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_MAP_ID` when a styled Google Maps map ID is used
- `VITE_ARCGIS_API_KEY` when the ArcGIS Operations Map is enabled
- `VITE_ARCGIS_ORG_URL`, normally `https://jdtnurseries.maps.arcgis.com`
- `VITE_ARCGIS_WEB_MAP_ID` when a saved ArcGIS web map is used
- `VITE_ARCGIS_LAYER_JDT_*_URL` values for each hosted ArcGIS layer after ArcGIS Online setup

The Firebase browser config is intentionally stored in `firebase-applet-config.json` for the single production Firebase app. Future Drive Picker and Gemini workflows should add their keys only when those features are implemented; keep Gemini keys server-side.

## Google Drive Migration

The Documents board now stores document tracking records in Firestore. Keep file uploads and Google Drive Picker integration behind a separate feature flow so the app can request Drive permissions only when a user starts a Drive action.

## Google Maps Tree Relocation

The Maps board supports tree relocation pinning with source and destination locations, assigned task visibility, GPS capture, and a fallback field map when Google Maps is not configured. Enable Maps JavaScript API in the same Google Cloud project. The map feature stores each tree's relocation pins on the existing `ranchOaks` records so the nursery, relocation, and maps workflows stay connected.

## ArcGIS Operations Map

The GIS board is available at `/map` and project-specific routes like `/projects/<projectId>/map`. It uses the ArcGIS Maps SDK for JavaScript hosted loader and reads `VITE_ARCGIS_API_KEY` from Vite env or the Cloud Run `/runtime-config.js` response. Do not hardcode the key in source.

JDT's GIS workflow is ArcGIS Online-first. Do not make the production app depend on ArcGIS Pro desktop projects, local geodatabases, or workstation files. ArcGIS Pro can still be used outside the app for one-off cleanup if needed, but the app should read and write only through ArcGIS Online hosted feature layers and JDT Command Center records.

Keep JDT Command Center and ArcGIS Online connected but separate:

- JDT Command Center is the operational system of record for projects, tree assets, work orders, costs, notes, crews, and workflow status.
- ArcGIS Online is the GIS system of record for map geometry, hosted feature layers, boundaries, holding areas, work zones, tree points, final locations, and spatial visualization.
- Stable IDs connect both systems: `Project_ID`, `Client_ID`, `Tree_Asset_ID`, `Root_Pruning_ID`, `Relocation_Work_ID`, and `Nutrient_Care_ID`.
- JDT records store ArcGIS references as `arcGisFeatureId`, `arcGisLayerUrl`, `mapGeometryStatus`, and `lastMapSyncAt`.

JDT's first hosted ArcGIS layer stack is defined in `src/commandCenter/arcgisLayerConfig.ts`:

- `JDT_Project_Boundaries`: polygon project/work-area boundaries.
- `JDT_Tree_Assets`: point layer for project tree inventory. `Tree_Relocation_Status` is the primary symbology/status field.
- `JDT_Final_Tree_Locations`: point layer for proposed or approved destination points.
- `JDT_Holding_Areas`: polygon layer for temporary tree holding/staging areas.
- `JDT_Work_Zones`: polygon layer for active construction, staging, grading, and relocation work areas.
- `JDT_Root_Prune_Events`: point overlay for scheduled or completed root-prune work.
- `JDT_Relocation_Work`: point overlay for move-day relocation operations.
- `JDT_Nutrient_Care_Tasks`: point overlay for treatment, watering, inspection, and follow-up tasks.
- `JDT_Equipment_Locations`: point layer for machines, trucks, trailers, implements, and tracked assets.

The board filters by Project, Tree Relocation Status, Tree Type, DBH, and Crew. Creating or editing a tree point saves back into the normal `treeRelocationRecords` collection so ArcGIS points remain connected to project profiles, imports/backups, work orders, reports, and field updates.

For Cloud Run, set `VITE_ARCGIS_API_KEY`, `VITE_ARCGIS_ORG_URL`, and the `VITE_ARCGIS_LAYER_JDT_*_URL` values as environment variables on the `jd-thornton-nurseries-command-center` service. Restrict the ArcGIS browser key to the production domain plus local development origins.

Hosted layer writes use the server endpoint `/api/integrations/arcgis/tree-assets/apply-edits` because ArcGIS browser API keys are for map display/query, not trusted hosted-layer editing. Set these server-only variables in Cloud Run and do not expose them as `VITE_*` values:

- `ARCGIS_CLIENT_ID`
- `ARCGIS_CLIENT_SECRET`
- `ARCGIS_TOKEN_URL`, usually `https://www.arcgis.com/sharing/rest/oauth2/token/`
- `JDT_ARCGIS_WRITE_EMAILS`, optional comma-separated non-domain emails allowed to sync map edits

The tree point editor saves the JDT record first, then calls the server endpoint with the signed-in Firebase user's ID token. ArcGIS stores geometry and feature IDs; JDT Command Center remains the operations record.

To create schema seed GeoJSON files for ArcGIS Online hosted layer setup:

```bash
node --import tsx scripts/create-arcgis-hosted-layer-seeds.mjs
```

The command writes one file per hosted layer in `arcgis-seeds/`. Upload each GeoJSON file to ArcGIS Online as a hosted feature layer, keep the service name matching the file name, then copy each hosted layer URL back into the matching `VITE_ARCGIS_LAYER_JDT_*_URL` environment variable.

KML/KMZ files are bridge formats only. Use them for client imports, ArcGIS Online exports, legacy Google Earth files, backups, and field sharing. After import, save clean project/tree/location records into JDT Command Center and sync geometry to ArcGIS Online hosted layers. Do not treat raw KML/KMZ files as the long-term database.

See `docs/ARCGIS_ONLINE_OPERATING_STANDARD.md` for the JDT account, group, layer-sharing, and KML/KMZ operating standard.
