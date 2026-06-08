import React, { useState } from 'react';
import { AlertTriangle, BarChart3, FileDown, Loader2, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { buildDataQualityActionQueue, buildOperatingKpis, buildWorkflowReadinessQueue } from '../commandCenter/operatingIntelligence';
import type { AlertRecord, ClientRecord, DocumentRecord, EquipmentRecord, FieldUpdateRecord, ImportBatchRecord, JobRecord, LoadRecord, ProjectRecord, RanchOakRecord, ScheduleTaskRecord, TreeRelocationRecord, WorkOrderRecord } from '../commandCenter/records';
import { riskPillClass, riskSurfaceClass } from '../commandCenter/visualLanguage';

type ReportsBoardProps = {
  jobs: JobRecord[];
  projects?: ProjectRecord[];
  workOrders?: WorkOrderRecord[];
  loads: LoadRecord[];
  ranchOaks: RanchOakRecord[];
  equipment: EquipmentRecord[];
  alerts: AlertRecord[];
  clients?: ClientRecord[];
  fieldUpdates?: FieldUpdateRecord[];
  scheduleTasks?: ScheduleTaskRecord[];
  treeRelocationRecords?: TreeRelocationRecord[];
  documents?: DocumentRecord[];
  importBatches?: ImportBatchRecord[];
};

const metricToneClass = {
  ready: riskSurfaceClass('low'),
  watch: riskSurfaceClass('watch'),
  bad: riskSurfaceClass('critical'),
  context: 'border-jdt-border bg-white text-jdt-text',
};

function dataQualitySeverityClass(severity: string) {
  if (severity === 'High') return riskPillClass('critical');
  if (severity === 'Medium') return riskPillClass('watch');
  return riskPillClass('low');
}

export default function ReportsBoard({ jobs, projects = [], workOrders = [], loads, ranchOaks, equipment, alerts, clients = [], fieldUpdates = [], scheduleTasks = [], treeRelocationRecords = [], documents = [], importBatches = [] }: ReportsBoardProps) {
  const [exporting, setExporting] = useState(false);
  const kpiGroups = buildOperatingKpis({
    clients,
    projects,
    jobs,
    workOrders,
    loads,
    equipment,
    fieldUpdates,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts,
    importBatches,
  });
  const dataQualityQueue = buildDataQualityActionQueue({
    clients,
    projects,
    jobs,
    workOrders,
    loads,
    equipment,
    fieldUpdates,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts,
    importBatches,
  });
  const workflowReadinessQueue = buildWorkflowReadinessQueue({
    clients,
    projects,
    jobs,
    workOrders,
    loads,
    equipment,
    fieldUpdates,
    scheduleTasks,
    treeRelocationRecords,
    documents,
    alerts,
    importBatches,
    ranchOaks,
  });
  const rows = [
    { label: 'Projects', value: jobs.length },
    { label: 'Freight Loads', value: loads.length },
    { label: 'Tree Records', value: ranchOaks.length },
    { label: 'Relocation Records', value: treeRelocationRecords.length },
    { label: 'Equipment Records', value: equipment.length },
    { label: 'Clients', value: clients.length },
    { label: 'Schedule Tasks', value: scheduleTasks.length },
    { label: 'Import Batches', value: importBatches.length },
    { label: 'Alerts', value: alerts.length },
  ];
  const recentImports = importBatches.slice(0, 5);

  const exportPdf = () => {
    setExporting(true);
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('JDT Command Center Report', 20, 24);
    pdf.setFontSize(10);
    rows.forEach((row, index) => {
      pdf.text(`${row.label}: ${row.value}`, 20, 36 + index * 8);
    });
    let cursorY = 50 + rows.length * 8;
    kpiGroups.forEach((group) => {
      pdf.setFontSize(12);
      pdf.text(group.title, 20, cursorY);
      cursorY += 7;
      pdf.setFontSize(9);
      group.metrics.forEach((metric) => {
        pdf.text(`${metric.label}: ${metric.value} - ${metric.detail}`, 24, cursorY);
        cursorY += 6;
      });
      cursorY += 3;
    });
    pdf.save('jdt-command-center-report.pdf');
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Reports</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Live reports will populate from the operational records you add</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive transition-colors"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-4 py-2 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark disabled:opacity-60 transition-colors"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Export PDF
          </button>
        </div>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 border-b border-jdt-border pb-4">
          <BarChart3 className="h-5 w-5 text-jdt-olive" />
          <h3 className="text-sm font-black uppercase text-jdt-text">Operational KPIs</h3>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {kpiGroups.map((group) => (
            <section key={group.id} className="rounded-lg border border-jdt-border bg-white p-4">
              <h4 className="text-xs font-black uppercase text-jdt-text">{group.title}</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.metrics.map((metric) => (
                  <div key={`${group.id}-${metric.label}`} className={`rounded-lg border p-3 ${metricToneClass[metric.tone]}`}>
                    <p className="text-[10px] font-black uppercase opacity-70">{metric.label}</p>
                    <p className="mt-2 text-2xl font-black">{metric.value}</p>
                    <p className="mt-1 text-[10px] font-bold leading-snug opacity-75">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 border-b border-jdt-border pb-4">
          <BarChart3 className="h-5 w-5 text-jdt-olive" />
          <h3 className="text-sm font-black uppercase text-jdt-text">Workspace Snapshot</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-jdt-border bg-white p-4">
              <p className="text-[10px] font-black uppercase text-zinc-400">{row.label}</p>
              <p className="mt-2 text-3xl font-black text-jdt-primary">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-3 border-b border-jdt-border pb-4">
          <FileDown className="h-5 w-5 text-jdt-olive" />
          <h3 className="text-sm font-black uppercase text-jdt-text">Data Readiness</h3>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          <div className="rounded-lg border border-jdt-border bg-white p-4">
            <p className="text-[10px] font-black uppercase text-zinc-400">Latest Imports</p>
            {recentImports.length > 0 ? (
              <div className="mt-3 space-y-2">
                {recentImports.map((batch) => (
                  <div key={batch.id} className="rounded border border-jdt-border bg-jdt-panel px-3 py-2">
                    <p className="text-xs font-black text-jdt-text">{batch.name || batch.title}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-500">{batch.recordCount} records | {batch.status || 'Applied'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-zinc-500">No imports have been saved yet.</p>
            )}
          </div>
          <div className="rounded-lg border border-jdt-border bg-white p-4">
            <p className="text-[10px] font-black uppercase text-zinc-400">Operational Coverage</p>
            <div className="mt-3 space-y-2 text-xs font-bold text-zinc-600">
              <p>Clients with records: {clients.length}</p>
              <p>Schedule tasks staged: {scheduleTasks.length}</p>
              <p>Tree inventory available for maps/reports: {ranchOaks.length}</p>
              <p>Equipment records ready for service tracking: {equipment.length}</p>
            </div>
          </div>
          <div className="rounded-lg border border-jdt-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400">Data Quality Action Queue</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">Records to clean up before relying on dashboards, maps, schedules, or imports.</p>
              </div>
              <AlertTriangle className="h-4 w-4 shrink-0 text-jdt-clay" />
            </div>
            {dataQualityQueue.length > 0 ? (
              <div className="mt-3 space-y-2">
                {dataQualityQueue.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-jdt-text">{item.title}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{item.sourceType}</p>
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold leading-snug text-zinc-600">{item.detail}</p>
                    <p className="mt-2 text-[10px] font-black uppercase leading-snug text-jdt-primary">{item.recommendedAction}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-zinc-500">No relationship, import, or missing-context cleanup items are currently visible.</p>
            )}
          </div>
          <div className="rounded-lg border border-jdt-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400">Workflow Readiness</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">Required details missing before dispatch, closeout, or office review.</p>
              </div>
              <AlertTriangle className="h-4 w-4 shrink-0 text-jdt-clay" />
            </div>
            {workflowReadinessQueue.length > 0 ? (
              <div className="mt-3 space-y-2">
                {workflowReadinessQueue.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border border-jdt-border bg-jdt-panel p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-jdt-text">{item.title}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{item.workflow} / {item.stage}</p>
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase ${dataQualitySeverityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.missingFields.slice(0, 4).map((field) => (
                        <span key={`${item.id}-${field}`} className="rounded border border-jdt-border bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-jdt-text">{field}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase leading-snug text-jdt-primary">{item.recommendedAction}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs font-bold text-zinc-500">No dispatch, closeout, maintenance, tree, or inventory readiness gaps are currently visible.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
