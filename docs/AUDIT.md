# SyncFlow Engine & Architecture Audit

Single source of truth audit for SyncFlow CPU Scheduling Visualizer codebase before adding backend and relational database persistence.

---

## 1. Environment & Build Configuration

- **Node.js Version:** `v22.19.0`
- **Package Manager:** `npm` (using `package-lock.json` lockfileVersion 3)
- **Root Scripts (`package.json`):**
  - `npm run dev`: starts Vite development server (`vite`) on default port 5173.
  - `npm run build`: builds client production bundle into `dist/` (`vite build`).
  - `npm run preview`: local preview of built client assets (`vite preview`).
  - `npm run lint`: fast code linting via Oxlint (`oxlint`).
  - `npm run deploy`: builds and publishes `dist/` to GitHub Pages (`gh-pages -d dist`).
- **Current Deployment:** Static single-page application deployed to GitHub Pages with relative asset path (`base: './'` in `vite.config.js`).

---

## 2. Engine Location & Modularity

- **File Path:** [`src/engine/schedulerEngine.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/engine/schedulerEngine.js)
- **Purity & Isolation:** The engine module contains **zero external imports** (no React, no DOM, no third-party libraries).
- **Node.js Importability:** Fully pure JavaScript ES module (`package.json` defines `"type": "module"`). Node.js can import and execute the engine directly in tests and CLI scripts without transpilation, extraction, or virtual DOM mocks.
- **Exported Symbols:**
  - `PROCESS_COLORS`: Default color palette array for processes.
  - `getProcessColor(index)`: Utility returning a hex color string.
  - `calculateMetrics(processes, timeline, totalTime, contextSwitchCount)`: Core metric calculation engine.
  - Algorithm functions: `simulateFCFS`, `simulateSJF`, `simulateSRTF`, `simulatePriority`, `simulateRoundRobin`, `simulateMLQ`, `simulateMLFQ`.
  - Dispatcher: `runSimulation(algorithm, processes, options)`.

---

## 3. Process Input Shape & Priority Convention

Each process object in the workload array has the following structure:

```json
{
  "id": "1",
  "pid": "P1",
  "arrivalTime": 0,
  "burstTime": 5,
  "priority": 3,
  "queueLevel": 0,
  "color": "#38BDF8"
}
```

- **Field Details:**
  - `id`: Unique identifier (string).
  - `pid`: Process name/label (string, e.g. `'P1'`).
  - `arrivalTime`: Arrival timestamp in milliseconds (integer >= 0, default 0).
  - `burstTime`: Required CPU execution time (integer >= 1, default 1).
  - `priority`: Priority rank (integer >= 1, default 1).
  - `queueLevel`: Target queue for multi-level queues (integer 0 or 1, default 0 or inferred from priority).
  - `color`: Optional hex color code; auto-assigned if omitted.
- **Priority Urgency Convention:**
  - **Lower numerical value indicates HIGHER urgency** (e.g., Priority 1 is executed before Priority 3).
  - Proven by `simulatePriority` ready-queue comparator:
    `ready.sort((a, b) => a.effectivePriority - b.effectivePriority || a.arrivalTime - b.arrivalTime || a.pid.localeCompare(b.pid))`
  - In aging mode, waiting processes have their numerical priority decreased: `p.effectivePriority--` (boosting priority).

---

## 4. Algorithm Parameters & Queue Configurations

- **General Parameters:**
  - `timeQuantum`: integer > 0 (default: 2), applies to RR, MLQ (Queue 0), and MLFQ.
  - `csOverhead`: integer >= 0 (default: 0), context-switch duration penalty inserted whenever CPU changes running PID.
  - `agingEnabled`: boolean (default: false), enables periodic priority increments for starved processes.
  - `agingInterval`: integer >= 1 (default: 5), execution cycles/ticks of wait time before priority boost.
- **Multilevel Queue (MLQ) Configuration:**
  - **Queue 0 (High Priority):** Round Robin scheduling using `options.timeQuantum` (default 2).
  - **Queue 1 (Low Priority):** First-Come First-Served (FCFS) scheduling.
  - Static queue assignment based on `process.queueLevel`.
- **Multilevel Feedback Queue (MLFQ) Configuration:**
  - **Queue 0 (Interactive):** Round Robin with `q0Quantum = 2`.
  - **Queue 1 (Medium):** Round Robin with `q1Quantum = 4`.
  - **Queue 2 (Background Batch):** FCFS.
  - All processes enter at Queue 0 and demote to lower priority queues upon exhausting their time slice.

---

## 5. Output Shape & Metric Definitions

The engine outputs: `{ timeline, processMetrics, summaryMetrics, eventLog }`.

### Gantt Timeline Slots
Array of time slices:
- `start`: integer >= 0.
- `end`: integer > start.
- `pid`: `'P1'`, `'P2'`, etc. when `type === 'run'`; `'IDLE'` when CPU is idle; `'CS'` during context switch.
- `type`: `'run'` | `'idle'` | `'cs'`.
- `color`: hex color code (for run slots).
- `decisionReason`: explanation string for scheduling step.
- `remainingTimeMap`: snapshot of remaining bursts.
- `readyQueueAtStart`: array of PIDs queued when slot started.

### Metric Definitions (from `calculateMetrics`)
- **Completion Time ($CT$):** $\max(\text{end of all RUN slices for this PID})$. If process never ran, defaults to $AT$.
- **Turnaround Time ($TAT$):** $CT - AT$.
- **Waiting Time ($WT$):** $TAT - BT = CT - AT - BT$.
- **Response Time ($RT$):** $(\text{start of first RUN slice}) - AT$.
- **Makespan ($totalDuration$):** Timestamp of simulation completion.
- **CPU Utilization:** $\min\left(100, \frac{\sum \text{RUN slice durations}}{\text{totalDuration}} \times 100\right)$ (rounded to 1 decimal place).
- **Throughput:** $\frac{N}{\text{totalDuration}}$ (rounded to 3 decimal places).
- **Context Switches:** Total number of `'cs'` slots in timeline.

---

## 6. Race Mode Implementation

- **Location:** [`src/components/RaceMode/ComparisonView.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/RaceMode/ComparisonView.jsx)
- **Mechanism:** User selects 2 to 6 algorithms (`FCFS`, `SJF`, `SRTF`, `PRIORITY_NP`, `PRIORITY_P`, `RR`, `MLQ`, `MLFQ`).
- When inputs or parameters change, `useMemo` iterates through `selectedAlgos` and calls `runSimulation(algoId, processes, options)`.
- Renders synchronized multi-timeline tracks and a Recharts grouped bar chart comparing Average Waiting Time and Average Turnaround Time.
- Determines the winner via `BestPerformerBadge.jsx` using lowest Average Waiting Time.

