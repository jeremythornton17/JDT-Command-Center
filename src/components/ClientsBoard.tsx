import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Building2, ClipboardList, DollarSign, FolderClosed, LayoutGrid, ListChecks, Mail, MapPin, Phone, Plus, Search, User } from 'lucide-react';
import type { ClientRecord, JobRecord, ProjectRecord } from '../commandCenter/records';
import { sameClient } from '../commandCenter/relationships';

type ClientsBoardProps = {
  clients: ClientRecord[];
  projects?: ProjectRecord[];
  jobs?: JobRecord[];
  openModal: (type: string, data?: any) => void;
  openDrawer: (type: string, id: string) => void;
};

function jobHistoryLabels(history: unknown): string[] {
  if (!Array.isArray(history)) return [];
  return history.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function normalizeMatchValue(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function clientMatchesRecord(client: ClientRecord, record: ProjectRecord | JobRecord): boolean {
  if (sameClient(client, record)) return true;
  const clientNames = [client.name, client.title, client.clientName].map(normalizeMatchValue).filter(Boolean);
  const recordNames = [record.clientName, record.client].map(normalizeMatchValue).filter(Boolean);
  return clientNames.some((name) => recordNames.includes(name));
}

function clientName(client: ClientRecord): string {
  return String(client.name || client.title || client.clientName || 'Client account').trim();
}

function recordName(record: ProjectRecord | JobRecord): string {
  return String(record.title || record.name || record.projectName || record.jobName || 'Linked work').trim();
}

function recordStatus(record: ProjectRecord | JobRecord): string {
  return String(record.status || record.projectStatus || record.jobStatus || 'Open').trim();
}

function isCompleteStatus(status: string): boolean {
  return /(complete|completed|closed|done|cancelled|paid)/i.test(status);
}

function missingClientInfo(client: ClientRecord): string[] {
  const missing: string[] = [];
  if (!String(client.contactName || '').trim()) missing.push('Missing contact');
  if (!String(client.phone || '').trim()) missing.push('Missing phone');
  if (!String(client.email || '').trim()) missing.push('Missing email');
  if (!String(client.billingAddress || '').trim()) missing.push('Missing billing address');
  return missing;
}

export default function ClientsBoard({ clients, projects = [], jobs = [], openModal, openDrawer }: ClientsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roster' | 'cards'>('roster');

  const clientRows = useMemo(() => clients.map((client) => {
    const linkedProjects = projects.filter((project) => clientMatchesRecord(client, project));
    const linkedJobs = jobs.filter((job) => clientMatchesRecord(client, job));
    const activeProjects = linkedProjects.filter((project) => !isCompleteStatus(recordStatus(project)));
    const openJobs = linkedJobs.filter((job) => !isCompleteStatus(recordStatus(job)));
    const latestProject = activeProjects[0] || linkedProjects[0];
    const missing = missingClientInfo(client);

    return {
      client,
      linkedProjects,
      linkedJobs,
      activeProjects,
      openJobs,
      latestProject,
      missing,
      searchText: [
        clientName(client),
        client.contactName,
        client.phone,
        client.email,
        client.billingAddress,
        client.billingDetails,
        ...linkedProjects.map(recordName),
        ...linkedJobs.map(recordName),
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  }), [clients, projects, jobs]);

  const filteredClients = clientRows.filter((row) => row.searchText.includes(searchQuery.toLowerCase()));
  const activeProjectCount = clientRows.reduce((sum, row) => sum + row.activeProjects.length, 0);
  const openJobCount = clientRows.reduce((sum, row) => sum + row.openJobs.length, 0);
  const missingInfoCount = clientRows.filter((row) => row.missing.length > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Client Account Register</h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">Accurate account details, contacts, projects, and job history.</p>
        </div>
        <button 
          onClick={() => openModal('client')} 
          className="flex items-center gap-2 self-start rounded-lg bg-jdt-primary px-4 py-2.5 text-sm font-black uppercase text-white shadow-sm transition-colors hover:bg-jdt-dark"
        >
          <Plus className="h-4 w-4"/> Add Client
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Clients', clients.length],
          ['Active Projects', activeProjectCount],
          ['Open Jobs', openJobCount],
          ['Missing Info', missingInfoCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-jdt-border bg-jdt-panel p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-jdt-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-jdt-border bg-jdt-panel p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search client, contact, project, job, or address..."
            className="w-full rounded-lg border border-jdt-border bg-white py-2 pl-9 pr-4 text-sm font-bold text-jdt-text focus:border-zinc-500 focus:outline-none"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-zinc-500">Showing {filteredClients.length} of {clients.length} accounts</span>
          <div className="flex rounded-lg border border-jdt-border bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('roster')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-black uppercase ${viewMode === 'roster' ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:text-jdt-primary'}`}
            >
              <ListChecks className="h-3.5 w-3.5" /> Roster View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-black uppercase ${viewMode === 'cards' ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:text-jdt-primary'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Card View
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'roster' ? (
        <div className="overflow-hidden rounded-xl border border-jdt-border bg-jdt-panel shadow-sm">
          <div className="hidden border-b border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-400 xl:grid xl:grid-cols-[1.5fr_1fr_1.1fr_.75fr_.75fr_1fr_1fr_.9fr] xl:gap-3">
            <span>Client</span>
            <span>Primary Contact</span>
            <span>Phone / Email</span>
            <span>Billing</span>
            <span>Active Projects</span>
            <span>Open Jobs</span>
            <span>Missing Info</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-jdt-border">
            {filteredClients.map(({ client, linkedProjects, linkedJobs, activeProjects, openJobs, latestProject, missing }) => {
              const clientDrawerId = String(client.id || client.name || client.title || '').trim();
              return (
                <article
                  key={client.id || clientName(client)}
                  role="button"
                  tabIndex={0}
                  onClick={() => clientDrawerId && openDrawer('client', clientDrawerId)}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && clientDrawerId) {
                      event.preventDefault();
                      openDrawer('client', clientDrawerId);
                    }
                  }}
                  className="grid cursor-pointer gap-3 px-3 py-3 text-sm transition-colors hover:bg-white xl:grid-cols-[1.5fr_1fr_1.1fr_.75fr_.75fr_1fr_1fr_.9fr] xl:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-words font-black text-jdt-primary">{clientName(client)}</p>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-400">{String(client.id || client.clientId || '').toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 xl:hidden">Primary Contact</p>
                    <p className="font-bold text-jdt-text">{client.contactName || 'Unassigned'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-zinc-400 xl:hidden">Phone / Email</p>
                    <p className="break-words font-bold text-zinc-700">{client.phone || '-'}</p>
                    <p className="break-words text-xs font-semibold text-zinc-500">{client.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 xl:hidden">Billing</p>
                    <span className="rounded bg-jdt-sand px-2 py-1 text-[10px] font-black uppercase text-jdt-primary">{client.billingDetails || 'Net 30'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 xl:hidden">Active Projects</p>
                    <p className="font-black text-jdt-text">{countLabel(activeProjects.length, 'project')}</p>
                    {latestProject && <p className="mt-1 line-clamp-1 text-[11px] font-bold text-zinc-500">{recordName(latestProject)}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-400 xl:hidden">Open Jobs</p>
                    <p className="font-black text-jdt-text">{countLabel(openJobs.length, 'job')}</p>
                    {linkedJobs[0] && <p className="mt-1 line-clamp-1 text-[11px] font-bold text-zinc-500">{recordName(linkedJobs[0])}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.length > 0 ? missing.slice(0, 2).map((item) => (
                      <span key={item} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">{item}</span>
                    )) : (
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-800">Complete</span>
                    )}
                    {missing.length > 2 && <span className="rounded bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-500">+{missing.length - 2}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        clientDrawerId && openDrawer('client', clientDrawerId);
                      }}
                      className="rounded border border-jdt-border bg-white px-2.5 py-1.5 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                    >
                      View Full Profile
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal('client', client);
                      }}
                      className="rounded border border-jdt-border bg-white px-2.5 py-1.5 text-[10px] font-black uppercase text-zinc-600 hover:text-jdt-primary"
                    >
                      Edit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredClients.map(({ client, linkedProjects, linkedJobs, missing }) => {
            const clientJobHistory = jobHistoryLabels(client.history);
            const clientDrawerId = String(client.id || client.name || client.title || '').trim();

          return (
          <article 
            key={client.id || clientName(client)}
            role="button"
            tabIndex={0}
            onClick={() => clientDrawerId && openDrawer('client', clientDrawerId)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && clientDrawerId) {
                event.preventDefault();
                openDrawer('client', clientDrawerId);
              }
            }}
            className="cursor-pointer rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:border-zinc-400 hover:shadow-md transition-all"
          >
            <div className="p-4 border-b border-jdt-border bg-jdt-panel/50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 text-jdt-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-jdt-primary group-hover:text-blue-700 transition-colors leading-tight">{clientName(client)}</h3>
                  <p className="text-[11px] font-black uppercase text-zinc-400 mt-1 tracking-wider">{String(client.id || '').toUpperCase()}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    openModal('delete_client', client);
                  }}
                  className="p-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm rounded-md transition-colors font-black uppercase"
                  title="Delete Account"
                >
                  Delete
                </button>
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    openModal('client', client);
                  }}
                  className="p-1.5 text-xs text-zinc-500 hover:text-jdt-text bg-jdt-panel border border-jdt-border shadow-sm rounded-md transition-colors font-black uppercase"
                  title="Edit Account"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 border-r border-dashed border-zinc-200 sm:pr-4">
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Primary Contact</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-zinc-400"/> {client.contactName || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Phone & Email</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400"/> {client.phone || '-'}</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5 mt-1"><Mail className="h-3.5 w-3.5 text-zinc-400"/> {client.email || '-'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Billing Address</p>
                  <p className="font-bold text-zinc-600 flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5"/> {client.billingAddress || '-'}</p>
                </div>
                {client.members && client.members.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-zinc-200 mt-2">
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1 flex items-center gap-1"><User className="h-2.5 w-2.5" /> Additional Reps</p>
                    <div className="space-y-2">
                      {client.members.map((m: any, i: number) => (
                        <div key={i} className="text-[10px] leading-tight text-zinc-600">
                          <p className="font-black text-jdt-text">{m.name} <span className="text-zinc-400 font-bold uppercase tracking-wide">({m.role})</span></p>
                          <p className="font-bold">{m.phone} | {m.email}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {client.activeJobs && client.activeJobs.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Active Projects</p>
                    <div className="space-y-1">
                      {client.activeJobs.map((job: string) => (
                        <p 
                          key={job} 
                          className="font-black text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                          onClick={() => openDrawer('job', job)}
                        >
                          <ArrowRight className="h-3 w-3 shrink-0" /> {job}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {clientJobHistory.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Job History</p>
                    <div className="space-y-1 text-[11px] font-bold text-zinc-500">
                      {clientJobHistory.map((hisName: string) => (
                        <p key={hisName} className="flex items-center gap-1"><FolderClosed className="h-3 w-3" /> {hisName}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Terms & Billing Info</p>
                  <p className="font-black text-jdt-text">{client.billingDetails || 'Net 30'}</p>
                </div>
                <div className="rounded-lg border border-jdt-border bg-white p-3">
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Linked Work</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded bg-jdt-sand px-2 py-1 text-[10px] font-black uppercase text-jdt-primary">{countLabel(linkedProjects.length, 'project')}</span>
                    <span className="rounded bg-jdt-sand px-2 py-1 text-[10px] font-black uppercase text-jdt-primary">{countLabel(linkedJobs.length, 'job')}</span>
                    {missing.length > 0 && <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-800">{missing[0]}</span>}
                  </div>
                </div>
              </div>
            </div>

            {client.accessNotes && (
              <div className="px-4 py-2 bg-amber-50 border-t border-b border-amber-100 flex items-start gap-2 text-[11px] font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">Site Access: {client.accessNotes}</p>
              </div>
            )}

            <div className="p-3 border-t border-jdt-border bg-jdt-panel/50 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Contact: {client.billingDetails || 'Net 30'} Account</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    clientDrawerId && openDrawer('client', clientDrawerId);
                  }}
                  className="px-3 py-1.5 text-[10px] font-black uppercase rounded border border-jdt-border bg-white text-jdt-primary hover:border-jdt-olive transition-colors"
                >
                  View Full Profile
                </button>
                <button 
                  onClick={(event) => {
                    event.stopPropagation();
                    openModal('contact', { company: client.name || client.title, clientId: client.id });
                  }}
                  className="px-3 py-1.5 text-[10px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors"
                >
                  Add Contact Point
                </button>
              </div>
            </div>
          </article>
          );
          })}
        </div>
      )}

        {filteredClients.length === 0 && (
          <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel py-16 text-center">
            <Building2 className="h-10 w-10 text-zinc-400 mb-3" />
            <h3 className="font-black text-md text-zinc-600 uppercase">No Clients Found</h3>
            <p className="text-zinc-400 text-xs mt-1 font-bold">Try adjusting filters or add a new client record.</p>
          </div>
        )}
    </div>
  );
}
