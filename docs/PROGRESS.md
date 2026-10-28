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

---

## Phase 2 — Backend Skeleton and Schema

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Configured backend skeleton in `server/` with Express app (`server/app.js`), database connection manager (`server/db/connection.js`), and server entrypoint (`server/index.js`).
2. Installed dependencies: `better-sqlite3`, `express`, `cors`, `dotenv`, `bcryptjs`, `jsonwebtoken`. Verified `better-sqlite3` native bindings compile and run successfully on Windows Node v22.
3. Created complete declarative SQL schema in [`server/db/schema.sql`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/schema.sql) with tables (`Users`, `Scenarios`, `Processes`, `Algorithms`, `SimulationRuns`, `RunQueueConfig`, `GanttSlots`, `RunMetrics`), views, triggers, and indexes. Every constraint, trigger, view, and index is documented with a dedicated comment identifying the DBMS concept.
4. Created lookup seed script in [`server/db/seed_lookup.sql`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/seed_lookup.sql) with reference rows for all 8 algorithms (`FCFS`, `SJF`, `SRTF`, `PRIORITY_NP`, `PRIORITY_P`, `RR`, `MLQ`, `MLFQ`).
5. Implemented `npm run db:reset` via [`server/db/reset.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/reset.js) that drops existing objects, recreates schema from `schema.sql`, and seeds lookup data.
6. Enforced `PRAGMA foreign_keys = ON;` on every database connection.
7. Implemented core and extra triggers:
   - `trg_run_quantum_rule`: Cross-table quantum integrity constraint.
   - `trg_slot_no_overlap`: Temporal mutual exclusion on single CPU core.
   - `trg_lock_processes_insert`, `trg_lock_processes_update`, `trg_lock_processes_delete`: Preserves historical input reproducibility while permitting cascading delete of parent scenarios.
   - `trg_scenarios_touch`: Automatic timestamp maintenance on scenario update.
   - `trg_slot_pid_valid`: Verifies slot PID exists in run scenario.
   - `trg_slot_after_arrival`: Guarantees slot does not start before process arrival.
   - `trg_metrics_pid_valid`: Verifies metrics PID exists in run scenario.
   - `trg_immutable_ganttslots`, `trg_immutable_runmetrics`: Append-only immutability.
8. Authored and verified DB test suite in [`test/schema.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/schema.test.js).

