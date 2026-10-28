# SyncFlow Database — DBMS Architectural Notes & Technical Report

This document serves as the comprehensive DBMS design report for **SyncFlow + Database** (B.Tech CSE Project-Based Learning, Graphic Era Hill University). It details the database normalization process, relational constraints, active database rules (triggers), analytical views, physical indexing, intentional denormalization for auditability, and transaction management.

---

## 1. Normalization Walkthrough (UNF → 1NF → 2NF → 3NF)

### 1.1 Unnormalized Form (UNF)
In an unnormalized architecture without a database, a simulation run is typically stored as a single flat JSON record or document:

$$\text{UNF\_SIMULATION} = \{ \underline{\text{RunID}}, \text{UserName}, \text{UserEmail}, \text{ScenarioTitle}, \text{ScenarioDesc}, \text{IsPublic}, \text{ProcessList\_Array}, \text{AlgorithmCode}, \text{AlgorithmName}, \text{IsPreemptive}, \text{UsesQuantum}, \text{Quantum}, \text{ContextSwitchTime}, \text{AgingInterval}, \text{QueueConfig\_Array}, \text{GanttSlices\_Array}, \text{Metrics\_Array}, \text{CreatedAt} \}$$

#### Anomalies in UNF:
- **Insertion Anomaly:** Cannot define a reusable workload scenario or an algorithm without immediately executing a simulation run.
- **Update Anomaly:** If a user updates their name or email, every historical run record must be updated independently; otherwise data becomes inconsistent.
- **Deletion Anomaly:** Deleting a simulation run deletes the scenario definition and algorithm definitions if it was the only run referencing them.
- **Lack of Atomicity:** Attributes such as `ProcessList_Array`, `GanttSlices_Array`, and `Metrics_Array` contain nested repeating groups and complex multi-valued objects.

---

### 1.2 First Normal Form (1NF)
> **Definition:** A relation is in 1NF if and only if all underlying domains contain only atomic (indivisible) scalar values, and there are no repeating groups or nested arrays.

To satisfy 1NF, repeating groups and multi-valued composite attributes are decomposed into dedicated relations where each record represents a single scalar tuple:
1. Multi-valued process lists are extracted into a separate table: $\text{Processes}(\underline{\text{ScenarioID}, \text{PID}}, \text{ArrivalTime}, \text{BurstTime}, \text{Priority}, \text{QueueLevel})$.
2. Multi-level queue configurations are extracted into: $\text{RunQueueConfig}(\underline{\text{RunID}, \text{QueueLevel}}, \text{QueueAlgorithm}, \text{Quantum})$.
3. Gantt execution slices are extracted into: $\text{GanttSlots}(\underline{\text{RunID}, \text{Seq}}, \text{SlotType}, \text{PID}, \text{StartTime}, \text{EndTime})$.
4. Process execution metrics are extracted into: $\text{RunMetrics}(\underline{\text{RunID}, \text{PID}}, \text{CompletionTime}, \text{TurnaroundTime}, \text{WaitingTime}, \text{ResponseTime})$.

All remaining tables now contain exclusively atomic attributes (INTEGER, TEXT, DATETIME).

---

### 1.3 Second Normal Form (2NF)
> **Definition:** A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the primary key (no partial functional dependencies on composite candidate keys).

Consider the composite keys in 1NF:
- In $\text{Processes}(\underline{\text{ScenarioID}, \text{PID}})$:
  - $\text{ArrivalTime}, \text{BurstTime}, \text{Priority}, \text{QueueLevel}$ depend on the full composite key $(\text{ScenarioID}, \text{PID})$.
  - If scenario attributes ($\text{Title}, \text{Description}, \text{IsPublic}$) were kept in the process relation, they would depend solely on $\text{ScenarioID}$ (a partial dependency: $\text{ScenarioID} \to \text{Title}$).
  - **Resolution:** Scenario metadata is isolated in its own entity $\text{Scenarios}(\underline{\text{ScenarioID}}, \text{OwnerID}, \text{Title}, \text{Description}, \text{IsPublic}, \text{CreatedAt}, \text{UpdatedAt})$.
- In $\text{GanttSlots}(\underline{\text{RunID}, \text{Seq}})$:
  - Non-prime attributes $\text{SlotType}, \text{PID}, \text{StartTime}, \text{EndTime}$ depend strictly on the composite execution sequence $(\text{RunID}, \text{Seq})$. No partial dependencies exist.
