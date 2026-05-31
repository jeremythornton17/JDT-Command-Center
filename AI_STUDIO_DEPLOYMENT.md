# Legacy AI Studio Reference

This app started as a Google AI Studio applet, but the production path is now Codex/GitHub to Google Cloud Run.

Do not publish or redeploy this app from Google AI Studio unless the Cloud Run service is intentionally being reset. Publishing from AI Studio can overwrite the current image-backed Cloud Run service and reintroduce stale source-build metadata.

The AI Studio applet can remain open for reference:

- Applet ID: `aaf65ee2-61ca-4360-af29-1c862096338e`

Production deployment must keep:

- Custom URL: `https://app.jdtcommandcenter.com`
- Cloud Run default URL disabled
- Firestore database: `ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e`
- `firebase-applet-config.json` with `firestoreDatabaseId`
- `src/firebase.ts` using `getFirestore(app, firebaseConfig.firestoreDatabaseId)`

Before any production deploy, run:

```bash
npm run verify
```
