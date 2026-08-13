import React from 'react';
import { HelpCircle, Sparkles, Activity } from 'lucide-react';
import { PROCESS_COLORS } from '../../engine/schedulerEngine';

export default function GanttVisualizer({
  timeline,
  currentTime,
  maxTime,
  onSelectMoment,
  selectedBlockIndex
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-xs">
        <Activity className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
        <span>No execution timeline generated yet. Click "Simulate" to run.</span>
      </div>
    );
  }

  // Calculate visible blocks up to currentTime
  const visibleTimeline = timeline.filter(block => block.start < currentTime);

  return (
    <div className="w-full">
      {/* Timeline Visual Container */}
      <div className="relative overflow-x-auto pb-4 pt-2">
        <div className="min-w-[600px] relative">
          
          {/* Top Time Scale Ruler */}
          <div className="flex justify-between items-center mb-2 px-1 text-[11px] font-mono text-slate-400 border-b border-white/10 pb-1">
            <span>t=0</span>
            <span className="text-purple-400 font-semibold">Live CPU Timeline</span>
            <span>t={maxTime} ms</span>
          </div>

          {/* Gantt Blocks Bar */}
          <div className="flex h-16 w-full rounded-xl overflow-hidden border border-white/10 bg-[#0E0E17] p-1 gap-1 shadow-inner relative">
            {timeline.map((block, idx) => {
              const widthPct = maxTime > 0 ? ((block.end - block.start) / maxTime) * 100 : 0;
              const isVisible = block.start < currentTime;
              const isCurrent = currentTime >= block.start && currentTime < block.end;
              const isSelected = selectedBlockIndex === idx;

              if (block.type === 'idle') {
                return (
                  <div
                    key={idx}
                    onClick={() => isVisible && onSelectMoment(idx)}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-lg bg-idle-striped border border-slate-700/50 flex flex-col items-center justify-center text-slate-400 text-[11px] font-mono cursor-pointer transition-all duration-300 relative group ${
                      !isVisible ? 'opacity-20 scale-95' : 'hover:scale-[1.02] hover:border-slate-500'
                    } ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
                  >
                    <span className="truncate max-w-full px-1 text-[10px]">IDLE</span>
                    <span className="text-[9px] opacity-75">{block.start}-{block.end}</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#13131F] text-slate-200 p-2 rounded-lg border border-white/10 text-xs shadow-2xl z-30 pointer-events-none w-48">
                      <span className="font-bold text-slate-300">CPU Idle Block</span>
                      <span className="text-[10px] text-slate-400">t={block.start} to t={block.end} ({block.end - block.start}ms)</span>
                      <span className="text-[10px] text-purple-300 mt-1">Click to inspect moment</span>
                    </div>
                  </div>
                );
              }

              if (block.type === 'cs') {
                return (
                  <div
                    key={idx}
                    onClick={() => isVisible && onSelectMoment(idx)}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-lg bg-cs-striped border border-rose-500/40 flex flex-col items-center justify-center text-rose-300 text-[10px] font-mono cursor-pointer transition-all duration-300 relative group ${
                      !isVisible ? 'opacity-20 scale-95' : 'hover:scale-[1.02] hover:border-rose-400'
                    } ${isSelected ? 'ring-2 ring-rose-400' : ''}`}
                  >
                    <span className="font-bold tracking-widest text-[9px]">CS</span>
                    <span className="text-[8px] opacity-80">{block.start}-{block.end}</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#13131F] text-slate-200 p-2 rounded-lg border border-rose-500/30 text-xs shadow-2xl z-30 pointer-events-none w-52">
                      <span className="font-bold text-rose-300">Context Switch Overhead</span>
                      <span className="text-[10px] text-slate-400">Duration: {block.end - block.start}ms</span>
                      <span className="text-[10px] text-slate-300 mt-1">{block.decisionReason}</span>
                    </div>
                  </div>
                );
              }

              // Process execution block
              return (
                <div
                  key={idx}
                  onClick={() => isVisible && onSelectMoment(idx)}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: block.color || '#8B5CF6'
                  }}
                  className={`h-full rounded-lg flex flex-col items-center justify-center text-white text-xs font-mono font-bold shadow-md cursor-pointer transition-all duration-300 relative group ${
                    !isVisible ? 'opacity-15 scale-95' : 'hover:scale-[1.03] hover:brightness-110'
                  } ${isCurrent ? 'ring-2 ring-white animate-pulse shadow-glow-purple' : ''} ${
                    isSelected ? 'ring-2 ring-purple-300 scale-[1.02]' : ''
                  }`}
                >
                  <span className="truncate max-w-full px-1 drop-shadow">{block.pid}</span>
                  <span className="text-[9px] font-normal opacity-90">{block.start}-{block.end}</span>

                  {/* Hover Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-[#13131F]/95 backdrop-blur-md text-slate-100 p-2.5 rounded-xl border border-white/10 text-xs shadow-2xl z-30 pointer-events-none w-56">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                      <span className="font-bold text-purple-300">{block.pid} Execution</span>
                      <span className="text-[10px] text-slate-400 font-mono">t={block.start}➔{block.end}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight mb-1">{block.decisionReason}</p>
                    <span className="text-[9px] text-purple-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Click block to inspect scheduling rule
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Playback Marker Line */}
          {maxTime > 0 && (
            <div
              className="absolute top-7 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 to-pink-500 shadow-glow-purple z-20 transition-all duration-100"
              style={{ left: `${(currentTime / maxTime) * 100}%` }}
            >
              <div className="w-2.5 h-2.5 bg-pink-400 rounded-full -translate-x-[4px] -translate-y-1.5 shadow-md border border-white" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
