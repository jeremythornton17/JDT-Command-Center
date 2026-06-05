import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("AI Studio deployment source guard", () => {
  it("keeps the Cloud Run server entrypoint in the source branch", () => {
    const packageJson = JSON.parse(readProjectFile("package.json"));

    assert.equal(packageJson.scripts.start, "node server.js");
    assert.equal(existsSync(path.join(repoRoot, "server.js")), true);
    assert.equal(existsSync(path.join(repoRoot, "src/treeRelocationMap.ts")), true);
  });

  it("serves the app shell without stale browser caching after deploys", () => {
    const serverSource = readProjectFile("server.js");

    assert.match(serverSource, /express\.static\(distDir,\s*\{\s*index:\s*false,\s*maxAge:\s*'1h'\s*\}\)/);
    assert.match(serverSource, /Cache-Control',\s*'no-store'/);
    assert.match(serverSource, /sendFile\(path\.join\(distDir,\s*'index\.html'\)\)/);
  });

  it("keeps the maps board on tree relocation instead of removed fleet providers", () => {
    const mapsBoard = readProjectFile("src/components/MapsBoard.tsx");

    assert.match(mapsBoard, /Field Maps & Tree Relocation/);
    assert.doesNotMatch(mapsBoard, /Verizon|Michelin/i);
  });

  it("does not request removed fleet provider credentials", () => {
    const filesToCheck = [
      ".env.example",
      "README.md",
      "src/components/MapsBoard.tsx",
      "package.json",
    ];

    for (const filePath of filesToCheck) {
      assert.doesNotMatch(readProjectFile(filePath), /Verizon|Michelin/i, `${filePath} contains removed fleet provider copy`);
    }
  });

  it("does not seed blank workspaces with mock operational records", () => {
    const firestoreHook = readProjectFile("src/useFirestoreCollection.ts");

    assert.equal(existsSync(path.join(repoRoot, "src/commandCenter/seedData.ts")), false);
    assert.doesNotMatch(firestoreHook, /Seed database|initialData\.forEach|initialData\.map|initialData\.length/);
  });

  it("keeps Firebase admins tied to the jdtnurseries.com email domain", () => {
    const firestoreRules = readProjectFile("firestore.rules");

    assert.match(firestoreRules, /request\.auth\.token\.email/);
    assert.equal(firestoreRules.includes("jdtnurseries\\\\.com"), true);
    assert.match(firestoreRules, /jeremy@jdtnurseries\.com/);
    assert.match(firestoreRules, /buck@jdtnurseries\.com/);
    assert.doesNotMatch(firestoreRules, /jdtn2155@gmail\.com/);
    assert.match(firestoreRules, /isContactOnlyAuthorized\(\)/);
    assert.doesNotMatch(firestoreRules, /allow\s+(read|create|update):\s*if\s+isSignedIn\(\)/);
    assert.match(firestoreRules, /isAuthorizedUser\(\)/);
  });

  it("keeps both Firebase email/password and Google sign-in options with narrow Sheets authorization", () => {
    const authProvider = readProjectFile("src/AuthProvider.tsx");
    const googleSheetsSync = readProjectFile("src/commandCenter/googleSheetsSync.ts");

    assert.match(authProvider, /signInWithEmailAndPassword/);
    assert.match(authProvider, /GoogleAuthProvider/);
    assert.match(authProvider, /signInWithPopup/);
    assert.match(authProvider, /Sign In With Google/);
    assert.match(authProvider, /Reset Password/);
    assert.match(authProvider, /\/jd-thornton-logo\.png/);
    assert.doesNotMatch(authProvider, /mail\.google\.com|auth\/contacts|auth\/calendar/);
    assert.match(authProvider, /provider\.addScope\(googleSheetsScope\)/);
    assert.match(googleSheetsSync, /https:\/\/www\.googleapis\.com\/auth\/spreadsheets/);
    assert.doesNotMatch(googleSheetsSync, /mail\.google\.com|auth\/contacts|auth\/calendar/);
  });

  it("uses the production named Firestore database instead of the missing default database", () => {
    const firebaseConfig = JSON.parse(readProjectFile("firebase-applet-config.json"));
    const firebaseSource = readProjectFile("src/firebase.ts");

    assert.equal(firebaseConfig.projectId, "jdt-command-board");
    assert.equal(firebaseConfig.firestoreDatabaseId, "ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e");
    assert.match(firebaseSource, /getFirestore\(app,\s*firebaseConfig\.firestoreDatabaseId\)/);
    assert.doesNotMatch(firebaseSource, /getFirestore\(app\)/);
  });

  it("keeps the test script and app shell aligned with production hardening", () => {
    const packageJson = JSON.parse(readProjectFile("package.json"));
    const appSource = readProjectFile("src/App.tsx");
    const tsConfig = JSON.parse(readProjectFile("tsconfig.json"));

    assert.match(packageJson.scripts.test, /authAccess\.test\.ts/);
    assert.match(packageJson.scripts.test, /firestoreSync\.test\.ts/);
    assert.doesNotMatch(appSource, /if\s*\(!user\)/);
    assert.equal(tsConfig.compilerOptions.strict, true);
    assert.equal(tsConfig.compilerOptions.allowJs, false);
  });
});
