import React, { useState } from 'react';
import { Briefcase, Building2, User, Leaf, Truck, Wrench, AlertTriangle, Users, CheckSquare, FilePlus, ChevronRight, Check, PenTool } from 'lucide-react';

export default function EntityForms({ 
  type, 
  onClose, 
  openModal,
  onSaveRecord,
  data,
  jobsList = [],
  ranchOaksList = [],
  equipmentList = [],
  crewsList = [],
  clientsList = []
}: { 
  type: string, 
  onClose: () => void, 
  openModal: (type: string, data?: any) => void,
  onSaveRecord?: (recordType: string, data: any) => void,
  data?: any,
  jobsList?: any[],
  ranchOaksList?: any[],
  equipmentList?: any[],
  crewsList?: any[],
  clientsList?: any[]
}) {
  const [formData, setFormData] = useState<any>(() => {
    if (data) {
      const initial = { ...data };
      if (initial.skills && initial.skills.length > 0 && !initial.skill) {
        initial.skill = initial.skills[0];
      }
      return initial;
    }
    return {};
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pastedSpreadsheet, setPastedSpreadsheet] = useState('');
  const [stagedRows, setStagedRows] = useState<any[]>(() => {
    return formData.importedTrackerRows || [];
  });
  const [isStaged, setIsStaged] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(() => {
    return formData.jobDocuments || [];
  });

  const handleStageImport = () => {
    if (!pastedSpreadsheet.trim()) return;
    const lines = pastedSpreadsheet.trim().split('\n');
    const resultRows = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = line.split(/[,\t]/);
      resultRows.push({
        tag: cells[0]?.trim() || `T-${1000 + i}`,
        caliber: cells[1]?.trim() || '16 in DBH',
        height: cells[2]?.trim() || '30 ft',
        farm: cells[3]?.trim() || 'Office',
        lastPruned: cells[4]?.trim() || '2026-05-15',
      });
    }
    setStagedRows(resultRows);
    setIsStaged(true);
    setFormData((prev: any) => ({
      ...prev,
      importedTrackerRows: resultRows
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newFile = {
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'PDF' : 'Spreadsheet',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toISOString().split('T')[0]
      };
      const updated = [...uploadedFiles, newFile];
      setUploadedFiles(updated);
      setFormData((prev: any) => ({
        ...prev,
        jobDocuments: updated
      }));
    }
  };

  if (type === 'add_new') {
    const options = [
      { id: 'job', icon: Briefcase, label: 'New Job / Project' },
      { id: 'client', icon: Building2, label: 'New Client / Company' },
      { id: 'contact', icon: User, label: 'New Contact' },
      { id: 'tree', icon: Leaf, label: 'New Tree / Plant Asset' },
      { id: 'load', icon: Truck, label: 'New Freight Load' },
      { id: 'equipment', icon: Wrench, label: 'New Equipment Asset' },
      { id: 'maintenance', icon: AlertTriangle, label: 'New Maintenance Issue' },
      { id: 'employee', icon: Users, label: 'New Employee / Crew Member' },
      { id: 'task', icon: CheckSquare, label: 'New Task / Follow-Up' },
      { id: 'change_order', icon: FilePlus, label: 'New Change Order' }
    ];

    return (
      <div className="grid grid-cols-2 gap-3 pb-2">
        {options.map(t => (
          <button 
            key={t.id} 
            onClick={() => openModal(t.id)} 
            className="flex flex-col items-center justify-center p-6 bg-jdt-panel border border-jdt-border rounded-xl hover:bg-jdt-panel hover:border-zinc-400 hover:shadow-md transition-all group pointer-events-auto"
          >
            <div className="h-12 w-12 rounded-full bg-jdt-panel border border-jdt-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <t.icon className="h-5 w-5 text-zinc-700" />
            </div>
            <span className="text-sm font-black text-jdt-text text-center">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (type === 'job') {
      if (!formData.title) err.title = 'Project Name is required';
      if (!formData.client) err.client = 'Client / Company is required';
    } else if (type === 'client') {
      if (!formData.name) err.name = 'Company Name is required';
      if (!formData.phone) err.phone = 'Main Phone is required';
    } else if (type === 'contact') {
      if (!formData.name) err.name = 'Contact Name is required';
      if (!formData.email) err.email = 'Email is required';
    } else if (type === 'tree' || type === 'edit_tree') {
      if (!formData.treeId) err.treeId = 'Tree ID / Tag Number is required';
      if (!formData.ranchOakType) err.ranchOakType = 'Species / Tree Type is required';
    } else if (type === 'load') {
      if (!formData.title) err.title = 'Title / Load Number is required';
      if (!formData.driver) err.driver = 'Driver is required';
    } else if (type === 'equipment') {
      if (!formData.name) err.name = 'Equipment Name / ID is required';
      if (!formData.status) err.status = 'Status is required';
    } else if (type === 'maintenance') {
      if (!formData.asset) err.asset = 'Affected Asset is required';
      if (!formData.notes) err.notes = 'Issue details are required';
    } else if (type === 'employee') {
      if (!formData.name) err.name = 'Employee Name is required';
      if (!formData.role) err.role = 'Role is required';
    } else if (type === 'task') {
      if (!formData.title) err.title = 'Task Title is required';
    } else if (type === 'change_order') {
      if (!formData.project) err.project = 'Linked Project is required';
      if (!formData.description) err.description = 'Description is required';
    } else if (type === 'delay') {
      if (!formData.reason) err.reason = 'Reason for Delay is required';
    } else if (type === 'assign_crew') {
      if (!formData.lead) err.lead = 'Crew Selection is required';
    } else if (type === 'edit_project') {
      if (!formData.title) err.title = 'Project Name is required';
      if (!formData.client) err.client = 'Client is required';
    } else if (type === 'add_tree') {
      if (!formData.treeId) err.treeId = 'Tree ID is required';
    } else if (type === 'create_move') {
      if (!formData.title) err.title = 'Load Title / Number is required';
      if (!formData.driver) err.driver = 'Driver is required';
    } else if (type === 'log_prune') {
      if (!formData.pruneDate) err.pruneDate = 'Prune Date is required';
      if (!formData.crewLead) err.crewLead = 'Crew Lead is required';
    } else if (type === 'treatment') {
      if (!formData.treatmentType) err.treatmentType = 'Treatment Type is required';
      if (!formData.productUsed) err.productUsed = 'Product Used is required';
    } else if (type === 'move_check') {
      if (!formData.inspectedBy) err.inspectedBy = 'Inspected By is required';
    } else if (type === 'assign_tree') {
      if (!formData.jobTitle) err.jobTitle = 'Target Job Assignment is required';
    } else if (type === 'set_freight_status') {
      if (!formData.status) err.status = 'Status is required';
    } else if (type === 'edit_freight') {
      if (!formData.title) err.title = 'Title / Load Number is required';
      if (!formData.driver) err.driver = 'Driver is required';
    } else if (type === 'edit_equipment') {
      if (!formData.name) err.name = 'Equipment Name is required';
    } else if (type === 'set_eq_status') {
      if (!formData.status) err.status = 'Status is required';
    } else if (type === 'log_issue') {
      if (!formData.issueText) err.issueText = 'Issue Details is required';
    } else if (type === 'complete') {
      if (!formData.receiverName) err.receiverName = 'Receiver Name is required';
    } else if (type === 'schedule_disruption') {
      if (!formData.cause) err.cause = 'Disruption Cause is required';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (onSaveRecord) {
      onSaveRecord(type, formData);
    }
    onClose();
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 pointer-events-auto">
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold uppercase">Validation Mismatch Errors</p>
            <ul className="list-disc pl-3">
              {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* RENDER SPECIFIC INPUTS ACCORDING TO TYPE */}
      {/* 1. JOB FORM */}
      {type === 'job' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Project Name *</label>
              <input type="text" onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Boca West Expansion" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Client Company *</label>
              <select onChange={e => handleChange('client', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required>
                <option value="">-- Select Client --</option>
                {clientsList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="New Client Option">Other / New Client</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Division *</label>
              <select onChange={e => handleChange('division', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" defaultValue="relocation">
                <option value="relocation">Relocation / Installation</option>
                <option value="nursery">Nursery / Sales</option>
                <option value="freight">Freight Dispatch</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Priority Level</label>
              <select onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" defaultValue="onSchedule">
                <option value="onSchedule">On Schedule</option>
                <option value="waiting">Waiting on JDT</option>
                <option value="delayed">Delayed (Other)</option>
                <option value="urgent">Problem / Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Job Location / Address</label>
            <input type="text" onChange={e => handleChange('location', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="1200 Golf Course Rd, Boca Raton" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Project Manager</label>
              <input type="text" onChange={e => handleChange('pm', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. PM Carlos" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Work Window / Target Date</label>
              <input type="date" onChange={e => handleChange('date', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Access Notes & Obstacles</label>
            <textarea onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="e.g. stage east service driveway. Watch main power lines overhead." />
          </div>

          {/* JOB SOURCE FILES & SPREADSHEET INTAKE */}
          <div className="border-t border-jdt-border pt-4 mt-6">
            <h4 className="text-sm font-black text-jdt-primary uppercase tracking-wide mb-1">Job Source Files & Tracker Intake</h4>
            <p className="text-xs text-zinc-500 font-bold mb-4">Connect dynamic spreadsheets, Drive folders, and stage spreadsheet tree list rows for approval.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tracker / Spreadsheet Title</label>
                <input type="text" value={formData.sourceTrackerTitle || ''} onChange={e => handleChange('sourceTrackerTitle', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Boca West Tree Log V4" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Spreadsheet / Drive URL</label>
                <input type="url" value={formData.sourceTrackerUrl || ''} onChange={e => handleChange('sourceTrackerUrl', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="https://docs.google.com/spreadsheets/..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Source Folder URL</label>
                <input type="url" value={formData.sourceFolderUrl || ''} onChange={e => handleChange('sourceFolderUrl', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="https://drive.google.com/drive/folders/..." />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Source Notes</label>
                <input type="text" value={formData.sourceNotes || ''} onChange={e => handleChange('sourceNotes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Overhead powerlines, watch out" />
              </div>
            </div>

            {/* Simulated Drag & Drop File Upload */}
            <div className="mt-4">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5 font-sans">Document Upload (Contracts, PDFs, Photos, Excel)</label>
              <div 
                className="border-2 border-dashed border-jdt-border rounded-xl p-6 text-center hover:bg-jdt-sand/30 cursor-pointer transition-colors relative"
                onClick={() => document.getElementById('drag-drop-upload-input')?.click()}
              >
                <input 
                  type="file" 
                  id="drag-drop-upload-input" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.xlsx,.csv,.docx,.jpg,.png" 
                />
                <p className="text-sm font-bold text-jdt-primary">Drag & drop files here, or <span className="underline">browse</span></p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1">Accepts PDF, Excel, Word, CSV, Image up to 25MB</p>
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400">Attached Documents ({uploadedFiles.length})</p>
                  {uploadedFiles.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-jdt-sand/40 border border-jdt-border rounded-lg text-xs font-bold">
                      <span className="text-zinc-700 truncate max-w-sm">📄 {doc.name} ({doc.size})</span>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = uploadedFiles.filter((_, idx) => idx !== i);
                          setUploadedFiles(updated);
                          setFormData((prev: any) => ({ ...prev, jobDocuments: updated }));
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paste Spreadsheet / Bulk Import Textarea */}
            <div className="mt-4 p-3 bg-jdt-sand/20 border border-jdt-border rounded-xl space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-500">Paste Spreadsheet Rows (CSV / Tab delimited)</label>
              <textarea 
                value={pastedSpreadsheet}
                onChange={e => setPastedSpreadsheet(e.target.value)}
                className="w-full bg-jdt-panel border border-jdt-border rounded-lg p-2.5 text-xs font-mono font-bold text-jdt-text h-20 outline-none focus:border-zinc-500" 
                placeholder="Tag,Caliber,Height,Farm,PrunedDate&#10;BCC-41,18 in,30 ft,Office,2026-04-10&#10;BCC-45,20 in,25 ft,Office,2026-04-12" 
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400">Format: Tag, Caliber, Height, Nursery, LastPrunedDate</p>
                <div className="flex gap-2">
                  {pastedSpreadsheet && (
                    <button 
                      type="button" 
                      onClick={() => setPastedSpreadsheet('')}
                      className="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-500 hover:text-jdt-text"
                    >
                      Clear
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleStageImport}
                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wide bg-jdt-primary text-white hover:bg-jdt-dark rounded shadow-sm transition-colors"
                  >
                    Stage Import
                  </button>
                </div>
              </div>

              {/* Parsed / Staged Rows Preview Table */}
              {stagedRows.length > 0 && (
                <div className="mt-3 pt-2 border-t border-jdt-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-emerald-800">Staged Rows Preview ({stagedRows.length})</p>
                    <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Pre-Approval Draft</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-jdt-border rounded-lg bg-jdt-panel">
                    <table className="w-full text-left text-[10px] font-bold">
                      <thead className="bg-jdt-sand sticky top-0 text-[9px] font-black uppercase text-zinc-500 border-b border-jdt-border">
                        <tr>
                          <th className="p-2">Tag</th>
                          <th className="p-2">Caliber</th>
                          <th className="p-2">Height</th>
                          <th className="p-2">Nursery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-jdt-border text-zinc-600 font-bold">
                        {stagedRows.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-zinc-50">
                            <td className="p-2 text-jdt-text font-black">{row.tag}</td>
                            <td className="p-2">{row.caliber}</td>
                            <td className="p-2">{row.height}</td>
                            <td className="p-2">{row.farm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CLIENT FORM */}
      {type === 'client' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Company / Developer Name *</label>
            <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Primary Representative *</label>
              <input type="text" value={formData.contactName || ''} onChange={e => handleChange('contactName', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Mike Johnson" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Phone Number *</label>
              <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="561-555-0100" required />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Email Address</label>
            <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="pm@company.com" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Billing & Corporate Address</label>
            <input type="text" value={formData.billingAddress || ''} onChange={e => handleChange('billingAddress', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Gate / Site Access Instructions</label>
            <textarea value={formData.accessNotes || ''} onChange={e => handleChange('accessNotes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20 focus:border-zinc-500" placeholder="Acreage gate keycode 8200#. Ask for Mike on radio channel 3." />
          </div>
        </div>
      )}

      {/* 3. CONTACT FORM */}
      {type === 'contact' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Contact Person Name *</label>
              <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Linked Organization / Company</label>
              <select value={formData.company || ''} onChange={e => handleChange('company', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500">
                <option value="">-- Select Company --</option>
                {clientsList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Contact Email *</label>
              <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Contact Phone</label>
              <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Role/Title in Field</label>
            <input type="text" value={formData.role || ''} onChange={e => handleChange('role', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Superintendent, Landscape Architect" />
          </div>
        </div>
      )}

      {/* 4. TREE INVENTORY FORM */}
      {(type === 'tree' || type === 'edit_tree') && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tree ID / Tag Number *</label>
              <input type="text" value={formData.treeId || ''} onChange={e => handleChange('treeId', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. LO-115" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Species / Tree Type *</label>
              <select value={formData.ranchOakType || ''} onChange={e => handleChange('ranchOakType', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required>
                <option value="">-- Select Species --</option>
                <option value="Live Oak Profile">Live Oak</option>
                <option value="Sabal Palm">Sabal Palm</option>
                <option value="Royal Palm">Royal Palm</option>
                <option value="Shumard Oak">Shumard Oak</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">DBH (inches)</label>
              <input type="number" value={formData.dbh ?? ''} onChange={e => handleChange('dbh', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Height (ft)</label>
              <input type="number" value={formData.height ?? ''} onChange={e => handleChange('height', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Spread (ft)</label>
              <input type="number" value={formData.spread ?? ''} onChange={e => handleChange('spread', e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Stock Status</label>
              <select value={formData.status || 'Available'} onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500">
                <option value="Available">Available</option>
                <option value="Assigned">Assigned to Job</option>
                <option value="Sold">Sold</option>
                <option value="On Hold">On Hold</option>
                <option value="Dig Queue">Dig Queue</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Farm Loop Location</label>
              <select value={formData.farm || 'Office'} onChange={e => handleChange('farm', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500">
                <option value="Office">Office Farm</option>
                <option value="25 Acre">25 Acre Farm</option>
                <option value="40 Acre">40 Acre Farm</option>
                <option value="10 Acre">10 Acre Farm</option>
                <option value="Janets">Janets Farm</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Zone Block</label>
              <input type="text" value={formData.zone || ''} onChange={e => handleChange('zone', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Block D6" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Rootball Size (in)</label>
              <input type="text" value={formData.rootballSize || formData.rootball || ''} onChange={e => handleChange('rootballSize', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. 96" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Date Planted</label>
              <input type="date" value={formData.datePlanted || ''} onChange={e => handleChange('datePlanted', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Date Harvested</label>
              <input type="date" value={formData.dateHarvested || ''} onChange={e => handleChange('dateHarvested', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div className="border-t border-jdt-border pt-4 mt-2 space-y-3">
            <p className="text-[11px] font-black uppercase text-jdt-primary tracking-wide">Root Pruning & Customer Flagging Logs</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Root Pruning Category</label>
                <select value={formData.rootPruneRequirement || 'None'} onChange={e => handleChange('rootPruneRequirement', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500">
                  <option value="None">None (Can be dug directly)</option>
                  <option value="1 Pruning">Requires 1 Root Pruning</option>
                  <option value="2 Prunings">Requires 2 Root Prunings</option>
                  <option value="3 Prunings">Requires 3 Root Prunings</option>
                  <option value="More">Requires More Prunings</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Pruning #1 Date</label>
                <input type="date" value={formData.rootPruneDate1 || ''} onChange={e => handleChange('rootPruneDate1', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-xs font-bold text-jdt-text outline-none focus:border-zinc-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Pruning #2 Date</label>
                <input type="date" value={formData.rootPruneDate2 || ''} onChange={e => handleChange('rootPruneDate2', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-2.5 py-2 text-xs font-bold text-jdt-text outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Pruning #3 Date</label>
                <input type="date" value={formData.rootPruneDate3 || ''} onChange={e => handleChange('rootPruneDate3', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-2.5 py-2 text-xs font-bold text-jdt-text outline-none focus:border-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Pruning #4 Date</label>
                <input type="date" value={formData.rootPruneDate4 || ''} onChange={e => handleChange('rootPruneDate4', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-2.5 py-2 text-xs font-bold text-jdt-text outline-none focus:border-zinc-500" />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Customer Order Flagging Tape Description</label>
              <input type="text" value={formData.flaggingTape || ''} onChange={e => handleChange('flaggingTape', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Tagged with Red Flagging Tape for Golf Course VIP client order" />
            </div>
          </div>
        </div>
      )}

      {/* 5. FREIGHT LOAD DISPATCH */}
      {type === 'load' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Load Number / Title *</label>
              <input type="text" onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. FRT-0522-09" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Linked Relocation Project</label>
              <select onChange={e => handleChange('jobId', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="">-- Select Active Job --</option>
                {jobsList.map(j => <option key={j.id} value={j.title}>{j.title}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Heavy Driver Assignment *</label>
              <select onChange={e => handleChange('driver', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Select Driver --</option>
                <option value="Christian">Christian</option>
                <option value="Alex">Alex</option>
                <option value="Ron">Ron</option>
                <option value="Vince">Vince</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tractor Truck / Trailer Rig</label>
              <input type="text" onChange={e => handleChange('truck', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="Truck #4 / Trailer #12" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Pickup / Origin Block</label>
              <input type="text" onChange={e => handleChange('origin', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="Yard Block D" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Delivery / HOA Drop-site</label>
              <input type="text" onChange={e => handleChange('delivery', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Departure Launch Time</label>
              <input type="time" onChange={e => handleChange('departureTime', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">ETA Window</label>
              <input type="text" onChange={e => handleChange('eta', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. 11:30 AM" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-jdt-border pt-3">
            <input type="checkbox" id="escort" onChange={e => handleChange('escortRequired', e.target.checked)} className="h-4 w-4 rounded text-jdt-primary focus:ring-0" />
            <label htmlFor="escort" className="text-xs font-black uppercase text-zinc-500 cursor-pointer">Require Escort Vehicle (Wide load permit constraint)</label>
          </div>
        </div>
      )}

      {/* 6. EQUIPMENT ASSET FORM */}
      {type === 'equipment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Equipment Name / ID *</label>
              <input type="text" onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. John Deere Spade 770" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Equipment Type</label>
              <select onChange={e => handleChange('eqType', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Loadders">Loader</option>
                <option value="Spades">Tree Spade</option>
                <option value="Excavators">Excavator</option>
                <option value="Trucks">Hauler Truck</option>
                <option value="Trailers">Trailer Flatbed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Equipment Status *</label>
              <select onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Status --</option>
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Maintenance">Maintenance Check</option>
                <option value="Down">Down (Needs Service)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Assigned Operator</label>
              <input type="text" onChange={e => handleChange('operator', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Luis" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Current Active Hours</label>
              <input type="number" onChange={e => handleChange('hours', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" defaultValue={100} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Service Due Window (hrs)</label>
              <input type="number" onChange={e => handleChange('serviceDueHours', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" defaultValue={250} />
            </div>
          </div>
        </div>
      )}

      {/* 7. MAINTENANCE ISSUE FORM */}
      {type === 'maintenance' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Select Disruption Equipment *</label>
            <select onChange={e => handleChange('asset', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose fleet machinery --</option>
              {equipmentList.map(eq => <option key={eq.id} value={eq.name}>{eq.name} ({eq.id})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Disruption Severity</label>
              <select onChange={e => handleChange('severity', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" defaultValue="Moderate">
                <option value="Low">Low (Can run)</option>
                <option value="Moderate">Moderate (Needs check soon)</option>
                <option value="Critical">Critical (GROUNDED)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Reported By</label>
              <input type="text" onChange={e => handleChange('reporter', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Christian" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Service Task Details *</label>
            <textarea onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="e.g. hydraulic fluid leaking around left front arm joint." required />
          </div>
        </div>
      )}

      {/* 8. EMPLOYEE / CREW成员 FORM */}
      {type === 'employee' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Personnel Full Name *</label>
            <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Role / Function *</label>
              <select value={formData.role || ''} onChange={e => handleChange('role', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required>
                <option value="">-- Select Role --</option>
                <option value="Crew Leader">Crew Leader</option>
                <option value="Field Hand">Field Hand</option>
                <option value="Heavy Haul Driver">Heavy Haul Driver</option>
                <option value="Lead Mechanic">Lead Mechanic</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Contact Phone</label>
              <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="561-555-0100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Language Preference</label>
              <select value={formData.language || 'Bilingual'} onChange={e => handleChange('language', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500">
                <option value="Bilingual">Bilingual (Eng/Spa)</option>
                <option value="Spanish">Spanish Only</option>
                <option value="English">English Only</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Primary Operation Skills</label>
              <input type="text" value={formData.skill || ''} onChange={e => handleChange('skill', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Rigging, Large Spade" />
            </div>
          </div>
        </div>
      )}

      {/* 9. TASK FORM */}
      {type === 'task' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Task / Milestone Title *</label>
            <input type="text" onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Verify HOA entry gates clearances" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Assign User / Crew</label>
              <input type="text" onChange={e => handleChange('owner', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Carlos" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Milestone Deadline</label>
              <input type="date" onChange={e => handleChange('dueDate', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* 10. CHANGE ORDER FORM */}
      {type === 'change_order' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Select Linked Project *</label>
            <select onChange={e => handleChange('project', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose active job --</option>
              {jobsList.map(j => <option key={j.id} value={j.title}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Financial Budget Offset ($)</label>
              <input type="number" onChange={e => handleChange('amount', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. 4500" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Requested By</label>
              <input type="text" onChange={e => handleChange('requester', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Superintendent Mike" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Impact Adjust Reason *</label>
            <textarea onChange={e => handleChange('description', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="Required crane relocate due to soft sand blockages." required />
          </div>
        </div>
      )}

      {/* 11. DELAY FORM */}
      {type === 'delay' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Reason for Delay *</label>
            <select onChange={e => handleChange('reason', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Select Delay Cause --</option>
              <option value="Mechanical Failure">Mechanical Failure (Tire/Hydraulic)</option>
              <option value="Weather blockades">Severe Weather (High Winds/Rain)</option>
              <option value="Site constraints">HOA Site blockades</option>
              <option value="Agronomy holds">Agronomy check discrepancies</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Adjust ETA to</label>
              <input type="text" onChange={e => handleChange('adjustTime', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Tomorrow 8:00 AM" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Severity Impact</label>
              <select onChange={e => handleChange('severity', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" defaultValue="Moderate">
                <option value="Low">Low (Minutes shift)</option>
                <option value="Moderate">Moderate (Hours shift)</option>
                <option value="Critical">Critical (Day shift / Halt)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Field Observations Notes</label>
            <textarea onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="e.g. Rain flooded trench. Need pump before spade can drop." />
          </div>
        </div>
      )}

      {/* 12. ASSIGN CREW FORM */}
      {type === 'assign_crew' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Select Operations Crew *</label>
            <select onChange={e => handleChange('lead', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose Leader / Crew --</option>
              {crewsList.map(c => <option key={c.id} value={c.name}>{c.name} ({c.role})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Crew Size Needed</label>
              <input type="number" onChange={e => handleChange('crewSize', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" defaultValue={3} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Rigging / Specific Equipment</label>
              <input type="text" onChange={e => handleChange('eqNeeded', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Komatsu Loader" />
            </div>
          </div>
        </div>
      )}

      {/* 13. PRINT SERVICE CARD SPECIFIC */}
      {type === 'print_card' && (
        <div className="space-y-4 p-4 border border-zinc-200 bg-zinc-50 rounded-lg">
          <p className="text-xs font-bold text-zinc-600 leading-snug">This launches a print ticket packet with barcode QR trackers, safety checklist records, and active service schedules assigned to this operational asset.</p>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Output Terminal</label>
            <select className="w-full rounded border border-jdt-border bg-jdt-panel text-sm font-bold">
              <option>Mobile Handheld PDF Tag</option>
              <option>Yard Label Router #1 (Zebra Barcode)</option>
            </select>
          </div>
        </div>
      )}

      {/* 14. EDIT PROJECT FORM */}
      {type === 'edit_project' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Project Name *</label>
              <input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Client Company *</label>
              <select value={formData.client || ''} onChange={e => handleChange('client', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Select Client --</option>
                {clientsList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Division</label>
              <select value={formData.division || 'relocation'} onChange={e => handleChange('division', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="relocation">Relocation / Installation</option>
                <option value="nursery">Nursery / Sales</option>
                <option value="freight">Freight Dispatch</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Status</label>
              <select value={formData.status || 'onSchedule'} onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="onSchedule">On Schedule</option>
                <option value="waiting">Waiting on JDT</option>
                <option value="delayed">Delayed</option>
                <option value="urgent">Problem / Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Project Manager</label>
              <input type="text" value={formData.pm || ''} onChange={e => handleChange('pm', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Target Date</label>
              <input type="date" value={formData.date || ''} onChange={e => handleChange('date', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Location Address</label>
            <input type="text" value={formData.location || ''} onChange={e => handleChange('location', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Field Access Notes</label>
            <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-16" />
          </div>

          {/* JOB SOURCE FILES & SPREADSHEET INTAKE */}
          <div className="border-t border-jdt-border pt-4 mt-6">
            <h4 className="text-sm font-black text-jdt-primary uppercase tracking-wide mb-1">Job Source Files & Tracker Intake</h4>
            <p className="text-xs text-zinc-500 font-bold mb-4">Connect dynamic spreadsheets, Drive folders, and stage spreadsheet tree list rows for approval.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tracker / Spreadsheet Title</label>
                <input type="text" value={formData.sourceTrackerTitle || ''} onChange={e => handleChange('sourceTrackerTitle', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Boca West Tree Log V4" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Spreadsheet / Drive URL</label>
                <input type="url" value={formData.sourceTrackerUrl || ''} onChange={e => handleChange('sourceTrackerUrl', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="https://docs.google.com/spreadsheets/..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Source Folder URL</label>
                <input type="url" value={formData.sourceFolderUrl || ''} onChange={e => handleChange('sourceFolderUrl', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="https://drive.google.com/drive/folders/..." />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Source Notes</label>
                <input type="text" value={formData.sourceNotes || ''} onChange={e => handleChange('sourceNotes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500" placeholder="e.g. Overhead powerlines, watch out" />
              </div>
            </div>

            {/* Simulated Drag & Drop File Upload */}
            <div className="mt-4">
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5 font-sans">Document Upload (Contracts, PDFs, Photos, Excel)</label>
              <div 
                className="border-2 border-dashed border-jdt-border rounded-xl p-6 text-center hover:bg-jdt-sand/30 cursor-pointer transition-colors relative"
                onClick={() => document.getElementById('drag-drop-upload-input-edit')?.click()}
              >
                <input 
                  type="file" 
                  id="drag-drop-upload-input-edit" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".pdf,.xlsx,.csv,.docx,.jpg,.png" 
                />
                <p className="text-sm font-bold text-jdt-primary">Drag & drop files here, or <span className="underline">browse</span></p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1">Accepts PDF, Excel, Word, CSV, Image up to 25MB</p>
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400">Attached Documents ({uploadedFiles.length})</p>
                  {uploadedFiles.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-jdt-sand/40 border border-jdt-border rounded-lg text-xs font-bold">
                      <span className="text-zinc-700 truncate max-w-sm">📄 {doc.name} ({doc.size})</span>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = uploadedFiles.filter((_, idx) => idx !== i);
                          setUploadedFiles(updated);
                          setFormData((prev: any) => ({ ...prev, jobDocuments: updated }));
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paste Spreadsheet / Bulk Import Textarea */}
            <div className="mt-4 p-3 bg-jdt-sand/20 border border-jdt-border rounded-xl space-y-2">
              <label className="block text-[10px] font-black uppercase text-zinc-500">Paste Spreadsheet Rows (CSV / Tab delimited)</label>
              <textarea 
                value={pastedSpreadsheet}
                onChange={e => setPastedSpreadsheet(e.target.value)}
                className="w-full bg-jdt-panel border border-jdt-border rounded-lg p-2.5 text-xs font-mono font-bold text-jdt-text h-20 outline-none focus:border-zinc-500" 
                placeholder="Tag,Caliber,Height,Farm,PrunedDate&#10;BCC-41,18 in,30 ft,Office,2026-04-10&#10;BCC-45,20 in,25 ft,Office,2026-04-12" 
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-zinc-400">Format: Tag, Caliber, Height, Nursery, LastPrunedDate</p>
                <div className="flex gap-2">
                  {pastedSpreadsheet && (
                    <button 
                      type="button" 
                      onClick={() => setPastedSpreadsheet('')}
                      className="px-3 py-1.5 text-[10px] font-black uppercase text-zinc-500 hover:text-jdt-text"
                    >
                      Clear
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={handleStageImport}
                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wide bg-jdt-primary text-white hover:bg-jdt-dark rounded shadow-sm transition-colors"
                  >
                    Stage Import
                  </button>
                </div>
              </div>

              {/* Parsed / Staged Rows Preview Table */}
              {stagedRows.length > 0 && (
                <div className="mt-3 pt-2 border-t border-jdt-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-emerald-800">Staged Rows Preview ({stagedRows.length})</p>
                    <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Pre-Approval Draft</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-jdt-border rounded-lg bg-jdt-panel">
                    <table className="w-full text-left text-[10px] font-bold">
                      <thead className="bg-jdt-sand sticky top-0 text-[9px] font-black uppercase text-zinc-500 border-b border-jdt-border">
                        <tr>
                          <th className="p-2">Tag</th>
                          <th className="p-2">Caliber</th>
                          <th className="p-2">Height</th>
                          <th className="p-2">Nursery</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-jdt-border text-zinc-600 font-bold">
                        {stagedRows.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-zinc-50">
                            <td className="p-2 text-jdt-text font-black">{row.tag}</td>
                            <td className="p-2">{row.caliber}</td>
                            <td className="p-2">{row.height}</td>
                            <td className="p-2">{row.farm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 15. ADD TREE ASSET TO JOB FORM */}
      {type === 'add_tree' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Select an available tree asset to assign to: <strong className="text-jdt-primary">{data?.title || 'this project'}</strong></p>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Select Available Tree Asset *</label>
            <select value={formData.treeId || ''} onChange={e => handleChange('treeId', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose Tree --</option>
              {ranchOaksList.filter(tree => tree.status !== 'Assigned' && tree.status !== 'Sold').map(tree => (
                <option key={tree.id} value={tree.treeId}>{tree.treeId} ({tree.ranchOakType || 'Live Oak'} - DBH {tree.dbh}" - {tree.farm})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Placement Details</label>
            <input type="text" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. west edge near signature pond" />
          </div>
        </div>
      )}

      {/* 16. CREATE MOVE / FREIGHT LOAD FORM */}
      {type === 'create_move' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Configure a freight dispatch load for: <strong className="text-jdt-primary">{data?.title || 'this project'}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Load ID / Number *</label>
              <input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. FRT-0522-10" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Heavy Driver Assignment *</label>
              <select value={formData.driver || ''} onChange={e => handleChange('driver', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Select Driver --</option>
                <option value="Christian">Christian</option>
                <option value="Alex">Alex</option>
                <option value="Ron">Ron</option>
                <option value="Vince">Vince</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Rig Structure</label>
              <input type="text" value={formData.truck || 'Semi #4 / Lowboy #2'} onChange={e => handleChange('truck', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Pickup Origin</label>
              <input type="text" value={formData.origin || 'Clewiston Farm 1'} onChange={e => handleChange('origin', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Drop-off Destination</label>
              <input type="text" value={formData.delivery || data?.location || ''} onChange={e => handleChange('delivery', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">ETA Window</label>
              <input type="text" value={formData.eta || ''} onChange={e => handleChange('eta', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. 11:30 AM" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="escort_mov" checked={formData.escortRequired || false} onChange={e => handleChange('escortRequired', e.target.checked)} className="h-4 w-4 rounded text-jdt-primary focus:ring-0" />
            <label htmlFor="escort_mov" className="text-xs font-black uppercase text-zinc-500 cursor-pointer">Escort Vehicle Pilot Required</label>
          </div>
        </div>
      )}

      {/* 17. LOG PRUNE FORM */}
      {type === 'log_prune' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2 font-sans">Document pruning details for asset: <strong className="text-jdt-primary">{data?.treeId || 'this tree'}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Pruner Category</label>
              <select value={formData.pruneType || 'Maintenance'} onChange={e => handleChange('pruneType', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Maintenance">Annual Maintenance</option>
                <option value="Root Prune 1">Root Prune 1 (In ground)</option>
                <option value="Root Prune 2">Root Prune 2 (Hard Cure)</option>
                <option value="Crown Thinning">Crown Canopy Thinning</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Log Date *</label>
              <input type="date" value={formData.pruneDate || ''} onChange={e => handleChange('pruneDate', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Crew Leader Name *</label>
              <input type="text" value={formData.crewLead || ''} onChange={e => handleChange('crewLead', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Carlos Gomez" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Root Growth Integrity</label>
              <select value={formData.rootStatus || 'Good'} onChange={e => handleChange('rootStatus', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Good">Vigorous Root Growth</option>
                <option value="Moderate">Awaiting Fine Roots</option>
                <option value="Grounded">Slow Response</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Observations & Pruner Notes</label>
            <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-16" placeholder="Burlap check, hydration status, etc." />
          </div>
        </div>
      )}

      {/* 18. TREATMENT FORM */}
      {type === 'treatment' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Record tree care / soil treatment for: <strong className="text-jdt-primary">{data?.treeId || 'this tree'}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Treatment Type *</label>
              <select value={formData.treatmentType || ''} onChange={e => handleChange('treatmentType', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Choose Type --</option>
                <option value="Fertilizer">Fertilizer Application</option>
                <option value="Fungicide">Fungicide Spray</option>
                <option value="Insecticide">Pest Management</option>
                <option value="Moisture Control">Micropore Gel Injection</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Chemical / Product Used *</label>
              <input type="text" value={formData.productUsed || ''} onChange={e => handleChange('productUsed', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Copper Fungicide, 18-6-12" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Dosage Specifications</label>
              <input type="text" value={formData.dosage || ''} onChange={e => handleChange('dosage', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Application Date</label>
              <input type="date" value={formData.treatmentDate || ''} onChange={e => handleChange('treatmentDate', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* 19. MOVE CHECK FORM */}
      {type === 'move_check' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Register pre-harvest readiness checklist for: <strong className="text-jdt-primary">{data?.treeId || 'this tree'}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Readiness status</label>
              <select value={formData.readiness || 'Approved'} onChange={e => handleChange('readiness', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Approved">Approved for Spade Harvest</option>
                <option value="Marginal">Marginal (Needs 7-day watering hold)</option>
                <option value="Rejected">Rejected (Root check hold)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Inspected By PM *</label>
              <input type="text" value={formData.inspectedBy || ''} onChange={e => handleChange('inspectedBy', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Carlos Gomez" required />
            </div>
          </div>
          <div className="p-4 rounded-xl border border-jdt-border bg-jdt-sand/20 space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 font-sans">Pre-Dig Integrity List Required</p>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
               <input type="checkbox" id="e_chk1" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-jdt-primary focus:ring-0" />
               <label htmlFor="e_chk1">Underground utility lines marked (811 ticket)</label>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 mt-2">
               <input type="checkbox" id="e_chk2" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-jdt-primary focus:ring-0" />
               <label htmlFor="e_chk2">Water rings actively soaked for 48 hrs</label>
            </div>
          </div>
        </div>
      )}

      {/* 20. ASSIGN TREE FORM */}
      {type === 'assign_tree' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Bind tree asset <strong className="text-jdt-primary">{data?.treeId}</strong> to an active relocation project:</p>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Choose Project Location *</label>
            <select value={formData.jobTitle || ''} onChange={e => handleChange('jobTitle', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none mt-1" required>
              <option value="">-- Choose Job --</option>
              {jobsList.map(j => (
                <option key={j.id} value={j.title}>{j.title} ({j.client})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tag Specs & Notes</label>
            <input type="text" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none mt-1" placeholder="e.g. client pre-selected specimen" />
          </div>
        </div>
      )}

      {/* 21. FREIGHT STATUS FORM */}
      {type === 'set_freight_status' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Update transit status details for dispatch load: <strong className="text-jdt-primary">{data?.title || 'this load'}</strong></p>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Operational State *</label>
            <select value={formData.status || ''} onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose Status --</option>
              <option value="Pending">Dispatched</option>
              <option value="Dig Queue">Pre-load Curing</option>
              <option value="In Transit">In Transit</option>
              <option value="At Delivery">At Delivery</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">State Check Remarks</label>
            <textarea value={formData.transitNotes || ''} onChange={e => handleChange('transitNotes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="Traffic updates, route checkpoints passed, etc." />
          </div>
        </div>
      )}

      {/* 22. COMPLETE DISPATCH (POD) FORM */}
      {type === 'complete' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Finalize proof-of-delivery (POD) manifest sign-off for load: <strong className="text-jdt-primary">{data?.title || 'selected load'}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Client Receiver Name *</label>
              <input type="text" value={formData.receiverName || ''} onChange={e => handleChange('receiverName', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. Supt. Mike Johnson" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Completion Arrival Time</label>
              <input type="time" value={formData.completedAt || ''} onChange={e => handleChange('completedAt', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div className="h-28 bg-[#F5F2EC] rounded-xl border border-jdt-border flex flex-col items-center justify-center p-3 text-center">
             <PenTool className="h-6 w-6 text-emerald-800 mb-1 animate-bounce" />
             <p className="text-xs font-black text-jdt-text uppercase">Driver Touch Signature Verified</p>
             <p className="text-[10px] font-bold text-zinc-400">Electronic verification signature saved.</p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Unloading Issues</label>
            <input type="text" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. rootballs un-secured safely in sandy trenches" />
          </div>
        </div>
      )}

      {/* 23. EDIT FREIGHT FORM */}
      {type === 'edit_freight' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Load ID / Number *</label>
              <input type="text" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Heavy Driver Assignment *</label>
              <select value={formData.driver || ''} onChange={e => handleChange('driver', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
                <option value="">-- Select Driver --</option>
                <option value="Christian">Christian</option>
                <option value="Alex">Alex</option>
                <option value="Ron">Ron</option>
                <option value="Vince">Vince</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Hauling Rig Details</label>
              <input type="text" value={formData.truck || ''} onChange={e => handleChange('truck', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 font-sans">ETA</label>
              <input type="text" value={formData.eta || ''} onChange={e => handleChange('eta', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 font-sans">Pickup Origin</label>
              <input type="text" value={formData.origin || ''} onChange={e => handleChange('origin', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 font-sans">Drop Destination</label>
              <input type="text" value={formData.delivery || ''} onChange={e => handleChange('delivery', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="escort_efrt" checked={formData.escortRequired || false} onChange={e => handleChange('escortRequired', e.target.checked)} className="h-4 w-4 rounded text-jdt-primary focus:ring-0" />
            <label htmlFor="escort_efrt" className="text-xs font-black uppercase text-zinc-500 cursor-pointer">Require Escort Vehicle and DOT permits</label>
          </div>
        </div>
      )}

      {/* 24. LOG EQUIP ISSUE FORM */}
      {type === 'log_issue' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Flag maintenance trouble tickets for heavy asset: <strong className="text-jdt-primary">{data?.name}</strong></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Issue Severity</label>
              <select value={formData.severity || 'Moderate'} onChange={e => handleChange('severity', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Low">Low (Operating check)</option>
                <option value="Moderate">Moderate (Schedule fluid change)</option>
                <option value="Critical">Critical (GROUNDED / SERVICE DOWN)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 font-sans">Reported By</label>
              <input type="text" value={formData.reporter || ''} onChange={e => handleChange('reporter', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. PM Carlos" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Trouble Description *</label>
            <textarea value={formData.issueText || ''} onChange={e => handleChange('issueText', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="Describe the leak, broken hose, ignition issue, etc." required />
          </div>
        </div>
      )}

      {/* 25. SET EQUIP STATUS FORM */}
      {type === 'set_eq_status' && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 font-bold mb-2">Set physical asset status mapping for loader/spade: <strong className="text-jdt-primary">{data?.name}</strong></p>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Asset Operational State *</label>
            <select value={formData.status || ''} onChange={e => handleChange('status', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose status --</option>
              <option value="Available">Available for Dispatch</option>
              <option value="Assigned">Assigned to Job Site</option>
              <option value="Maintenance">In Main Shop Maintenance</option>
              <option value="Down">Down (Hydraulic Leak/Severe issue)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1 font-sans">Active Hour Meter</label>
            <input type="number" value={formData.hours || ''} onChange={e => handleChange('hours', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" placeholder="e.g. 230" />
          </div>
        </div>
      )}

      {/* 26. EDIT EQUIPMENT FORM */}
      {type === 'edit_equipment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Equipment Name *</label>
              <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Equipment Type</label>
              <select value={formData.type || formData.eqType || ''} onChange={e => handleChange('type', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none">
                <option value="Loadders">Loader</option>
                <option value="Spades">Tree Spade</option>
                <option value="Excavators">Excavator</option>
                <option value="Trucks">Hauler Truck</option>
                <option value="Trailers">Trailer Flatbed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Machinery Hours</label>
              <input type="number" value={formData.hours || ''} onChange={e => handleChange('hours', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Hours for Service Warning</label>
              <input type="number" value={formData.serviceDueHours || ''} onChange={e => handleChange('serviceDueHours', Number(e.target.value))} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Operator Assignment</label>
            <input type="text" value={formData.operator || ''} onChange={e => handleChange('operator', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" />
          </div>
        </div>
      )}

      {/* 27. SCHEDULE DISRUPTION FORM */}
      {type === 'schedule_disruption' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Disruption Cause *</label>
            <select value={formData.cause || ''} onChange={e => handleChange('cause', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none" required>
              <option value="">-- Choose disruption --</option>
              <option value="Severe Hurricane Winds">Severe Wind Gusts Hold (Crane Halt)</option>
              <option value="Wet Soil Trench Flooded">Rain / Trench Flooding Hold</option>
              <option value="Mechanical Spade Failure">Mechanical Equipment Failure</option>
              <option value="DOT Coastal Highway Hold">State Route DOT Clearance Wait</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Observations & Adjustment Guidelines</label>
            <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none h-20" placeholder="e.g. Gusts over 35mph. Heavy hauling and tree crane ops postponed till tomorrow morning 6:00 AM." />
          </div>
        </div>
      )}

      {/* FORMS FOOTER INSIDE THE ELEMENT COMPONENT ITSELF FOR REAL STATEFUL ACTIONS */}
      <div className="pt-4 border-t border-jdt-border flex gap-3 items-center justify-end">
        <button 
          type="button" 
          onClick={onClose} 
          className="px-4 py-2.5 text-xs font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-sand"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase rounded-lg bg-jdt-primary text-white shadow-sm hover:bg-jdt-dark transition-colors"
        >
          <Check className="h-4 w-4" /> Save Record
        </button>
      </div>
    </form>
  );
}
