import React, { useState } from 'react';
import { Folder, FileText, CheckCircle2, AlertTriangle, Printer, Download, Eye, UploadCloud, Search, Plus } from 'lucide-react';

export default function DocumentsBoard({ openModal }: { openModal: (type: string) => void }) {
  const [docCategory, setDocCategory] = useState('All');
  const [docSearch, setDocSearch] = useState('');
  const [docsList, setDocsList] = useState([
    { id: '1', name: 'Waterford Site Trench Permit', job: 'Waterford Golf Club', size: '2.4 MB', type: 'Permit', status: 'Approved', category: 'Permits' },
    { id: '2', name: 'HOA Access Escort Agreement', job: 'Boca West Country Club', size: '1.1 MB', type: 'Contract', status: 'Signed', category: 'HOA Docs' },
    { id: '3', name: 'FRT-0522-01 Driver Bill of Lading', job: 'FRT-0522-01 Load', size: '890 KB', type: 'dispatch', status: 'Awaiting Sign', category: 'Dispatch' },
    { id: '4', name: 'Miami Canopy Trimming Clearance', job: 'Bellaire Club', size: '4.8 MB', type: 'Permit', status: 'Reviewing', category: 'Permits' },
    { id: '5', name: 'Proof of Delivery - LO-101 Oak', job: 'Waterford Golf Club', size: '1.2 MB', type: 'POD', status: 'Approved', category: 'Proofs' },
  ]);

  const handleSimulateUpload = () => {
    const name = prompt("Enter Document Name:", "New Site Map Plan");
    const job = prompt("Enter Linked Project:", "Waterford Golf Club");
    if (!name || !job) return;
    setDocsList([
      { id: `doc-${Date.now()}`, name, job, size: `${(Math.random()*4 + 1).toFixed(1)} MB`, type: 'PDF Plan', status: 'Reviewing', category: 'Plans' },
      ...docsList
    ]);
  };

  const filteredDocs = docsList.filter(d => {
    const matchesCategory = docCategory === 'All' || d.category === docCategory || (docCategory === 'Permits' && d.type === 'Permit');
    const matchesSearch = d.name.toLowerCase().includes(docSearch.toLowerCase()) || d.job.toLowerCase().includes(docSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Document Cabinet</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Access site blueprints, ROW permits, driver bill-of-lading (BOL), and signed POD sheets</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSimulateUpload}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-jdt-primary text-white hover:bg-jdt-dark transition-colors shadow-sm"
          >
            <UploadCloud className="h-4 w-4"/> Import Document
          </button>
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
          {['All', 'Permits', 'Dispatch', 'HOA Docs', 'Proofs'].map(c => (
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

      <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm overflow-hidden text-sm">
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
                    <FileText className="h-5 w-5 text-zinc-400 group-hover:text-blue-600 shrink-0" />
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
                  <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-black uppercase ${doc.status === 'Approved' || doc.status === 'Signed' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'Reviewing' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-zinc-400 hover:text-jdt-text hover:bg-zinc-200/50 rounded" title="View PDF"><Eye className="h-4 w-4" /></button>
                    <button className="p-1.5 text-zinc-400 hover:text-jdt-text hover:bg-zinc-200/50 rounded" title="Download"><Download className="h-4 w-4" /></button>
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
