import React, { useState, useEffect, useMemo } from 'react';
import { runSimulation } from '../../engine/schedulerEngine';
import { ALGORITHM_OPTIONS } from '../ControlsPanel';
import BestPerformerBadge from './BestPerformerBadge';
import PerformanceChart from './PerformanceChart';
import PlaybackBar from '../GanttChart/PlaybackBar';
import { Trophy, Check, Play, Pause, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/apiClient';

export default function ComparisonView({
  processes,
  timeQuantum,
  csOverhead,
  agingEnabled,
  agingInterval,
  currentUser,
  onOpenAuth,
  activeScenarioId,
  onEnsureScenario
}) {
  const [selectedAlgos, setSelectedAlgos] = useState(['FCFS', 'SJF', 'SRTF', 'RR']);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSavingRace, setIsSavingRace] = useState(false);
  const [raceSaveMessage, setRaceSaveMessage] = useState(null);
  const [raceSaveError, setRaceSaveError] = useState(null);

  const toggleAlgo = (id) => {
    if (selectedAlgos.includes(id)) {
      if (selectedAlgos.length <= 2) return; // Keep at least 2 for comparison
      setSelectedAlgos(selectedAlgos.filter(a => a !== id));
    } else {
      if (selectedAlgos.length >= 6) return; // Limit to 6 max
      setSelectedAlgos([...selectedAlgos, id]);
    }
  };

  // Run simulation for all selected algorithms with memoization
  const results = useMemo(() => {
    return selectedAlgos.map(algoId => {
      const algoObj = ALGORITHM_OPTIONS.find(a => a.id === algoId);
      const sim = runSimulation(algoId, processes, {
        timeQuantum,
        csOverhead,
        agingEnabled,
        agingInterval
      });
      return {
        algorithmId: algoId,
        algorithmName: algoObj?.label || algoId,
        ...sim
      };
    });
  }, [selectedAlgos, processes, timeQuantum, csOverhead, agingEnabled, agingInterval]);

  // Calculate max timeline duration across all compared algorithms safely
  const maxDuration = useMemo(() => {
    const rawMax = Math.max(...results.map(r => r.summaryMetrics?.totalDuration || 1), 1);
    return isNaN(rawMax) || rawMax <= 0 ? 1 : rawMax;
  }, [results]);

  // Clamp currentTime if maxDuration changes
  useEffect(() => {
    if (currentTime > maxDuration) {
      setCurrentTime(maxDuration);
    }
  }, [maxDuration, currentTime]);

  // Synchronized playback animation loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= maxDuration) {
            setIsPlaying(false);
            return maxDuration;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxDuration, playbackSpeed]);

  const handleSaveRace = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSavingRace(true);
    setRaceSaveMessage(null);
    setRaceSaveError(null);

    try {
      let scenarioId = activeScenarioId;
      if (!scenarioId) {
        scenarioId = await onEnsureScenario();
      }

      const raceGroup = `Race_${Date.now()}`;
      const runs = results.map(res => ({
        algorithmCode: res.algorithmId,
        quantum: (res.algorithmId === 'RR' || res.algorithmId === 'MLQ') ? timeQuantum : null,
        contextSwitchTime: csOverhead,
        agingInterval: agingEnabled ? agingInterval : null,
        slots: (res.timeline || []).map((block, idx) => ({
          seq: idx + 1,
          slotType: block.type === 'idle' ? 'IDLE' : block.type === 'cs' ? 'CS' : 'RUN',
          pid: (block.type === 'idle' || block.type === 'cs') ? null : block.pid,
          startTime: block.start,
          endTime: block.end
        })),
        metrics: (res.processMetrics || []).map(m => ({
          pid: m.pid,
          completionTime: m.completionTime,
          turnaroundTime: m.turnaroundTime,
          waitingTime: m.waitingTime,
          responseTime: m.responseTime
        }))
      }));

      const res = await api.saveRace({
        scenarioId,
        raceGroup,
        runs
      });

      setRaceSaveMessage(`Successfully saved ${res.savedRunsCount} race simulation runs to the database!`);
      setTimeout(() => setRaceSaveMessage(null), 5000);
    } catch (err) {
      setRaceSaveError(err.data?.error || err.message || 'Failed to save race runs');
      setTimeout(() => setRaceSaveError(null), 6000);
    } finally {
      setIsSavingRace(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Algorithm Multi-Select Chips Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-sora font-semibold text-base text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Race Mode — Multi-Algorithm Comparison
            </h3>
            <p className="text-xs text-slate-400">Select 2 to 6 algorithms to race on the current process workload</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveRace}
              disabled={isSavingRace}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-200 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 transition-all shadow-sm"
              title="Save all compared algorithms to the database in one transaction"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingRace ? 'Saving...' : 'Save Race'}</span>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition-all shadow-lg shadow-purple-500/25"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{isPlaying ? 'Pause Race' : 'Start Race'}</span>
            </button>
          </div>
        </div>

        {raceSaveMessage && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{raceSaveMessage}</span>
          </div>
        )}

        {raceSaveError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{raceSaveError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {ALGORITHM_OPTIONS.map((algo) => {
            const isChecked = selectedAlgos.includes(algo.id);
            return (
              <button
                key={algo.id}
                onClick={() => toggleAlgo(algo.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isChecked
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isChecked ? 'bg-purple-500 border-purple-400' : 'border-slate-600'}`}>
                  {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span>{algo.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Best Performer Trophy Banner */}
      <BestPerformerBadge results={results} />

      {/* Stacked Mini Gantt Charts */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
        <h4 className="font-sora font-semibold text-sm text-white border-b border-white/10 pb-2">
          Synchronized Timeline Comparison (t={currentTime}ms)
        </h4>

        {results.map((res) => {
          return (
            <div key={res.algorithmId} className="glass-card p-3.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-purple-300 font-mono">
                  {res.algorithmName}
                </span>

                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="text-slate-400">Avg Wait: <strong className="text-emerald-400">{res.summaryMetrics.avgWaitingTime}ms</strong></span>
                  <span className="text-slate-400">Avg TAT: <strong className="text-violet-300">{res.summaryMetrics.avgTurnaroundTime}ms</strong></span>
                </div>
              </div>

              {/* Mini Timeline Bar */}
              <div className="flex h-10 w-full rounded-lg overflow-hidden border border-white/10 bg-[#0E0E17] p-1 gap-1 relative">
                {res.timeline.map((block, bIdx) => {
                  const duration = Math.max(0, (block.end || 0) - (block.start || 0));
                  const widthPct = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
                  const isVisible = (block.start || 0) < currentTime;

                  if (block.type === 'idle') {
                    return (
                      <div
                        key={bIdx}
                        style={{ width: `${widthPct}%` }}
                        className={`h-full bg-idle-striped text-[9px] text-slate-500 font-mono flex items-center justify-center ${!isVisible ? 'opacity-20' : ''}`}
                      >
                        IDLE
                      </div>
                    );
                  }

                  if (block.type === 'cs') {
                    return (
                      <div
                        key={bIdx}
                        style={{ width: `${widthPct}%` }}
                        className={`h-full bg-cs-striped text-[8px] text-rose-300 font-mono flex items-center justify-center ${!isVisible ? 'opacity-20' : ''}`}
                      >
                        CS
                      </div>
                    );
                  }

                  return (
                    <div
                      key={bIdx}
                      style={{ width: `${widthPct}%`, backgroundColor: block.color || '#8B5CF6' }}
                      className={`h-full text-[10px] text-white font-mono font-bold flex items-center justify-center truncate px-0.5 shadow-sm transition-opacity duration-300 ${
                        !isVisible ? 'opacity-20' : 'opacity-100'
                      }`}
                    >
                      {block.pid}
                    </div>
                  );
                })}

                {/* Vertical Synchronized Time Marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-pink-400 z-10 transition-all duration-100"
                  style={{ left: `${maxDuration > 0 ? Math.min(100, Math.max(0, (currentTime / maxDuration) * 100)) : 0}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Global Synchronized Playback Controls */}
        <PlaybackBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          maxTime={maxDuration}
          onSeek={(t) => setCurrentTime(t)}
          onStepBack={() => setCurrentTime(Math.max(0, currentTime - 1))}
          onStepForward={() => setCurrentTime(Math.min(maxDuration, currentTime + 1))}
          onReset={() => setCurrentTime(0)}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={(s) => setPlaybackSpeed(s)}
        />
      </div>

      {/* Benchmark Bar Chart */}
      <PerformanceChart results={results} />

    </div>
  );
}

