import React, { useState, useEffect } from 'react';
import { History, Trophy, Filter, Play, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, X, Clock, RefreshCw, Activity, ArrowRight, Award, Layers } from 'lucide-react';
import { api } from '../../services/apiClient';
import GanttVisualizer from '../GanttChart/GanttVisualizer';
import PlaybackBar from '../GanttChart/PlaybackBar';
import MetricsGrid from '../Dashboard/MetricsGrid';

export default function HistoryView({ currentUser, onOpenAuth }) {
  const [subTab, setSubTab] = useState('runs'); // 'runs' | 'leaderboard'
  const [runs, setRuns] = useState([]);
  const [scenarios, setMyScenarios] = useState([]);
  const [selectedScenarioFilter, setSelectedScenarioFilter] = useState('');
  const [selectedAlgoFilter, setSelectedAlgoFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Replay Modal State
  const [activeReplayRun, setActiveReplayRun] = useState(null);
  const [activeVerification, setActiveVerification] = useState(null);
  const [isReplayingLoading, setIsReplayingLoading] = useState(false);
  const [replayTime, setReplayTime] = useState(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  // Leaderboard State
  const [leaderboardScenarioId, setLeaderboardScenarioId] = useState('');
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // Load runs & scenarios
  const loadHistory = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [fetchedRuns, fetchedScenarios] = await Promise.all([
        api.getRuns(selectedScenarioFilter || null),
        api.getMyScenarios()
      ]);
      setRuns(fetchedRuns);
      setMyScenarios(fetchedScenarios);
      if (fetchedScenarios.length > 0 && !leaderboardScenarioId) {
        setLeaderboardScenarioId(String(fetchedScenarios[0].ScenarioID));
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentUser, selectedScenarioFilter]);

  // Load Leaderboard when scenario selected
  useEffect(() => {
    if (subTab === 'leaderboard' && leaderboardScenarioId) {
      setIsLeaderboardLoading(true);
      api.getLeaderboard(leaderboardScenarioId)
        .then(rows => setLeaderboardRows(rows))
        .catch(err => console.error('Failed to load leaderboard', err))
        .finally(() => setIsLeaderboardLoading(false));
    }
  }, [subTab, leaderboardScenarioId]);

  // Open Replay Modal
  const handleOpenReplay = async (runId) => {
    setIsReplayingLoading(true);
    try {
      const [fullRun, verification] = await Promise.all([
        api.getRun(runId),
        api.verifyRun(runId)
      ]);
      setActiveReplayRun(fullRun);
      setActiveVerification(verification);
      setReplayTime(0);
      setIsReplayPlaying(false);
    } catch (err) {
      console.error('Failed to load run details for replay', err);
    } finally {
      setIsReplayingLoading(false);
    }
  };

  // Replay animation loop
  useEffect(() => {
    let interval = null;
    const maxTime = activeReplayRun?.run?.Makespan || 0;
    if (isReplayPlaying) {
      interval = setInterval(() => {
        setReplayTime(prev => {
          if (prev >= maxTime) {
            setIsReplayPlaying(false);
            return maxTime;
          }
          return prev + 1;
        });
      }, 500 / replaySpeed);
    }
    return () => clearInterval(interval);
  }, [isReplayPlaying, activeReplayRun, replaySpeed]);

  if (!currentUser) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 shadow-2xl max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <History className="w-6 h-6" />
        </div>
        <h3 className="font-sora font-bold text-lg text-white mb-2">Sign in to Access Run History</h3>
        <p className="text-xs text-slate-400 mb-6">
          Logged-in users can save simulations to the relational database, replay past Gantt charts, check SQL verification badges, and view scenario leaderboards.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // Filtered runs
  const filteredRuns = runs.filter(r => {
    if (selectedAlgoFilter && r.AlgorithmCode !== selectedAlgoFilter) return false;
    return true;
  });

  // Convert raw DB slots into format for GanttVisualizer
  const replayedTimeline = (activeReplayRun?.slots || []).map(s => ({
    start: s.StartTime,
    end: s.EndTime,
    pid: s.PID || s.SlotType,
    type: s.SlotType.toLowerCase(),
    decisionReason: `Stored Gantt Slot #${s.Seq}: ${s.SlotType} ${s.PID || ''}`
  }));

  const replayedSummary = activeReplayRun?.run ? {
    avgWaitingTime: activeReplayRun.run.AvgWT,
    avgTurnaroundTime: activeReplayRun.run.AvgTAT,
    avgResponseTime: activeReplayRun.run.AvgRT,
    cpuUtilization: activeReplayRun.run.CpuUtilization,
    throughput: activeReplayRun.run.Throughput,
    totalDuration: activeReplayRun.run.Makespan,
    contextSwitches: activeReplayRun.run.ContextSwitches,
    idleTime: 0
  } : {};

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-sora font-semibold text-base text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Simulation History & Verification
          </h3>
          <p className="text-xs text-slate-400">Database-persisted Gantt charts, metrics, and SQL leaderboard</p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#13131F] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setSubTab('runs')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'runs'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Runs
          </button>
          <button
            onClick={() => setSubTab('leaderboard')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'leaderboard'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Tab: Runs */}
      {subTab === 'runs' && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
          
          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                Filter:
              </span>

              {/* Scenario Filter */}
              <select
                value={selectedScenarioFilter}
                onChange={(e) => setSelectedScenarioFilter(e.target.value)}
                className="glass-input text-xs px-2.5 py-1.5 rounded-xl text-slate-300"
              >
                <option value="">All Scenarios</option>
                {scenarios.map(s => (
                  <option key={s.ScenarioID} value={s.ScenarioID} className="bg-[#13131F] text-slate-200">
                    {s.Title}
                  </option>
                ))}
              </select>

              {/* Algorithm Filter */}
              <select
                value={selectedAlgoFilter}
                onChange={(e) => setSelectedAlgoFilter(e.target.value)}
                className="glass-input text-xs px-2.5 py-1.5 rounded-xl text-slate-300"
              >
                <option value="">All Algorithms</option>
                {['FCFS', 'SJF', 'SRTF', 'PRIORITY_NP', 'PRIORITY_P', 'RR', 'MLQ', 'MLFQ'].map(code => (
                  <option key={code} value={code} className="bg-[#13131F] text-slate-200">{code}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredRuns.length} runs
            </span>
          </div>

          {/* Runs Table */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading simulation history...</div>
          ) : filteredRuns.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No saved simulation runs found.</p>
              <p className="text-[11px] text-slate-500 mt-1">Run a simulation in the Simulator or Race Mode and click "Save run".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3 font-semibold">Run ID</th>
                    <th className="py-2.5 px-3 font-semibold">Scenario</th>
                    <th className="py-2.5 px-3 font-semibold">Algorithm</th>
                    <th className="py-2.5 px-3 font-semibold">Parameters</th>
                    <th className="py-2.5 px-3 font-semibold">Avg WT</th>
                    <th className="py-2.5 px-3 font-semibold">Avg TAT</th>
                    <th className="py-2.5 px-3 font-semibold">CPU Util</th>
                    <th className="py-2.5 px-3 font-semibold">Saved Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRuns.map((r) => (
                    <tr key={r.RunID} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-purple-300">#{r.RunID}</td>
                      <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate">{r.ScenarioTitle}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {r.AlgorithmCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {r.Quantum ? `q=${r.Quantum}` : ''}
                        {r.ContextSwitchTime > 0 ? ` cs=${r.ContextSwitchTime}` : ''}
                        {r.AgingInterval ? ` aging=${r.AgingInterval}` : ''}
                        {!r.Quantum && r.ContextSwitchTime === 0 && !r.AgingInterval ? 'Default' : ''}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-400">{r.AvgWT} ms</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{r.AvgTAT} ms</td>
                      <td className="py-3 px-3 font-mono text-pink-400">{r.CpuUtilization}%</td>
                      <td className="py-3 px-3 text-[11px] text-slate-400 font-mono">
                        {new Date(r.CreatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenReplay(r.RunID)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                        >
                          <Play className="w-3 h-3 fill-purple-300" />
                          <span>Replay</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* Tab: Leaderboard */}
      {subTab === 'leaderboard' && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h4 className="font-sora font-semibold text-sm text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Algorithm Efficiency Leaderboard
              </h4>
              <p className="text-xs text-slate-400">Computed live via SQL window function <code className="text-purple-300 font-mono">RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT)</code></p>
            </div>

            {/* Scenario Picker */}
            <select
              value={leaderboardScenarioId}
              onChange={(e) => setLeaderboardScenarioId(e.target.value)}
              className="glass-input text-xs px-3 py-1.5 rounded-xl text-slate-200 font-medium"
            >
              {scenarios.map(s => (
                <option key={s.ScenarioID} value={s.ScenarioID} className="bg-[#13131F] text-slate-200">
                  {s.Title}
                </option>
              ))}
            </select>
          </div>

          {isLeaderboardLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Computing leaderboard window partition...</div>
          ) : leaderboardRows.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No simulation runs recorded for this scenario yet. Run algorithms on this scenario to generate leaderboard standings!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3 font-semibold">Rank</th>
                    <th className="py-2.5 px-3 font-semibold">Algorithm</th>
                    <th className="py-2.5 px-3 font-semibold">Avg Waiting Time</th>
                    <th className="py-2.5 px-3 font-semibold">Avg Turnaround</th>
                    <th className="py-2.5 px-3 font-semibold">CPU Utilization</th>
                    <th className="py-2.5 px-3 font-semibold">Makespan</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Run ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardRows.map((row) => {
                    const isGold = row.AlgorithmRank === 1;
                    const isSilver = row.AlgorithmRank === 2;
                    const isBronze = row.AlgorithmRank === 3;
                    return (
                      <tr
                        key={row.RunID}
                        className={`transition-colors ${
                          isGold ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-bold font-mono">
                            {isGold && <span className="text-base" title="Optimal Efficiency">🥇</span>}
                            {isSilver && <span className="text-base">🥈</span>}
                            {isBronze && <span className="text-base">🥉</span>}
                            <span className={isGold ? 'text-amber-300 font-extrabold' : 'text-slate-300'}>
                              #{row.AlgorithmRank}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-white text-xs">{row.AlgorithmName}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-purple-300 border border-white/10">
                            {row.AlgorithmCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">{row.AvgWT} ms</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{row.AvgTAT} ms</td>
                        <td className="py-3 px-3 font-mono text-pink-400">{row.CpuUtilization}%</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{row.Makespan} ms</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenReplay(row.RunID)}
                            className="text-xs text-purple-400 hover:text-purple-300 font-mono hover:underline"
                          >
                            #{row.RunID}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* Replay Full Modal */}
      {activeReplayRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] rounded-2xl p-6 border border-white/10 shadow-2xl relative flex flex-col text-slate-100 overflow-y-auto">
            
            {/* Modal Close */}
            <button
              onClick={() => setActiveReplayRun(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Run Replay Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Run #{activeReplayRun.run.RunID}
                  </span>
                  <h3 className="font-sora font-bold text-lg text-white">
                    {activeReplayRun.run.AlgorithmName} Replay
                  </h3>
                  <span className="text-xs text-slate-400">({activeReplayRun.run.ScenarioTitle})</span>
                </div>
                <p className="text-xs text-slate-400">
                  Replaying {activeReplayRun.slots.length} Gantt slices and {activeReplayRun.metrics.length} process metrics directly from database
                </p>
              </div>

              {/* Integrity Badge */}
              <div className="flex items-center gap-2">
                {activeVerification?.isVerified ? (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-sm shadow-emerald-500/20 group relative cursor-help"
                    title="Verified: Stored metrics match Gantt slices with zero SQL mismatches"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>SQL verified ✓ 0 mismatches</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-semibold shadow-sm cursor-help"
                    title={`${activeVerification?.mismatchCount} discrepancy detected in vw_metrics_mismatch`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>SQL Mismatch ({activeVerification?.mismatchCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mismatch Alert Banner if any */}
            {activeVerification && !activeVerification.isVerified && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Integrity check detected discrepancies:</span>
                </div>
                {activeVerification.mismatches.map((m, idx) => (
                  <div key={idx} className="font-mono text-[11px] pl-5">
                    • [{m.ProblemType}] {m.PID}: {m.Details}
                  </div>
                ))}
              </div>
            )}

            {/* Replayed Gantt Chart */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-sora font-semibold text-sm text-white">
                  Database-Reconstructed Gantt Timeline
                </h4>
                <span className="text-xs text-purple-400 font-mono font-bold">
                  t={replayTime} / {activeReplayRun.run.Makespan} ms
                </span>
              </div>

              <GanttVisualizer
                timeline={replayedTimeline}
                currentTime={replayTime}
                maxTime={activeReplayRun.run.Makespan}
                selectedBlockIndex={null}
                onSelectMoment={() => {}}
              />

              <PlaybackBar
                isPlaying={isReplayPlaying}
                onTogglePlay={() => setIsReplayPlaying(!isReplayPlaying)}
                currentTime={replayTime}
                maxTime={activeReplayRun.run.Makespan}
                onSeek={(t) => setReplayTime(t)}
                onStepBack={() => setReplayTime(Math.max(0, replayTime - 1))}
                onStepForward={() => setReplayTime(Math.min(activeReplayRun.run.Makespan, replayTime + 1))}
                onReset={() => {
                  setReplayTime(0);
                  setIsReplayPlaying(false);
                }}
                playbackSpeed={replaySpeed}
                onChangeSpeed={(s) => setReplaySpeed(s)}
              />
            </div>

            {/* Replayed Metrics Grid */}
            <div className="mb-6">
              <MetricsGrid summaryMetrics={replayedSummary} />
            </div>

            {/* Replayed Process Metrics Table */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl">
              <h4 className="font-sora font-semibold text-sm text-white mb-3">
                Saved Process Metrics Table (from <code className="text-purple-300 font-mono">RunMetrics</code>)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10 uppercase tracking-wider font-mono">
                      <th className="py-2 px-3">Process</th>
                      <th className="py-2 px-3">Completion Time (CT)</th>
                      <th className="py-2 px-3">Turnaround Time (TAT)</th>
                      <th className="py-2 px-3">Waiting Time (WT)</th>
                      <th className="py-2 px-3">Response Time (RT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeReplayRun.metrics.map(m => (
                      <tr key={m.PID} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-mono font-bold text-white">{m.PID}</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{m.CompletionTime} ms</td>
                        <td className="py-2 px-3 font-mono text-slate-300">{m.TurnaroundTime} ms</td>
                        <td className="py-2 px-3 font-mono font-semibold text-emerald-400">{m.WaitingTime} ms</td>
                        <td className="py-2 px-3 font-mono text-purple-300">{m.ResponseTime} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
