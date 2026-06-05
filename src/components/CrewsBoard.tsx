import React, { useMemo, useState } from 'react';
import { Users, Globe, Award, ClipboardCheck, Phone, Plus, AlertCircle, Star, Mail, FileText } from 'lucide-react';
import { complianceBadgeClass, driverComplianceSummary, type ComplianceStatus } from '../commandCenter/compliance';
import { defaultJdtPersonnelRoster, mergePersonnelRecords, personnelRoleOptions } from '../commandCenter/personnel';
import type { CrewRecord, WorkOrderRecord } from '../commandCenter/records';
import { CategoryIcon } from './CategoryIcon';

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
  const memberId = String(member.id || member.email || member.name || '').trim();
  const memberName = String(member.name || '').trim().toLowerCase();
  return workOrders.filter((workOrder) => {
    const ids = workOrder.assignedCrewIds || [];
    const names = (workOrder.assignedCrewNames || []).map((name) => String(name).toLowerCase());
    return Boolean(memberId && ids.includes(memberId)) || Boolean(memberName && names.includes(memberName));
  });
}

function isDriverLike(member: CrewRecord) {
  return driverComplianceSummary(member).driverComplianceRequired;
}

function CompliancePill({ label, status }: { label: string; status: ComplianceStatus }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
      <span className="text-[10px] font-black uppercase text-zinc-500">{label}</span>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${complianceBadgeClass(status)}`}>
        {status.label}
      </span>
    </div>
  );
}

type CrewsBoardProps = {
  crews: CrewRecord[];
  workOrders?: WorkOrderRecord[];
  openModal: (type: string, data?: any) => void;
  openDrawer: (type: string, id: string) => void;
};

export default function CrewsBoard({ crews, workOrders = [], openModal, openDrawer }: CrewsBoardProps) {
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const personnel = useMemo(() => mergePersonnelRecords(defaultJdtPersonnelRoster, crews), [crews]);

  const filteredCrews = personnel.filter(c => {
    const role = c.role || '';
    const matchesRole = roleFilter === 'All' || role.toLowerCase() === roleFilter.toLowerCase() || (roleFilter === 'Crew Leader' && role.toLowerCase().includes('crew'));
    const matchesStatus = statusFilter === 'All' || (c.availability || 'Available') === statusFilter;
    return matchesRole && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Sidelined': return 'bg-red-100 text-red-800 border-red-200';
      case 'Off Duty': return 'bg-zinc-100 text-zinc-800 border-zinc-200';
      default: return 'bg-jdt-sand text-zinc-700 border-jdt-border';
    }
  };

  const getAccessBadge = (access: CrewRecord['appAccess']) => {
    switch (access) {
      case 'admin': return { label: 'Admin', style: 'bg-red-50 text-red-700 border-red-200' };
      case 'authorized': return { label: 'Company Login', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'contact-only': return { label: 'Contact Only', style: 'bg-amber-50 text-amber-800 border-amber-200' };
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CategoryIcon category="crew" size="md" />
          <div>
            <h2 className="text-2xl font-black text-jdt-primary">Operations Crews & Personnel</h2>
            <p className="text-sm font-bold text-zinc-500 mt-1">Manage ownership, office, crew leaders, drivers, mechanics, irrigation, and field support</p>
          </div>
        </div>
        <button 
          onClick={() => openModal('employee')} 
          className="flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-jdt-primary text-white hover:bg-jdt-dark transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4"/> Add Personnel
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-jdt-panel border border-jdt-border p-3.5 rounded-xl shadow-sm">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Filter Role</label>
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-jdt-panel border border-jdt-border rounded-md px-2.5 py-1.5 text-xs font-bold text-zinc-700"
          >
            <option value="All">All Roles</option>
            {personnelRoleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Filter Status</label>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-jdt-panel border border-jdt-border rounded-md px-2.5 py-1.5 text-xs font-bold text-zinc-700"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Active">Active</option>
            <option value="Sidelined">Sidelined</option>
            <option value="Off Duty">Off Duty</option>
          </select>
        </div>
        <div className="text-xs font-bold text-zinc-500 self-end mb-2">
          Showing {filteredCrews.length} of {personnel.length} entries
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCrews.map(member => {
          const accessBadge = getAccessBadge(member.appAccess);
          const memberName = member.name || 'Unnamed Personnel';
          const memberInitials = memberName.split(' ').map((n: string) => n[0]).join('');
          const primaryRole = member.role?.trim() || 'Role not set';
          const primarySkill = primarySkillFor(member);
          const additionalSkills = additionalSkillsFor(member);
          const crewAllocation = member.type?.trim() || 'Unassigned';
          const memberWorkOrders = workOrdersForMember(member, workOrders);
          const driverCompliance = driverComplianceSummary(member);
          const showDriverCompliance = isDriverLike(member);
          return (
          <article 
            key={member.id} 
            className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:border-zinc-400 hover:shadow-md transition-all"
          >
            <div className="p-4 border-b border-jdt-border bg-jdt-panel/50 flex justify-between items-start gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-jdt-sand flex items-center justify-center font-black text-jdt-primary">
                  {memberInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-black text-jdt-primary leading-tight">{memberName}</h4>
                  <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-jdt-border bg-jdt-sand px-2 py-1">
                    <Users className="h-3.5 w-3.5 shrink-0 text-jdt-primary" />
                    <span className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Primary Role</span>
                    <span className="truncate text-xs font-black text-jdt-primary">{primaryRole}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide self-start mt-1 ${getStatusBadgeColor(member.availability || 'Available')}`}>
                  {member.availability || 'Available'}
                </span>
                {accessBadge && (
                  <span className={`inline-flex rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${accessBadge.style}`}>
                    {accessBadge.label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 flex-1 space-y-3 text-xs text-zinc-700">
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Primary Skill / Task Go-To</p>
                  <p className="font-black text-jdt-text flex items-center gap-1.5 text-sm">
                    <Award className="h-3.5 w-3.5 text-jdt-olive shrink-0" /> {primarySkill}
                  </p>
                </div>
                <div className="border-t border-jdt-border pt-3">
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Crew Allocation</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0"/> {crewAllocation}
                  </p>
                </div>
              </div>
              {member.exceptionalSkills && member.exceptionalSkills.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Standout Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {member.exceptionalSkills.map((es: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 border border-orange-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide">
                        <Star className="h-2.5 w-2.5 fill-orange-500 text-orange-500" /> {es}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {memberWorkOrders.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Active Work Orders</p>
                  <div className="space-y-1">
                    {memberWorkOrders.slice(0, 3).map((workOrder) => (
                      <button
                        type="button"
                        key={workOrder.id || workOrder.title}
                        onClick={() => openDrawer('job', workOrder.jobId || workOrder.jobName || workOrder.projectId || '')}
                        className="block w-full rounded-md border border-jdt-border bg-white px-2 py-1.5 text-left text-[10px] font-black text-jdt-primary hover:border-jdt-olive"
                      >
                        {workOrder.title || 'Untitled work order'}
                        <span className="block text-[9px] font-bold uppercase text-zinc-400">{workOrder.status || 'Active'} - {workOrder.projectName || workOrder.jobName || 'No project'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {memberWorkOrders.length === 0 && member.activeJob && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Active Job / Load</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5 cursor-pointer text-blue-700 hover:underline" onClick={() => openDrawer((member.role || '').toLowerCase().includes('driver') ? 'freight' : 'job', member.activeJob || '')}>
                    <ClipboardCheck className="h-3.5 w-3.5" /> {member.activeJob}
                  </p>
                </div>
              )}
              {member.email && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Email</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5 break-all"><Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0"/> {member.email}</p>
                </div>
              )}
              {showDriverCompliance && (
                <div className="rounded-lg border border-jdt-border bg-jdt-sand/30 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-jdt-primary">
                    <FileText className="h-3.5 w-3.5" /> Driver Compliance
                  </p>
                  <div className="space-y-1.5">
                    <CompliancePill label="License" status={driverCompliance.license} />
                    <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Insured Driver</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${driverCompliance.drivesForCompany ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-jdt-sand text-zinc-700 border-jdt-border'}`}>
                        {driverCompliance.drivesForCompany ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-md border border-jdt-border bg-white px-2 py-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-500">CDL</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${driverCompliance.cdlCertified ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-jdt-sand text-zinc-700 border-jdt-border'}`}>
                        {driverCompliance.cdlCertified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <CompliancePill label="Medical Card" status={driverCompliance.medicalCard} />
                  </div>
                </div>
              )}
              {member.assignedEquipment && member.assignedEquipment.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Equipment Assigned</p>
                  <div className="flex flex-wrap gap-1">
                    {member.assignedEquipment.map((eq: string) => (
                      <span key={eq} className="bg-orange-50 text-orange-800 border border-orange-100 rounded px-1.5 py-0.5 font-bold text-[10px]">{eq}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-jdt-border">
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Language</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1"><Globe className="h-3 w-3 text-zinc-400" /> {member.language || 'English'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Additional Skills</p>
                  <div className="flex flex-col gap-1">
                    {additionalSkills.length > 0 ? (
                      additionalSkills.map((s: string, i: number) => (
                        <p key={i} className="font-bold text-jdt-text flex items-center gap-1.5"><Award className="h-3 w-3 text-zinc-400 shrink-0" /> {s}</p>
                      ))
                    ) : (
                       <p className="font-bold text-zinc-400">None listed</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-jdt-border bg-jdt-panel/50 flex justify-between items-center gap-2">
              <span className="text-[11px] font-black text-zinc-600 flex items-center gap-1"><Phone className="h-3 w-3" /> {member.phone}</span>
              <div className="flex gap-1.5">
                {!member.isRosterContact && (
                  <button 
                    onClick={() => openModal('delete_employee', member)} 
                    className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button 
                  onClick={() => openModal('employee', member)} 
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded bg-jdt-sand border border-jdt-border hover:bg-jdt-border text-zinc-700 transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openModal('assign_work', {
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
                  })}
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors"
                >
                  Assign Crew Work
                </button>
              </div>
            </div>
          </article>
          );
        })}

        {filteredCrews.length === 0 && (
          <div className="col-span-full py-16 bg-jdt-panel border border-jdt-border border-dashed rounded-xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-10 w-10 text-zinc-400 mb-3" />
            <h3 className="font-black text-md text-zinc-600 uppercase">No Personnel Found</h3>
            <p className="text-zinc-400 text-xs mt-1 font-bold">Try adjusting filters or add a new employee profile.</p>
          </div>
        )}
      </div>
    </div>
  );
}
