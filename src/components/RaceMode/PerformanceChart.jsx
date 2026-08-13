import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function PerformanceChart({ results }) {
  if (!results || results.length === 0) return null;

  const data = results.map(r => ({
    name: r.algorithmName,
    avgWait: r.summaryMetrics.avgWaitingTime,
    avgTurnaround: r.summaryMetrics.avgTurnaroundTime,
    avgResponse: r.summaryMetrics.avgResponseTime,
    cpuUtil: r.summaryMetrics.cpuUtilization
  }));

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-sora font-semibold text-sm text-white">Algorithm Benchmark Comparison</h3>
          <p className="text-xs text-slate-400">Lower bar height indicates better performance for Wait & Turnaround times</p>
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#13131F',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#F8FAFC',
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
            <Bar dataKey="avgWait" name="Avg Waiting Time (ms)" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avgTurnaround" name="Avg Turnaround Time (ms)" fill="#C084FC" radius={[6, 6, 0, 0]} />
            <Bar dataKey="avgResponse" name="Avg Response Time (ms)" fill="#F472B6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