- In $\text{RunMetrics}(\underline{\text{RunID}, \text{PID}})$:
  - Non-prime attributes $\text{CompletionTime}, \text{TurnaroundTime}, \text{WaitingTime}, \text{ResponseTime}$ depend strictly on the process performance within that specific run $(\text{RunID}, \text{PID})$.

Every relation in the schema satisfies 2NF.

---

### 1.4 Third Normal Form (3NF)
> **Definition:** A relation is in 3NF if it is in 2NF and there are no transitive functional dependencies (i.e. for every functional dependency $X \to Y$, either $X$ is a superkey, or $Y$ is a prime attribute).

Examining functional dependencies across entities:
1. In $\text{SimulationRuns}$:
   - Functional dependency: $\text{AlgorithmID} \to \text{Code}, \text{Name}, \text{IsPreemptive}, \text{UsesQuantum}, \text{UsesPriority}, \text{UsesQueues}$.
   - If algorithm details were stored inside `SimulationRuns`, the dependency $\text{RunID} \to \text{AlgorithmID} \to \text{AlgorithmName}$ would be **transitive**.
   - **Resolution:** Extracted into lookup dimension $\text{Algorithms}(\underline{\text{AlgorithmID}}, \text{Code}, \text{Name}, \dots)$.
2. In $\text{Scenarios}$:
   - Functional dependency: $\text{OwnerID} \to \text{Name}, \text{Email}, \text{PasswordHash}$.
   - If user profile data were stored in `Scenarios`, the dependency $\text{ScenarioID} \to \text{OwnerID} \to \text{Email}$ would be **transitive**.
   - **Resolution:** Extracted into authentication entity $\text{Users}(\underline{\text{UserID}}, \text{Name}, \text{Email}, \text{PasswordHash}, \text{CreatedAt})$.

---

### 1.5 Formal Functional Dependencies (FDs) per Table

| Table | Primary Key | Functional Dependencies | Normal Form |
|---|---|---|---|
| **`Users`** | `UserID` | `UserID` $\to$ `Name`, `Email`, `PasswordHash`, `CreatedAt`<br>`Email` $\to$ `UserID`, `Name`, `PasswordHash`, `CreatedAt` | 3NF / BCNF |
| **`Scenarios`** | `ScenarioID` | `ScenarioID` $\to$ `OwnerID`, `Title`, `Description`, `IsPublic`, `CreatedAt`, `UpdatedAt`<br>`(OwnerID, Title)` $\to$ `ScenarioID`, `Description`, `IsPublic`, `CreatedAt`, `UpdatedAt` | 3NF / BCNF |
| **`Processes`** | `(ScenarioID, PID)` | `(ScenarioID, PID)` $\to$ `ArrivalTime`, `BurstTime`, `Priority`, `QueueLevel` | 3NF / BCNF |
| **`Algorithms`** | `AlgorithmID` | `AlgorithmID` $\to$ `Code`, `Name`, `IsPreemptive`, `UsesQuantum`, `UsesPriority`, `UsesQueues`<br>`Code` $\to$ `AlgorithmID`, `Name`, `IsPreemptive`, `UsesQuantum`, `UsesPriority`, `UsesQueues` | 3NF / BCNF |
| **`SimulationRuns`** | `RunID` | `RunID` $\to$ `ScenarioID`, `AlgorithmID`, `RunBy`, `Quantum`, `ContextSwitchTime`, `AgingInterval`, `RaceGroup`, `CreatedAt` | 3NF / BCNF |
| **`RunQueueConfig`** | `(RunID, QueueLevel)` | `(RunID, QueueLevel)` $\to$ `QueueAlgorithm`, `Quantum` | 3NF / BCNF |
| **`GanttSlots`** | `(RunID, Seq)` | `(RunID, Seq)` $\to$ `SlotType`, `PID`, `StartTime`, `EndTime` | 3NF / BCNF |
| **`RunMetrics`** | `(RunID, PID)` | `(RunID, PID)` $\to$ `CompletionTime`, `TurnaroundTime`, `WaitingTime`, `ResponseTime` | 3NF / BCNF |

---

## 2. Catalog of Constraints, Triggers, Views, and Indexes

### 2.1 Integrity Constraints

