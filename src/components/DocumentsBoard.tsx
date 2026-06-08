import React, { useState } from 'react';
import { Folder, FileText, UploadCloud, Search, Plus } from 'lucide-react';
import { IconBadge } from './IconBadge';
import type { DocumentRecord } from '../commandCenter/records';

type DocumentsBoardProps = {
  documents: DocumentRecord[];
  openModal: (type: string, data?: DocumentRecord) => void;
};

export default function DocumentsBoard({ documents, openModal }: DocumentsBoardProps) {
  const [query, setQuery] = useState('');
  const filteredDocuments = documents.filter((doc) => {
    const haystack = `${doc.name || ''} ${doc.title || ''} ${doc.job || ''} ${doc.category || ''} ${doc.status || ''} ${doc.reviewStatus || ''} ${doc.relatedTitle || ''} ${doc.url || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const handleImportDocument = () => {
    const name = prompt('Enter document name:', '');
    if (!name) return;

    const linkedProject = prompt('Enter linked project:', '') || 'Unassigned';
    openModal('document', {
      id: `document-${Date.now().toString(36)}`,
      name,
      job: linkedProject,
      status: 'Needs Review',
      category: 'Imported',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Documents</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Permits, bills of lading, proofs, and project files you add</p>
        </div>
        <button
          type="button"
          onClick={handleImportDocument}
          className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Document
        </button>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents"
            className="w-full rounded-lg border border-jdt-border bg-white pl-9 pr-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
          />
        </div>

        {filteredDocuments.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <button
                type="button"
                key={doc.id || doc.name}
                onClick={() => openModal('document', doc)}
                className="group rounded-lg border border-jdt-border bg-white p-4 text-left hover:border-jdt-olive transition-colors"
              >
                <div className="flex items-start gap-3">
                  <IconBadge icon={FileText} size="sm" colorClass="text-zinc-500 group-hover:text-jdt-primary transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-jdt-text truncate">{doc.name}</p>
                    <p className="text-xs font-bold text-zinc-500 truncate mt-1">{doc.job || 'Unassigned'}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded bg-jdt-sand px-2 py-0.5 text-[9px] font-black uppercase text-jdt-primary">{doc.category || 'Document'}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-500">{doc.reviewStatus || doc.status || 'Unreviewed'}</span>
                    </div>
                    {doc.relatedTitle && <p className="mt-2 truncate text-[10px] font-bold text-zinc-400">{doc.relatedTitle}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-jdt-border p-10 text-center">
            <Folder className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-black text-jdt-text">No documents yet</p>
            <p className="text-xs font-bold text-zinc-500 mt-1">Upload or connect your real files to build this library.</p>
            <button
              type="button"
              onClick={handleImportDocument}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive transition-colors"
            >
              <UploadCloud className="h-4 w-4" /> Import First Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
