export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const requiredConfigKeys = [
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_GOOGLE_API_KEY",
  "VITE_GOOGLE_APP_ID",
] as const;

type RequiredConfigKey = (typeof requiredConfigKeys)[number];
type DriveEnv = Partial<Record<RequiredConfigKey | "VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID", string>>;

export interface DriveMigrationConfig {
  clientId: string;
  apiKey: string;
  appId: string;
  uploadFolderId: string;
  scope: string;
  isReady: boolean;
  missingKeys: RequiredConfigKey[];
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface DocumentCabinetRecord {
  id: string;
  name: string;
  job: string;
  size: string;
  type: string;
  status: string;
  category: string;
  driveId?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export type RelativeUploadFile = {
  name: string;
  webkitRelativePath?: string;
};

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

function viteEnv(): DriveEnv {
  return ((import.meta as unknown as { env?: DriveEnv }).env ?? {}) as DriveEnv;
}

export function getDriveMigrationConfig(env: DriveEnv = viteEnv()): DriveMigrationConfig {
  const missingKeys = requiredConfigKeys.filter((key) => !env[key]?.trim());

  return {
    clientId: env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "",
    apiKey: env.VITE_GOOGLE_API_KEY?.trim() ?? "",
    appId: env.VITE_GOOGLE_APP_ID?.trim() ?? "",
    uploadFolderId: env.VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID?.trim() ?? "",
    scope: DRIVE_FILE_SCOPE,
    isReady: missingKeys.length === 0,
    missingKeys,
  };
}

export function buildDriveFolderMetadata(name: string, parentId?: string) {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  };

  if (parentId) metadata.parents = [parentId];
  return metadata;
}

export function getRelativeFolderPath(file: RelativeUploadFile): string[] {
  const relativePath = file.webkitRelativePath?.replace(/\\/g, "/") ?? "";
  if (!relativePath.includes("/")) return [];

  return relativePath.split("/").filter(Boolean).slice(0, -1);
}

export function driveFileToDocumentRecord(
  file: DriveFileMetadata,
  status = "Migrated",
): DocumentCabinetRecord {
  return {
    id: file.id,
    driveId: file.id,
    name: file.name,
    job: "Google Drive Migration",
    size: formatDriveSize(file),
    type: getDriveFileType(file),
    status,
    category: "Drive",
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
  };
}

export async function requestDriveAccessToken(config = getDriveMigrationConfig()): Promise<string> {
  if (!config.isReady) {
    throw new Error(`Missing Google Drive configuration: ${config.missingKeys.join(", ")}`);
  }

  await loadExternalScript("google-identity-services", "https://accounts.google.com/gsi/client");

  const oauth = window.google?.accounts?.oauth2;
  if (!oauth?.initTokenClient) {
    throw new Error("Google Identity Services did not load.");
  }

  return new Promise((resolve, reject) => {
    const tokenClient = oauth.initTokenClient({
      client_id: config.clientId,
      scope: config.scope,
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google did not return a Drive access token."));
          return;
        }
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export async function loadGooglePicker(): Promise<void> {
  await loadExternalScript("google-api-loader", "https://apis.google.com/js/api.js");

  if (!window.gapi?.load) {
    throw new Error("Google API loader did not initialize.");
  }

  await new Promise<void>((resolve) => {
    window.gapi.load("picker", { callback: resolve });
  });
}

export function openGoogleDrivePicker({
  accessToken,
  config = getDriveMigrationConfig(),
  onPicked,
  onCancel,
}: {
  accessToken: string;
  config?: DriveMigrationConfig;
  onPicked: (files: DriveFileMetadata[]) => void;
  onCancel?: () => void;
}) {
  const pickerApi = window.google?.picker;
  if (!pickerApi?.PickerBuilder) {
    throw new Error("Google Picker did not load.");
  }

  const docsView = new pickerApi.DocsView()
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);

  const builder = new pickerApi.PickerBuilder()
    .addView(docsView)
    .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
    .setOAuthToken(accessToken)
    .setDeveloperKey(config.apiKey)
    .setAppId(config.appId)
    .setCallback((data: any) => {
      const action = data[pickerApi.Response.ACTION];
      if (action === pickerApi.Action.PICKED) {
        const docs = (data[pickerApi.Response.DOCUMENTS] ?? []).map((doc: any) => ({
          id: doc[pickerApi.Document.ID],
          name: doc[pickerApi.Document.NAME],
          mimeType: doc[pickerApi.Document.MIME_TYPE],
          webViewLink: doc[pickerApi.Document.URL],
        }));
        onPicked(docs);
      }
      if (action === pickerApi.Action.CANCEL) onCancel?.();
    });

  if (pickerApi.DocsUploadView) {
    const uploadView = new pickerApi.DocsUploadView();
    if (config.uploadFolderId && uploadView.setParent) uploadView.setParent(config.uploadFolderId);
    builder.addView(uploadView);
  }

  const picker = builder.build();
  picker.setVisible(true);
}

export async function createDriveFolder({
  name,
  accessToken,
  parentId,
}: {
  name: string;
  accessToken: string;
  parentId?: string;
}): Promise<DriveFileMetadata> {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDriveFolderMetadata(name, parentId)),
  });

  return parseDriveResponse(response, "Unable to create Drive folder.");
}

export async function ensureDriveFolderPath({
  folderPath,
  accessToken,
  rootFolderId,
  cache,
}: {
  folderPath: string[];
  accessToken: string;
  rootFolderId?: string;
  cache: Map<string, string>;
}): Promise<string | undefined> {
  let parentId = rootFolderId;
  let cacheKey = rootFolderId || "root";

  for (const folderName of folderPath) {
    cacheKey = `${cacheKey}/${folderName}`;
    const cachedFolderId = cache.get(cacheKey);
    if (cachedFolderId) {
      parentId = cachedFolderId;
      continue;
    }

    const folder = await createDriveFolder({ name: folderName, accessToken, parentId });
    cache.set(cacheKey, folder.id);
    parentId = folder.id;
  }

  return parentId;
}

export async function uploadFileToDrive({
  file,
  accessToken,
  parentId,
}: {
  file: File;
  accessToken: string;
  parentId?: string;
}): Promise<DriveFileMetadata> {
  const metadata: { name: string; mimeType?: string; parents?: string[] } = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
  };
  if (parentId) metadata.parents = [parentId];

