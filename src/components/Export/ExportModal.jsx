import React from 'react';
import { X, Download, FileCode, FileText, Image, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function ExportModal({ isOpen, onClose, processes, summaryMetrics, algorithmName, ganttRef }) {
  if (!isOpen) return null;

  const handleExportPNG = async () => {
    if (ganttRef && ganttRef.current) {
      try {
        const dataUrl = await toPng(ganttRef.current, { backgroundColor: '#0A0A0F' });
        const link = document.createElement('a');
        link.download = `SyncFlow_Gantt_${algorithmName}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('PNG export failed', err);
      }
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SyncFlow_Scenario_${algorithmName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SyncFlow — CPU Scheduling Simulation Report', 14, 22);

    doc.setFontSize(11);
    doc.text(`Algorithm: ${algorithmName}`, 14, 32);
    doc.text(`Total Duration: ${summaryMetrics?.totalDuration || 0} ms`, 14, 40);
    doc.text(`Avg Waiting Time: ${summaryMetrics?.avgWaitingTime || 0} ms`, 14, 48);
    doc.text(`Avg Turnaround Time: ${summaryMetrics?.avgTurnaroundTime || 0} ms`, 14, 56);
    doc.text(`CPU Utilization: ${summaryMetrics?.cpuUtilization || 0}%`, 14, 64);
    doc.text(`Throughput: ${summaryMetrics?.throughput || 0} procs/ms`, 14, 72);

    doc.save(`SyncFlow_Report_${algorithmName}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sora font-bold text-lg text-white">Export & Report Center</h3>
            <p className="text-xs text-slate-400">Save Gantt chart image, PDF summary, or JSON scenario</p>
          </div>
        </div>

        <div className="space-y-3">
          
          {/* PNG Export */}
          <button
            onClick={handleExportPNG}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 text-slate-200 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              <Image className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-semibold text-xs block">Export Gantt Timeline as PNG</span>
                <span className="text-[10px] text-slate-400">High-resolution image for presentation slides</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-purple-300" />
          </button>

          {/* PDF Report Export */}
          <button
            onClick={handleExportPDF}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-pink-600/20 border border-white/10 hover:border-pink-500/40 text-slate-200 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-semibold text-xs block">Download PDF Performance Report</span>
                <span className="text-[10px] text-slate-400">Formatted summary report with metrics table</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-pink-300" />
          </button>

          {/* JSON Scenario Export */}
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/40 text-slate-200 hover:text-white transition-all group"
          >
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="font-semibold text-xs block">Save Scenario as JSON</span>
                <span className="text-[10px] text-slate-400">Shareable workload file for future reload</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-300" />
          </button>

        </div>

      </div>
    </div>
  );
}
