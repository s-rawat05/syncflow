import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react';

export default function PlaybackBar({
  isPlaying,
  onTogglePlay,
  currentTime,
  maxTime,
  onSeek,
  onStepBack,
  onStepForward,
  onReset,
  playbackSpeed,
  onChangeSpeed
}) {
  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#13131F]/90 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-xl mt-3">
      
      {/* Primary Playback Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          title="Reset to t=0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onStepBack}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Step Backward (1ms)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`flex items-center justify-center w-10 h-10 rounded-xl text-white font-bold transition-all shadow-lg ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
              : 'bg-gradient-to-r from-purple-600 via-violet-600 to-pink-500 hover:opacity-95 shadow-purple-500/25 scale-105'
          }`}
          title={isPlaying ? 'Pause' : 'Play Simulation'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
        </button>

        <button
          onClick={onStepForward}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          title="Step Forward (1ms)"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Scrubber Slider */}
      <div className="flex-1 w-full max-w-md flex items-center gap-3">
        <span className="font-mono text-xs text-purple-400 font-bold min-w-[36px]">
          {currentTime}ms
        </span>

        <input
          type="range"
          min="0"
          max={maxTime || 1}
          value={currentTime}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />

        <span className="font-mono text-xs text-slate-400 min-w-[36px]">
          {maxTime}ms
        </span>
      </div>

      {/* Playback Speed Selector Pills */}
      <div className="flex items-center gap-1 bg-[#0A0A0F] p-1 rounded-xl border border-white/5">
        {speeds.map(spd => (
          <button
            key={spd}
            onClick={() => onChangeSpeed(spd)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              playbackSpeed === spd
                ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>

    </div>
  );
}