  const sessionResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!sessionResponse.ok) {
    throw new Error(await getDriveErrorMessage(sessionResponse, "Unable to start Drive upload."));
  }

  const uploadUrl = sessionResponse.headers.get("Location");
  if (!uploadUrl) throw new Error("Google Drive did not return an upload session URL.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  return parseDriveResponse(uploadResponse, "Unable to upload file to Drive.");
}

export async function copyDriveFile({
  file,
  accessToken,
  parentId,
}: {
  file: DriveFileMetadata;
  accessToken: string;
  parentId?: string;
}): Promise<DriveFileMetadata> {
  if (file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) return file;

  const metadata: { name: string; parents?: string[] } = { name: file.name };
  if (parentId) metadata.parents = [parentId];

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/copy?fields=id,name,mimeType,size,webViewLink,webContentLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );

  return parseDriveResponse(response, "Unable to copy Drive file.");
}

function getDriveFileType(file: DriveFileMetadata): string {
  const mimeType = file.mimeType ?? "";
  if (mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) return "Drive Folder";
  if (mimeType.includes("spreadsheet")) return "Sheet";
  if (mimeType.includes("document")) return "Doc";
  if (mimeType.includes("presentation")) return "Slides";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Photo";
  if (mimeType.includes("csv")) return "CSV";

  const extension = file.name.split(".").pop();
  return extension && extension !== file.name ? extension.toUpperCase() : "File";
}

function formatDriveSize(file: DriveFileMetadata): string {
  if (file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) return "Drive Folder";
  const bytes = Number(file.size ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Drive File";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function parseDriveResponse(response: Response, fallbackMessage: string): Promise<DriveFileMetadata> {
  if (!response.ok) {
    throw new Error(await getDriveErrorMessage(response, fallbackMessage));
  }
  return response.json();
}

async function getDriveErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const error = await response.json();
    return error?.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function loadExternalScript(id: string, src: string): Promise<void> {
  const existingScript = document.getElementById(id) as HTMLScriptElement | null;
  if (existingScript?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existingScript ?? document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}`));

    if (!existingScript) document.head.appendChild(script);
  });
}
