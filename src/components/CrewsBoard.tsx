import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, CalendarDays, ClipboardCheck, FileText, Globe, Mail, MapPin, Phone, Plus, Star, Users, Wrench } from 'lucide-react';
import { complianceBadgeClass, driverComplianceSummary, type ComplianceStatus } from '../commandCenter/compliance';
import { defaultJdtPersonnelRoster, mergePersonnelRecords, personnelCrewAllocationOptions, personnelLanguageOptions, personnelRoleOptions } from '../commandCenter/personnel';
import type { CrewRecord, WorkOrderRecord } from '../commandCenter/records';
import { categoryAccentBorderClass, statusPillClass } from '../commandCenter/visualLanguage';
import { CategoryIcon } from './CategoryIcon';

type CrewRow = {
  key: string;
  member: CrewRecord;
  name: string;
  role: string;
  status: string;
  primarySkill: string;
  additionalSkills: string[];
  crewAllocation: string;
  workOrders: WorkOrderRecord[];
  assignmentCount: number;
  equipment: string[];
  language: string;
  compliance: ReturnType<typeof driverComplianceSummary>;
  complianceLabel: string;
  complianceTone: ComplianceStatus['tone'];
  hasComplianceIssue: boolean;
  driverComplianceRequired: boolean;
};

type CrewsBoardProps = {
  crews: CrewRecord[];
  workOrders?: WorkOrderRecord[];
  openModal: (type: string, data?: any) => void;
  openDrawer: (type: string, id: string) => void;
};

