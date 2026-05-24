import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FileUp,
  Folder,
  FolderUp,
  Loader2,
  Printer,
  Search,
  UploadCloud,
} from 'lucide-react';
import {
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  copyDriveFile,
  createDriveFolder,
  driveFileToDocumentRecord,
  ensureDriveFolderPath,
  getDriveMigrationConfig,
  getRelativeFolderPath,
  loadGooglePicker,
  openGoogleDrivePicker,
  requestDriveAccessToken,
  uploadFileToDrive,
  type DocumentCabinetRecord,
  type DriveFileMetadata,
} from '../googleDriveMigration';

type UploadFile = File & { webkitRelativePath?: string };

const initialDocuments: DocumentCabinetRecord[] = [
  { id: '1', name: 'Waterford Site Trench Permit', job: 'Waterford Golf Club', size: '2.4 MB', type: 'Permit', status: 'Approved', category: 'Permits' },
  { id: '2', name: 'HOA Access Escort Agreement', job: 'Boca West Country Club', size: '1.1 MB', type: 'Contract', status: 'Signed', category: 'HOA Docs' },
  { id: '3', name: 'FRT-0522-01 Driver Bill of Lading', job: 'FRT-0522-01 Load', size: '890 KB', type: 'Dispatch', status: 'Awaiting Sign', category: 'Dispatch' },
  { id: '4', name: 'Miami Canopy Trimming Clearance', job: 'Bellaire Club', size: '4.8 MB', type: 'Permit', status: 'Reviewing', category: 'Permits' },
  { id: '5', name: 'Proof of Delivery - LO-101 Oak', job: 'Waterford Golf Club', size: '1.2 MB', type: 'POD', status: 'Approved', category: 'Proofs' },
];

