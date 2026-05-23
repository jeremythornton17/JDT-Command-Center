import React, { useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Ship, ShieldAlert, Award, Wrench, Leaf, PieChart, FileDown, Loader2, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportsBoard() {
  const [activeReport, setActiveReport] = useState('daily');
  const [isGenerating, setIsGenerating] = useState(false);

  const stats = [
    { title: 'Tree Survival Rate', value: '98.4%', trend: '+0.8% Vs last year', label: 'Agronomy Care success' },
    { title: 'Fleet Availability', value: '87.2%', trend: '-2.4% Down (hydraulic checks)', label: 'Mechanic workload' },
    { title: 'On-Time Dispatch Rate', value: '96.1%', trend: '+1.5% Improv', label: 'Route tracking feedback' },
    { title: 'Daily Spade Cycle', value: '18 min', trend: '-2 min Faster digs', label: 'Operational efficiency' },
  ];

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('jdt-print-template');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FBF8F1',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      pdf.save(`JDT_Weekly_Operations_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jdt-border pb-5">
        <div>
          <h2 className="text-2xl font-black text-jdt-primary">Operations Analytics & Reports</h2>
          <p className="text-sm font-bold text-zinc-500 mt-1">Live performance digests, asset yields, and cost audits</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            disabled={isGenerating}
            onClick={handleExportPDF} 
            className="flex items-center gap-1.5 rounded-lg bg-jdt-primary px-4 py-2.5 text-xs font-black uppercase text-white shadow-sm hover:bg-jdt-dark transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                Download PDF Report
              </>
            )}
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-1.5 rounded-lg border border-jdt-border bg-jdt-panel px-4 py-2.5 text-xs font-black uppercase text-zinc-700 shadow-sm hover:bg-jdt-sand transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Quick Print
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st, idx) => (
          <div key={idx} className="bg-jdt-panel p-4 rounded-xl border border-jdt-border shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">{st.title}</p>
              <h3 className="text-3xl font-black text-jdt-text">{st.value}</h3>
            </div>
            <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
              <span className={`text-[10px] font-black ${st.trend.startsWith('+') ? 'text-emerald-700' : 'text-red-700'}`}>{st.trend}</span>
              <span className="text-[9px] font-bold text-zinc-400">{st.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Navigation Sidebar */}
        <div className="bg-jdt-panel rounded-xl border border-jdt-border p-4 space-y-2.5 h-fit shadow-sm">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wide px-2.5 mb-2">Available Digests</h3>
          {[
            { id: 'daily', label: 'Daily Dig & Relocates' },
            { id: 'fleet', label: 'Fleet & Service Hours' },
            { id: 'freight', label: 'Freight Transit Speeds' },
            { id: 'nursery', label: 'Nursery Stock Yields' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`w-full text-left px-3 py-2 text-xs font-black uppercase rounded-lg transition-colors ${activeReport === r.id ? 'bg-jdt-primary text-white' : 'text-zinc-500 hover:text-zinc-700 hover:bg-jdt-sand'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Selected Report Content */}
        <div className="bg-jdt-panel rounded-xl border border-jdt-border shadow-sm p-6 space-y-6">
          {activeReport === 'daily' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">Daily Dig & Relocations Audit</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Daily project completion vs schedule commitments</p>
              </div>

              {/* Custom SVG/HTML Chart representing Dig Completion */}
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase text-zinc-400">Survival / Milestone completion breakdown (May 17 - May 23)</p>
                <div className="h-48 flex items-end justify-between gap-4 bg-jdt-sand/30 p-4 rounded-xl border border-jdt-border">
                  {[
                    { day: 'May 17', completed: 12, target: 15 },
                    { day: 'May 18', completed: 15, target: 15 },
                    { day: 'May 19', completed: 8, target: 12 },
                    { day: 'May 20', completed: 18, target: 15 },
                    { day: 'May 21', completed: 14, target: 14 },
                    { day: 'May 22', completed: 16, target: 18 },
                    { day: 'May 23', completed: 11, target: 12 },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full">
                      <div className="w-full flex items-end justify-center gap-1.5 h-full">
                        {/* Target line bar */}
                        <div className="w-3 bg-zinc-300 rounded-t" style={{ height: `${(bar.target / 20) * 100}%` }} title={`Target: ${bar.target}`}></div>
                        {/* Completed bar */}
                        <div className="w-3.5 bg-jdt-primary rounded-t" style={{ height: `${(bar.completed / 20) * 100}%` }} title={`Completed: ${bar.completed}`}></div>
                      </div>
                      <p className="text-[9px] font-black uppercase text-zinc-500 mt-2">{bar.day}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-[10px] font-bold text-zinc-500 items-center justify-center">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 bg-zinc-300 rounded"></span> Target Projects</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 bg-jdt-primary rounded"></span> Completed Digs</span>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'fleet' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">Fleet Maintenance & Service Due</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1 font-sans">Hours elapsed vs safety inspect indicators</p>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'CAT 988G Loader', status: 'Maintenance due in 70 hrs', val: 74 },
                  { name: 'John Deere Spade 770', status: 'Service due in 150 hrs', val: 55 },
                  { name: 'Terex Heavy Excavator', status: 'Available', val: 92 },
                  { name: 'Freightliner M2 (FRT-02)', status: 'Service due in 20 hrs', val: 12 },
                ].map((fl, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-jdt-text">{fl.name}</span>
                      <span className="font-bold text-zinc-500">{fl.status}</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                      <div className={`h-full rounded-full ${fl.val < 30 ? 'bg-red-500' : fl.val < 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fl.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'freight' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">Freight Transit Performance</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Average hourly transport milestones across projects</p>
              </div>
              <div className="p-8 rounded-xl bg-jdt-sand border border-jdt-border flex flex-col items-center justify-center text-center">
                <PieChart className="h-10 w-10 text-zinc-400 mb-2" />
                <p className="text-sm font-black text-jdt-text uppercase">Transit Analytics Module</p>
                <p className="text-xs font-bold text-zinc-500 mt-1 max-w-sm">96.1% of all freight loads arrived within their 2-hour delivery window this quarter. Delays were primarily agricultural inspect checkpoints.</p>
              </div>
            </div>
          )}

          {activeReport === 'nursery' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-jdt-text uppercase">Nursery Harvest Yield</h3>
                <p className="text-xs font-bold text-zinc-500 mt-1">Average growth cycle tracking across farms</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><Leaf className="h-3.5 w-3.5" /> Block Harvest Yield</h4>
                  <p className="text-2xl font-black">94.2%</p>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">Average survival of harvested stock</p>
                </div>
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-1 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Total Nursery Val, May</h4>
                  <p className="text-2xl font-black">$2.42M</p>
                  <p className="text-[11px] font-bold text-zinc-500 mt-0.5">Est standing tree inventory</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden printable template specifically crafted for exporting Letter-sized PDF */}
      <div 
        id="jdt-print-template" 
        className="absolute -left-[9999px] top-0 overflow-hidden w-[780px] bg-[#FBF8F1] text-[#1E2520] p-8 font-sans"
        style={{ width: '780px', minHeight: '1050px', boxSizing: 'border-box' }}
      >
        {/* Header Grid */}
        <div className="flex justify-between items-start border-b-2 border-[#123524] pb-4 mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#6F7D4D]">LIVE STOCK & FIELD LOGISTICS DIVISION</div>
            <h1 className="text-3xl font-black text-[#123524] tracking-tight mt-1">JDT NURSERIES</h1>
            <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase">Operations Performance Division — Established 1984</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-[#123524] text-[#FBF8F1] text-[9px] font-black tracking-widest rounded-sm">WEEKLY PERFORMANCE REPORT</span>
            <p className="text-[10px] font-bold text-zinc-600 mt-2">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[10px] font-medium text-zinc-400 mt-0.5">Author Account: jeremy@jdtnurseries.com</p>
          </div>
        </div>

        {/* Highlight Metadata Row */}
        <div className="grid grid-cols-3 gap-4 bg-[#F4EFE7]/50 rounded-lg p-3 border border-[#D9D1C2] text-xs font-bold text-zinc-700 mb-6">
          <div><span className="text-[#123524] font-black uppercase text-[9px] block">AUDIT INTERVAL</span> May 17, 2026 – May 23, 2026</div>
          <div><span className="text-[#123524] font-black uppercase text-[9px] block">STATUS OF AUDIT</span> Archived & Verified</div>
          <div><span className="text-[#123524] font-black uppercase text-[9px] block">CRITICAL INDICATOR</span> Agronomy CARE SUCCESS</div>
        </div>

        {/* Core KPIs 4-card Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Tree Survival Rate', value: '98.4%', trend: '+0.8% Vs last year', label: 'Agronomy Care success' },
            { title: 'Fleet Availability', value: '87.2%', trend: '-2.4% (hydraulic checks)', label: 'Mechanic workload' },
            { title: 'On-Time Dispatch Rate', value: '96.1%', trend: '+1.5% Improvement', label: 'Route tracking feedback' },
            { title: 'Daily Spade Cycle', value: '18 min', trend: '-2 min Faster digs', label: 'Operational efficiency' },
          ].map((st, idx) => (
            <div key={idx} className="bg-white p-3.5 rounded-lg border border-[#D9D1C2] flex flex-col justify-between shadow-sm">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1">{st.title}</p>
                <h3 className="text-2xl font-black text-[#1E2520]">{st.value}</h3>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                <span className={`text-[9px] font-black ${st.trend.startsWith('+') ? 'text-emerald-700' : 'text-red-700'}`}>{st.trend}</span>
                <span className="text-[8px] font-semibold text-zinc-400">{st.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Section 1: Daily Digs Relocation Chart / Table */}
        <div className="grid grid-cols-5 gap-6 border-b border-[#D9D1C2] pb-6 mb-6">
          <div className="col-span-3 space-y-4">
            <h4 className="text-xs font-black uppercase text-[#123524] tracking-wide border-b border-[#D9D1C2] pb-1.5">Section A: Daily Digs & Relocations Audit</h4>
            
            {/* Visual Bar chart layout */}
            <div className="h-40 flex items-end justify-between gap-2 bg-white p-3 rounded-lg border border-[#D9D1C2]">
              {[
                { day: 'May 17', completed: 12, target: 15 },
                { day: 'May 18', completed: 15, target: 15 },
                { day: 'May 19', completed: 8, target: 12 },
                { day: 'May 20', completed: 18, target: 15 },
                { day: 'May 21', completed: 14, target: 14 },
                { day: 'May 22', completed: 16, target: 18 },
                { day: 'May 23', completed: 11, target: 12 },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div className="w-2.5 bg-zinc-300 rounded-t" style={{ height: `${(bar.target / 20) * 100}%` }}></div>
                    <div className="w-3 bg-[#123524] rounded-t" style={{ height: `${(bar.completed / 20) * 100}%` }}></div>
                  </div>
                  <p className="text-[8px] font-black uppercase text-[#1E2520] mt-1.5">{bar.day.split(' ')[1]}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-[9px] font-bold text-zinc-500 justify-center">
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-zinc-300 rounded-sm"></span> Target Digs</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-[#123524] rounded-sm"></span> Completed Digs</span>
            </div>
          </div>

          <div className="col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-[#123524] tracking-wide border-b border-[#D9D1C2] pb-1.5">Dig Statistics Table</h4>
            <div className="overflow-hidden border border-[#D9D1C2] rounded-lg">
              <table className="w-full text-left border-collapse text-[9px]">
                <thead>
                  <tr className="bg-[#F4EFE7] border-b border-[#D9D1C2] uppercase font-black text-[#123524]">
                    <th className="p-2">Date</th>
                    <th className="p-2 text-center">Comp</th>
                    <th className="p-2 text-center">Tgt</th>
                    <th className="p-2 text-right">Var</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {[
                    { day: 'May 17', completed: 12, target: 15 },
                    { day: 'May 18', completed: 15, target: 15 },
                    { day: 'May 19', completed: 8, target: 12 },
                    { day: 'May 20', completed: 18, target: 15 },
                    { day: 'May 21', completed: 14, target: 14 },
                    { day: 'May 22', completed: 16, target: 18 },
                    { day: 'May 23', completed: 11, target: 12 },
                  ].map((row, i) => {
                    const diff = row.completed - row.target;
                    return (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="p-2 font-black text-zinc-700">{row.day}</td>
                        <td className="p-2 text-center font-bold">{row.completed}</td>
                        <td className="p-2 text-center text-zinc-500">{row.target}</td>
                        <td className={`p-2 text-right font-extrabold ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {diff >= 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 2: Fleet Status & Service Due progress bars */}
        <div className="border-b border-[#D9D1C2] pb-6 mb-6">
          <h4 className="text-xs font-black uppercase text-[#123524] tracking-wide border-b border-[#D9D1C2] pb-1.5 mb-3">Section B: Fleet & Service Indicators</h4>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'CAT 988G Loader', status: 'Maintenance due in 70 hrs', val: 74 },
              { name: 'John Deere Spade 770', status: 'Service due in 150 hrs', val: 55 },
              { name: 'Terex Heavy Excavator', status: 'Available', val: 92 },
              { name: 'Freightliner M2 (FRT-02)', status: 'Service due in 20 hrs', val: 12 },
            ].map((fl, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-[#D9D1C2] space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-extrabold text-[#1E2520]">{fl.name}</span>
                  <span className="font-bold text-zinc-500 text-[9px]">{fl.status}</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                  <div className={`h-full rounded-full ${fl.val < 30 ? 'bg-red-600' : fl.val < 75 ? 'bg-amber-600' : 'bg-emerald-600'}`} style={{ width: `${fl.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 & 4 combined: Freight transit + Nursery Stock valuations */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="text-xs font-black uppercase text-[#123524] tracking-wide border-b border-[#D9D1C2] pb-1.5 mb-3">Section C: Freight & Logistics</h4>
            <div className="bg-white p-4 rounded-lg border border-[#D9D1C2] h-[105px] flex flex-col justify-center">
              <span className="text-[10px] font-black text-[#123524] uppercase">Transit Milestone Summary</span>
              <p className="text-[10px] text-zinc-600 mt-1 font-medium leading-relaxed">
                96.1% of all freight loads arrived within their 2-hour delivery window. Delay markers are primary agricultural inspect checkpoints and hydraulic checks. No critical transit bottlenecks found.
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-[#123524] tracking-wide border-b border-[#D9D1C2] pb-1.5 mb-3">Section D: Nursery Harvest Yields</h4>
            <div className="grid grid-cols-2 gap-3 h-[105px]">
              <div className="bg-white p-3 rounded-lg border border-[#D9D1C2] flex flex-col justify-center">
                <span className="text-[8px] font-black uppercase text-zinc-400">Survival Yield</span>
                <span className="text-lg font-black text-[#123524] mt-0.5">94.2%</span>
                <span className="text-[8px] font-bold text-zinc-500 mt-0.5 leading-tight">Average harvested stock survival rate</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#D9D1C2] flex flex-col justify-center">
                <span className="text-[8px] font-black uppercase text-zinc-400">Nursery Value</span>
                <span className="text-lg font-black text-[#123524] mt-0.5">$2.42M</span>
                <span className="text-[8px] font-bold text-zinc-500 mt-0.5 leading-tight">Standing tree inventory estimation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Certified Corporate Sign-Off */}
        <div className="mt-8 pt-6 border-t border-[#D9D1C2]">
          <div className="flex justify-between items-end">
            <div className="text-[9px] text-zinc-400 max-w-sm font-medium">
              This intelligence digest contains verified agricultural and mechanical telemetry for JDT Nurseries operations. Standard error margin &plusmn;0.15%. Authorized redistribution only.
            </div>
            <div className="flex gap-4 text-xs font-black text-zinc-700">
              <div className="text-center">
                <div className="w-40 border-b border-zinc-400 pb-1 h-6"></div>
                <p className="text-[9px] font-bold text-zinc-500 mt-1 uppercase">Operations Manager Signature</p>
              </div>
              <div className="text-center">
                <div className="w-24 border-b border-zinc-400 pb-1 h-6 text-center text-zinc-700 font-bold">2026-05-23</div>
                <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">Date Signed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
