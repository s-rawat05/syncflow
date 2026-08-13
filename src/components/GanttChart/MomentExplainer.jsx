import React from 'react';
import { X, Cpu, HelpCircle, CheckCircle2, Clock, Layers } from 'lucide-react';

export default function MomentExplainer({ blockIndex, timeline, onClose }) {
  if (blockIndex === null || !timeline || !timeline[blockIndex]) return null;

  const block = timeline[blockIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-purple-500/30 shadow-2xl relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sora font-bold text-lg text-white">Explain This Moment</h3>
            <p className="text-xs text-slate-400 font-mono">Timestamp t={block.start}ms ➔ t={block.end}ms</p>
          </div>
        </div>

        {/* Process Spotlight Banner */}
        <div
          className="p-4 rounded-xl border border-white/10 mb-4 flex items-center justify-between shadow-lg"
          style={{ backgroundColor: block.type === 'run' ? `${block.color}20` : 'rgba(255,255,255,0.05)' }}
        >
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Selected Entity</span>
            <span className="font-sora font-extrabold text-2xl" style={{ color: block.color || '#F8FAFC' }}>
              {block.pid}
            </span>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-400 block">Execution Window</span>
            <span className="text-sm font-bold text-slate-200">{block.end - block.start} ms</span>
          </div>
        </div>

        {/* Scheduling Rule Explanation */}
        <div className="glass-card p-4 rounded-xl border border-white/5 mb-4">
          <h4 className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Decision Logic & Algorithm Rule
          </h4>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {block.decisionReason}
          </p>
        </div>

        {/* System State Snapshot */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Ready Queue at Start:
            </span>
            <span className="font-mono text-purple-300 font-semibold">
              {block.readyQueueAtStart && block.readyQueueAtStart.length > 0
                ? block.readyQueueAtStart.join(', ')
                : 'None (CPU Idle)'}
            </span>
          </div>

          {block.remainingTimeMap && Object.keys(block.remainingTimeMap).length > 0 && (
            <div className="py-1.5">
              <span className="text-slate-400 block mb-1">Remaining Burst Times:</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(block.remainingTimeMap).map(([pid, rem]) => (
                  <span key={pid} className="px-2 py-0.5 rounded bg-white/5 font-mono text-[11px] text-slate-300 border border-white/5">
                    {pid}: {rem}ms
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Got it CTA */}
        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-500/20"
          >
            Close Explanation
          </button>
        </div>

      </div>
    </div>
  );
}
