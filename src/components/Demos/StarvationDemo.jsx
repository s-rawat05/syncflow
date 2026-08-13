import React, { useState } from 'react';
import { ShieldAlert, Sparkles, AlertCircle, ArrowRight, Play } from 'lucide-react';
import { runSimulation } from '../../engine/schedulerEngine';
import GanttVisualizer from '../GanttChart/GanttVisualizer';

export default function StarvationDemo() {
  const [agingEnabled, setAgingEnabled] = useState(false);
  const [agingInterval, setAgingInterval] = useState(3);

  // Workload: High priority continuous arrivals vs 1 low priority process P4
  const workload = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 1 },
    { id: '2', pid: 'P2', arrivalTime: 2, burstTime: 4, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 4, burstTime: 4, priority: 1 },
    { id: '4', pid: 'P4 (Starved)', arrivalTime: 0, burstTime: 6, priority: 10 }, // Low priority (10)
    { id: '5', pid: 'P5', arrivalTime: 6, burstTime: 4, priority: 1 },
  ];

  const sim = runSimulation('PRIORITY_P', workload, {
    agingEnabled,
    agingInterval
  });

  // Check completion time of P4
  const p4Metric = sim.processMetrics.find(p => p.pid.includes('P4'));

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 mb-1">
            <ShieldAlert className="w-3.5 h-3.5" /> OS Textbook Classic Demo
          </div>
          <h3 className="font-sora font-extrabold text-2xl text-white">
            Starvation & Aging Rescue Demo
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            In Priority Scheduling, low-priority processes (e.g. P4 with Priority 10) can wait indefinitely (starvation) if higher-priority jobs continuously arrive. Turning on <strong>Aging</strong> periodically boosts waiting process priorities to guarantee execution.
          </p>
        </div>

        {/* Interactive Aging Toggle */}
        <div className="flex items-center gap-3 bg-[#131322] p-3 rounded-xl border border-purple-500/30 shadow-lg">
          <div className="text-right">
            <span className="text-xs font-semibold text-white block">Aging (Anti-Starvation)</span>
            <span className="text-[10px] text-purple-300 font-mono">{agingEnabled ? 'ENABLED (Priority boosted every 3ms)' : 'DISABLED (Indefinite wait)'}</span>
          </div>

          <button
            onClick={() => setAgingEnabled(!agingEnabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer ${
              agingEnabled ? 'bg-emerald-500 justify-end' : 'bg-rose-500/50 justify-start'
            }`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
          </button>
        </div>
      </div>

      {/* Result Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
        agingEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
      }`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {agingEnabled
              ? `P4 RESCUED! Completed at t=${p4Metric?.completionTime}ms (Wait: ${p4Metric?.waitingTime}ms)`
              : `P4 STARVED! Delayed until t=${p4Metric?.completionTime}ms after all higher-priority jobs complete`}
          </span>
        </div>
      </div>

      {/* Animated Gantt Timeline */}
      <div className="glass-card p-4 rounded-xl border border-white/5">
        <h4 className="font-sora font-semibold text-sm text-white mb-2">
          Execution Timeline — {agingEnabled ? 'With Aging Enabled' : 'Without Aging (Starvation)'}
        </h4>
        <GanttVisualizer
          timeline={sim.timeline}
          currentTime={sim.summaryMetrics.totalDuration}
          maxTime={sim.summaryMetrics.totalDuration}
          onSelectMoment={() => {}}
          selectedBlockIndex={null}
        />
      </div>

    </div>
  );
}