### Files Changed / Created
- Created: [`server/db/schema.sql`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/schema.sql)
- Created: [`server/db/seed_lookup.sql`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/seed_lookup.sql)
- Created: [`server/db/connection.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/connection.js)
- Created: [`server/db/reset.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/reset.js)
- Created: [`server/app.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/app.js)
- Created: [`server/index.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/index.js)
- Created: [`test/schema.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/schema.test.js)
- Modified: [`package.json`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/package.json)
- Modified: [`package-lock.json`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/package-lock.json)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm run db:reset`: Exit code 0 (database reset and seeded cleanly).
- `npm test`: 13 of 13 tests passed (all 6 engine baseline tests + all 7 DB schema, constraint, trigger, and cascade tests passed).

### Open Issues / Notes
- None. Ready for Phase 3 (Views: analytics and verification).

---

## Phase 3 — Views (Analytics and Verification)

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Implemented analytical and integrity verification views in [`server/db/schema.sql`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/db/schema.sql):
   - **`vw_metrics_recomputed`**: Recomputes CompletionTime, TurnaroundTime, WaitingTime, ResponseTime, and ExecutedTime from raw Gantt slots alone.
   - **`vw_metrics_mismatch`**: Independent verification view utilizing `UNION ALL` across four discrepancy checks (`METRIC_MISMATCH`, `EXECUTED_NOT_EQUAL_BURST`, `PROCESS_NEVER_RAN`, `METRICS_MISSING`). Must yield 0 rows for valid runs.
   - **`vw_run_summary`**: Aggregate analytical view computing process count, average metrics (WT, TAT, RT rounded to 2 decimals), makespan, CPU utilization % (1 decimal), throughput (3 decimals), and context switch count using Common Table Expressions (CTEs) to prevent Cartesian product inflation.
   - **`vw_algorithm_leaderboard`**: Ranks each algorithm's best run per scenario using `RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT ASC, AvgTAT ASC)`.
   - **`vw_user_activity`**: Aggregates scenarios, run counts, most used algorithm, and last activity per user, using `LEFT JOIN` so users with 0 runs are retained.
2. Created test suite [`test/views.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/views.test.js) validating:
   - Saving Test A FCFS produces exactly 0 mismatch rows in `vw_metrics_mismatch`.
   - Tampering with a single metric (setting WaitingTime to 99) flags exactly 1 `METRIC_MISMATCH` anomaly.
   - Flagging unexecuted processes (`PROCESS_NEVER_RAN`), burst duration discrepancies (`EXECUTED_NOT_EQUAL_BURST`), and missing metrics (`METRICS_MISSING`).
   - Summary statistics and leaderboard rankings match hand calculations for Test A (FCFS vs. SJF).
   - Inactive users are represented in `vw_user_activity` with 0 runs and 'None' for most-used algorithm.

### Files Changed / Created
- Created: [`test/views.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/views.test.js)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm test`: 18 of 18 tests passed across 3 test suites (`engine.test.js`, `schema.test.js`, `views.test.js`).
- Verification logic proved 100% sound on both authentic and artificially perturbed scheduling data.

### Open Issues / Notes
- None. Ready for Phase 4 (Auth API).

---

## Phase 4 — Auth API

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Implemented JWT authentication and verification middleware in [`server/middleware/auth.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/middleware/auth.js) supporting `requireAuth` and `optionalAuth` with 7-day token expiration.
2. Built authentication endpoints in [`server/routes/auth.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/auth.js):
   - `POST /api/auth/signup`: Validates name (2–60 chars), email format, and password (minimum 8 chars). Hashes passwords with bcryptjs (salt rounds 10). Rejects duplicate emails with HTTP 409 without leaking internal database stack traces. Returns JWT and safe user object.
   - `POST /api/auth/login`: Authenticates credentials with constant-time comparison. Returns uniform HTTP 401 "Invalid email or password" error on unknown email or incorrect password, preventing user enumeration attacks. Returns 7-day JWT and safe user object.
   - `GET /api/auth/me`: Protected endpoint returning authenticated user profile from token.
3. Connected auth router to Express application in [`server/app.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/app.js).
4. Implemented and verified test suite in [`test/auth.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/auth.test.js).

### Files Changed / Created
- Created: [`server/middleware/auth.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/middleware/auth.js)
- Created: [`server/routes/auth.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/auth.js)
- Created: [`test/auth.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/auth.test.js)
- Modified: [`server/app.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/app.js)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm test`: 21 of 21 tests passed across 4 test suites.
- Validated password hashing, JWT creation/expiry, security against user enumeration, and protected route gating.

### Open Issues / Notes
- None. Ready for Phase 5 (Scenarios and runs API).

---

## Phase 5 — Scenarios and Runs API

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. Implemented complete REST API for scenarios, runs, algorithms, and analytics:
   - [`server/routes/algorithms.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/algorithms.js): `GET /api/algorithms` returning algorithm parameters and capability flags.
   - [`server/routes/scenarios.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/scenarios.js):
     - `GET /api/scenarios`: User's scenarios with aggregated process count and run count.
     - `GET /api/scenarios/public`: Public scenarios with owner name and process count.
     - `POST /api/scenarios`: Single-transaction scenario + processes creation.
     - `GET /api/scenarios/:id`: Scenario detail with processes (respecting public/private permissions).
     - `PUT /api/scenarios/:id`: Scenario update with automatic HTTP 409 conflict detection when processes are locked by existing runs, including `canSaveAsCopy: true` hint.
     - `POST /api/scenarios/:id/duplicate`: Duplicates scenario and processes in one transaction.
     - `DELETE /api/scenarios/:id`: Owner-only cascading delete.
     - `POST /api/scenarios/import`: Ingests SyncFlow's JSON export format.
     - `GET /api/scenarios/:id/leaderboard`: Retrieves window-ranked algorithm standings from `vw_algorithm_leaderboard`.
   - [`server/routes/runs.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/runs.js):
     - `POST /api/runs`: Saves single simulation run (run row + queue configs + Gantt slots + metrics) in **one transaction**.
     - `POST /api/runs/race`: Saves multiple concurrent Race Mode runs with a unified `RaceGroup` in **one transaction**.
     - `GET /api/runs?scenarioId=`: Filterable run history from `vw_run_summary`.
     - `GET /api/runs/:id`: Replays saved run's full parameters, queue configs, Gantt slots, and metrics without re-simulating.
     - `GET /api/runs/:id/verify`: Independent SQL verification returning `vw_metrics_mismatch` rows and verification status.
   - [`server/routes/me.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/me.js): `GET /api/me/stats` returning user metrics from `vw_user_activity`.
2. Implemented transaction rollback demo flag: `failAfterSlots: N` (accepted in non-production environments) that aborts mid-transaction to prove atomicity.
3. Authored comprehensive test suite in [`test/api.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/api.test.js) validating all routes, error handlers, duplicate title protection, and transaction rollback.
4. Verified that `/verify` returns 0 mismatches for **every algorithm** on **every built-in preset scenario** (`textbook`, `convoy`, `starvation`, `quantum-demo`, `mlfq-demo`).

### Bug Fix in Engine
- **Location:** [`src/engine/schedulerEngine.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/engine/schedulerEngine.js#L693)
- **Problem:** In `simulateMLQ`, processes assigned a queue level $> 1$ (such as P5 in the built-in textbook preset, which had `queueLevel: 2`) were never placed into either `readyQ0` (`queueLevel === 0`) or `readyQ1` (`queueLevel === 1`), causing them to starve infinitely and fail the database `TurnaroundTime > 0` domain check.
- **Resolution:** Clamped non-zero queue level assignments to 1 (`Number(p.queueLevel) === 0 ? 0 : 1`) so all background/lower priority processes are properly serviced in the secondary FCFS queue.

### Files Changed / Created
- Created: [`server/routes/algorithms.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/algorithms.js)
- Created: [`server/routes/scenarios.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/scenarios.js)
- Created: [`server/routes/runs.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/runs.js)
- Created: [`server/routes/me.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/routes/me.js)
- Created: [`test/api.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/api.test.js)
- Modified: [`server/app.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/server/app.js)
- Modified: [`src/engine/schedulerEngine.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/engine/schedulerEngine.js)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm test`: 26 of 26 tests passed across all 5 test suites.
- Rollback demo proved 0 partial records remain in `SimulationRuns`, `GanttSlots`, or `RunMetrics`.
- Independent SQL verification returned 0 mismatches for 40 distinct simulation permutations (8 algorithms × 5 presets).

### Open Issues / Notes
- None. Ready for Phase 6 (Frontend integration).

---

## Phase 6 — Frontend Integration

- **Date:** 2026-10-28
- **Branch:** `feature/database`
- **Status:** COMPLETED

### What Was Done
1. **Frontend API Client:** Created [`src/services/apiClient.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/services/apiClient.js) to manage HTTP requests, token persistence in `localStorage`, unified error parsing, and reactive health check detection with offline fallback notification.
2. **Authentication Flow:** Implemented [`src/components/Auth/AuthModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Auth/AuthModal.jsx) (Sign In and Sign Up with demo account quick-fill buttons) and [`src/components/Auth/UserMenu.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Auth/UserMenu.jsx) displaying user info, logout action, link to stats, and an "offline — guest mode" indicator when the backend server is unreachable.
3. **Scenarios Manager:** Built [`src/components/Scenarios/ScenariosModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Scenarios/ScenariosModal.jsx) with 4 tabs:
   - **My Scenarios:** Lists user's scenarios with process count, run count, and actions to load into editor, duplicate, toggle public/private, or delete.
   - **Public Workloads:** Browses and loads community scenarios shared by other users.
   - **Save Current Workload:** Persists current processes with title, description, and privacy flag; handles HTTP 409 locked-scenario errors with "Save as Copy" guidance.
   - **Import JSON:** Allows uploading a `.json` file or pasting JSON arrays to save directly into the database.
4. **History & Verification Replay:** Built [`src/components/History/HistoryView.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/History/HistoryView.jsx):
   - **Saved Runs:** Filterable table by scenario and algorithm with average waiting time, turnaround time, CPU utilization, and timestamp.
   - **Gantt Replay:** Clicking "Replay" reconstructs and plays back the exact Gantt timeline from stored `GanttSlots` and displays `RunMetrics` without re-simulating.
   - **SQL Integrity Badge:** Checks `/api/runs/:id/verify` to display "SQL verified ✓ 0 mismatches" or itemizes anomalies from `vw_metrics_mismatch`.
   - **Leaderboard:** Live scenario standings ranked by SQL window function `RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT)` with medal icons (🥇, 🥈, 🥉).
5. **My Activity & Stats:** Built [`src/components/Dashboard/MyStatsModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Dashboard/MyStatsModal.jsx) displaying scenario count, run count, favorite algorithm, and last activity from `vw_user_activity`.
6. **Main Navigation & Simulation Controls Integration:**
   - Updated [`src/components/Navbar.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Navbar.jsx) with History tab, Scenarios button, and UserMenu.
   - Updated [`src/App.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/App.jsx) with a "Save Run" button on the Simulator Gantt card and mounted all modals.
   - Updated [`src/components/RaceMode/ComparisonView.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/RaceMode/ComparisonView.jsx) with a "Save Race" button to batch-save all selected algorithm runs in one atomic transaction under a shared `RaceGroup`.
7. **Guest Mode Preservation:** Unauthenticated users can continue to use the simulator, race mode, and export features completely uninterrupted without requiring login or a backend connection.

### Files Changed / Created
- Created: [`src/services/apiClient.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/services/apiClient.js)
- Created: [`src/components/Auth/AuthModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Auth/AuthModal.jsx)
- Created: [`src/components/Auth/UserMenu.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Auth/UserMenu.jsx)
- Created: [`src/components/Dashboard/MyStatsModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Dashboard/MyStatsModal.jsx)
- Created: [`src/components/Scenarios/ScenariosModal.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Scenarios/ScenariosModal.jsx)
- Created: [`src/components/History/HistoryView.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/History/HistoryView.jsx)
- Modified: [`src/components/Navbar.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/Navbar.jsx)
- Modified: [`src/components/RaceMode/ComparisonView.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/components/RaceMode/ComparisonView.jsx)
- Modified: [`src/App.jsx`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/src/App.jsx)
- Modified: [`vite.config.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/vite.config.js)
- Modified: [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md)

### Check Results
- `npm run build`: Exit code 0 (Vite client build succeeded in 3.04s).
- `npm test`: 26 of 26 tests passed.
- Guest mode fully functional; all logged-in views styled consistently with dark glassmorphic design system.

### Open Issues / Notes
- None. Ready for Phase 7 (Demo data, SQL queries, index evidence).

