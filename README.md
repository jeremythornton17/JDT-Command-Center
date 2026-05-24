<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/aaf65ee2-61ca-4360-af29-1c862096338e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Google Drive migration

The Documents board supports local file upload, browser folder upload, drag/drop migration, and Google Drive Picker imports. Configure these Vite environment variables in `.env.local` and in the hosted app environment:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`
- `VITE_GOOGLE_APP_ID`
- `VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID` optional destination folder

Enable Google Drive API and Google Picker API in the same Google Cloud project. The app requests `https://www.googleapis.com/auth/drive.file` for upload and Picker-selected file access.
