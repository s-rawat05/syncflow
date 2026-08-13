import React, { useState } from 'react';
import { ArrowUpDown, Award, CheckCircle2 } from 'lucide-react';

export default function ProcessMetricsTable({ processMetrics }) {
  const [sortField, setSortField] = useState('pid');
  const [sortAsc, setSortAsc] = useState(true);

  if (!processMetrics || processMetrics.length === 0) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedList = [...processMetrics].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  // Calculate min and max waiting time to highlight best/worst
  const minWT = Math.min(...processMetrics.map(p => p.waitingTime));
  const maxWT = Math.max(...processMetrics.map(p => p.waitingTime));

  return (
    <div className="glass-panel rounded-2xl p-5 mb-6 border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div>
          <h3 className="font-sora font-semibold text-sm text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            Detailed Process Performance Summary
          </h3>
          <p className="text-xs text-slate-400">Sortable metrics per process instance</p>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Total Processes: <strong className="text-white">{processMetrics.length}</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono">
              <th onClick={() => handleSort('pid')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Process <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('arrivalTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Arrival Time <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('burstTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Burst Time <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('completionTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Completion (CT) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('turnaroundTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Turnaround (TAT) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('waitingTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Waiting (WT) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th onClick={() => handleSort('responseTime')} className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">Response (RT) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {sortedList.map((proc) => {
              const isBestWT = proc.waitingTime === minWT && minWT !== maxWT;
              return (
                <tr key={proc.pid} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-bold">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: proc.color }} />
                      <span className="text-white">{proc.pid}</span>
                      {isBestWT && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5" /> Best Wait
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{proc.arrivalTime} ms</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{proc.burstTime} ms</td>
                  <td className="py-2.5 px-3 text-slate-200">{proc.completionTime} ms</td>
                  <td className="py-2.5 px-3 text-violet-300">{proc.turnaroundTime} ms</td>
                  <td className={`py-2.5 px-3 font-semibold ${isBestWT ? 'text-emerald-400' : 'text-purple-300'}`}>
                    {proc.waitingTime} ms
                  </td>
                  <td className="py-2.5 px-3 text-pink-300">{proc.responseTime} ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
