import React, { useState } from 'react';
import { UserCheck, Users, Wrench, Shield, Globe, Award, ClipboardCheck, MessageSquare, Phone, Plus, AlertCircle } from 'lucide-react';
import { normalizePersonnelRole, personnelRoleFilters, roleMatchesFilter } from '../personnelRoles';

export default function CrewsBoard({ crews, openModal, openDrawer }: { crews: any[], openModal: (type: string, data?: any) => void, openDrawer: (type: string, id: string) => void }) {
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredCrews = crews.filter(c => {
    const matchesRole = roleMatchesFilter(c.role, roleFilter);
    const matchesStatus = statusFilter === 'All' || c.availability === statusFilter;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Crews & Personnel</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Manage field teams, heavy drivers, and mechanics</p>
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
            {personnelRoleFilters.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
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
          Showing {filteredCrews.length} of {crews.length} entries
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCrews.map(member => (
          <article 
            key={member.id} 
            className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:border-zinc-400 hover:shadow-md transition-all"
          >
            <div className="p-4 border-b border-jdt-border bg-jdt-panel/50 flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-jdt-sand flex items-center justify-center font-black text-jdt-primary">
                  {member.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-base font-black text-jdt-primary leading-tight">{member.name}</h4>
                  <p className="text-xs font-bold text-zinc-500 mt-1">{normalizePersonnelRole(member.role) || member.role}</p>
                </div>
              </div>
              <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${getStatusBadgeColor(member.availability)}`}>
                {member.availability}
              </span>
            </div>

            <div className="p-4 flex-1 space-y-3 text-xs text-zinc-700">
              {member.type && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Crew Allocation</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-zinc-500"/> {member.type}</p>
                </div>
              )}
              {member.activeJob && (
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Active Job / Load</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5 cursor-pointer text-blue-700 hover:underline" onClick={() => openDrawer(normalizePersonnelRole(member.role) === 'Driver' ? 'freight' : 'job', member.activeJob)}>
                    <ClipboardCheck className="h-3.5 w-3.5" /> {member.activeJob}
                  </p>
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
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Primary Skill</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1"><Award className="h-3 w-3 text-zinc-400" /> {member.skills?.[0] || 'Field Hand'}</p>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-jdt-border bg-jdt-panel/50 flex justify-between items-center gap-2">
              <span className="text-[11px] font-black text-zinc-600 flex items-center gap-1"><Phone className="h-3 w-3" /> {member.phone}</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => openModal('employee', member)} 
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded bg-jdt-sand border border-jdt-border hover:bg-jdt-border text-zinc-700 transition-colors"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => openModal('assign_crew', member)} 
                  className="px-2.5 py-1.5 text-[9px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </article>
        ))}

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
