import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, MapPin, MessageSquare, Truck, UserCheck, Wrench } from 'lucide-react';
import { equipmentDisplayName } from '../commandCenter/equipmentFreight';
import { buildCrewCloseoutPrompts, buildDailyCloseoutUpdate, recordMatchesCrew } from '../commandCenter/fieldCloseout';
import type { CrewRecord, EquipmentRecord, FieldUpdateRecord, JobRecord, LoadRecord, WorkOrderRecord } from '../commandCenter/records';
import { categoryAccentBorderClass, riskSurfaceClass, statusPillClass } from '../commandCenter/visualLanguage';

type AssignmentRecord = {
  id: string;
  type: 'load' | 'workOrder' | 'job';
  title: string;
  status?: string;
  detail: string;
  drawerType: string;
  source: LoadRecord | WorkOrderRecord | JobRecord;
};

type CrewViewBoardProps = {
  crews: CrewRecord[];
  loads?: LoadRecord[];
  workOrders?: WorkOrderRecord[];
  jobs?: JobRecord[];
  equipment?: EquipmentRecord[];
  fieldUpdates?: FieldUpdateRecord[];
  currentUserEmail?: string | null;
  canSubmitFieldUpdates?: boolean;
  onSaveFieldUpdate: (update: Partial<FieldUpdateRecord>) => void;
  openDrawer: (type: string, id: string) => void;
};

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function displayName(member: CrewRecord) {
  return member.name || member.email || member.id || 'Crew member';
}

function assignmentEquipmentNames(load: LoadRecord, equipment: EquipmentRecord[]) {
  const names = [
    load.truck,
    load.trailer,
    ...(load.equipmentNames || []),
    ...(load.routeSteps || []).flatMap((step) => [step.truckName, step.trailerName, step.equipmentName]),
  ].filter(Boolean).map(String);
  const normalizedNames = names.map(normalize);

  return equipment.filter((item) => {
    const itemNames = [item.id, item.name, item.asset, equipmentDisplayName(item)].map(normalize);
    return itemNames.some((name) => normalizedNames.includes(name));
  });
}

function statusNeedsAdmin(status: string) {
  return ['Delayed', 'Need Help', 'Issue'].includes(status);
}

function statusForFieldAction(status: string): string {
  if (status === 'Need Help' || status === 'Issue') return 'Blocked';
  if (status === 'Arrived' || status === 'Started') return 'In Progress';
  return status;
}

