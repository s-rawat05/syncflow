import React from 'react';
import { BookOpen, HelpCircle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function TheoryGuide() {
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-sora font-extrabold text-2xl text-white">
              OS CPU Scheduling Theory & Viva Reference
            </h3>
            <p className="text-xs text-slate-400">Core formulas, algorithm classifications, and viva questions with answers</p>
          </div>
        </div>
      </div>

      {/* Core Formulas */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl">
        <h4 className="font-sora font-semibold text-base text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Fundamental Scheduling Formulas
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="glass-card p-3 rounded-xl border border-white/5">
            <span className="text-purple-300 font-bold block mb-1">Turnaround Time (TAT)</span>
            <code className="text-white bg-black/40 px-2 py-1 rounded block text-center border border-white/5">
              TAT = Completion Time - Arrival Time
            </code>
          </div>

          <div className="glass-card p-3 rounded-xl border border-white/5">
            <span className="text-emerald-300 font-bold block mb-1">Waiting Time (WT)</span>
            <code className="text-white bg-black/40 px-2 py-1 rounded block text-center border border-white/5">
              WT = Turnaround Time - Burst Time
            </code>
          </div>

          <div className="glass-card p-3 rounded-xl border border-white/5">
            <span className="text-pink-300 font-bold block mb-1">Response Time (RT)</span>
            <code className="text-white bg-black/40 px-2 py-1 rounded block text-center border border-white/5">
              RT = First Execution Time - Arrival Time
            </code>
          </div>

          <div className="glass-card p-3 rounded-xl border border-white/5">
            <span className="text-amber-300 font-bold block mb-1">CPU Utilization %</span>
            <code className="text-white bg-black/40 px-2 py-1 rounded block text-center border border-white/5">
              Util % = (Busy Time / Total Time) * 100
            </code>
          </div>
        </div>
      </div>

      {/* Viva Preparation Q&A Accordion */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
        <h4 className="font-sora font-semibold text-base text-white border-b border-white/10 pb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          Top Viva & Exam Interview Questions
        </h4>

        <div className="space-y-3 text-xs">
          
          <div className="glass-card p-4 rounded-xl border border-white/5">
            <h5 className="font-semibold text-purple-300 text-sm mb-1">
              Q1: What is the difference between Preemptive and Non-Preemptive scheduling?
            </h5>
            <p className="text-slate-300 leading-relaxed">
              <strong>Preemptive:</strong> CPU can be taken away from a running process before it finishes if a higher priority process arrives or quantum expires (e.g. SRTF, RR, Preemptive Priority).<br />
              <strong>Non-Preemptive:</strong> Once CPU is allocated to a process, it holds CPU until it voluntarily terminates or performs I/O (e.g. FCFS, SJF).
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-white/5">
            <h5 className="font-semibold text-purple-300 text-sm mb-1">
              Q2: What is Starvation and how does Aging solve it?
            </h5>
            <p className="text-slate-300 leading-relaxed">
              <strong>Starvation:</strong> A situation where low-priority processes wait indefinitely because high-priority processes continuously arrive.<br />
              <strong>Aging Solution:</strong> Gradually increases the priority of processes that wait in the ready queue for a long time, guaranteeing they eventually execute.
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-white/5">
            <h5 className="font-semibold text-purple-300 text-sm mb-1">
              Q3: What is the Convoy Effect in FCFS?
            </h5>
            <p className="text-slate-300 leading-relaxed">
              When one CPU-bound process with a huge burst time arrives first, all subsequent short I/O-bound or interactive processes get stuck waiting behind it, leading to poor CPU and device utilization.
            </p>
          </div>

          <div className="glass-card p-4 rounded-xl border border-white/5">
            <h5 className="font-semibold text-purple-300 text-sm mb-1">
              Q4: Why is Shortest Remaining Time First (SRTF) theoretically optimal for minimum average waiting time?
            </h5>
            <p className="text-slate-300 leading-relaxed">
              SRTF always schedules the process with the shortest remaining burst time, moving completed processes out of the queue as quickly as possible, thereby minimizing total wait time across all processes.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
