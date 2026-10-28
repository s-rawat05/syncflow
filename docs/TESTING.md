# SyncFlow Database — Testing & Verification Guide

This document details the test framework, test execution instructions, and the **proof matrix** for **SyncFlow + Database**. All tests run natively in Node.js via `node:test` without requiring external testing frameworks.

---

## 1. Quick Start: Running Tests

```bash
# 1. Run all 26 test cases across all 5 test suites
npm test

# 2. Run an individual test suite
node --test test/engine.test.js    # Phase 1 Engine baseline tests
node --test test/schema.test.js    # Phase 2 Schema, constraints & triggers
node --test test/views.test.js     # Phase 3 Views & verification logic
node --test test/auth.test.js      # Phase 4 Authentication API
node --test test/api.test.js       # Phase 5 Scenarios, Runs, Rollback & Verification

# 3. Reset and re-seed the demo database
npm run db:reset       # Rebuilds database from schema.sql + lookup seeds
npm run db:seed-demo   # Seeds 3 demo users, presets, and executes real runs

# 4. Generate SQL Demonstration Queries and Index Evidence
npm run docs:queries   # Runs 12 queries + EXPLAIN QUERY PLAN and updates SQL_QUERIES.md

# 5. Verify production client build
npm run build          # Compiles production React/Vite assets to dist/
```

---

## 2. Test Suites Summary

| Test Suite | Focus Area | Test Count | Specification Phase | Status |
|---|---|:---:|:---:|:---:|
| [`test/engine.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/engine.test.js) | Pure Scheduling Engine Correctness | 6 | Phase 1 | **PASSED** (6/6) |
| [`test/schema.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/schema.test.js) | Relational Schema, Constraints & Triggers | 7 | Phase 2 | **PASSED** (7/7) |
| [`test/views.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/views.test.js) | Independent SQL Verification & Analytics | 5 | Phase 3 | **PASSED** (5/5) |
| [`test/auth.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/auth.test.js) | JWT Authentication & Security | 3 | Phase 4 | **PASSED** (3/3) |
| [`test/api.test.js`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/test/api.test.js) | Scenarios, Runs, Rollback & Verification | 5 | Phase 5 | **PASSED** (5/5) |
| **Total** | | **26** | | **100% PASS** |

---

## 3. Comprehensive Proof Matrix

### 3.1 Suite 1: Pure Engine Baseline (`test/engine.test.js`)
*Proves that the scheduling algorithms in `src/engine/schedulerEngine.js` strictly conform to standard operating systems textbook definitions with context-switch cost 0.*