export default function CrewViewBoard({
  crews,
  loads = [],
  workOrders = [],
  jobs = [],
  equipment = [],
  fieldUpdates = [],
  currentUserEmail,
  canSubmitFieldUpdates = false,
  onSaveFieldUpdate,
  openDrawer,
}: CrewViewBoardProps) {
  const sortedCrews = useMemo(() => [...crews].sort((a, b) => displayName(a).localeCompare(displayName(b))), [crews]);
  const matchedCrew = sortedCrews.find((member) => normalize(member.email) === normalize(currentUserEmail));
  const [selectedCrewId, setSelectedCrewId] = useState(matchedCrew?.id || sortedCrews[0]?.id || sortedCrews[0]?.email || '');
  const [notes, setNotes] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [treeTagText, setTreeTagText] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');
  const [proofAttachmentText, setProofAttachmentText] = useState('');
  const selectedCrew = sortedCrews.find((member) => (member.id || member.email || displayName(member)) === selectedCrewId) || matchedCrew || sortedCrews[0];

  const assignments = useMemo<AssignmentRecord[]>(() => {
    if (!selectedCrew) return [];

    const loadAssignments = loads
      .filter((load) => recordMatchesCrew(load, selectedCrew))
      .map((load) => ({
        id: load.id || load.title || 'load',
        type: 'load' as const,
        title: load.title || load.loadNumber || 'Freight move',
        status: load.status,
        detail: [load.truck, load.trailer, load.origin, load.delivery || load.destination, load.eta].filter(Boolean).join(' - '),
        drawerType: 'freight',
        source: load,
      }));

    const workOrderAssignments = workOrders
      .filter((workOrder) => recordMatchesCrew(workOrder, selectedCrew))
      .map((workOrder) => ({
        id: workOrder.id || workOrder.title || 'work-order',
        type: 'workOrder' as const,
        title: workOrder.title || workOrder.taskType || 'Work order',
        status: workOrder.status,
        detail: [workOrder.projectName, workOrder.jobName, workOrder.siteArea, workOrder.scheduledDate].filter(Boolean).join(' - '),
        drawerType: 'job',
        source: workOrder,
      }));

    const jobAssignments = jobs
      .filter((job) => recordMatchesCrew(job, selectedCrew))
      .map((job) => ({
        id: job.id || job.title || 'job',
        type: 'job' as const,
        title: job.title || job.client || 'Job',
        status: job.status,
        detail: [job.clientName || job.client, job.location, job.startDate || job.scheduledDate].filter(Boolean).join(' - '),
        drawerType: 'job',
        source: job,
      }));

    return [...loadAssignments, ...workOrderAssignments, ...jobAssignments];
  }, [jobs, loads, selectedCrew, workOrders]);

  const closeoutPrompts = useMemo(() => buildCrewCloseoutPrompts({
    crew: selectedCrew,
    loads,
    workOrders,
    jobs,
    fieldUpdates,
  }), [fieldUpdates, jobs, loads, selectedCrew, workOrders]);

  const selectedCrewUpdates = fieldUpdates.filter((update) => normalize(update.crewName) === normalize(selectedCrew?.name) || normalize(update.crewId) === normalize(selectedCrew?.id));

  const submitUpdate = (assignment: AssignmentRecord, fieldStatus: string) => {
    if (!selectedCrew || !canSubmitFieldUpdates) return;

    onSaveFieldUpdate({
      title: `${fieldStatus}: ${assignment.title}`,
      crewId: selectedCrew.id || selectedCrew.email || selectedCrew.name,
      crewName: displayName(selectedCrew),
      crewRole: selectedCrew.role,
      userEmail: selectedCrew.email || currentUserEmail || undefined,
      relatedRecordType: assignment.type,
      relatedRecordId: assignment.id,
      relatedTitle: assignment.title,
      updateType: fieldStatus,
      fieldStatus,
      notes,
      needsAdminReview: statusNeedsAdmin(fieldStatus),
      status: statusNeedsAdmin(fieldStatus) ? 'Needs Review' : 'Submitted',
    });
    setNotes('');
  };

  const submitCloseout = (assignment: AssignmentRecord) => {
    if (!selectedCrew || !canSubmitFieldUpdates) return;

    onSaveFieldUpdate(buildDailyCloseoutUpdate({
      crew: selectedCrew,
      assignment: {
        id: assignment.id,
        type: assignment.type,
        title: assignment.title,
        source: assignment.source,
      },
      workCompleted,
      treeTagText,
      locationDetail,
      issueSummary,
      tomorrowPlan,
      photoNotes,
      proofAttachmentText,
      userEmail: currentUserEmail,
    }));
    setWorkCompleted('');
    setTreeTagText('');
    setLocationDetail('');
    setIssueSummary('');
    setTomorrowPlan('');
    setPhotoNotes('');
    setProofAttachmentText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Crew View</h2>
          <p className="mt-1 text-sm font-bold text-zinc-500">Test the field-user workflow for drivers, crew leaders, mechanics, irrigation techs, and support crews</p>
        </div>
        <div className="w-full rounded-xl border border-jdt-border bg-jdt-panel p-3 shadow-sm lg:w-80">
          <label className="block text-[10px] font-black uppercase tracking-wide text-zinc-500">Testing As</label>
          <select
            value={selectedCrewId}
            onChange={(event) => setSelectedCrewId(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-black text-jdt-text outline-none focus:border-jdt-olive"
          >
            {sortedCrews.map((member) => (
              <option key={member.id || member.email || displayName(member)} value={member.id || member.email || displayName(member)}>
                {displayName(member)} - {member.role || 'Crew'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCrew && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Field User</p>
                  <h3 className="mt-1 text-xl font-black text-jdt-primary">{displayName(selectedCrew)}</h3>
                  <p className="text-xs font-bold text-zinc-500">{selectedCrew.role || 'Crew'} {selectedCrew.skill ? `- ${selectedCrew.skill}` : ''}</p>
                </div>
                <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase ${canSubmitFieldUpdates ? statusPillClass('Ready') : statusPillClass('Closed')}`}>
                  {canSubmitFieldUpdates ? 'Field Updates Enabled' : 'Read Only'}
                </span>
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Notes for Next Update</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Delay reason, site note, equipment issue, or completion detail"
                  className="h-20 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                />
              </label>
              <div className="mt-4 border-t border-jdt-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Daily Closeout</p>
                    <p className="mt-0.5 text-xs font-bold text-zinc-500">Capture completed work, tags/materials, location proof, issues, and tomorrow handoff notes.</p>
                  </div>
                  <span className="rounded-md border border-jdt-border bg-white px-2.5 py-1 text-[10px] font-black uppercase text-jdt-primary">{closeoutPrompts.filter((prompt) => prompt.closeoutStatus === 'Needs Closeout').length} open</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Work Completed</span>
                    <textarea
                      value={workCompleted}
                      onChange={(event) => setWorkCompleted(event.target.value)}
                      placeholder="What actually got done today"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Tree Tags / Materials</span>
                    <textarea
                      value={treeTagText}
                      onChange={(event) => setTreeTagText(event.target.value)}
                      placeholder="Tree tags, quantities, material names, or load notes"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">GPS / Location Note</span>
                    <textarea
                      value={locationDetail}
                      onChange={(event) => setLocationDetail(event.target.value)}
                      placeholder="Pin, coordinates, farm zone, hole, staging area, or access note"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Issues / Delays</span>
                    <textarea
                      value={issueSummary}
                      onChange={(event) => setIssueSummary(event.target.value)}
                      placeholder="Anything Jennifer, Regina, Buck, Max, or Jeremy needs to review"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Tomorrow Plan</span>
                    <textarea
                      value={tomorrowPlan}
                      onChange={(event) => setTomorrowPlan(event.target.value)}
                      placeholder="What should happen next or carry over tomorrow"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Proof Links / Photos</span>
                    <textarea
                      value={proofAttachmentText}
                      onChange={(event) => setProofAttachmentText(event.target.value)}
                      placeholder="Paste Drive links, photo URLs, BOL/POD links, or proof notes"
                      className="h-16 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-500">Photo / Proof Notes</span>
                    <textarea
                      value={photoNotes}
                      onChange={(event) => setPhotoNotes(event.target.value)}
                      placeholder="What photos were taken, what proof is missing, or where the files are stored"
                      className="h-14 w-full rounded-lg border border-jdt-border bg-white px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-jdt-olive"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wide text-zinc-700">Today Assignments</h3>
                <span className="rounded-full bg-jdt-sand px-2 py-0.5 text-xs font-black text-jdt-primary">{assignments.length}</span>
              </div>

              {assignments.map((assignment) => {
                const relatedEquipment = assignment.type === 'load' ? assignmentEquipmentNames(assignment.source as LoadRecord, equipment) : [];
                const closeoutPrompt = closeoutPrompts.find((prompt) => prompt.id === assignment.id && prompt.type === assignment.type);
                return (
                  <article key={`${assignment.type}-${assignment.id}`} className={`rounded-xl border border-jdt-border border-l-4 bg-jdt-panel p-4 shadow-sm ${categoryAccentBorderClass(assignment.type === 'load' ? 'freight' : 'crew')}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                          {assignment.type === 'load' ? <Truck className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                          {assignment.type === 'load' ? 'Freight Assignment' : assignment.type === 'workOrder' ? 'Work Order' : 'Job'}
                        </p>
                        <h4 className="mt-1 text-lg font-black text-jdt-primary">{assignment.title}</h4>
                        <p className="mt-1 text-xs font-bold text-zinc-600">{assignment.detail || 'No route or site details added yet'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDrawer(assignment.drawerType, assignment.id)}
                        className="rounded-lg border border-jdt-border bg-white px-3 py-2 text-[10px] font-black uppercase text-jdt-primary hover:border-jdt-olive"
                      >
                        Details
                      </button>
                    </div>

                    {relatedEquipment.length > 0 && (
                      <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><Wrench className="h-3.5 w-3.5" /> Assigned Equipment</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {relatedEquipment.map((item) => (
                            <span key={item.id || equipmentDisplayName(item)} className="rounded bg-jdt-sand px-2 py-1 text-[9px] font-black uppercase text-jdt-primary">
                              {equipmentDisplayName(item)}
                            </span>
                          ))}
                          {relatedEquipment.flatMap((item) => item.trailerMaintenanceCategories || []).map((category) => (
                            <span key={category} className="rounded bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-800">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(assignment.source as LoadRecord).routeSteps?.length ? (
                      <div className="mt-3 rounded-lg border border-jdt-border bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-zinc-500">Dispatch Steps</p>
                        <div className="mt-2 space-y-1">
                          {((assignment.source as LoadRecord).routeSteps || []).slice(0, 4).map((step, index) => (
                            <p key={step.id || `${assignment.id}-step-${index}`} className="text-xs font-bold text-zinc-700">
                              {step.sequence || index + 1}. {step.label || step.actionType || 'Dispatch step'} <span className="text-zinc-400">({step.status || 'Pending'})</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500"><MessageSquare className="h-3.5 w-3.5" /> Update Status</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {['Arrived', 'Started', 'Delayed', 'Need Help', 'Complete'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={!canSubmitFieldUpdates}
                            onClick={() => submitUpdate(assignment, status)}
                            className={`rounded-lg border px-2 py-2 text-[10px] font-black uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-95 ${statusPillClass(statusForFieldAction(status))}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-jdt-border bg-white p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Daily Closeout</p>
                          <p className="mt-1 text-xs font-bold text-zinc-600">{closeoutPrompt?.recommendedAction || 'Submit daily closeout before office review.'}</p>
                          {closeoutPrompt?.treeOrMaterialLabels.length ? (
                            <p className="mt-1 text-[10px] font-black uppercase text-zinc-400">{closeoutPrompt.treeOrMaterialLabels.slice(0, 4).join(' / ')}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase ${statusPillClass(closeoutPrompt?.closeoutStatus === 'Submitted' ? 'Complete' : 'Pending')}`}>
                            {closeoutPrompt?.closeoutStatus || 'Needs Closeout'}
                          </span>
                          <button
                            type="button"
                            disabled={!canSubmitFieldUpdates}
                            onClick={() => submitCloseout(assignment)}
                            className="rounded-lg border border-jdt-olive bg-jdt-primary px-3 py-2 text-[10px] font-black uppercase text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Submit Closeout
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {assignments.length === 0 && (
                <div className="rounded-xl border border-dashed border-jdt-border bg-jdt-panel p-8 text-center">
                  <UserCheck className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
                  <p className="text-sm font-black text-jdt-text">No active assignments for this crew member</p>
                  <p className="mx-auto mt-1 max-w-md text-xs font-bold text-zinc-500">Assign this person to a freight move, work order, or job to test the field update flow.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-jdt-border bg-jdt-panel p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-jdt-primary"><Clock className="h-4 w-4" /> Latest Crew Updates</h3>
              <div className="mt-3 space-y-2">
                {selectedCrewUpdates.slice(0, 6).map((update) => (
                  <div key={update.id || update.title} className="rounded-lg border border-jdt-border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-jdt-primary">{update.relatedTitle || update.title || 'Field update'}</p>
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${statusPillClass(statusForFieldAction(update.fieldStatus || update.updateType || update.status || 'Submitted'))}`}>
                        {update.fieldStatus || update.updateType || update.status || 'Submitted'}
                      </span>
                    </div>
                    {update.notes && <p className="mt-1 text-xs font-bold text-zinc-600">{update.notes}</p>}
                    {update.proofLinks?.length ? (
                      <div className="mt-2 rounded border border-jdt-border bg-jdt-panel p-2">
                        <p className="text-[9px] font-black uppercase text-zinc-400">Proof Attachments</p>
                        <div className="mt-1 space-y-1">
                          {update.proofLinks.map((link, index) => (
                            <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className="block break-all text-[10px] font-black text-jdt-primary hover:underline">
                              {link.label || `Proof ${index + 1}`} - {link.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {update.locationName && <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase text-zinc-400"><MapPin className="h-3 w-3" /> {update.locationName}</p>}
                  </div>
                ))}
                {selectedCrewUpdates.length === 0 && <p className="rounded-lg border border-dashed border-jdt-border bg-white p-3 text-xs font-bold text-zinc-500">No updates submitted yet.</p>}
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${riskSurfaceClass('watch')}`}>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide"><AlertTriangle className="h-4 w-4" /> Escalation Rules</h3>
              <p className="mt-2 text-xs font-bold">Delayed, Need Help, and Issue updates are routed to the admin dashboard for review. Arrived, Started, and Complete updates create a status history without requiring an owner decision.</p>
            </div>

            <div className={`rounded-xl border p-4 ${riskSurfaceClass('low')}`}>
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide"><CheckCircle2 className="h-4 w-4" /> Field Workflow</h3>
              <p className="mt-2 text-xs font-bold">This view is built for phone use later: current assignment, route steps, quick status buttons, notes, and service issue reporting in one place.</p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
