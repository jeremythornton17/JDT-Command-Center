import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRIVE_FILE_SCOPE,
  buildDriveFolderMetadata,
  driveFileToDocumentRecord,
  getDriveMigrationConfig,
  getRelativeFolderPath,
} from "./googleDriveMigration";

describe("Google Drive migration helpers", () => {
  it("uses the narrow Drive file scope for upload and picker access", () => {
    assert.equal(DRIVE_FILE_SCOPE, "https://www.googleapis.com/auth/drive.file");
  });

  it("reports missing Google Drive browser credentials", () => {
    const config = getDriveMigrationConfig({});

    assert.equal(config.isReady, false);
    assert.deepEqual(config.missingKeys, [
      "VITE_GOOGLE_CLIENT_ID",
      "VITE_GOOGLE_API_KEY",
      "VITE_GOOGLE_APP_ID",
    ]);
  });

  it("reads configured Google Drive browser credentials", () => {
    const config = getDriveMigrationConfig({
      VITE_GOOGLE_CLIENT_ID: "client-id",
      VITE_GOOGLE_API_KEY: "api-key",
      VITE_GOOGLE_APP_ID: "project-number",
      VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID: "folder-id",
    });

    assert.equal(config.isReady, true);
    assert.equal(config.clientId, "client-id");
    assert.equal(config.apiKey, "api-key");
    assert.equal(config.appId, "project-number");
    assert.equal(config.uploadFolderId, "folder-id");
  });

  it("builds Google Drive folder metadata with optional parent folder", () => {
    assert.deepEqual(buildDriveFolderMetadata("Operations Imports", "parent-folder"), {
      name: "Operations Imports",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["parent-folder"],
    });
  });

  it("keeps browser folder upload paths separate from file names", () => {
    assert.deepEqual(
      getRelativeFolderPath({ name: "permit.pdf", webkitRelativePath: "Bellaire/Permits/permit.pdf" }),
      ["Bellaire", "Permits"],
    );
    assert.deepEqual(getRelativeFolderPath({ name: "permit.pdf" }), []);
  });

  it("converts Drive file metadata into a document cabinet record", () => {
    const record = driveFileToDocumentRecord({
      id: "drive-file-id",
      name: "Site Plan.pdf",
      mimeType: "application/pdf",
      size: "1048576",
      webViewLink: "https://drive.google.com/file/d/drive-file-id/view",
    });

    assert.equal(record.id, "drive-file-id");
    assert.equal(record.name, "Site Plan.pdf");
    assert.equal(record.size, "1.0 MB");
    assert.equal(record.type, "PDF");
    assert.equal(record.status, "Migrated");
    assert.equal(record.category, "Drive");
  });
});
