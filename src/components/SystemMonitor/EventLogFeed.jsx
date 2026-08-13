import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Search, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export default function EventLogFeed({ eventLog, currentTime }) {
  const [searchTerm, setSearchTerm] = useState('');
  const logContainerRef = useRef(null);

  // Filter logs up to current playback time
  const activeLogs = (eventLog || []).filter(log => log.time <= currentTime);

  const filteredLogs = activeLogs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(log.time).includes(searchTerm)
  );

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [currentTime, filteredLogs.length]);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-sora font-semibold text-xs text-white">
            System Event Log
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-32 glass-input text-[11px] font-mono pl-6 pr-2 py-0.5 rounded-lg"
          />
        </div>
      </div>

      {/* Terminal Log Output Window */}
      <div
        ref={logContainerRef}
        className="h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-1 bg-[#09090E] p-3 rounded-xl border border-white/5"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic text-center py-6">
            No system log events recorded at t={currentTime}ms
          </div>
        ) : (
          filteredLogs.map((log, i) => {
            let icon = <Info className="w-3 h-3 text-sky-400 shrink-0" />;
            let badgeClass = 'text-sky-300';

            if (log.type === 'warning') {
              icon = <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />;
              badgeClass = 'text-amber-300 font-semibold';
            } else if (log.type === 'success') {
              icon = <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />;
              badgeClass = 'text-emerald-300';
            }

            return (
              <div key={i} className="flex items-start gap-2 text-slate-300 hover:bg-white/[0.03] p-1 rounded transition-colors">
                <span className="text-purple-400 font-bold shrink-0">t={log.time}:</span>
                {icon}
                <span className={badgeClass}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
