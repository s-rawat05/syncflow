import React from 'react';
import { Clock, RefreshCw, Zap, Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import CpuGauge from './CpuGauge';

export default function MetricsGrid({ summaryMetrics }) {
  const {
    avgWaitingTime = 0,
    avgTurnaroundTime = 0,
    avgResponseTime = 0,
    cpuUtilization = 0,
    throughput = 0,
    contextSwitches = 0
  } = summaryMetrics || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      
      {/* Avg Waiting Time Card */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Avg Waiting Time</span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-extrabold text-2xl text-white">
            {avgWaitingTime}
          </span>
          <span className="text-xs text-slate-400 font-mono">ms</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3 text-emerald-400" /> Lower is better
        </p>
      </div>

      {/* Avg Turnaround Time Card */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-violet-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Avg Turnaround Time</span>
          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
            <RefreshCw className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-extrabold text-2xl text-violet-300">
            {avgTurnaroundTime}
          </span>
          <span className="text-xs text-slate-400 font-mono">ms</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Completion - Arrival Time</p>
      </div>

      {/* Avg Response Time Card */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-pink-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Avg Response Time</span>
          <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-extrabold text-2xl text-pink-300">
            {avgResponseTime}
          </span>
          <span className="text-xs text-slate-400 font-mono">ms</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">First run - Arrival Time</p>
      </div>

      {/* Throughput Card */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Throughput</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-extrabold text-2xl text-emerald-400">
            {throughput}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">procs/ms</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Higher is better
        </p>
      </div>

      {/* CPU Utilization Gauge Card */}
      <div className="glass-card p-3 rounded-2xl border border-white/10 flex items-center justify-center relative group hover:border-purple-500/30 transition-all col-span-1">
        <CpuGauge percentage={cpuUtilization} />
      </div>

    </div>
  );
}
