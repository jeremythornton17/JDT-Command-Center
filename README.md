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

- `GEMINI_API_KEY`
- `APP_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`
- `VITE_GOOGLE_APP_ID`
- `VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_MAP_ID`

## Google Drive Migration

The Documents board supports local file upload, browser folder upload, drag/drop migration, and Google Drive Picker imports. Enable Google Drive API and Google Picker API in the same Google Cloud project. The app requests `https://www.googleapis.com/auth/drive.file` for upload and Picker-selected file access.

## Google Maps Tree Relocation

The Maps board supports tree relocation pinning with source and destination locations, assigned task visibility, GPS capture, and a fallback field map when Google Maps is not configured. Enable Maps JavaScript API in the same Google Cloud project. The map feature stores each tree's relocation pins on the existing `ranchOaks` records so the nursery, relocation, and maps workflows stay connected.