function clean(value: unknown, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function unique(values: unknown[]) {
  const seen = new Set<string>();
  const results: string[] = [];
  values.flatMap((value) => Array.isArray(value) ? value : [value]).forEach((value) => {
    const text = clean(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    results.push(text);
  });
  return results;
}

function primarySkillFor(member: CrewRecord) {
  const directSkill = member.skill?.trim();
  if (directSkill) return directSkill;

  const listedSkill = member.skills?.find(skill => skill.trim().length > 0);
  return listedSkill || 'Not set';
}

function additionalSkillsFor(member: CrewRecord) {
  const primarySkill = primarySkillFor(member).toLowerCase();
  return (member.skills || []).filter(skill => skill.trim().length > 0 && skill.trim().toLowerCase() !== primarySkill);
}

function workOrdersForMember(member: CrewRecord, workOrders: WorkOrderRecord[]) {
  const memberId = clean(member.id || member.email || member.name);
  const memberName = clean(member.name).toLowerCase();
  return workOrders.filter((workOrder) => {
    const ids = workOrder.assignedCrewIds || [];
    const names = (workOrder.assignedCrewNames || []).map((name) => String(name).toLowerCase());
    return Boolean(memberId && ids.includes(memberId)) || Boolean(memberName && names.includes(memberName));
  });
}

function accessBadge(access: CrewRecord['appAccess']) {
  switch (access) {
    case 'admin': return { label: 'Admin', style: 'bg-red-50 text-red-700 border-red-200' };
    case 'authorized': return { label: 'Company Login', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'contact-only': return { label: 'Contact Only', style: 'bg-amber-50 text-amber-800 border-amber-200' };
    default: return null;
  }
}

function worstComplianceTone(statuses: ComplianceStatus[]): ComplianceStatus['tone'] {
  if (statuses.some((status) => status.tone === 'bad')) return 'bad';
  if (statuses.some((status) => status.tone === 'watch')) return 'watch';
  if (statuses.some((status) => status.tone === 'good')) return 'good';
  return 'neutral';
}

function compactComplianceLabel(summary: ReturnType<typeof driverComplianceSummary>) {
  if (!summary.driverComplianceRequired) return 'N/A';
  const parts = [`License ${summary.license.label}`];
  if (summary.cdlCertified) parts.push('CDL');
  if (summary.cdlCertified || summary.medicalCard.label !== 'Not Required') parts.push(`Medical Card ${summary.medicalCard.label}`);
  return parts.join(' / ');
}

function isAvailable(status: string) {
  return ['available', 'active'].includes(status.toLowerCase());
}

function isOperatorLike(row: Pick<CrewRow, 'role' | 'primarySkill' | 'equipment' | 'status'>) {
  const text = `${row.role} ${row.primarySkill}`.toLowerCase();
  return isAvailable(row.status) && (text.includes('operator') || text.includes('driver') || text.includes('equipment') || text.includes('loader') || row.equipment.length > 0);
}

function isCrewLeader(row: Pick<CrewRow, 'role' | 'status'>) {
  return isAvailable(row.status) && row.role.toLowerCase().includes('crew');
}

function seedCrewWork(member: CrewRecord) {
  return {
    ...member,
    title: `Crew work for ${member.name || 'personnel'}`,
    division: 'Relocation & Installation',
    workOrderType: 'general_task',
    taskType: member.skill || 'Field work',
    status: 'Draft',
    priority: 'Normal',
    assignedCrewIds: [member.id || member.email || member.name].filter(Boolean),
    assignedCrewNames: [member.name].filter(Boolean),
    crewLeadName: member.name,
  };
}

function personKey(member: CrewRecord) {
  return clean(member.id || member.email || member.name, 'personnel');
}

function buildRows(personnel: CrewRecord[], workOrders: WorkOrderRecord[]): CrewRow[] {
  return personnel.map((member) => {
    const activeWorkOrders = workOrdersForMember(member, workOrders);
    const compliance = driverComplianceSummary(member);
    const complianceTone = worstComplianceTone([compliance.license, compliance.medicalCard]);
    const equipment = unique(member.assignedEquipment || []);
    return {
      key: personKey(member),
      member,
      name: clean(member.name, 'Unnamed Personnel'),
      role: clean(member.role, 'Role not set'),
      status: clean(member.availability, 'Available'),
      primarySkill: primarySkillFor(member),
      additionalSkills: additionalSkillsFor(member),
      crewAllocation: clean(member.type, 'Unassigned'),
      workOrders: activeWorkOrders,
      assignmentCount: activeWorkOrders.length + (member.activeJob ? 1 : 0),
      equipment,
      language: clean(member.language, 'English'),
      compliance,
      complianceLabel: compactComplianceLabel(compliance),
      complianceTone,
      hasComplianceIssue: complianceTone === 'bad' || complianceTone === 'watch',
      driverComplianceRequired: compliance.driverComplianceRequired,
    };
  });
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="min-w-[130px] flex-1">
      <span className="mb-1 block text-[9px] font-black uppercase text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-jdt-border bg-white px-2 py-1.5 text-xs font-bold text-zinc-700">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-jdt-border bg-white px-3 py-2">
      <p className="text-[9px] font-black uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-black text-jdt-primary">{value}</p>
    </div>
  );
}

function ComplianceBadge({ row }: { row: CrewRow }) {
  if (!row.driverComplianceRequired) {
    return <span className="inline-flex rounded border border-jdt-border bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-zinc-600">Compliance: N/A</span>;
  }

  return (
    <span className={`inline-flex rounded border px-2 py-1 text-[9px] font-black uppercase ${complianceBadgeClass({ label: row.hasComplianceIssue ? (row.complianceTone === 'bad' ? 'Missing' : 'Expiring Soon') : 'On File', tone: row.complianceTone })}`}>
      {row.complianceLabel}
    </span>
  );
}

function ActionButtons({
  row,
  openModal,
  openDrawer,
}: {
  row: CrewRow;
  openModal: CrewsBoardProps['openModal'];
  openDrawer: CrewsBoardProps['openDrawer'];
}) {
  const stop = (event: React.MouseEvent) => event.stopPropagation();
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" title="Assign Crew Work" aria-label="Assign Crew Work" onClick={(event) => { stop(event); openModal('assign_work', seedCrewWork(row.member)); }} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Assign Work</button>
      <button type="button" onClick={(event) => { stop(event); openDrawer('employee', row.key); }} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">View Schedule</button>
      <button type="button" onClick={(event) => { stop(event); openModal('crew_map', row.member); }} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">View Map</button>
      <a href={row.member.phone ? `tel:${row.member.phone}` : undefined} onClick={stop} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Call / Phone</a>
      <button type="button" onClick={(event) => { stop(event); openModal('employee', row.member); }} className="rounded border border-jdt-border bg-jdt-panel px-2 py-1 text-[9px] font-black uppercase text-jdt-primary hover:border-jdt-olive">Edit</button>
    </div>
  );
}

function ComplianceLine({ label, status }: { label: string; status: ComplianceStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
      <span className="text-[10px] font-black uppercase text-zinc-500">{label}</span>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${complianceBadgeClass(status)}`}>
        {status.label}
      </span>
    </div>
  );
}

function DetailPanel({
  row,
  openModal,
  openDrawer,
}: {
  row?: CrewRow;
  openModal: CrewsBoardProps['openModal'];
  openDrawer: CrewsBoardProps['openDrawer'];
}) {
  if (!row) {
    return (
      <aside className="rounded-lg border border-dashed border-jdt-border bg-white p-4 text-sm font-bold text-zinc-500">
        Select a roster row to view personnel detail.
      </aside>
    );
  }

  const badge = accessBadge(row.member.appAccess);

  return (
    <aside className="rounded-lg border border-jdt-border bg-white shadow-sm lg:sticky lg:top-4">
      <div className="border-b border-jdt-border bg-jdt-panel px-3 py-2">
        <p className="text-[10px] font-black uppercase text-zinc-400">Personnel Detail</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-jdt-primary">{row.name}</h3>
            <p className="text-[11px] font-bold uppercase text-zinc-500">{row.role}</p>
          </div>
          <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(row.status)}`}>{row.status}</span>
        </div>
      </div>

      <div className="space-y-3 p-3 text-xs">
        {row.hasComplianceIssue && row.driverComplianceRequired && (
          <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-black uppercase text-red-700">Dispatch blocked until driver compliance is cleaned up.</p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <InfoLine icon={<Award className="h-3.5 w-3.5" />} label="Primary Skill / Task Go-To" value={row.primarySkill} />
          <InfoLine icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Crew Allocation" value={row.crewAllocation} />
          <InfoLine icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={row.member.phone || '-'} />
          <InfoLine icon={<Globe className="h-3.5 w-3.5" />} label="Language" value={row.language} />
        </div>

        {row.member.email && <InfoLine icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={row.member.email} />}
        {badge && <span className={`inline-flex rounded border px-2 py-1 text-[9px] font-black uppercase ${badge.style}`}>{badge.label}</span>}

        <div>
          <p className="mb-1 text-[9px] font-black uppercase text-zinc-400">Additional Skills</p>
          <div className="flex flex-wrap gap-1">
            {row.additionalSkills.length > 0 ? row.additionalSkills.map((skill) => (
              <span key={skill} className="rounded border border-jdt-border bg-jdt-panel px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">{skill}</span>
            )) : <span className="text-[11px] font-bold text-zinc-400">None listed</span>}
            {(row.member.exceptionalSkills || []).map((skill) => (
              <span key={skill} className="inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-800">
                <Star className="h-2.5 w-2.5 fill-orange-500 text-orange-500" /> {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[9px] font-black uppercase text-zinc-400">Active Work Orders</p>
          {row.workOrders.length > 0 ? (
            <div className="space-y-1">
              {row.workOrders.slice(0, 4).map((workOrder) => (
                <button
                  type="button"
                  key={workOrder.id || workOrder.title}
                  onClick={() => openDrawer('job', workOrder.jobId || workOrder.jobName || workOrder.projectId || '')}
                  className="block w-full rounded-md border border-jdt-border bg-jdt-panel px-2 py-1.5 text-left text-[10px] font-black text-jdt-primary hover:border-jdt-olive"
                >
                  {workOrder.title || 'Untitled work order'}
                  <span className="block text-[9px] font-bold uppercase text-zinc-400">{workOrder.status || 'Active'} - {workOrder.projectName || workOrder.jobName || 'No project'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded border border-dashed border-jdt-border bg-jdt-panel px-2 py-3 text-[11px] font-bold text-zinc-500">No active work orders assigned.</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-[9px] font-black uppercase text-zinc-400">Equipment Assigned</p>
          <div className="flex flex-wrap gap-1">
            {row.equipment.length > 0 ? row.equipment.map((equipment) => (
              <span key={equipment} className="rounded border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">{equipment}</span>
            )) : <span className="text-[11px] font-bold text-zinc-400">No equipment assigned</span>}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-jdt-primary"><FileText className="h-3.5 w-3.5" /> Driver Compliance</p>
          {row.driverComplianceRequired ? (
            <div className="space-y-1.5 rounded-lg border border-jdt-border bg-jdt-sand/30 p-2">
              <ComplianceLine label="License" status={row.compliance.license} />
              <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-500">Insured Driver</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${row.compliance.drivesForCompany ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-jdt-sand text-zinc-700 border-jdt-border'}`}>
                  {row.compliance.drivesForCompany ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-500">CDL</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${row.compliance.cdlCertified ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-jdt-sand text-zinc-700 border-jdt-border'}`}>
                  {row.compliance.cdlCertified ? 'Yes' : 'No'}
                </span>
              </div>
              <ComplianceLine label="Medical Card" status={row.compliance.medicalCard} />
            </div>
          ) : (
            <p className="rounded border border-jdt-border bg-jdt-panel px-2 py-2 text-[11px] font-bold text-zinc-500">Compliance: N/A for this role unless driving or equipment transport is assigned.</p>
          )}
        </div>

        {row.member.notes && <InfoLine icon={<FileText className="h-3.5 w-3.5" />} label="Notes" value={row.member.notes} />}

        <ActionButtons row={row} openModal={openModal} openDrawer={openDrawer} />
      </div>
    </aside>
  );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-jdt-border bg-jdt-panel px-2 py-1.5">
      <p className="mb-0.5 flex items-center gap-1 text-[9px] font-black uppercase text-zinc-400">{icon}{label}</p>
      <p className="font-bold text-jdt-text">{value}</p>
    </div>
  );
}

function CompactRosterTable({
  rows,
  selectedKey,
  setSelectedKey,
  openModal,
  openDrawer,
}: {
  rows: CrewRow[];
  selectedKey?: string;
  setSelectedKey: (key: string) => void;
  openModal: CrewsBoardProps['openModal'];
  openDrawer: CrewsBoardProps['openDrawer'];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-jdt-border bg-white">
      <table className="w-full min-w-[1180px] text-left text-[11px]">
        <thead className="bg-jdt-sand text-[9px] font-black uppercase text-zinc-500">
          <tr>
            <th className="px-2 py-2">Name</th>
            <th className="px-2 py-2">Role</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Primary Skill</th>
            <th className="px-2 py-2">Crew Allocation</th>
            <th className="px-2 py-2">Today's Assignment Count</th>
            <th className="px-2 py-2">Compliance Status</th>
            <th className="px-2 py-2">Equipment Assigned</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              onClick={() => setSelectedKey(row.key)}
              className={`cursor-pointer border-t border-jdt-border align-top hover:bg-jdt-panel ${row.key === selectedKey ? 'bg-jdt-panel' : ''}`}
            >
              <td className="px-2 py-2 font-black text-jdt-primary">{row.name}</td>
              <td className="px-2 py-2 font-bold text-zinc-600">{row.role}</td>
              <td className="px-2 py-2"><span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(row.status)}`}>{row.status}</span></td>
              <td className="px-2 py-2 font-bold text-zinc-600">{row.primarySkill}</td>
              <td className="px-2 py-2 font-bold text-zinc-600">{row.crewAllocation}</td>
              <td className="px-2 py-2 font-black text-jdt-text">{row.assignmentCount}</td>
              <td className="px-2 py-2"><ComplianceBadge row={row} /></td>
              <td className="px-2 py-2 font-bold text-zinc-600">{row.equipment.length ? row.equipment.join(', ') : '-'}</td>
              <td className="px-2 py-2 font-bold text-zinc-600">{row.member.phone || '-'}</td>
              <td className="px-2 py-2"><ActionButtons row={row} openModal={openModal} openDrawer={openDrawer} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompactCardView({
  rows,
  selectedKey,
  setSelectedKey,
  openModal,
  openDrawer,
}: {
  rows: CrewRow[];
  selectedKey?: string;
  setSelectedKey: (key: string) => void;
  openModal: CrewsBoardProps['openModal'];
  openDrawer: CrewsBoardProps['openDrawer'];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <article key={row.key} onClick={() => setSelectedKey(row.key)} className={`rounded-lg border border-jdt-border border-l-4 bg-white p-3 shadow-sm ${categoryAccentBorderClass('crew')} ${row.key === selectedKey ? 'ring-2 ring-jdt-olive/30' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-jdt-primary">{row.name}</h4>
              <p className="text-[10px] font-bold uppercase text-zinc-500">Primary Role: {row.role}</p>
            </div>
            <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${statusPillClass(row.status)}`}>{row.status}</span>
          </div>
          <div className="mt-2 grid gap-1 text-[11px] font-bold text-zinc-600">
            <p>Primary Skill / Task Go-To: {row.primarySkill}</p>
            <p>Crew Allocation: {row.crewAllocation}</p>
            <p>Assignments: {row.assignmentCount}</p>
            <ComplianceBadge row={row} />
          </div>
          <div className="mt-2">
            <ActionButtons row={row} openModal={openModal} openDrawer={openDrawer} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CrewsBoard({ crews, workOrders = [], openModal, openDrawer }: CrewsBoardProps) {
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [crewAllocationFilter, setCrewAllocationFilter] = useState('All');
  const [complianceFilter, setComplianceFilter] = useState('All');
  const [assignedTodayFilter, setAssignedTodayFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'roster' | 'cards'>('roster');
  const [selectedKey, setSelectedKey] = useState('');

  const personnel = useMemo(() => mergePersonnelRecords(defaultJdtPersonnelRoster, crews), [crews]);
  const rows = useMemo(() => buildRows(personnel, workOrders), [personnel, workOrders]);

  const roleOptions = ['All', ...personnelRoleOptions, ...unique(rows.map((row) => row.role)).filter((role) => !personnelRoleOptions.includes(role))];
  const skillOptions = ['All', ...unique(rows.map((row) => row.primarySkill))];
  const allocationOptions = ['All', ...personnelCrewAllocationOptions, ...unique(rows.map((row) => row.crewAllocation)).filter((allocation) => !personnelCrewAllocationOptions.includes(allocation))];
  const languageOptions = ['All', ...personnelLanguageOptions, ...unique(rows.map((row) => row.language)).filter((language) => !personnelLanguageOptions.includes(language))];

  const filteredRows = rows.filter((row) => {
    const matchesRole = roleFilter === 'All' || row.role.toLowerCase() === roleFilter.toLowerCase() || (roleFilter === 'Crew Leader' && row.role.toLowerCase().includes('crew'));
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    const matchesSkill = skillFilter === 'All' || row.primarySkill === skillFilter;
    const matchesAllocation = crewAllocationFilter === 'All' || row.crewAllocation === crewAllocationFilter;
    const matchesCompliance = complianceFilter === 'All'
      || (complianceFilter === 'Issue' && row.hasComplianceIssue)
      || (complianceFilter === 'Required' && row.driverComplianceRequired)
      || (complianceFilter === 'N/A' && !row.driverComplianceRequired);
    const matchesAssigned = assignedTodayFilter === 'All'
      || (assignedTodayFilter === 'Assigned Today' && row.assignmentCount > 0)
      || (assignedTodayFilter === 'Unassigned Today' && row.assignmentCount === 0);
    const matchesLanguage = languageFilter === 'All' || row.language === languageFilter;
    const matchesEquipment = equipmentFilter === 'All'
      || (equipmentFilter === 'Has Equipment' && row.equipment.length > 0)
      || (equipmentFilter === 'No Equipment' && row.equipment.length === 0);
    return matchesRole && matchesStatus && matchesSkill && matchesAllocation && matchesCompliance && matchesAssigned && matchesLanguage && matchesEquipment;
  });

  const selectedRow = filteredRows.find((row) => row.key === selectedKey)
    || filteredRows.find((row) => row.assignmentCount > 0)
    || filteredRows[0];

  const unassignedWorkOrders = workOrders.filter((workOrder) => {
    const names = workOrder.assignedCrewNames || [];
    return !names.length && !workOrder.crewLeadName && !workOrder.assignee;
  }).length;

  const kpis = [
    { label: 'Available Today', value: rows.filter((row) => isAvailable(row.status)).length },
    { label: 'Assigned Today', value: rows.filter((row) => row.assignmentCount > 0).length },
    { label: 'Unassigned Work Orders', value: unassignedWorkOrders },
    { label: 'Driver Compliance Issues', value: rows.filter((row) => row.hasComplianceIssue).length },
    { label: 'Equipment Operators Available', value: rows.filter(isOperatorLike).length },
    { label: 'Crew Leaders Available', value: rows.filter(isCrewLeader).length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <CategoryIcon category="crew" size="md" />
          <div>
            <h2 className="text-2xl font-black text-jdt-primary">Operations Crews & Personnel</h2>
            <p className="mt-1 text-sm font-bold text-zinc-500">Dispatch roster, availability, skills, assignments, and driver compliance</p>
          </div>
        </div>
        <button onClick={() => openModal('employee')} className="flex items-center gap-2 self-start rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm transition-colors hover:bg-jdt-dark">
          <Plus className="h-4 w-4" /> Add Personnel
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />)}
      </div>

      <div className="rounded-lg border border-jdt-border bg-jdt-panel p-3 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-2 md:grid-cols-4 xl:grid-cols-8">
            <FieldSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
            <FieldSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', 'Available', 'Active', 'Sidelined', 'Off Duty']} />
            <FieldSelect label="Primary Skill" value={skillFilter} onChange={setSkillFilter} options={skillOptions} />
            <FieldSelect label="Crew Allocation" value={crewAllocationFilter} onChange={setCrewAllocationFilter} options={allocationOptions} />
            <FieldSelect label="Compliance Issue" value={complianceFilter} onChange={setComplianceFilter} options={['All', 'Issue', 'Required', 'N/A']} />
            <FieldSelect label="Assigned Today" value={assignedTodayFilter} onChange={setAssignedTodayFilter} options={['All', 'Assigned Today', 'Unassigned Today']} />
            <FieldSelect label="Language" value={languageFilter} onChange={setLanguageFilter} options={languageOptions} />
            <FieldSelect label="Equipment Assigned" value={equipmentFilter} onChange={setEquipmentFilter} options={['All', 'Has Equipment', 'No Equipment']} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-zinc-500">Showing {filteredRows.length} of {rows.length}</span>
            <div className="flex rounded-lg border border-jdt-border bg-white p-1">
              <button type="button" onClick={() => setViewMode('roster')} className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${viewMode === 'roster' ? 'bg-jdt-primary text-white' : 'text-jdt-primary'}`}>Roster View</button>
              <button type="button" onClick={() => setViewMode('cards')} className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase ${viewMode === 'cards' ? 'bg-jdt-primary text-white' : 'text-jdt-primary'}`}>Card View</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          {viewMode === 'roster' ? (
            <CompactRosterTable rows={filteredRows} selectedKey={selectedRow?.key} setSelectedKey={setSelectedKey} openModal={openModal} openDrawer={openDrawer} />
          ) : (
            <CompactCardView rows={filteredRows} selectedKey={selectedRow?.key} setSelectedKey={setSelectedKey} openModal={openModal} openDrawer={openDrawer} />
          )}
          {filteredRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-jdt-border bg-white px-4 py-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <h3 className="text-sm font-black uppercase text-zinc-600">No Personnel Found</h3>
              <p className="mt-1 text-xs font-bold text-zinc-400">Try adjusting filters or add a new employee profile.</p>
            </div>
          )}
        </div>
        <DetailPanel row={selectedRow} openModal={openModal} openDrawer={openDrawer} />
      </div>
    </div>
  );
}