1. **Test A — FCFS (`node:test` #1):**
   - **Input:** $(P1,0,5), (P2,1,3), (P3,2,8), (P4,3,6)$
   - **What it Proves:** Completion times are exactly $[5, 8, 16, 22]$; Waiting times are $[0, 4, 6, 13]$; Average Waiting Time is $5.75$; Average Turnaround Time is $11.25$.
2. **Test A — SJF Non-Preemptive (`node:test` #2):**
   - **What it Proves:** Non-preemptive execution order is strictly $[P1, P2, P4, P3]$; Waiting times are $[0, 4, 12, 5]$; Average Waiting Time is $5.25$.
3. **Test A — SRTF Preemptive (`node:test` #3):**
   - **What it Proves:** Preemption occurs at arrivals; execution slices are $P1[0,1], P2[1,4], P1[4,8], P4[8,14], P3[14,22]$; Waiting times are $[3, 0, 12, 5]$ (Average $5.00$); Response times are $[0, 0, 12, 5]$.
4. **Test B — Priority Non-Preemptive (`node:test` #4):**
   - **Input:** $(P1,0,4,3), (P2,1,3,1), (P3,2,2,4), (P4,3,1,2)$ (lower number = higher priority).
   - **What it Proves:** Execution order is $[P1, P2, P4, P3]$; Waiting times are $[0, 3, 6, 4]$; Average Waiting Time is $3.25$.
5. **Test B — Priority Preemptive (`node:test` #5):**
   - **What it Proves:** Slices are $P1[0,1], P2[1,4], P4[4,5], P1[5,8], P3[8,10]$; Waiting times are $[4, 0, 6, 1]$; Average Waiting Time is $2.75$.
6. **Round Robin Hand-Computed Benchmark (`node:test` #6):**
   - **Input:** $q=2, cs=0$, processes $(P1, 0, 5), (P2, 2, 3), (P3, 4, 2)$.
   - **What it Proves:** Proves quantum preemption rotation; explicitly tests the arrival vs. preemption ordering convention: newly arrived processes are enqueued into the ready queue **before** a preempted process is requeued. Slices are $P1[0,2], P2[2,4], P1[4,6], P3[6,8], P2[8,9], P1[9,10]$; Waiting times $[5, 4, 2]$ (Avg WT $3.67$).

---

### 3.2 Suite 2: Relational Schema & Constraints (`test/schema.test.js`)
*Proves that relational domain constraints, primary keys, composite unique constraints, active triggers, and referential cascades are strictly enforced by SQLite.*

1. **Valid Inserts Work Across All Tables:**
   - **What it Proves:** Valid data cleanly populates `Users`, `Scenarios`, `Processes`, `Algorithms`, `SimulationRuns`, `RunQueueConfig`, `GanttSlots`, and `RunMetrics`.
2. **CHECK Constraints Reject Invalid Data:**
   - **What it Proves:** Rejects invalid emails (e.g. `bademail`), names shorter than 2 chars, burst times $\le 0$, negative arrival times, and inverted Gantt intervals ($EndTime \le StartTime$).
3. **Duplicate Scenario Title Rejected:**
   - **What it Proves:** Composite constraint `UNIQUE(OwnerID, Title)` aborts duplicate titles for the same user while permitting distinct users to use identical scenario titles.
4. **Cross-Table Quantum Rule Trigger (`trg_run_quantum_rule`):**
   - **What it Proves:** Rejects an `RR` run inserted without a quantum; rejects an `FCFS` run inserted with a non-null quantum.
5. **Single-Core Temporal Non-Overlap (`trg_slot_no_overlap`):**
   - **What it Proves:** Rejects inserting a Gantt slice whose time interval overlaps with an existing slice of the same simulation run.
6. **Historical Input Immutability (`trg_lock_processes_*`):**
   - **What it Proves:** Once a scenario has associated simulation runs, modifying or deleting its processes throws an abort exception; deleting the parent scenario succeeds and cascades cleanly.
7. **Extra Domain & Immutability Triggers:**
   - **What it Proves:** `trg_slot_pid_valid` rejects unknown PIDs; `trg_slot_after_arrival` rejects slices starting before process arrival; `trg_immutable_ganttslots` and `trg_immutable_runmetrics` prevent post-insert updates.

---

### 3.3 Suite 3: SQL Views & Independent Verification (`test/views.test.js`)
*Proves that SQL independently recomputes metrics from raw Gantt slices and detects data tampering or scheduling anomalies.*

1. **Clean Run (Test A FCFS):**
   - **What it Proves:** Querying `vw_metrics_mismatch` returns exactly **0 rows** for a valid, authentic simulation run.
2. **Tampered Metric Detection:**
   - **What it Proves:** Artificially modifying `RunMetrics.WaitingTime` to an erroneous value results in `vw_metrics_mismatch` detecting a `METRIC_MISMATCH` row.
3. **Missing / Incomplete Data Detection:**
   - **What it Proves:** `vw_metrics_mismatch` flags `PROCESS_NEVER_RAN` if a scenario process has no slice, `EXECUTED_NOT_EQUAL_BURST` if executed duration differs from declared burst, and `METRICS_MISSING` if metric rows are absent.
4. **Summary & Window Function Leaderboard:**
   - **What it Proves:** `vw_run_summary` and `vw_algorithm_leaderboard` compute average waiting time, turnaround time, makespan, and window rankings matching hand-worked values.
5. **Outer Join User Activity (`vw_user_activity`):**
   - **What it Proves:** Users who have never executed a run still appear with `RunCount = 0` and `MostUsedAlgorithm = 'None'`.

---

### 3.4 Suite 4: Authentication API (`test/auth.test.js`)
*Proves that identity verification, password hashing, and token authorization adhere to security best practices.*

1. **Signup Endpoint (`POST /api/auth/signup`):**
   - **What it Proves:** Validates input parameters, hashes passwords with bcrypt (salt rounds 10), creates user records, rejects duplicate emails with HTTP 409, and returns a signed JWT.
2. **Login Endpoint (`POST /api/auth/login`):**
   - **What it Proves:** Verifies bcrypt passwords, returns signed 7-day JWT tokens, and returns uniform HTTP 401 errors on wrong passwords or unknown emails (preventing user enumeration).
3. **Protected Route Authorization (`GET /api/auth/me`):**
   - **What it Proves:** Rejects unauthenticated requests with HTTP 401; decodes valid JWT bearer tokens and returns the current user profile.

---

### 3.5 Suite 5: Scenarios & Runs API (`test/api.test.js`)
*Proves end-to-end API functionality, atomic persistence, transaction rollback, and full preset verification.*

1. **Algorithm Lookup (`GET /api/algorithms`):**
   - **What it Proves:** Returns lookup rows with capability flags (`UsesQuantum`, `UsesPriority`, `UsesQueues`, `IsPreemptive`).
2. **Scenario CRUD & Conflict-Aware Locking:**
   - **What it Proves:** Creates scenarios and processes in one transaction; duplicates scenarios; imports SyncFlow JSON workloads; returns HTTP 409 Conflict with `canSaveAsCopy: true` when editing a locked scenario.
3. **Transaction Rollback Demo (`failAfterSlots: N`):**
   - **What it Proves:** When `failAfterSlots: 2` is specified in development mode, an intentional exception thrown after 2 slots triggers an immediate rollback; verifies that **zero rows remain** in `SimulationRuns`, `GanttSlots`, or `RunMetrics`.
4. **Race Mode Batch Persistence (`POST /api/runs/race`):**
   - **What it Proves:** Saves multi-algorithm runs sharing a common `RaceGroup` in a single atomic transaction.
5. **Comprehensive Preset Verification:**
   - **What it Proves:** Runs all 8 scheduling algorithms across all 5 preset scenarios (40 simulation combinations) and verifies that `/api/runs/:id/verify` returns **0 mismatches** for every single run.
