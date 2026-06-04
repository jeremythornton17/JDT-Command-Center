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

The Firebase browser config is intentionally stored in `firebase-applet-config.json` for the single production Firebase app. Future Drive Picker and Gemini workflows should add their keys only when those features are implemented; keep Gemini keys server-side.

## Google Drive Migration

The Documents board now stores document tracking records in Firestore. Keep file uploads and Google Drive Picker integration behind a separate feature flow so the app can request Drive permissions only when a user starts a Drive action.

## Google Maps Tree Relocation

The Maps board supports tree relocation pinning with source and destination locations, assigned task visibility, GPS capture, and a fallback field map when Google Maps is not configured. Enable Maps JavaScript API in the same Google Cloud project. The map feature stores each tree's relocation pins on the existing `ranchOaks` records so the nursery, relocation, and maps workflows stay connected.
