import React, { useState } from 'react';
import { BarChart3, FileDown, Loader2, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function ReportsBoard() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = () => {
    setExporting(true);
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('JDT Command Center Report', 20, 24);
    pdf.setFontSize(10);
    pdf.text('No live report data has been added yet.', 20, 36);
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

      <div className="bg-jdt-panel border border-jdt-border rounded-xl shadow-sm p-10 text-center">
        <BarChart3 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
        <p className="text-sm font-black text-jdt-text">No report data yet</p>
        <p className="text-xs font-bold text-zinc-500 mt-1 max-w-md mx-auto">
          Add jobs, freight loads, equipment records, tree relocation data, and alerts to build reports from your actual information.
        </p>
      </div>
    </div>
  );
}
