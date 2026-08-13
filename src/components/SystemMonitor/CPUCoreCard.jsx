import React from 'react';
import { Cpu, Activity, Zap, Shield, Play } from 'lucide-react';

export default function CPUCoreCard({ currentBlock, processes, currentTime }) {
  const isRunning = currentBlock && currentBlock.type === 'run';
  const activeProc = isRunning ? processes.find(p => p.pid === currentBlock.pid) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#131322] via-[#1A1A30] to-[#25183E] border border-purple-500/30 p-5 shadow-2xl group">
      {/* Sci-fi glow corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

      {/* Top Card Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-sora font-semibold text-xs text-white uppercase tracking-wider">
            CPU Core 0 — Spotlight
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span className="text-[10px] font-mono uppercase text-slate-300 font-semibold">
            {isRunning ? 'EXECUTION' : currentBlock?.type === 'cs' ? 'SWAPPING' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Main Process Info */}
      {isRunning && activeProc ? (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Active PID</span>
              <span
                className="font-sora font-extrabold text-3xl tracking-tight drop-shadow"
                style={{ color: currentBlock.color || '#38BDF8' }}
              >
                {activeProc.pid}
              </span>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 uppercase block">Window</span>
              <span className="text-sm font-bold text-slate-200">
                t={currentBlock.start}➔{currentBlock.end}
              </span>
            </div>
          </div>

          {/* Burst progress info */}
          <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block">Original Burst:</span>
              <span className="text-emerald-400 font-bold">{activeProc.burstTime} ms</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Priority Rank:</span>
              <span className="text-purple-300 font-bold">{activeProc.priority}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-tight bg-purple-950/40 p-2 rounded-lg border border-purple-500/20">
            {currentBlock.decisionReason}
          </p>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-400 font-mono text-xs">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 text-slate-500">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <span>CPU is currently idle or context-switching</span>
        </div>
      )}

    </div>
  );
}