| Constraint Name / Location | Table | Type | DBMS Concept Demonstrated |
|---|---|---|---|
| `Users.Email UNIQUE` | `Users` | Candidate Key / Uniqueness | Entity Uniqueness; prevents duplicate user registration. |
| `CHECK(Email LIKE '%_@_%._%')` | `Users` | Domain Integrity | Syntactic regex-like validation at database layer. |
| `CHECK(length(Name) BETWEEN 2 AND 60)` | `Users` | Domain Integrity | Character boundary check; prevents empty or overflow strings. |
| `UNIQUE(OwnerID, Title)` | `Scenarios` | Composite Uniqueness | Scoped Candidate Key; prevents a user from creating duplicate scenario names while allowing different users to use the same title. |
| `CHECK(BurstTime > 0)` | `Processes` | Semantic Domain Check | Operational validity; a process cannot request zero or negative CPU execution. |
| `CHECK(ArrivalTime >= 0)` | `Processes` | Temporal Domain Check | Time monotonicity; arrival cannot occur in negative time. |
| `CHECK(EndTime > StartTime)` | `GanttSlots` | Temporal Interval Check | Valid interval duration; a time slice must have positive non-zero length. |
| `CHECK((SlotType = 'RUN' AND PID IS NOT NULL) OR (SlotType <> 'RUN' AND PID IS NULL))` | `GanttSlots` | Conditional Tuple Integrity | State-dependent nullability; active execution requires an assigned PID, whereas idle CPU and context switches cannot belong to any process. |
| `ON DELETE CASCADE` | Multiple | Referential Action | Declarative cascade deletion propagating parent removal to child dependencies. |
| `ON DELETE RESTRICT` | `SimulationRuns` | Referential Action | Foreign key protection preventing deletion of lookup records referenced by historical runs. |

---

### 2.2 Active Database Triggers

| Trigger Name | Event | Timing | DBMS Concept & Business Rule |
|---|---|---|---|
| **`trg_run_quantum_rule`** | `SimulationRuns` | `BEFORE INSERT` | **Cross-Table Consistency Rule:** Declarative table CHECK constraints cannot execute subqueries across foreign tables. This trigger joins `Algorithms` to enforce that quantum-dependent algorithms (`RR`, `MLQ`) provide a quantum ($q > 0$), while non-quantum algorithms (`FCFS`, `SJF`, `SRTF`) forbid quantum values. |
| **`trg_slot_no_overlap`** | `GanttSlots` | `BEFORE INSERT` | **Temporal Mutual Exclusion & Serializability:** A uniprocessor CPU core can only execute one task at a time. The trigger inspects existing slices for the same `RunID` and rejects any slot where $[Start_{new}, End_{new})$ overlaps with $[Start_{existing}, End_{existing})$. |
| **`trg_lock_processes_insert`**<br>**`trg_lock_processes_update`**<br>**`trg_lock_processes_delete`** | `Processes` | `BEFORE INSERT / UPDATE / DELETE` | **Historical Reproducibility / Audit Lock:** Once simulation runs reference a scenario, its input process workload becomes strictly immutable. If updates or inserts are attempted, the trigger aborts. The `DELETE` trigger conditionally permits cascade deletion only when the parent `Scenarios` record itself is being dropped. |
| **`trg_scenarios_touch`** | `Scenarios` | `AFTER UPDATE` | **Automatic Timestamp Maintenance:** Maintains `UpdatedAt = CURRENT_TIMESTAMP` upon any metadata modification. |
| **`trg_slot_pid_valid`** | `GanttSlots` | `BEFORE INSERT` | **Inter-Entity Referential Consistency:** Verifies that a `RUN` slot's `PID` actually belongs to the processes declared in the run's scenario. |
| **`trg_slot_after_arrival`** | `GanttSlots` | `BEFORE INSERT` | **Physical Causality Constraint:** A process cannot execute on the CPU before its declared `ArrivalTime` ($StartTime \ge ArrivalTime$). |
| **`trg_metrics_pid_valid`** | `RunMetrics` | `BEFORE INSERT` | **Foreign Domain Validation:** Verifies that reported process metrics correspond to an existing scenario process. |
| **`trg_immutable_ganttslots`**<br>**`trg_immutable_runmetrics`** | `GanttSlots`<br>`RunMetrics` | `BEFORE UPDATE` | **Append-Only Immutability:** Historical execution traces and performance metrics are strictly read-only and cannot be tampered with post-insert. |

