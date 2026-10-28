import React, { useState, useEffect } from 'react';
import { X, Activity, Layers, Play, Cpu, Calendar, Sparkles } from 'lucide-react';
import { api } from '../../services/apiClient';

export default function MyStatsModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api.getMyStats()
        .then(data => setStats(data))
        .catch(err => console.error('Failed to load user stats', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl relative text-slate-100">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sora font-bold text-lg text-white">My Activity & Stats</h3>
            <p className="text-xs text-slate-400">Aggregated directly from SQLite via <code className="text-purple-300">vw_user_activity</code></p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading activity metrics...</div>
        ) : stats ? (
          <div className="space-y-4">
            
            {/* User Meta Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="font-sora font-semibold text-sm text-white">{stats.Name}</p>
                <p className="font-mono text-xs text-slate-400">{stats.Email}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                User #{stats.UserID}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              
              <div className="p-3.5 rounded-xl bg-[#13131F] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>My Scenarios</span>
                </div>
                <div className="font-sora font-extrabold text-2xl text-emerald-300">
                  {stats.ScenarioCount}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#13131F] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Play className="w-3.5 h-3.5 text-pink-400" />
                  <span>Simulation Runs</span>
                </div>
                <div className="font-sora font-extrabold text-2xl text-pink-300">
                  {stats.RunCount}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#13131F] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Favorite Algo</span>
                </div>
                <div className="font-mono font-bold text-lg text-purple-300">
                  {stats.MostUsedAlgorithm || 'None'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#13131F] border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Last Activity</span>
                </div>
                <div className="font-mono text-xs text-slate-300 truncate" title={stats.LastActivity}>
                  {stats.LastActivity ? new Date(stats.LastActivity).toLocaleDateString() : 'Never'}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">No user statistics available.</div>
        )}

      </div>
    </div>
  );
}
