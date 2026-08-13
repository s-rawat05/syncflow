import React from 'react';
import { Cpu, Zap, Activity, Clock, Layers } from 'lucide-react';

export default function HeroHeader({ summaryMetrics, processCount, algorithmName, onOpenPresets }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#151522] to-[#0E0E17] border border-white/10 p-6 md:p-8 mb-6">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left Headline & Subtext */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-3">
            <Zap className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>Interactive OS CPU Scheduling Simulator</span>
          </div>

          <h1 className="font-sora font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight mb-3">
            Watch your CPU{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-300 to-pink-400 drop-shadow-sm">
              think
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-4">
            Simulate and animate CPU scheduling algorithms — FCFS, SJF, SRTF, Priority, Round Robin, MLQ, and MLFQ — with a live animated Gantt chart, system monitors, and multi-algorithm race mode.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Active Algo: <strong className="text-purple-300 font-semibold">{algorithmName}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Processes: <strong className="text-emerald-300 font-semibold">{processCount}</strong>
            </span>
            <button
              onClick={onOpenPresets}
              className="text-xs text-pink-400 hover:text-pink-300 underline underline-offset-4 font-medium transition-colors"
            >
              Explore Preset Scenarios ➔
            </button>
          </div>
        </div>

        {/* Right Summary Quick Stats Bar */}
        <div className="w-full lg:w-auto grid grid-cols-3 gap-3 bg-[#0A0A0F]/80 p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
          <div className="text-center px-3 py-1 border-r border-white/10">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
              Throughput
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
              {summaryMetrics?.throughput || 0}
            </span>
            <span className="text-[10px] text-slate-400 block">procs/sec</span>
          </div>

          <div className="text-center px-3 py-1 border-r border-white/10">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
              Avg Wait
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-purple-400">
              {summaryMetrics?.avgWaitingTime || 0}
            </span>
            <span className="text-[10px] text-slate-400 block">time units</span>
          </div>

          <div className="text-center px-3 py-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium block mb-1">
              CPU Util
            </span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-pink-400">
              {summaryMetrics?.cpuUtilization || 0}%
            </span>
            <span className="text-[10px] text-slate-400 block">active load</span>
          </div>
        </div>

      </div>
    </div>
  );
}