---

### 2.3 Views

| View Name | Type | Key DBMS Concepts Demonstrated |
|---|---|---|
| **`vw_metrics_recomputed`** | Computed View | Recomputes $CT$, $TAT$, $WT$, $RT$, and total executed duration directly from raw `GanttSlots` using standard textbook scheduling formulas without consulting `RunMetrics`. |
| **`vw_metrics_mismatch`** | Integrity Audit View | **Set-Theoretic Audit (`UNION ALL`):** Compares `RunMetrics` against `vw_metrics_recomputed`. Returns zero rows for a verified run. Detects: `METRIC_MISMATCH`, `EXECUTED_NOT_EQUAL_BURST`, `PROCESS_NEVER_RAN`, and `METRICS_MISSING`. |
| **`vw_run_summary`** | Analytical View | Uses **Common Table Expressions (CTEs)** to aggregate slot statistics and metric statistics independently before joining with `SimulationRuns`, completely eliminating Cartesian product inflation. Computes Makespan, Average Waiting Time, Turnaround Time, Response Time, CPU Utilization %, Throughput, and Context Switch count. |
| **`vw_algorithm_leaderboard`** | Analytical Window View | Uses SQL window function `RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT ASC, AvgTAT ASC)` to identify and rank the optimal scheduling algorithm for every scenario. |
| **`vw_user_activity`** | Reporting View | Uses `LEFT JOIN` and grouping subqueries to report total scenarios, total runs, most-used algorithm, and last activity timestamp per user, ensuring users with 0 runs are retained. |

---

### 2.4 Physical Indexes

| Index Name | Target Table & Columns | DBMS Concept & Optimization Rationale |
|---|---|---|
| `idx_scenarios_owner` | `Scenarios(OwnerID)` | **Foreign Key Index:** Accelerates user scenario dashboard queries and joins, preventing full table scans on scenario lookups. |
| `idx_runs_scenario_algo` | `SimulationRuns(ScenarioID, AlgorithmID)` | **Composite Covering Index:** Optimizes filtered leaderboard queries and scenario history queries; supports index covering on joins between scenarios and algorithms. |
| `idx_runs_user_time` | `SimulationRuns(RunBy, CreatedAt)` | **Range & Order-By Index:** Optimizes chronological history queries per user, avoiding in-memory sort passes. |
| `idx_slots_run_start` | `GanttSlots(RunID, StartTime)` | **Temporal Range Index:** Accelerates the `trg_slot_no_overlap` trigger by transforming interval conflict checks into logarithmic B-tree range queries. |

---

## 3. Why `RunMetrics` is Intentionally Redundant

In traditional relational normalization, storing values that can be derived from other stored rows (such as computing waiting time from Gantt slice timestamps) represents transitive redundancy that would normally be eliminated.

In **SyncFlow**, `RunMetrics` is **deliberately retained as a redundant table** for the following reasons:
1. **Separation of Engine vs. Database Computations:** The scheduling visualizer in the frontend/engine calculates process metrics during its simulation step and persists them into `RunMetrics`.
2. **Independent Verification via Relational Calculus:** `vw_metrics_recomputed` independently recalculates each process metric directly from raw time intervals in `GanttSlots` using textbook definitions:
   $$\text{CompletionTime} = \max(\text{EndTime})$$
   $$\text{TurnaroundTime} = \max(\text{EndTime}) - \text{ArrivalTime}$$
   $$\text{WaitingTime} = \text{TurnaroundTime} - \text{BurstTime}$$
   $$\text{ResponseTime} = \min(\text{StartTime}) - \text{ArrivalTime}$$
3. **Automated Auditability:** The view `vw_metrics_mismatch` performs an outer join between `RunMetrics` and `vw_metrics_recomputed`. If the engine has a scheduling bug, incorrect metric calculation, or corrupted data, `vw_metrics_mismatch` outputs diagnostic anomaly rows. If the engine is 100% correct, the query produces **0 rows**, providing mathematical proof of simulation integrity.

---

## 4. Architectural Trade-off: Process Locking vs. Per-Run Workload Snapshotting

When designing a scheduling visualizer with persistence, a fundamental architectural dilemma arises: **What happens when a user edits a scenario that already has saved simulation runs?**

