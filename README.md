# SyncFlow + Database ⚡

> *"Watch your CPU think — backed by a relational database."*

OS Project-Based Learning (PBL) with a Relational Database Management System (DBMS) component.  
Department of Computer Science & Engineering, Graphic Era Hill University.

---

## 🚀 Overview

**SyncFlow** is an interactive, dark glassmorphic web application that simulates, animates, compares, and persists CPU scheduling algorithms in real-time. It combines core Operating Systems principles with an auditable relational database backend (SQLite via `better-sqlite3`, handwritten SQL, zero ORM).

### Key Highlights:
1. **Operating Systems Scheduling:** FCFS, SJF, SRTF, Priority (Preemptive & Non-Preemptive with Aging), Round Robin, Multilevel Queue (MLQ), and Multilevel Feedback Queue (MLFQ).
2. **Relational Database Management System:**
   - **Normalized Schema (3NF):** 8 tables (`Users`, `Scenarios`, `Processes`, `Algorithms`, `SimulationRuns`, `RunQueueConfig`, `GanttSlots`, `RunMetrics`).
   - **Active Database Rules (Triggers):** Single-core non-overlap temporal mutual exclusion, cross-table quantum validation, historical reproducibility process locks, and immutability guards.
   - **Independent SQL Verification:** SQL recomputes process metrics ($CT, TAT, WT, RT$) directly from raw Gantt intervals and compares them with the engine's reported metrics via `vw_metrics_mismatch` (yielding 0 mismatches for authentic runs).
   - **Analytical Views & Window Functions:** Scenario efficiency leaderboards ranked by SQL window function `RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT)`.
   - **ACID Transaction Atomicity:** Runs and multi-algorithm race groups persist in single atomic transactions; proven via an intentional rollback demo (`failAfterSlots: N`).
3. **Database Replay (No Re-simulation):** Browse past runs in the History view and replay their exact animated Gantt charts reconstructed directly from database time slices.
4. **Dual-Mode Operation:** Guest Mode remains 100% operational offline without requiring login or a backend server.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS, Recharts, Lucide Icons, Canvas Confetti
- **Backend:** Node.js v22, Express 5, CORS, `dotenv`
- **Database:** SQLite 3 via `better-sqlite3` (handwritten SQL, prepared statements, zero ORM)
- **Security:** `bcryptjs` (password hashing), `jsonwebtoken` (JWT auth, 7-day expiry)
- **Testing:** Node.js native test runner (`node:test`, 26 tests across 5 test suites)

---

## 💻 Local Setup & Execution Guide

### 1. Prerequisites
- Node.js `v20.x` or `v22.x`
- npm `v10.x` or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/s-rawat05/syncflow.git
cd syncflow

# Install project dependencies
npm install
```

### 3. Environment Configuration
Create a local `.env` file (copied from `.env.example`):
```bash
# Windows PowerShell
copy .env.example .env

# macOS / Linux
cp .env.example .env
```
Default environment parameters:
```env
PORT=3001
JWT_SECRET=syncflow_super_secret_jwt_key_2026_gehu_pbl
DB_PATH=server/db/syncflow.sqlite
DEMO_PASSWORD=demo_password_123
NODE_ENV=development
```

### 4. Database Setup & Demo Seed
```bash
# Reset database schema and seed lookup dimensions (Algorithms)
npm run db:reset

# Populate demo data: 3 users, 7 scenarios, and 30 real simulation runs
npm run db:seed-demo

# Generate SQL demonstration query logs and EXPLAIN QUERY PLAN evidence
npm run docs:queries
```

### 5. Running the Application
Start both the backend API server and the Vite frontend dev server:

**Terminal 1 (Backend Server):**
```bash
npm run server
# Server listening on http://localhost:3001
```

**Terminal 2 (Frontend Client):**
```bash
npm run dev
# Vite client running at http://localhost:5173
```
Open `http://localhost:5173` in your browser.

### 6. Demo User Accounts
Click **"Sign In"** in the navigation bar to use the pre-configured accounts (passwords are pre-filled or use `demo_password_123`):
- `alice@gehu.ac.in` (Owns Textbook Classic, Convoy Effect, Test A Benchmark)
- `bob@gehu.ac.in` (Owns Starvation Showcase, Quantum Sensitivity, MLFQ Demo, Test B Benchmark)
- `charlie@gehu.ac.in` (Registered user with 0 saved runs, proving outer anti-joins)

---

## 🧪 Testing Suite

Run the full automated test suite containing all 26 test cases:
```bash
npm test
```

### What the Test Suites Prove:
1. `test/engine.test.js` (6 tests): Validates that the scheduling engine produces exact textbook values for FCFS, SJF, SRTF (Test A), Priority NP & P (Test B), and Round Robin with arrival-preemption ordering conventions.
2. `test/schema.test.js` (7 tests): Validates database domain CHECKs, composite candidate keys, cross-table quantum trigger, temporal non-overlap trigger, process locking triggers, and cascading deletes.
3. `test/views.test.js` (5 tests): Validates independent SQL metric recomputation (`vw_metrics_recomputed`), anomaly detection (`vw_metrics_mismatch`), summary metrics (`vw_run_summary`), and window-function leaderboards.
4. `test/auth.test.js` (3 tests): Validates bcrypt password hashing, token verification, and security against user enumeration.
5. `test/api.test.js` (5 tests): Validates REST API endpoints, conflict handling (HTTP 409), transaction atomicity with rollback demo (`failAfterSlots: N`), and proves `/verify` returns 0 mismatches for all 8 algorithms across all 5 preset scenarios.

---

## 📚 Technical Documentation Directory

Comprehensive documentation is provided in the `docs/` folder:

| Document | Description |
|---|---|
| [`docs/ER_DIAGRAM.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/ER_DIAGRAM.md) | Mermaid ER diagram specifying all 8 tables, keys, and relational cardinalities. |
| [`docs/DBMS_NOTES.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/DBMS_NOTES.md) | Normalization walkthrough (1NF $\to$ 2NF $\to$ 3NF), functional dependencies, triggers, views, intentional redundancy, and transaction rollback mechanics. |
| [`docs/ARCHITECTURE.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/ARCHITECTURE.md) | Component topology, sequence diagrams, and detailed Guest Mode vs. Logged-in Mode design. |
| [`docs/SQL_QUERIES.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/SQL_QUERIES.md) | Execution report of 12 demonstration SQL queries with real tabular outputs and `EXPLAIN QUERY PLAN` index evidence. |
| [`docs/TESTING.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/TESTING.md) | Complete testing guide and proof matrix for all 26 automated tests. |
| [`docs/AUDIT.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/AUDIT.md) | Initial Phase 0 codebase audit, engine purity verification, and parameter conventions. |
| [`docs/PROGRESS.md`](file:///c:/Users/Sahil%20Rawat/.gemini/antigravity/scratch/syncflow/docs/PROGRESS.md) | Step-by-step audit trail documenting work completed and test results for Phases 0 through 8. |

---

## 🌐 Deployment Note

- **Static Frontend Deployment:** The frontend visualizer can be deployed to any static host (e.g. GitHub Pages via `npm run deploy`). In static deployments without a running backend, SyncFlow operates seamlessly in **Guest Mode**.
- **Full-Stack Deployment:** The backend requires a persistent Node.js server. Because SQLite databases stored on ephemeral container disks (e.g. free-tier cloud containers) can be wiped on redeployment, **run and evaluate locally** for full demonstration of database persistence and SQL verification.

---

## 📄 License
MIT License © 2026 SyncFlow Team — Department of Computer Science & Engineering, Graphic Era Hill University.
