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

  const ganttRef = useRef(null);

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
      if (preset.algorithm) setSelectedAlgorithm(preset.algorithm);
      if (preset.timeQuantum) setTimeQuantum(preset.timeQuantum);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleRandomize = () => {
    const randomProcs = generateRandomWorkload(5);
    setProcesses(randomProcs);
    setCurrentTime(0);
    setIsPlaying(false);
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-sora font-semibold text-sm text-white">
                  Live Animated Gantt Timeline ({currentAlgoObj.fullName})
                </h3>
                <span className="text-xs text-purple-400 font-mono font-bold">
                  t={currentTime} / {maxTime} ms
                </span>
              </div>

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
          />
        )}

        {/* Tab 3: Interactive OS Demos */}
        {activeTab === 'demos' && (
          <div className="space-y-8">
            <StarvationDemo />
            <ConvoyDemo />
            <QuantumTuner />
          </div>
        )}

        {/* Tab 4: Docs & Theory */}
        {activeTab === 'docs' && (
          <TheoryGuide />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SyncFlow — CPU Scheduling Visualizer v2.5</span>
          <span>Crafted with React, Tailwind CSS & Framer animations</span>
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

    </div>
  );
}
