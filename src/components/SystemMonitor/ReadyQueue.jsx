import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { PROCESS_COLORS } from '../../engine/schedulerEngine';

export default function ReadyQueue({ currentBlock, processes, currentTime }) {
  const readyPids = currentBlock?.readyQueueAtStart || [];
  
  // Filter out currently running process from queue display if present
  const waitingPids = readyPids.filter(pid => pid !== currentBlock?.pid);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl mb-4">
      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-sora font-semibold text-xs text-white">
            Live Ready Queue
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
          {waitingPids.length} Waiting
        </span>
      </div>

      {/* Horizontal Avatar Queue */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 min-h-[48px]">
        {waitingPids.length === 0 ? (
          <span className="text-xs text-slate-500 font-mono italic">
            Queue is empty at t={currentTime}ms
          </span>
        ) : (
          waitingPids.map((pid, idx) => {
            const proc = processes.find(p => p.pid === pid);
            const color = proc?.color || '#8B5CF6';
            return (
              <React.Fragment key={pid}>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-[#151525] shadow-md hover:scale-105 transition-all"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono font-bold text-xs text-white">{pid}</span>
                  {proc && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      (p={proc.priority})
                    </span>
                  )}
                </div>

                {idx < waitingPids.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