export default function DocumentsBoard({ openModal: _openModal }: { openModal: (type: string) => void }) {
  const driveConfig = useMemo(() => getDriveMigrationConfig(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [docCategory, setDocCategory] = useState('All');
  const [docSearch, setDocSearch] = useState('');
  const [docsList, setDocsList] = useState<DocumentCabinetRecord[]>(initialDocuments);
  const [migrationFolderName, setMigrationFolderName] = useState('JDT Command Center Imports');
  const [migrationStatus, setMigrationStatus] = useState('Ready');
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const filteredDocs = docsList.filter(d => {
    const matchesCategory = docCategory === 'All' || d.category === docCategory || (docCategory === 'Permits' && d.type === 'Permit');
    const matchesSearch = d.name.toLowerCase().includes(docSearch.toLowerCase()) || d.job.toLowerCase().includes(docSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const importRootLabel = driveConfig.uploadFolderId || migrationFolderName.trim() || 'JDT Command Center Imports';

  const prepareImportRoot = async (accessToken: string) => {
    if (driveConfig.uploadFolderId) return driveConfig.uploadFolderId;

    const rootFolder = await createDriveFolder({
      name: migrationFolderName.trim() || 'JDT Command Center Imports',
      accessToken,
    });
    return rootFolder.id;
  };

  const uploadFiles = async (incomingFiles: UploadFile[]) => {
    const files = incomingFiles.filter(file => file.size >= 0);
    if (files.length === 0) return;

    if (!driveConfig.isReady) {
      setMigrationStatus(`Missing Google Drive setup: ${driveConfig.missingKeys.join(', ')}`);
      return;
    }

    setIsMigrating(true);
    try {
      setMigrationStatus('Authorizing Google Drive');
      const accessToken = await requestDriveAccessToken(driveConfig);
      setMigrationStatus('Preparing Drive folder');
      const rootFolderId = await prepareImportRoot(accessToken);
      const folderCache = new Map<string, string>();
      const migratedRecords: DocumentCabinetRecord[] = [];

      for (const [index, file] of files.entries()) {
        setMigrationStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`);
        const parentId = await ensureDriveFolderPath({
          folderPath: getRelativeFolderPath(file),
          accessToken,
          rootFolderId,
          cache: folderCache,
        });
        const uploadedFile = await uploadFileToDrive({ file, accessToken, parentId });
        migratedRecords.push(driveFileToDocumentRecord(uploadedFile));
      }

      setDocsList(prev => [...migratedRecords, ...prev]);
      setMigrationStatus(`Migrated ${migratedRecords.length} file${migratedRecords.length === 1 ? '' : 's'} to Drive`);
    } catch (error) {
      setMigrationStatus(error instanceof Error ? error.message : 'Google Drive migration failed');
    } finally {
      setIsMigrating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleLocalFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(Array.from(event.target.files ?? []) as UploadFile[]);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const files = await collectDroppedFiles(event.dataTransfer);
    uploadFiles(files);
  };

  const handleDrivePicker = async () => {
    if (!driveConfig.isReady) {
      setMigrationStatus(`Missing Google Drive setup: ${driveConfig.missingKeys.join(', ')}`);
      return;
    }

    setIsMigrating(true);
    try {
      setMigrationStatus('Opening Google Drive');
      const accessToken = await requestDriveAccessToken(driveConfig);
      await loadGooglePicker();
      openGoogleDrivePicker({
        accessToken,
        config: driveConfig,
        onPicked: async (pickedFiles) => {
          setMigrationStatus('Importing selected Drive files');
          try {
            const copiedRecords = await importPickedDriveFiles(pickedFiles, accessToken);
            setDocsList(prev => [...copiedRecords, ...prev]);
            setMigrationStatus(`Imported ${copiedRecords.length} Drive item${copiedRecords.length === 1 ? '' : 's'}`);
          } catch (error) {
            setMigrationStatus(error instanceof Error ? error.message : 'Unable to import selected Drive items');
          } finally {
            setIsMigrating(false);
          }
        },
        onCancel: () => {
          setMigrationStatus('Ready');
          setIsMigrating(false);
        },
      });
      setMigrationStatus('Google Drive picker open');
    } catch (error) {
      setMigrationStatus(error instanceof Error ? error.message : 'Unable to open Google Drive picker');
      setIsMigrating(false);
    }
  };

  const importPickedDriveFiles = async (pickedFiles: DriveFileMetadata[], accessToken: string) => {
    const shouldCopyFiles = pickedFiles.some(file => file.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE);
    const rootFolderId = shouldCopyFiles ? await prepareImportRoot(accessToken) : undefined;
    const importedRecords: DocumentCabinetRecord[] = [];

    for (const file of pickedFiles) {
      if (file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        importedRecords.push(driveFileToDocumentRecord(file, 'Linked'));
        continue;
      }

      try {
        const copiedFile = await copyDriveFile({ file, accessToken, parentId: rootFolderId });
        importedRecords.push(driveFileToDocumentRecord(copiedFile));
      } catch {
        importedRecords.push(driveFileToDocumentRecord(file, 'Linked'));
      }
    }

    return importedRecords;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Document Cabinet</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Drive-backed migration for site files, permit folders, photos, spreadsheets, and dispatch packets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isMigrating}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-jdt-primary text-white hover:bg-jdt-dark disabled:opacity-60 transition-colors shadow-sm"
          >
            <FileUp className="h-4 w-4" /> Upload Files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={isMigrating}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-jdt-panel border border-jdt-border text-jdt-text hover:bg-jdt-sand disabled:opacity-60 transition-colors shadow-sm"
          >
            <FolderUp className="h-4 w-4" /> Upload Folder
          </button>
          <button
            type="button"
            onClick={handleDrivePicker}
            disabled={isMigrating}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm"
          >
            <Cloud className="h-4 w-4" /> Select from Drive
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleLocalFileInput} />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleLocalFileInput}
        {...({ webkitdirectory: '', directory: '' } as any)}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-5 bg-jdt-panel shadow-sm transition-colors ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-jdt-border hover:bg-jdt-sand/40'}`}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-jdt-sand border border-jdt-border flex items-center justify-center shrink-0">
                {isMigrating ? <Loader2 className="h-6 w-6 text-jdt-primary animate-spin" /> : <UploadCloud className="h-6 w-6 text-jdt-primary" />}
              </div>
              <div>
                <h3 className="text-base font-black text-jdt-text uppercase">Drive Migration Drop Zone</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Local files and browser folder uploads are recreated in Google Drive under the selected import folder.</p>
              </div>
            </div>
            <div className="w-full md:w-72">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Import Folder</label>
              <input
                value={migrationFolderName}
                onChange={event => setMigrationFolderName(event.target.value)}
                disabled={!!driveConfig.uploadFolderId || isMigrating}
                className="w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500 disabled:bg-zinc-100"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatusTile label="Destination" value={importRootLabel} icon={Folder} />
            <StatusTile label="Drive Status" value={driveConfig.isReady ? 'Configured' : 'Needs Credentials'} icon={driveConfig.isReady ? CheckCircle2 : AlertTriangle} tone={driveConfig.isReady ? 'good' : 'warn'} />
            <StatusTile label="Last Action" value={migrationStatus} icon={isMigrating ? Loader2 : UploadCloud} spinning={isMigrating} />
          </div>

          {!driveConfig.isReady && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Missing Drive config: {driveConfig.missingKeys.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="bg-jdt-panel border border-jdt-border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-black text-jdt-text uppercase">Migration Controls</h3>
          <div className="mt-4 space-y-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={isMigrating} className="w-full flex items-center justify-between rounded-lg border border-jdt-border px-3 py-2.5 text-xs font-black uppercase hover:bg-jdt-sand disabled:opacity-60">
              <span className="flex items-center gap-2"><FileUp className="h-4 w-4 text-jdt-primary" /> Files</span>
              <span className="text-zinc-400">PDF, DOCX, XLSX, CSV</span>
            </button>
            <button onClick={() => folderInputRef.current?.click()} disabled={isMigrating} className="w-full flex items-center justify-between rounded-lg border border-jdt-border px-3 py-2.5 text-xs font-black uppercase hover:bg-jdt-sand disabled:opacity-60">
              <span className="flex items-center gap-2"><FolderUp className="h-4 w-4 text-jdt-primary" /> Folders</span>
              <span className="text-zinc-400">Keeps paths</span>
            </button>
            <button onClick={handleDrivePicker} disabled={isMigrating} className="w-full flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-black uppercase text-blue-900 hover:bg-blue-100 disabled:opacity-60">
              <span className="flex items-center gap-2"><Cloud className="h-4 w-4" /> Google Drive</span>
              <span>Picker</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-jdt-panel border border-jdt-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by file name, linked project..."
            className="w-full bg-jdt-panel border border-jdt-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-500 font-bold text-jdt-text"
            value={docSearch}
            onChange={e => setDocSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'Drive', 'Permits', 'Dispatch', 'HOA Docs', 'Proofs'].map(c => (
            <button
              key={c}
              onClick={() => setDocCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-colors ${docCategory === c ? 'bg-jdt-primary text-white' : 'bg-jdt-sand hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-x-auto text-sm">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-jdt-sand text-zinc-500 border-b border-jdt-border">
            <tr>
              <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Document Title</th>
              <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Linked Work</th>
              <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">File Size/Type</th>
              <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px]">Status</th>
              <th className="px-5 py-3 font-black uppercase tracking-wide text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-jdt-sand transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {doc.type === 'Drive Folder' ? <Folder className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 shrink-0" /> : <FileText className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 shrink-0" />}
                    <div>
                      <p className="font-extrabold text-jdt-text">{doc.name}</p>
                      <p className="text-[10px] font-black uppercase text-zinc-400 mt-0.5">{doc.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-bold text-zinc-600">{doc.job}</span>
                </td>
                <td className="px-5 py-4 text-xs font-bold text-zinc-500">
                  {doc.size} &bull; {doc.type.toUpperCase()}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-black uppercase ${getStatusClassName(doc.status)}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {doc.webViewLink ? (
                      <a href={doc.webViewLink} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-400 hover:text-jdt-text hover:bg-zinc-200/50 rounded" title="Open in Drive"><ExternalLink className="h-4 w-4" /></a>
                    ) : (
                      <button className="p-1.5 text-zinc-300 rounded" title="No Drive link" disabled><Eye className="h-4 w-4" /></button>
                    )}
                    {doc.webContentLink ? (
                      <a href={doc.webContentLink} target="_blank" rel="noreferrer" className="p-1.5 text-zinc-400 hover:text-jdt-text hover:bg-zinc-200/50 rounded" title="Download"><Download className="h-4 w-4" /></a>
                    ) : (
                      <button className="p-1.5 text-zinc-300 rounded" title="No direct download" disabled><Download className="h-4 w-4" /></button>
                    )}
                    <button className="p-1.5 text-zinc-400 hover:text-jdt-text hover:bg-zinc-200/50 rounded" title="Print File"><Printer className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-zinc-400 font-bold">
                  No binders or document credentials matched your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusTile({ label, value, icon: Icon, tone = 'neutral', spinning = false }: { label: string; value: string; icon: any; tone?: 'neutral' | 'good' | 'warn'; spinning?: boolean }) {
  const iconClass = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-jdt-primary';
  return (
    <div className="rounded-lg border border-jdt-border bg-white px-3 py-2 flex items-center gap-2 min-w-0">
      <Icon className={`h-4 w-4 shrink-0 ${iconClass} ${spinning ? 'animate-spin' : ''}`} />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase text-zinc-400">{label}</p>
        <p className="text-xs font-extrabold text-jdt-text truncate">{value}</p>
      </div>
    </div>
  );
}

function getStatusClassName(status: string) {
  if (status === 'Approved' || status === 'Signed' || status === 'Migrated') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Reviewing' || status === 'Linked') return 'bg-amber-100 text-amber-800';
  return 'bg-zinc-100 text-zinc-700';
}

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<UploadFile[]> {
  const entries = Array.from(dataTransfer.items ?? [])
    .map(item => (item as any).webkitGetAsEntry?.())
    .filter(Boolean);

  if (entries.length === 0) return Array.from(dataTransfer.files ?? []) as UploadFile[];

  const nestedFiles = await Promise.all(entries.map(entry => readFileSystemEntry(entry)));
  return nestedFiles.flat();
}

async function readFileSystemEntry(entry: any, path = ''): Promise<UploadFile[]> {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file((file: UploadFile) => {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: `${path}${file.name}`,
          configurable: true,
        });
        resolve([file]);
      }, reject);
    });
  }

  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const children = await readAllDirectoryEntries(reader);
  const nestedFiles = await Promise.all(children.map((child: any) => readFileSystemEntry(child, `${path}${entry.name}/`)));
  return nestedFiles.flat();
}

function readAllDirectoryEntries(reader: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const entries: any[] = [];
    const readBatch = () => {
      reader.readEntries((batch: any[]) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}
