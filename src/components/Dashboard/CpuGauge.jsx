import React from 'react';

export default function CpuGauge({ percentage = 0 }) {
  const safePct = Math.min(100, Math.max(0, percentage));
  const radius = 60;
  const circumference = Math.PI * radius; // Semi-circle arc
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative p-2">
      <svg className="w-44 h-24 overflow-visible">
        {/* Background Arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Foreground Animated Gradient Arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="url(#cpuGaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />

        <defs>
          <linearGradient id="cpuGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Percentage Center Text */}
      <div className="absolute top-10 flex flex-col items-center">
        <span className="font-sora font-extrabold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-white drop-shadow">
          {safePct}%
        </span>
        <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold tracking-wider">
          CPU Load
        </span>
      </div>
    </div>
  );
}
