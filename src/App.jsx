import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroHeader from './components/HeroHeader';
import ControlsPanel, { ALGORITHM_OPTIONS } from './components/ControlsPanel';
import ProcessTable from './components/ProcessTable';
import GanttVisualizer from './components/GanttChart/GanttVisualizer';
import PlaybackBar from './components/GanttChart/PlaybackBar';
import MomentExplainer from './components/GanttChart/MomentExplainer';
import MetricsGrid from './components/Dashboard/MetricsGrid';
import ProcessMetricsTable from './components/Dashboard/ProcessMetricsTable';
import CPUCoreCard from './components/SystemMonitor/CPUCoreCard';
import ReadyQueue from './components/SystemMonitor/ReadyQueue';
import EventLogFeed from './components/SystemMonitor/EventLogFeed';
import ComparisonView from './components/RaceMode/ComparisonView';
import StarvationDemo from './components/Demos/StarvationDemo';
import ConvoyDemo from './components/Demos/ConvoyDemo';
import QuantumTuner from './components/Demos/QuantumTuner';
import TheoryGuide from './components/Docs/TheoryGuide';
import ExportModal from './components/Export/ExportModal';

// Database & Auth Modals
import AuthModal from './components/Auth/AuthModal';
import ScenariosModal from './components/Scenarios/ScenariosModal';
import MyStatsModal from './components/Dashboard/MyStatsModal';
import HistoryView from './components/History/HistoryView';
import { api } from './services/apiClient';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';

