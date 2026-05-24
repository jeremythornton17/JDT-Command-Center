import React, { useMemo, useState } from 'react';
import { Briefcase, Building2, Check, FilePlus, Leaf, Truck, User, Users, Wrench } from 'lucide-react';

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'checkbox';
  required?: boolean;
};

type EntityFormsProps = {
  type: string;
  onClose: () => void;
  openModal: (type: string, data?: any) => void;
  onSaveRecord: (type: string, data: any) => void;
  data?: any;
  jobsList?: any[];
  ranchOaksList?: any[];
  equipmentList?: any[];
  crewsList?: any[];
  clientsList?: any[];
};

const addNewOptions = [
  { type: 'job', label: 'Project', icon: Briefcase },
  { type: 'client', label: 'Client', icon: Building2 },
  { type: 'tree', label: 'Tree', icon: Leaf },
  { type: 'load', label: 'Freight Load', icon: Truck },
  { type: 'equipment', label: 'Equipment', icon: Wrench },
  { type: 'employee', label: 'Employee', icon: User },
];

const fieldSets: Record<string, FieldConfig[]> = {
  job: [
    { key: 'title', label: 'Project Name', required: true },
    { key: 'client', label: 'Client' },
    { key: 'division', label: 'Division' },
    { key: 'location', label: 'Location' },
    { key: 'pm', label: 'Project Manager' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Target Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  client: [
    { key: 'name', label: 'Company Name', required: true },
    { key: 'contactName', label: 'Primary Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'billingAddress', label: 'Billing Address' },
    { key: 'accessNotes', label: 'Access Notes', type: 'textarea' },
  ],
  employee: [
    { key: 'name', label: 'Name', required: true },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone' },
    { key: 'skill', label: 'Primary Skill' },
    { key: 'language', label: 'Language' },
  ],
  tree: [
    { key: 'treeId', label: 'Tree ID', required: true },
    { key: 'ranchOakType', label: 'Tree Type' },
    { key: 'dbh', label: 'DBH', type: 'number' },
    { key: 'height', label: 'Height', type: 'number' },
    { key: 'spread', label: 'Spread', type: 'number' },
    { key: 'status', label: 'Status' },
    { key: 'farm', label: 'Farm' },
    { key: 'zone', label: 'Zone' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  load: [
    { key: 'title', label: 'Load Title', required: true },
    { key: 'driver', label: 'Driver' },
    { key: 'truck', label: 'Truck / Trailer' },
    { key: 'origin', label: 'Origin' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'status', label: 'Status' },
    { key: 'eta', label: 'ETA' },
    { key: 'escortRequired', label: 'Escort Required', type: 'checkbox' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  equipment: [
    { key: 'name', label: 'Equipment Name', required: true },
    { key: 'eqType', label: 'Equipment Type' },
    { key: 'status', label: 'Status' },
    { key: 'operator', label: 'Operator' },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'serviceDueHours', label: 'Service Due Hours', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  generic: [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

function canonicalType(type: string) {
  const normalized = type.replace(/^edit_/, '');
  if (['project', 'assign_crew', 'change_order', 'delay'].includes(normalized)) return 'job';
  if (['freight', 'create_move', 'set_freight_status', 'complete'].includes(normalized)) return 'load';
  if (['add_tree', 'log_prune', 'treatment', 'move_check', 'assign_tree'].includes(normalized)) return 'tree';
  if (['maintenance', 'log_issue', 'set_eq_status'].includes(normalized)) return 'equipment';
  if (['crew'].includes(normalized)) return 'employee';
  return fieldSets[normalized] ? normalized : 'generic';
}

function initialFormData(data: any, fields: FieldConfig[]) {
  const base = { ...(data || {}) };
  for (const field of fields) {
    if (base[field.key] === undefined) {
      base[field.key] = field.type === 'checkbox' ? false : '';
    }
  }
  return base;
}

export default function EntityForms({ type, onClose, openModal, onSaveRecord, data }: EntityFormsProps) {
  const resolvedType = canonicalType(type);
  const fields = useMemo(() => fieldSets[resolvedType] || fieldSets.generic, [resolvedType]);
  const [formData, setFormData] = useState<any>(() => initialFormData(data, fields));

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSaveRecord(type, formData);
    onClose();
  };

  if (type === 'add_new') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {addNewOptions.map(({ type: optionType, label, icon: Icon }) => (
          <button
            type="button"
            key={optionType}
            onClick={() => openModal(optionType)}
            className="flex items-center justify-between gap-4 rounded-xl border border-jdt-border bg-white p-4 text-left hover:border-jdt-olive transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-black text-jdt-text">
              <Icon className="h-5 w-5 text-jdt-olive" /> {label}
            </span>
            <FilePlus className="h-4 w-4 text-zinc-400" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2 block' : 'block'}>
            <span className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5">{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.key] || ''}
                onChange={(event) => handleChange(field.key, event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : field.type === 'checkbox' ? (
              <span className="flex h-10 items-center gap-2 rounded-lg border border-jdt-border bg-jdt-panel px-3">
                <input
                  type="checkbox"
                  checked={Boolean(formData[field.key])}
                  onChange={(event) => handleChange(field.key, event.target.checked)}
                  className="h-4 w-4 rounded border-jdt-border text-jdt-primary"
                />
                <span className="text-sm font-bold text-jdt-text">Yes</span>
              </span>
            ) : (
              <input
                type={field.type || 'text'}
                value={formData[field.key] || ''}
                onChange={(event) => handleChange(field.key, event.target.value)}
                required={field.required}
                className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )}
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-jdt-border pt-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-zinc-700 hover:border-jdt-olive">
          Cancel
        </button>
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark">
          <Check className="h-4 w-4" /> Save Record
        </button>
      </div>
    </form>
  );
}
