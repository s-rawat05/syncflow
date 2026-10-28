# SyncFlow + Database — Build Progress Log

Project-Based Learning (PBL) Build Progress and Audit Trail.

---

## Phase 0 — Audit (No Functional Changes)

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Inspected repository configuration, Node.js runtime (`v22.19.0`), build tooling (Vite 8, React 19, Tailwind CSS), and GitHub Pages deployment setup.
2. Verified that the scheduling engine at `src/engine/schedulerEngine.js` is pure JavaScript with **zero imports**, requiring no extraction or browser shims to run in Node.js.
3. Audited process input shapes, priority semantics (lower numerical value = higher urgency), algorithm configurations (RR quantum, context switch cost, priority aging, MLQ static queues, MLFQ feedback queues).
4. Examined output structures: timeline slice representation (`RUN`, `IDLE`, `CS`), metric computation definitions ($CT, TAT, WT, RT, \text{throughput}, \text{utilization}$).
5. Documented Race Mode execution mechanism, JSON export/import data format, and all 5 preset scenarios.
6. Created branch `feature/database`.
7. Created `.env.example` and added `.env`, `.env*.local`, `*.sqlite`, `*.sqlite3`, and `*.db` to `.gitignore`.
8. Created `docs/AUDIT.md`.

### Files Changed / Created
- Created: [`docs/AUDIT.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/AUDIT.md)
- Created: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)
- Created: [`.env.example`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/.env.example)
- Modified: [`.gitignore`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/.gitignore)

### Check Results
- `node -v`: `v22.19.0`
- `npm run build`: Exit code 0 (verified production build succeeded cleanly)
- Working tree: clean on branch `feature/database`

### Open Issues / Notes
- None. Ready for Phase 1 (Engine baseline tests).

---

## Phase 1 — Engine Baseline Tests

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Implemented standard baseline test suite in [`test/engine.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/engine.test.js) using Node.js native test runner (`node:test`).
2. Configured and executed **Test A** $(P1,0,5), (P2,1,3), (P3,2,8), (P4,3,6)$ with context-switch time 0:
   - **FCFS:** Completion times $[5, 8, 16, 22]$, Waiting times $[0, 4, 6, 13]$, Avg WT $5.75$, Avg TAT $11.25$.
   - **SJF (non-preemptive):** Execution order $[P1, P2, P4, P3]$, Waiting times $[0, 4, 12, 5]$, Avg WT $5.25$.
   - **SRTF:** Slices $P1[0,1], P2[1,4], P1[4,8], P4[8,14], P3[14,22]$, Waiting times $[3, 0, 12, 5]$, Avg WT $5.00$, Response times $[0, 0, 12, 5]$.
3. Configured and executed **Test B** Priority $(P1,0,4,3), (P2,1,3,1), (P3,2,2,4), (P4,3,1,2)$ where lower number = more urgent, with context-switch time 0, no aging:
   - **Non-preemptive:** Execution order $[P1, P2, P4, P3]$, Waiting times $[0, 3, 6, 4]$, Avg WT $3.25$.
   - **Preemptive:** Merged slices $P1[0,1], P2[1,4], P4[4,5], P1[5,8], P3[8,10]$, Waiting times $[4, 0, 6, 1]$, Avg WT $2.75$.
4. Hand-computed and executed **Round Robin** test $(q=2, cs=0)$ with processes $(P1, 0, 5), (P2, 2, 3), (P3, 4, 2)$:
   - Documented engine's arrival vs. preemption ordering convention: When process preemption and new process arrival coincide at timestamp $t$, newly arrived processes are enqueued into the ready queue **before** the preempted process is requeued.
   - Slices: $P1[0,2], P2[2,4], P1[4,6], P3[6,8], P2[8,9], P1[9,10]$.
   - Waiting times: $P1=5, P2=4, P3=2$ (Avg WT $3.67$). Response times: $P1=0, P2=0, P3=2$ (Avg RT $0.67$). Turnaround times: $P1=10, P2=7, P3=4$ (Avg TAT $7.00$).
5. Added `"test": "node --test test/**/*.test.js"` script to `package.json`.

### Files Changed / Created
- Created: [`test/engine.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/engine.test.js)
- Modified: [`package.json`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/package.json)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm test`: 6 of 6 tests passed (0 failures, duration ~145ms).
- Zero modifications to scheduling engine behavior were required; engine passed all exact baseline specification requirements on the first run.

### Open Issues / Notes
- None. Ready for Phase 2 (Backend skeleton and schema).
