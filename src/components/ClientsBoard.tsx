import React, { useState } from 'react';
import { Building2, User, Phone, Mail, MapPin, ClipboardList, DollarSign, Plus, AlertTriangle, Eye, ArrowRight, FolderClosed } from 'lucide-react';

export default function ClientsBoard({ clients, openModal, openDrawer }: { clients: any[], openModal: (type: string, data?: any) => void, openDrawer: (type: string, id: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.billingAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Clients & Accounts</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Partners, developers, golf superintendents, and site managers</p>
        </div>
        <button 
          onClick={() => openModal('client')} 
          className="flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-sm font-black uppercase bg-jdt-primary text-white hover:bg-jdt-dark transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4"/> Add Client
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-jdt-panel border border-jdt-border p-4 rounded-xl shadow-sm">
        <div className="relative w-full max-w-md">
           <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
           <input 
             type="text"
             placeholder="Search by company name, location, contact..."
             className="w-full bg-jdt-panel border border-jdt-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-500 font-bold text-jdt-text"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
        </div>
        <div className="text-xs font-bold text-zinc-500">
          Showing {filteredClients.length} of {clients.length} accounts
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredClients.map(client => (
          <article 
            key={client.id} 
            className="rounded-xl border border-jdt-border bg-jdt-panel shadow-sm overflow-hidden flex flex-col group hover:border-zinc-400 hover:shadow-md transition-all"
          >
            <div className="p-4 border-b border-jdt-border bg-jdt-panel/50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 text-jdt-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-jdt-primary group-hover:text-blue-700 transition-colors leading-tight">{client.name}</h3>
                  <p className="text-[11px] font-black uppercase text-zinc-400 mt-1 tracking-wider">{client.id.toUpperCase()}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => openModal('delete_client', client)}
                  className="p-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm rounded-md transition-colors font-black uppercase"
                  title="Delete Account"
                >
                  Delete
                </button>
                <button 
                  onClick={() => openModal('client', client)}
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
                  <p className="font-bold text-jdt-text flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400"/> {client.phone}</p>
                  <p className="font-bold text-jdt-text flex items-center gap-1.5 mt-1"><Mail className="h-3.5 w-3.5 text-zinc-400"/> {client.email}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-0.5">Billing Address</p>
                  <p className="font-bold text-zinc-600 flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5"/> {client.billingAddress}</p>
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
                {client.history && client.history.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Job History</p>
                    <div className="space-y-1 text-[11px] font-bold text-zinc-500">
                      {client.history.map((hisName: string) => (
                        <p key={hisName} className="flex items-center gap-1"><FolderClosed className="h-3 w-3" /> {hisName}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Terms & Billing Info</p>
                  <p className="font-black text-jdt-text">{client.billingDetails || 'Net 30'}</p>
                </div>
              </div>
            </div>

            {client.accessNotes && (
              <div className="px-4 py-2 bg-amber-50 border-t border-b border-amber-100 flex items-start gap-2 text-[11px] font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-snug">Site Access: {client.accessNotes}</p>
              </div>
            )}

            <div className="p-3 border-t border-jdt-border bg-jdt-panel/50 flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Contact: {client.billingDetails || 'Net 30'} Account</span>
              <button 
                onClick={() => openModal('contact', { company: client.name })}
                className="px-3 py-1.5 text-[10px] font-black uppercase rounded bg-jdt-primary text-white hover:bg-jdt-dark transition-colors"
              >
                Add Contact Point
              </button>
            </div>
          </article>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-16 bg-jdt-panel border border-jdt-border border-dashed rounded-xl flex flex-col items-center justify-center text-center">
            <Building2 className="h-10 w-10 text-zinc-400 mb-3" />
            <h3 className="font-black text-md text-zinc-600 uppercase">No Clients Found</h3>
            <p className="text-zinc-400 text-xs mt-1 font-bold">Try adjusting filters or add a new client record.</p>
          </div>
        )}
      </div>
    </div>
  );
}
