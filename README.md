# SyncFlow — CPU Scheduling Visualizer ⚡

> *"Watch your CPU think."*

SyncFlow is an interactive, dark glassmorphic web application that simulates, animates, and compares CPU scheduling algorithms in real-time. Built for Operating System students, developers, and educators.

---

## 🚀 Live Demo & Features

### Core Modules
- **Pure CPU Scheduling Engine**: FCFS, SJF, SRTF, Priority (Preemptive & Non-Preemptive with Aging), Round Robin (configurable quantum & context-switch penalty), Multilevel Queue (MLQ), and Multilevel Feedback Queue (MLFQ).
- **Animated Gantt Timeline Visualizer**: Live block-by-block progression, context-switch stripes, idle blocks, playback controls ($0.5\times \dots 4\times$), time scrubber, and *"Explain This Moment"* decision rule inspection.
- **Live Metrics Dashboard**: Real-time cards ($Avg WT, Avg TAT, Avg RT, \text{Throughput}$), glowing animated circular CPU utilization gauge, and sortable per-process metrics table.
- **Race Mode (Multi-Algorithm Comparison)**: Synchronized side-by-side timeline simulation for 2–6 algorithms with Recharts comparative bar charts and an automatic **Optimal Efficiency Winner** badge.
- **System Monitor Panel**: Sci-fi CPU Core Spotlight ("Currently Running"), live horizontal Ready Queue visualizer, and terminal-style Event Log.
- **Interactive OS Demos**: Starvation & Aging rescue showcase, Convoy Effect comparison (FCFS vs SJF), and Round Robin Quantum Sensitivity Tuner.
- **Export & Report Tools**: High-resolution PNG Gantt image export, PDF report generation, and JSON scenario import/export.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS, Custom Glassmorphism tokens, Google Fonts (Inter, Sora, JetBrains Mono)
- **Charts & UI**: Recharts, Lucide Icons, Canvas Confetti
- **Exports**: `html-to-image`, `jsPDF`

---

## 💻 Local Setup Instructions

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/syncflow.git
cd syncflow

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

---

## 🌐 Deploying to GitHub Pages

This project is pre-configured with `gh-pages` and relative asset paths (`base: './'`).

```bash
# Deploy to GitHub Pages automatically
npm run deploy
```

---

## 📄 License
MIT License © 2026 SyncFlow Team
