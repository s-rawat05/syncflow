import React from 'react';
import { Sliders, Clock, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';

export const ALGORITHM_OPTIONS = [
  { id: 'FCFS', label: 'FCFS', fullName: 'First-Come, First-Served', type: 'Non-Preemptive' },
  { id: 'SJF', label: 'SJF', fullName: 'Shortest Job First', type: 'Non-Preemptive' },
  { id: 'SRTF', label: 'SRTF', fullName: 'Shortest Remaining Time First', type: 'Preemptive SJF' },
  { id: 'PRIORITY_NP', label: 'Priority (NP)', fullName: 'Priority Scheduling', type: 'Non-Preemptive' },
  { id: 'PRIORITY_P', label: 'Priority (P)', fullName: 'Priority Scheduling', type: 'Preemptive' },
  { id: 'RR', label: 'Round Robin', fullName: 'Round Robin Scheduling', type: 'Preemptive' },
  { id: 'MLQ', label: 'MLQ', fullName: 'Multilevel Queue', type: 'Static Queue' },
  { id: 'MLFQ', label: 'MLFQ', fullName: 'Multilevel Feedback Queue', type: 'Dynamic Feedback' },
];

export default function ControlsPanel({
  selectedAlgorithm,
  setSelectedAlgorithm,
  timeQuantum,
  setTimeQuantum,
  csOverhead,
  setCsOverhead,
  agingEnabled,
  setAgingEnabled,
  agingInterval,
  setAgingInterval
}) {
  const currentAlgoObj = ALGORITHM_OPTIONS.find(a => a.id === selectedAlgorithm) || ALGORITHM_OPTIONS[0];

  return (
    <div className="glass-panel rounded-2xl p-5 mb-6 border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sora font-semibold text-sm text-white">Algorithm & Parameters</h3>
            <p className="text-xs text-slate-400">Configure scheduling policy and execution overheads</p>
          </div>
        </div>

        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
          {currentAlgoObj.type}
        </span>
      </div>

      {/* Algorithm Pills Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
        {ALGORITHM_OPTIONS.map((algo) => {
          const isSelected = algo.id === selectedAlgorithm;
          return (
            <button
              key={algo.id}
              onClick={() => setSelectedAlgorithm(algo.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-gradient-to-b from-purple-600/30 to-purple-800/40 text-white border-purple-500 shadow-md shadow-purple-500/20 scale-[1.02]'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
              }`}
              title={algo.fullName}
            >
              <span className="font-bold text-slate-100 mb-0.5">{algo.label}</span>
              <span className="text-[10px] text-slate-400 truncate max-w-full">{algo.type}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sliders Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-white/5">
        
        {/* Time Quantum Slider (Show for RR, MLQ, MLFQ) */}
        {(selectedAlgorithm === 'RR' || selectedAlgorithm === 'MLQ' || selectedAlgorithm === 'MLFQ') && (
          <div className="glass-card p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Time Quantum (q)
              </span>
              <span className="font-mono text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded">
                {timeQuantum} ms
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={timeQuantum}
              onChange={(e) => setTimeQuantum(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">CPU time slice allocated per process burst</p>
          </div>
        )}

        {/* Context Switch Overhead Slider */}
        <div className="glass-card p-3 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              Context Switch Cost
            </span>
            <span className="font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
              {csOverhead} ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={csOverhead}
            onChange={(e) => setCsOverhead(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Penalty cost added during CPU register swaps</p>
        </div>

        {/* Priority Aging Toggle & Interval Slider */}
        {(selectedAlgorithm.startsWith('PRIORITY')) && (
          <div className="glass-card p-3 rounded-xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-pink-400" />
                Enable Aging (Anti-Starvation)
              </span>
              <input
                type="checkbox"
                checked={agingEnabled}
                onChange={(e) => setAgingEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
              />
            </div>
            {agingEnabled && (
              <div className="mt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Aging Interval:</span>
                  <span className="font-mono text-pink-300 font-semibold">{agingInterval} wait units</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={agingInterval}
                  onChange={(e) => setAgingInterval(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Gradually boosts priority of long-waiting jobs</p>
          </div>
        )}

      </div>
    </div>
  );
}
