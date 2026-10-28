import React, { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, Activity, WifiOff, ChevronDown, Check } from 'lucide-react';

export default function UserMenu({ currentUser, onOpenAuth, onLogout, onOpenStats, isServerOnline }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      
      {/* Offline Status Badge */}
      {!isServerOnline && (
        <span
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
          title="Backend server unreachable. SyncFlow is operating in local guest mode."
        >
          <WifiOff className="w-3 h-3 text-amber-400" />
          <span>offline — guest mode</span>
        </span>
      )}

      {currentUser ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-all"
          >
            <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <span className="max-w-[100px] truncate">{currentUser.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-2xl glass-panel p-2 border border-white/10 shadow-2xl z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate">{currentUser.email}</p>
              </div>

              <button
                onClick={() => { setIsOpen(false); onOpenStats(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>My Activity & Stats</span>
              </button>

              <button
                onClick={() => { setIsOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-all text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-purple-600/20 hover:text-white border border-white/10 hover:border-purple-500/30 transition-all shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5 text-purple-400" />
          <span>Sign In</span>
        </button>
      )}

    </div>
  );
}