---

## 7. JSON Import & Export Format

- **Export Location:** [`src/components/Export/ExportModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Export/ExportModal.jsx)
- **Format:** Pure JSON array of process objects:
  ```json
  [
    {
      "id": "1",
      "pid": "P1",
      "arrivalTime": 0,
      "burstTime": 5,
      "priority": 3,
      "queueLevel": 0
    }
  ]
  ```
- Triggered in `handleExportJSON` via client-side `Blob`/data URI download (`SyncFlow_Scenario_<Algorithm>.json`).

---

## 8. Built-in Preset Scenarios

Defined in [`src/data/presets.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/data/presets.js):

1. **`textbook` ("Textbook Classic"):** 5 processes (P1: AT 0, BT 8, Pri 3; P2: AT 1, BT 4, Pri 1; P3: AT 2, BT 9, Pri 4; P4: AT 3, BT 5, Pri 2; P5: AT 4, BT 2, Pri 5). Default algorithm: `RR`, $q=2$.
2. **`convoy` ("Convoy Effect Demo"):** 3 processes (P1: AT 0, BT 24; P2: AT 0, BT 3; P3: AT 0, BT 3). Shows FCFS convoy stalling short jobs.
3. **`starvation` ("Starvation & Aging Showcase"):** 4 processes (P1: AT 0, BT 6, Pri 1; P2: AT 2, BT 5, Pri 1; P3: AT 4, BT 5, Pri 1; P4: AT 0, BT 8, Pri 10). Demonstrates starvation of P4 under `PRIORITY_P` without aging.
4. **`quantum-demo` ("Quantum Sensitivity (RR)"):** 4 processes (AT 0, bursts 10, 12, 8, 6). Evaluates overhead vs response trade-offs with varying $q$.
5. **`mlfq-demo` ("MLFQ Dynamic Queue Flow"):** 3 processes (P1: AT 0, BT 14; P2: AT 1, BT 2; P3: AT 3, BT 10). Highlights interactive vs CPU-bound queue migration.

---

## 9. Existing Tests

- **Current State:** No automated test suite existed in the repository (`git ls-files "*test*"` returned empty).
- `package.json` had no `test` script.
- Phase 1 will implement a comprehensive test suite using Node's native test runner (`node:test`).