Two primary design alternatives exist:

```
Alternative A: Process Snapshotting per Run
┌──────────────┐         ┌─────────────────────────┐         ┌─────────────────────────┐
│  Scenarios   │         │     SimulationRuns      │         │   RunProcessSnapshots   │
│ (ScenarioID) │ ◄────── │ (RunID, ScenarioID, ..) │ ◄────── │  (RunID, PID, Burst, ..)│
└──────────────┘         └─────────────────────────┘         └─────────────────────────┘
(Duplicates full process sets on EVERY run: high storage bloat, loss of common workload identity)

Alternative B: Referential Scenario Locking with "Save as Copy" (SyncFlow Architecture)
┌──────────────┐         ┌─────────────────────────┐
│  Scenarios   │ ◄────── │     SimulationRuns      │ (Runs strictly point to the original Scenario)
│ (ScenarioID) │         │ (RunID, ScenarioID, ..) │
└──────┬───────┘         └─────────────────────────┘
       │
       ▼ (1:N)
┌──────────────┐
│  Processes   │ ──► [Locked by Triggers if runs exist]
│(Scenario,PID)│ ──► [UI offers "Save as Copy" on HTTP 409 conflict]
└──────────────┘
```

### Comparative Analysis:

| Architectural Metric | Alternative A: Workload Snapshotting | Alternative B: Process Locking (SyncFlow) |
|---|---|---|
| **Storage Complexity** | High: Every single run duplicates all process rows, multiplying storage overhead by $N_{\text{runs}} \times N_{\text{processes}}$. | **Optimal ($O(P)$):** Process definitions exist exactly once per scenario regardless of how many algorithms run on it. |
| **Comparative Analytics & Leaderboards** | Weak: Cannot perform straightforward `PARTITION BY ScenarioID` window functions because each run references a distinct snapshot copy. | **Robust:** Enables clean analytical window functions (`RANK() OVER (PARTITION BY ScenarioID)`) since all runs benchmark the exact same physical workload. |
| **Integrity Guarantees** | Prone to divergence; requires custom snapshot consistency tracking. | **Guaranteed by Triggers:** Database triggers reject any process mutation if runs exist (`trg_lock_processes_*`). |
| **User Experience on Workload Edit** | Edits modify future runs silently, muddying comparative analysis. | **Explicit & Clear:** The API returns HTTP 409 Conflict with `canSaveAsCopy: true`, prompting the user to fork the scenario cleanly. |

**Conclusion:** SyncFlow's choice of **Process Locking with "Save as Copy"** guarantees database normalization, eliminates redundant storage bloat, and provides the relational foundation for SQL window-function leaderboards.

---

## 5. ACID Transaction Semantics & The Rollback Demo

### 5.1 Atomicity in Simulation Run Persistence
Saving a single simulation run requires inserting records across up to four distinct tables:
1. One row in `SimulationRuns`
2. $Q$ rows in `RunQueueConfig` (for MLQ / MLFQ multi-queue setups)
3. $S$ rows in `GanttSlots` (typically 5 to 50 execution slices)
4. $M$ rows in `RunMetrics` (one per process)

If an application crash, constraint failure, or network failure occurs halfway through (for example, inserting 10 slots and failing on slot 11), a non-transactional database would be left with a **corrupted partial simulation run** (a run header with incomplete time slices and zero metrics).

SyncFlow wraps the entire save operation within a single immediate SQLite transaction:
```javascript
const runId = db.transaction(() => {
  return insertSimulationRun(db, { ... });
})();
```

### 5.2 The Rollback Demonstration (`failAfterSlots: N`)
To verify and prove transaction atomicity under failure conditions, SyncFlow provides a test/development parameter: `failAfterSlots: N`.
When specified during a `POST /api/runs` request in non-production environments:
1. The transaction begins and inserts the `SimulationRuns` parent record.
2. Slices $1$ through $N$ are inserted into `GanttSlots`.
3. Upon reaching slice $N+1$, an intentional exception is thrown:
   ```javascript
   throw new Error(`Simulated rollback triggered after ${failAfterSlots} slots.`);
   ```
4. SQLite immediately rolls back the transaction.
5. Automated test `test/api.test.js` queries `SimulationRuns`, `GanttSlots`, and `RunMetrics` and proves that **zero partial records remain in any table**. The database remains in a consistent state.
