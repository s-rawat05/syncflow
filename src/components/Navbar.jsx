import React from 'react';
import { Cpu, Play, BarChart3, BookOpen, Sparkles, Download, Layers, ShieldAlert } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onRunSimulation, onOpenExport, presets, selectedPreset, onLoadPreset }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('simulator')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-violet-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#0E0E17] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0A0A0F] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sora font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Sync<span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Flow</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Watch your CPU think.</p>
          </div>
        </div>

        {/* Navigation Pills */}
        <nav className="flex items-center bg-[#13131F] p-1 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('race')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'race'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Race Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('demos')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'demos'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OS Demos</span>
            <span className="sm:hidden">Demos</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Docs & Theory</span>
            <span className="md:hidden">Docs</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Preset Selector Dropdown */}
          <select
            value={selectedPreset}
            onChange={(e) => onLoadPreset(e.target.value)}
            className="glass-input text-xs rounded-xl px-2.5 py-1.5 text-slate-300 cursor-pointer hidden md:block max-w-[140px] truncate"
            title="Load Textbook Preset"
          >
            <option value="" disabled className="bg-[#13131F] text-slate-400">Load Preset...</option>
            {presets.map(p => (
              <option key={p.id} value={p.id} className="bg-[#13131F] text-slate-200">
                {p.name}
              </option>
            ))}
          </select>

          {/* Export Report CTA */}
          <button
            onClick={onOpenExport}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Run Simulation Primary CTA */}
          <button
            onClick={onRunSimulation}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-violet-600 to-pink-500 hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/25 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Simulate</span>
          </button>
        </div>

      </div>
    </header>
  );
}
