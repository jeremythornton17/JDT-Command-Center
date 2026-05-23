import React from 'react';
import { X, Check } from 'lucide-react';
import EntityForms from './EntityForms';

export default function UniversalModal({ 
  isOpen, 
  onClose, 
  type, 
  data, 
  openModal,
  onSaveRecord, // state-altering callback
  jobsList = [],
  ranchOaksList = [],
  equipmentList = [],
  crewsList = [],
  clientsList = []
}: any) {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  const MODAL_CONFIG: any = {
    'add_new': { title: 'What are you adding?', desc: 'Select the type of record to create', btn: 'Continue' },
    'job': { title: 'New Job / Project', desc: 'Create a new project or relocation job', btn: 'Create Project' },
    'client': { title: 'New Client / Company', desc: 'Add a new client to the directory', btn: 'Save Client' },
    'contact': { title: 'New Contact', desc: 'Add a new person connected to a company', btn: 'Save Contact' },
    'tree': { title: 'New Tree / Plant Asset', desc: 'Enter a new tree into inventory', btn: 'Save Tree' },
    'load': { title: 'New Freight Load', desc: 'Dispatch a new load', btn: 'Dispatch Load' },
    'equipment': { title: 'New Equipment Asset', desc: 'Add new equipment to fleet', btn: 'Save Equipment' },
    'maintenance': { title: 'New Maintenance Issue', desc: 'Report equipment issue', btn: 'Submit Ticket' },
    'employee': { title: 'New Employee / Crew Member', desc: 'Add new crew member or driver', btn: 'Save Employee' },
    'task': { title: 'New Task / Follow-Up', desc: 'Assign a task to a user or crew', btn: 'Save Task' },
    'change_order': { title: 'New Change Order', desc: 'Document field impact', btn: 'Save Change Order' },
    
    // Command Drawer specific actions
    'assign_crew': { title: 'Assign Crew', desc: 'Assign a crew to this project', btn: 'Save Assignment' },
    'add_tree': { title: 'Add Tree to Job', desc: 'Link a new tree asset to this project', btn: 'Add Tree' },
    'create_move': { title: 'Create Freight Move', desc: 'Schedule a new move for this project', btn: 'Create Move' },
    'edit_project': { title: 'Edit Project Details', desc: 'Update main project information', btn: 'Save Changes' },
    
    'log_prune': { title: 'Log Pruning Cut', desc: 'Log a new pruning instance for this tree', btn: 'Save Log' },
    'treatment': { title: 'Add Treatment / Aftercare', desc: 'Log treatments or health checks', btn: 'Save Treatment' },
    'move_check': { title: 'Move Readiness Check', desc: 'Log pre-move checklist details', btn: 'Save Checklist' },
    'assign_tree': { title: 'Assign Tree', desc: 'Assign this tree to a project or crew', btn: 'Assign Tree' },
    'edit_tree': { title: 'Edit Tree Profile', desc: 'Update tree information', btn: 'Save Changes' },
    
    'set_freight_status': { title: 'Update Freight Status', desc: 'Change load and stop status', btn: 'Update Status' },
    'delay': { title: 'Report Delay', desc: 'Log a delay for this objective', btn: 'Log Delay' },
    'complete': { title: 'Complete Execution (POD)', desc: 'Mark completed and save POD', btn: 'Complete' },
    'edit_freight': { title: 'Edit Freight Load', desc: 'Update dispatch details', btn: 'Save Changes' },
    
    'log_issue': { title: 'Log Equipment Issue', desc: 'Report a new problem or ticket', btn: 'Submit Issue' },
    'set_eq_status': { title: 'Update Equipment Status', desc: 'Mark down, available, etc.', btn: 'Update Status' },
    'print_card': { title: 'Print Service Card', desc: 'Generate printable tag', btn: 'Print' },
    'edit_equipment': { title: 'Edit Equipment Profile', desc: 'Update stats or assignment', btn: 'Save Changes' },
    
    'qr': { title: 'QR Code', desc: 'Scan to access profile online', btn: 'Done' },
    'closeout': { title: 'Daily Closeout', desc: 'Mark completed, alert delays, move unfinished to tomorrow', btn: 'Run Closeout' },
    'move_unfinished': { title: 'Move Unfinished', desc: 'Push active/delayed jobs to tomorrow schedule', btn: 'Move Jobs' },
    'schedule_disruption': { title: 'Log Schedule Disruption', desc: 'Delay active jobs due to weather, mechanical, or site issues', btn: 'Log Disruption' }
  };

  const isEntityForm = [
    'add_new', 'job', 'client', 'contact', 'tree', 'load', 'equipment', 'maintenance', 'employee', 'task', 'change_order', 
    'delay', 'assign_crew', 'create_move', 'complete_job', 'complete', 'log_issue', 'set_eq_status', 'schedule_disruption', 
    'move_unfinished', 'edit_project', 'print_packet', 'import_csv', 'export_csv', 'closeout', 'sync_all', 'connect_source', 
    'add_mapping', 'apply_sync', 'save_profile', 'review_errors', 'set_freight_status', 'edit_freight', 'edit_equipment', 
    'assign_tree', 'add_tree', 'log_prune', 'treatment', 'move_check', 'edit_tree'
  ].includes(type.toLowerCase());
  const baseConfig = MODAL_CONFIG[type.toLowerCase()] || { title: type.toUpperCase(), desc: 'Action Form', btn: 'Confirm' };
  const config = { ...baseConfig };

  if (data) {
    const dataId = data.id || data.treeId || data.title || '';
    if (type.toLowerCase() === 'employee') {
      config.title = `Edit Employee Profile: ${data.name || ''}`;
      config.desc = 'Update roles, phone, or specific skillset';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'client') {
      config.title = `Edit Client Profile: ${data.name || ''}`;
      config.desc = 'Update client account and contact details';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'contact') {
      config.title = `Edit Contact: ${data.name || ''}`;
      config.desc = 'Update representative details';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'tree' || type.toLowerCase() === 'edit_tree') {
      config.title = `Edit Tree Profile: ${data.treeId || dataId || ''}`;
      config.desc = 'Update species, zone, or status details';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'edit_equipment' || type.toLowerCase() === 'equipment') {
      config.title = `Edit Equipment Profile: ${data.name || ''}`;
      config.desc = 'Update hours, status, or asset assignments';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'edit_freight' || type.toLowerCase() === 'load') {
      config.title = `Edit Freight Load: ${data.loadNumber || data.title || ''}`;
      config.desc = 'Update stops, dispatch state, and details';
      config.btn = 'Save Changes';
    } else if (type.toLowerCase() === 'edit_project' || type.toLowerCase() === 'job') {
      config.title = `Edit Project Details: ${data.title || ''}`;
      config.desc = 'Update client, schedule window, or PM';
      config.btn = 'Save Changes';
    }
  }

  // If the form should manage its own footer buttons (which all stateful EntityForms do)
  const hasSelfFooter = isEntityForm && type !== 'add_new';

  return (
    <>
      <div className="fixed inset-0 bg-jdt-primary/60 backdrop-blur-sm z-[60] pointer-events-auto" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[70] pointer-events-none">
        <div className={`bg-jdt-panel rounded-xl shadow-2xl w-full ${isEntityForm && type !== 'add_new' ? 'max-w-2xl' : 'max-w-lg'} pointer-events-auto flex flex-col max-h-[90vh] overflow-hidden`}>
          <div className="px-6 py-4 border-b border-jdt-border flex items-center justify-between bg-jdt-panel">
             <div>
               <h3 className="text-xl font-black text-jdt-text leading-tight">{config.title}</h3>
               <p className="text-xs font-bold text-zinc-500 mt-0.5">{config.desc}</p>
             </div>
             <button onClick={onClose} aria-label="Close modal" className="p-2 text-zinc-400 hover:text-jdt-text bg-jdt-panel border border-jdt-border rounded-lg shadow-sm hover:bg-jdt-sand transition-colors">
               <X className="h-5 w-5" />
             </button>
          </div>
          
          <div className="p-6 overflow-y-auto bg-jdt-panel flex-1">
             {type.toLowerCase() === 'qr' ? (
                <div className="flex flex-col items-center py-8">
                   <div className="w-48 h-48 bg-zinc-900 rounded-xl mb-6"></div>
                   <p className="font-black tracking-wide text-zinc-500 uppercase text-xs">JDT-{Math.floor(Math.random()*10000)}</p>
                </div>
             ) : isEntityForm ? (
                <EntityForms 
                  type={type.toLowerCase()} 
                  onClose={onClose} 
                  openModal={openModal} 
                  onSaveRecord={onSaveRecord}
                  data={data}
                  jobsList={jobsList}
                  ranchOaksList={ranchOaksList}
                  equipmentList={equipmentList}
                  crewsList={crewsList}
                  clientsList={clientsList}
                />
             ) : (
             <div className="space-y-4">
               {['Field 1', 'Field 2', 'Notes'].map((f, i) => (
                 <div key={i}>
                   <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5">{f}</label>
                   <input type="text" className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2.5 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500 focus:bg-jdt-panel transition-all shadow-inner" placeholder={`Enter ${f.toLowerCase()}...`} />
                 </div>
               ))}
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                 <p className="text-sm font-bold text-blue-900">This action writes to the change log and triggers linked impact events (e.g. task creation or status shift).</p>
               </div>
             </div>
             )}
          </div>
          
          {!hasSelfFooter && type.toLowerCase() !== 'add_new' && (
            <div className="px-6 py-4 border-t border-jdt-border bg-jdt-panel flex items-center gap-3 justify-end pointer-events-auto">
               <button onClick={onClose} disabled={isSaving} className="px-4 py-2.5 text-xs font-black uppercase rounded-lg border border-jdt-border bg-jdt-panel text-zinc-700 shadow-sm hover:bg-jdt-sand disabled:opacity-50">Cancel</button>
               <button onClick={handleSave} disabled={isSaving} className="flex flex-1 items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase rounded-lg bg-jdt-primary text-white shadow-sm hover:bg-jdt-dark transition-colors disabled:opacity-50 font-sans">
                 {isSaving ? 'Saving...' : type.toLowerCase() === 'qr' ? 'Done' : <><Check className="h-4 w-4" /> {config.btn}</>}
               </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
