import React from 'react';
import { Plus, Trash2, Dices, RotateCcw, Table, Layers } from 'lucide-react';
import { PROCESS_COLORS } from '../engine/schedulerEngine';

export default function ProcessTable({ processes, setProcesses, onRandomize, onReset, isAlgorithmMLQ }) {
  
  const handleAddProcess = () => {
    const nextNum = processes.length + 1;
    const newProc = {
      id: String(Date.now()),
      pid: `P${nextNum}`,
      arrivalTime: Math.min(10, Math.max(0, Math.floor(Math.random() * 5))),
      burstTime: Math.floor(Math.random() * 8) + 2,
      priority: Math.floor(Math.random() * 5) + 1,
      queueLevel: nextNum % 2 === 0 ? 1 : 0
    };
    setProcesses([...processes, newProc]);
  };

  const handleDeleteProcess = (id) => {
    if (processes.length <= 1) return;
    setProcesses(processes.filter(p => p.id !== id));
  };

  const handleUpdate = (id, field, value) => {
    const numVal = Math.max(0, parseInt(value) || 0);
    setProcesses(processes.map(p => {
      if (p.id === id) {
        return { ...p, [field]: field === 'pid' ? value : numVal };
      }
      return p;
    }));
  };

  return (
    <div className="glass-panel rounded-2xl p-5 mb-6 border border-white/10 shadow-xl">
      
      {/* Table Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sora font-semibold text-sm text-white">Process Workload Table</h3>
            <p className="text-xs text-slate-400">Define Arrival Time, Burst Time & Priority per process</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Generate Random Workload"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Randomize</span>
          </button>

          <button
            onClick={handleAddProcess}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 transition-all shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Process</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono">
              <th className="py-2.5 px-3 font-semibold">Process</th>
              <th className="py-2.5 px-3 font-semibold">Arrival Time (AT)</th>
              <th className="py-2.5 px-3 font-semibold">Burst Time (BT)</th>
              <th className="py-2.5 px-3 font-semibold">Priority</th>
              {isAlgorithmMLQ && <th className="py-2.5 px-3 font-semibold">Queue Level</th>}
              <th className="py-2.5 px-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {processes.map((proc, index) => {
              const color = PROCESS_COLORS[index % PROCESS_COLORS.length];
              return (
                <tr key={proc.id} className="hover:bg-white/[0.02] transition-colors group">
                  
                  {/* PID Badge */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <input
                        type="text"
                        value={proc.pid}
                        onChange={(e) => handleUpdate(proc.id, 'pid', e.target.value)}
                        className="w-16 glass-input text-xs font-mono font-bold px-2 py-1 rounded-lg"
                      />
                    </div>
                  </td>

                  {/* Arrival Time */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={proc.arrivalTime}
                      onChange={(e) => handleUpdate(proc.id, 'arrivalTime', e.target.value)}
                      className="w-20 glass-input text-xs font-mono px-2 py-1 rounded-lg"
                    />
                  </td>

                  {/* Burst Time */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={proc.burstTime}
                      onChange={(e) => handleUpdate(proc.id, 'burstTime', e.target.value)}
                      className="w-20 glass-input text-xs font-mono px-2 py-1 rounded-lg font-semibold text-emerald-400"
                    />
                  </td>

                  {/* Priority */}
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={proc.priority}
                      onChange={(e) => handleUpdate(proc.id, 'priority', e.target.value)}
                      className="w-20 glass-input text-xs font-mono px-2 py-1 rounded-lg text-purple-300"
                    />
                  </td>

                  {/* Queue Level */}
                  {isAlgorithmMLQ && (
                    <td className="py-2.5 px-3">
                      <select
                        value={proc.queueLevel}
                        onChange={(e) => handleUpdate(proc.id, 'queueLevel', e.target.value)}
                        className="glass-input text-xs font-mono px-2 py-1 rounded-lg text-slate-300 cursor-pointer"
                      >
                        <option value={0} className="bg-[#13131F]">Q0 (High Priority RR)</option>
                        <option value={1} className="bg-[#13131F]">Q1 (Low Priority FCFS)</option>
                      </select>
                    </td>
                  )}

                  {/* Delete Action */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDeleteProcess(proc.id)}
                      disabled={processes.length <= 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Delete process"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
