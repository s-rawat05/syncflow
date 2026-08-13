import React from 'react';
import { runSimulation } from '../../engine/schedulerEngine';
import GanttVisualizer from '../GanttChart/GanttVisualizer';
import { Truck, ArrowRight, Zap } from 'lucide-react';

export default function ConvoyDemo() {
  const convoyWorkload = [
    { id: '1', pid: 'P1 (Giant CPU Job)', arrivalTime: 0, burstTime: 24, priority: 1 },
    { id: '2', pid: 'P2 (Interactive)', arrivalTime: 0, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3 (Interactive)', arrivalTime: 0, burstTime: 3, priority: 1 },
  ];

  const fcfsSim = runSimulation('FCFS', convoyWorkload);
  const sjfSim = runSimulation('SJF', convoyWorkload);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-mono bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 mb-1">
          <Truck className="w-3.5 h-3.5" /> Performance Bottleneck Demo
        </div>
        <h3 className="font-sora font-extrabold text-2xl text-white">
          The Convoy Effect (FCFS vs SJF)
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          The <strong>Convoy Effect</strong> happens in FCFS when one giant CPU-bound process arrives first. All subsequent short, interactive processes get stuck behind it, causing average waiting time to skyrocket. See how Shortest Job First (SJF) resolves it.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FCFS Convoy Effect */}
        <div className="glass-card p-4 rounded-xl border border-rose-500/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-sora font-bold text-sm text-rose-300">
              1. FCFS — Severe Convoy Effect
            </h4>
            <span className="font-mono text-xs text-rose-400 font-bold">
              Avg Wait: {fcfsSim.summaryMetrics.avgWaitingTime}ms
            </span>
          </div>

          <GanttVisualizer
            timeline={fcfsSim.timeline}
            currentTime={fcfsSim.summaryMetrics.totalDuration}
            maxTime={fcfsSim.summaryMetrics.totalDuration}
            onSelectMoment={() => {}}
            selectedBlockIndex={null}
          />
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            P2 and P3 wait 24ms just for 3ms of CPU time!
          </p>
        </div>

        {/* SJF Reordered */}
        <div className="glass-card p-4 rounded-xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-sora font-bold text-sm text-emerald-300 flex items-center gap-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              2. SJF — Reordered Optimal Flow
            </h4>
            <span className="font-mono text-xs text-emerald-400 font-bold">
              Avg Wait: {sjfSim.summaryMetrics.avgWaitingTime}ms
            </span>
          </div>

          <GanttVisualizer
            timeline={sjfSim.timeline}
            currentTime={sjfSim.summaryMetrics.totalDuration}
            maxTime={sjfSim.summaryMetrics.totalDuration}
            onSelectMoment={() => {}}
            selectedBlockIndex={null}
          />
          <p className="text-[11px] text-emerald-400 mt-2 font-mono font-semibold">
            Average waiting time reduced by {Math.round(((fcfsSim.summaryMetrics.avgWaitingTime - sjfSim.summaryMetrics.avgWaitingTime) / fcfsSim.summaryMetrics.avgWaitingTime) * 100)}%!
          </p>
        </div>

      </div>
    </div>
  );
}
