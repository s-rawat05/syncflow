import React, { useState } from 'react';
import { runSimulation } from '../../engine/schedulerEngine';
import GanttVisualizer from '../GanttChart/GanttVisualizer';
import { Sliders, Clock, RefreshCw } from 'lucide-react';

export default function QuantumTuner() {
  const [quantum, setQuantum] = useState(2);
  const [csCost, setCsCost] = useState(1);

  const workload = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 10, priority: 1 },
    { id: '2', pid: 'P2', arrivalTime: 0, burstTime: 12, priority: 2 },
    { id: '3', pid: 'P3', arrivalTime: 0, burstTime: 8, priority: 1 },
    { id: '4', pid: 'P4', arrivalTime: 0, burstTime: 6, priority: 3 },
  ];

  const sim = runSimulation('RR', workload, {
    timeQuantum: quantum,
    csOverhead: csCost
  });

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs text-pink-400 font-mono bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20 mb-1">
          <Sliders className="w-3.5 h-3.5" /> Interactive Sensitivity Analysis
        </div>
        <h3 className="font-sora font-extrabold text-2xl text-white">
          Round Robin Time Quantum Sensitivity Tuner
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Drag the quantum slider to observe the trade-off: extremely small quantums lead to excessive context switches, while very large quantums turn Round Robin back into FCFS!
        </p>
      </div>

      {/* Sliders Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="glass-card p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Time Quantum (q)
            </span>
            <span className="font-mono text-purple-300 font-bold text-sm bg-purple-500/20 px-2.5 py-0.5 rounded">
              q = {quantum} ms
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            value={quantum}
            onChange={(e) => setQuantum(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        <div className="glass-card p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              Context Switch Overhead
            </span>
            <span className="font-mono text-amber-300 font-bold text-sm bg-amber-500/20 px-2.5 py-0.5 rounded">
              cs = {csCost} ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            value={csCost}
            onChange={(e) => setCsCost(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3 text-center bg-[#0E0E17] p-3 rounded-xl border border-white/10 font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block">Context Switches</span>
          <span className="text-lg font-bold text-amber-400">{sim.summaryMetrics.contextSwitches}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Avg Waiting Time</span>
          <span className="text-lg font-bold text-purple-400">{sim.summaryMetrics.avgWaitingTime}ms</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Avg Turnaround Time</span>
          <span className="text-lg font-bold text-pink-400">{sim.summaryMetrics.avgTurnaroundTime}ms</span>
        </div>
      </div>

      {/* Gantt Timeline */}
      <div className="glass-card p-4 rounded-xl border border-white/5">
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