import { runSimulation } from './engine/schedulerEngine';
import { PRESETS, generateRandomWorkload } from './data/presets';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [selectedPreset, setSelectedPreset] = useState('textbook');

  // Workload and Simulation Parameters State
  const [processes, setProcesses] = useState(PRESETS[0].processes);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('RR');
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [csOverhead, setCsOverhead] = useState(0);
  const [agingEnabled, setAgingEnabled] = useState(false);
  const [agingInterval, setAgingInterval] = useState(5);

  // Playback Control State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Inspection & Modals
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Auth, Scenarios, and Persistence State
  const [currentUser, setCurrentUser] = useState(null);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isScenariosModalOpen, setIsScenariosModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeScenarioTitle, setActiveScenarioTitle] = useState(null);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [saveRunSuccess, setSaveRunSuccess] = useState(null);
  const [saveRunError, setSaveRunError] = useState(null);

  const ganttRef = useRef(null);

  // Check server health & restore session on mount
  useEffect(() => {
    api.checkHealth().then(online => setIsServerOnline(online));
    const unsubscribe = api.onStatusChange(online => setIsServerOnline(online));

    api.getMe()
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null));

    return () => unsubscribe();
  }, []);

  // Run pure simulation logic whenever input workload or parameters change
  const simulationResult = runSimulation(selectedAlgorithm, processes, {
    timeQuantum,
    csOverhead,
    agingEnabled,
    agingInterval
  });

  const { timeline = [], processMetrics = [], summaryMetrics = {}, eventLog = [] } = simulationResult;
  const maxTime = summaryMetrics.totalDuration || 0;

  // Auto-play timeline animation loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxTime, playbackSpeed]);

  // Handle Preset Loader
  const handleLoadPreset = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setProcesses(preset.processes);
      setActiveScenarioId(null);
      setActiveScenarioTitle(null);
      if (preset.algorithm) setSelectedAlgorithm(preset.algorithm);
      if (preset.timeQuantum) setTimeQuantum(preset.timeQuantum);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleRandomize = () => {
    const randomProcs = generateRandomWorkload(5);
    setProcesses(randomProcs);
    setActiveScenarioId(null);
    setActiveScenarioTitle(null);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Helper to ensure a scenario exists in DB for foreign key relations
  const handleEnsureScenario = async () => {
    if (activeScenarioId) return activeScenarioId;

    const defaultTitle = selectedPreset
      ? `${selectedPreset.charAt(0).toUpperCase() + selectedPreset.slice(1)} Preset Workload`
      : `Custom Workload (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

    const created = await api.createScenario({
      title: defaultTitle,
      description: 'Auto-saved workload scenario from simulator',
      isPublic: 0,
      processes
    });

    setActiveScenarioId(created.ScenarioID);
    setActiveScenarioTitle(created.Title);
    return created.ScenarioID;
  };

  // Save single simulation run to database
  const handleSaveRun = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsSavingRun(true);
    setSaveRunSuccess(null);
    setSaveRunError(null);

    try {
      const scenarioId = await handleEnsureScenario();
      const slots = timeline.map((block, idx) => ({
        seq: idx + 1,
        slotType: block.type === 'idle' ? 'IDLE' : block.type === 'cs' ? 'CS' : 'RUN',
        pid: (block.type === 'idle' || block.type === 'cs') ? null : block.pid,
        startTime: block.start,
        endTime: block.end
      }));

      const metrics = processMetrics.map(m => ({
        pid: m.pid,
        completionTime: m.completionTime,
        turnaroundTime: m.turnaroundTime,
        waitingTime: m.waitingTime,
        responseTime: m.responseTime
      }));

      const res = await api.saveRun({
        scenarioId,
        algorithmCode: selectedAlgorithm,
        quantum: (selectedAlgorithm === 'RR' || selectedAlgorithm === 'MLQ') ? timeQuantum : null,
        contextSwitchTime: csOverhead,
        agingInterval: agingEnabled ? agingInterval : null,
        slots,
        metrics
      });

      setSaveRunSuccess(`Simulation run #${res.runId} successfully saved to database!`);
      setTimeout(() => setSaveRunSuccess(null), 5000);
    } catch (err) {
      setSaveRunError(err.data?.error || err.message || 'Failed to save simulation run');
      setTimeout(() => setSaveRunError(null), 6000);
    } finally {
      setIsSavingRun(false);
    }
  };

  const currentAlgoObj = ALGORITHM_OPTIONS.find(a => a.id === selectedAlgorithm) || ALGORITHM_OPTIONS[0];

  // Current block under execution at instant currentTime
  const currentBlockIndex = timeline.findIndex(b => currentTime >= b.start && currentTime < b.end);
  const currentBlock = currentBlockIndex !== -1 ? timeline[currentBlockIndex] : timeline[timeline.length - 1];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      
      {/* Top Sticky Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunSimulation={() => {
          setCurrentTime(0);
          setIsPlaying(true);
        }}
        onOpenExport={() => setIsExportModalOpen(true)}
        presets={PRESETS}
        selectedPreset={selectedPreset}
        onLoadPreset={handleLoadPreset}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          api.logout();
          setCurrentUser(null);
        }}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenScenarios={() => setIsScenariosModalOpen(true)}
        isServerOnline={isServerOnline}
        activeScenarioTitle={activeScenarioTitle}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Hero Section */}
        <HeroHeader
          summaryMetrics={summaryMetrics}
          processCount={processes.length}
          algorithmName={currentAlgoObj.label}
          onOpenPresets={() => handleLoadPreset('textbook')}
        />

        {/* Tab 1: Main Simulator View */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            
            {/* Control Panel: Algorithm Picker & Sliders */}
            <ControlsPanel
              selectedAlgorithm={selectedAlgorithm}
              setSelectedAlgorithm={setSelectedAlgorithm}
              timeQuantum={timeQuantum}
              setTimeQuantum={setTimeQuantum}
              csOverhead={csOverhead}
              setCsOverhead={setCsOverhead}
              agingEnabled={agingEnabled}
              setAgingEnabled={setAgingEnabled}
              agingInterval={agingInterval}
              setAgingInterval={setAgingInterval}
            />

            {/* Process Workload Input Table */}
            <ProcessTable
              processes={processes}
              setProcesses={setProcesses}
              onRandomize={handleRandomize}
              onReset={() => handleLoadPreset('textbook')}
              isAlgorithmMLQ={selectedAlgorithm === 'MLQ'}
            />

            {/* Central Animated Gantt Chart Glass Card */}
            <div ref={ganttRef} className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-sora font-semibold text-sm text-white">
                    Live Animated Gantt Timeline ({currentAlgoObj.fullName})
                  </h3>
                  
                  {/* Save Run Button */}
                  <button
                    onClick={handleSaveRun}
                    disabled={isSavingRun}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-purple-200 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 transition-all shadow-sm"
                    title="Persist simulation run, Gantt slots & metrics to relational database"
                  >
                    <Save className="w-3 h-3 text-purple-300" />
                    <span>{isSavingRun ? 'Saving...' : 'Save Run'}</span>
                  </button>
                </div>

                <span className="text-xs text-purple-400 font-mono font-bold">
                  t={currentTime} / {maxTime} ms
                </span>
              </div>

              {/* Save Run Feedback Alerts */}
              {saveRunSuccess && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveRunSuccess}</span>
                </div>
              )}
              {saveRunError && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveRunError}</span>
                </div>
              )}

              <GanttVisualizer
                timeline={timeline}
                currentTime={currentTime}
                maxTime={maxTime}
                onSelectMoment={(idx) => setSelectedBlockIndex(idx)}
                selectedBlockIndex={selectedBlockIndex}
              />

              <PlaybackBar
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                currentTime={currentTime}
                maxTime={maxTime}
                onSeek={(t) => setCurrentTime(t)}
                onStepBack={() => setCurrentTime(Math.max(0, currentTime - 1))}
                onStepForward={() => setCurrentTime(Math.min(maxTime, currentTime + 1))}
                onReset={() => {
                  setCurrentTime(0);
                  setIsPlaying(false);
                }}
                playbackSpeed={playbackSpeed}
                onChangeSpeed={(s) => setPlaybackSpeed(s)}
              />
            </div>

            {/* Live Metrics Grid & Circular CPU Gauge */}
            <MetricsGrid summaryMetrics={summaryMetrics} />

            {/* System Monitor Grid: CPU Core Spotlight + Ready Queue + Event Log Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <CPUCoreCard
                  currentBlock={currentBlock}
                  processes={processes}
                  currentTime={currentTime}
                />
              </div>

              <div className="lg:col-span-2 space-y-4">
                <ReadyQueue
                  currentBlock={currentBlock}
                  processes={processes}
                  currentTime={currentTime}
                />
                <EventLogFeed
                  eventLog={eventLog}
                  currentTime={currentTime}
                />
              </div>
            </div>

            {/* Per-process Summary Table */}
            <ProcessMetricsTable processMetrics={processMetrics} />

          </div>
        )}

        {/* Tab 2: Race Mode (Multi-Algorithm Comparison) */}
        {activeTab === 'race' && (
          <ComparisonView
            processes={processes}
            timeQuantum={timeQuantum}
            csOverhead={csOverhead}
            agingEnabled={agingEnabled}
            agingInterval={agingInterval}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            activeScenarioId={activeScenarioId}
            onEnsureScenario={handleEnsureScenario}
          />
        )}

        {/* Tab 3: History & Leaderboard (Saved Runs from DB) */}
        {activeTab === 'history' && (
          <HistoryView
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* Tab 4: Interactive OS Demos */}
        {activeTab === 'demos' && (
          <div className="space-y-8">
            <StarvationDemo />
            <ConvoyDemo />
            <QuantumTuner />
          </div>
        )}

        {/* Tab 5: Docs & Theory */}
        {activeTab === 'docs' && (
          <TheoryGuide />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SyncFlow — CPU Scheduling Visualizer v2.5 + SQLite DBMS</span>
          <span>Crafted with React, Tailwind CSS, Framer & SQLite relational storage</span>
        </div>
      </footer>

      {/* Inspect Moment Explanation Modal */}
      <MomentExplainer
        blockIndex={selectedBlockIndex}
        timeline={timeline}
        onClose={() => setSelectedBlockIndex(null)}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        processes={processes}
        summaryMetrics={summaryMetrics}
        algorithmName={currentAlgoObj.fullName}
        ganttRef={ganttRef}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />

      {/* Scenarios Management Modal */}
      <ScenariosModal
        isOpen={isScenariosModalOpen}
        onClose={() => setIsScenariosModalOpen(false)}
        currentProcesses={processes}
        onLoadScenario={(procs, id, title) => {
          setProcesses(procs);
          setActiveScenarioId(id);
          setActiveScenarioTitle(title);
          setCurrentTime(0);
          setIsPlaying(false);
        }}
        activeScenarioId={activeScenarioId}
        activeScenarioTitle={activeScenarioTitle}
        onScenarioSaved={(id, title) => {
          setActiveScenarioId(id);
          setActiveScenarioTitle(title);
        }}
      />

      {/* User Stats Modal */}
      <MyStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

    </div>
  );
}
