import React from 'react';
import { Trophy, Zap, TrendingUp, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BestPerformerBadge({ results }) {
  if (!results || results.length === 0) return null;

  // Find algorithm with minimum average waiting time
  const sorted = [...results].sort((a, b) => a.summaryMetrics.avgWaitingTime - b.summaryMetrics.avgWaitingTime);
  const winner = sorted[0];
  const runnerUp = sorted[1];

  // Calculate percentage improvement over runner up or worst
  let improvementPct = 0;
  if (runnerUp && runnerUp.summaryMetrics.avgWaitingTime > 0) {
    const diff = runnerUp.summaryMetrics.avgWaitingTime - winner.summaryMetrics.avgWaitingTime;
    improvementPct = Math.round((diff / runnerUp.summaryMetrics.avgWaitingTime) * 100);
  }

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 shadow-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/30">
          <Trophy className="w-6 h-6 fill-slate-950" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Optimal Efficiency Winner
            </span>
            <span className="text-xs text-slate-400 font-mono">Race Mode Analysis</span>
          </div>

          <h3 className="font-sora font-extrabold text-2xl text-white">
            {winner.algorithmName}
          </h3>
        </div>
      </div>

      {/* Metric Winner Readout */}
      <div className="flex items-center gap-6 font-mono text-right">
        <div>
          <span className="text-[10px] uppercase text-slate-400 block">Avg Waiting Time</span>
          <span className="text-xl font-bold text-emerald-400">
            {winner.summaryMetrics.avgWaitingTime} ms
          </span>
        </div>

        {improvementPct > 0 && (
          <div className="pl-4 border-l border-white/10">
            <span className="text-[10px] uppercase text-slate-400 block">Wait Time Delta</span>
            <span className="text-base font-bold text-amber-300 flex items-center gap-1 justify-end">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              {improvementPct}% Faster
            </span>
          </div>
        )}

        <button
          onClick={triggerConfetti}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          Celebrate 🎉
        </button>
      </div>

    </div>
  );
}
