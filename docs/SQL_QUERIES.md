# SyncFlow Database — SQL Demonstration Queries & Index Evidence

This document contains the verified execution logs of the 12 demonstration SQL queries on the populated SQLite database.
All query outputs shown below were generated programmatically from actual database results.

---

## Table of Contents
1. [All Scenarios of a User with Process Counts (JOIN + GROUP BY)](#1-all-scenarios-of-a-user-with-process-counts)
2. [Scenarios with More Than 4 Processes (HAVING)](#2-scenarios-with-more-than-4-processes)
3. [Average Waiting Time per Algorithm Across All Runs (Aggregate)](#3-average-waiting-time-per-algorithm-across-all-runs)
4. [Best Algorithm per Scenario (Window Function Leaderboard)](#4-best-algorithm-per-scenario)
5. [Runs with Above-Average Waiting Time for Their Scenario (Correlated Subquery)](#5-runs-with-above-average-waiting-time-for-their-scenario)
6. [Processes that Waited Longer than Their Own Burst Time](#6-processes-that-waited-longer-than-their-own-burst-time)
7. [Users with No Saved Runs (LEFT JOIN … IS NULL)](#7-users-with-no-saved-runs)
8. [Context-Switch Overhead per Algorithm (Conditional Aggregation)](#8-context-switch-overhead-per-algorithm)
9. [CPU Utilization Ranking (View Query)](#9-cpu-utilization-ranking)
10. [The Integrity Check Across All Runs (Zero Mismatch Verification)](#10-the-integrity-check-across-all-runs)
11. [A Saved Run's Full Gantt Timeline in Sequence (Indexed Lookup)](#11-a-saved-runs-full-gantt-timeline-in-sequence)
12. [Race Groups and Their Optimal Winners (CTE + Window Function)](#12-race-groups-and-their-optimal-winners)
13. [Index Evidence: EXPLAIN QUERY PLAN Analysis](#13-index-evidence-explain-query-plan-analysis)

---

### 1. All Scenarios of a User with Process Counts

**Purpose:** Retrieve all scheduling scenarios created by user Alice Turing with their computed process count.

**DBMS Concept:** INNER JOIN (between Scenarios, Users, and Processes) combined with GROUP BY aggregation.

```sql
SELECT s.ScenarioID, s.Title, u.Name AS Owner, s.IsPublic, COUNT(p.PID) AS ProcessCount
FROM Scenarios s
JOIN Users u ON u.UserID = s.OwnerID
JOIN Processes p ON p.ScenarioID = s.ScenarioID
WHERE u.Email = 'alice@gehu.ac.in'
GROUP BY s.ScenarioID, s.Title, u.Name, s.IsPublic
ORDER BY s.ScenarioID ASC;
```

**Actual Query Output (3 rows):**

| ScenarioID | Title | Owner | IsPublic | ProcessCount |
| --- | --- | --- | --- | --- |
| 1 | Textbook Classic | Alice Turing | 1 | 5 |
| 2 | Convoy Effect Demo | Alice Turing | 1 | 3 |
| 3 | Test A Benchmark | Alice Turing | 1 | 4 |

---

### 2. Scenarios with More Than 4 Processes

**Purpose:** Filter workload scenarios that represent larger multi-process batches exceeding 4 tasks.

**DBMS Concept:** HAVING clause filtering post-aggregated grouping results (distinguishing WHERE vs HAVING).

```sql
SELECT s.ScenarioID, s.Title, u.Name AS Owner, COUNT(p.PID) AS ProcessCount
FROM Scenarios s
JOIN Users u ON u.UserID = s.OwnerID
JOIN Processes p ON p.ScenarioID = s.ScenarioID
GROUP BY s.ScenarioID, s.Title, u.Name
HAVING COUNT(p.PID) > 4
ORDER BY ProcessCount DESC;
```

**Actual Query Output (1 rows):**

| ScenarioID | Title | Owner | ProcessCount |
| --- | --- | --- | --- |
| 1 | Textbook Classic | Alice Turing | 5 |

---

### 3. Average Waiting Time per Algorithm Across All Runs

**Purpose:** Evaluate overall scheduling efficiency across all simulated workloads to rank algorithms by average wait.

**DBMS Concept:** Three-table JOIN (Algorithms, SimulationRuns, RunMetrics) with aggregate function AVG() and GROUP BY.

```sql
SELECT a.Code AS AlgorithmCode, a.Name AS AlgorithmName,
       COUNT(DISTINCT r.RunID) AS TotalRuns,
       ROUND(AVG(m.WaitingTime), 2) AS OverallAvgWT,
       ROUND(AVG(m.TurnaroundTime), 2) AS OverallAvgTAT
FROM Algorithms a
JOIN SimulationRuns r ON r.AlgorithmID = a.AlgorithmID
JOIN RunMetrics m ON m.RunID = r.RunID
GROUP BY a.AlgorithmID, a.Code, a.Name
ORDER BY OverallAvgWT ASC;
```

**Actual Query Output (8 rows):**

| AlgorithmCode | AlgorithmName | TotalRuns | OverallAvgWT | OverallAvgTAT |
| --- | --- | --- | --- | --- |
| PRIORITY_NP | Priority Scheduling (Non-Preemptive) | 2 | 5 | 9.25 |
| PRIORITY_P | Priority Scheduling (Preemptive) | 3 | 5.42 | 10.25 |
| SJF | Shortest Job First | 5 | 6.05 | 12.95 |
| SRTF | Shortest Remaining Time First | 3 | 6.14 | 11.71 |
| MLFQ | Multilevel Feedback Queue | 2 | 11.25 | 18 |
| FCFS | First-Come, First-Served | 6 | 11.52 | 18.65 |
| MLQ | Multilevel Queue | 1 | 11.8 | 17.4 |
| RR | Round Robin | 8 | 19.58 | 27.21 |

---

### 4. Best Algorithm per Scenario (Window Function Leaderboard)

**Purpose:** Identify which scheduling algorithm achieved the lowest average waiting time for each distinct scenario.

**DBMS Concept:** SQL Window Function RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT ASC) evaluated via view vw_algorithm_leaderboard.

```sql
SELECT ScenarioID, ScenarioTitle, AlgorithmCode, AlgorithmName, AvgWT, AvgTAT, CpuUtilization
FROM vw_algorithm_leaderboard
WHERE AlgorithmRank = 1
ORDER BY ScenarioID ASC;
```

**Actual Query Output (8 rows):**

| ScenarioID | ScenarioTitle | AlgorithmCode | AlgorithmName | AvgWT | AvgTAT | CpuUtilization |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Textbook Classic | SRTF | Shortest Remaining Time First | 6.6 | 12.2 | 100 |
| 2 | Convoy Effect Demo | SJF | Shortest Job First | 3 | 13 | 100 |
| 3 | Test A Benchmark | SRTF | Shortest Remaining Time First | 5 | 10.5 | 100 |
| 4 | Starvation & Aging Showcase | PRIORITY_NP | Priority Scheduling (Non-Preemptive) | 6.75 | 12.75 | 100 |
| 4 | Starvation & Aging Showcase | PRIORITY_P | Priority Scheduling (Preemptive) | 6.75 | 12.75 | 100 |
| 5 | Quantum Sensitivity (RR) | RR | Round Robin | 26 | 35 | 85.7 |
| 6 | MLFQ Dynamic Queue Flow | MLFQ | Multilevel Feedback Queue | 7.33 | 16 | 100 |
| 7 | Test B Priority Benchmark | PRIORITY_P | Priority Scheduling (Preemptive) | 2.75 | 5.25 | 100 |

---

### 5. Runs with Above-Average Waiting Time for Their Scenario

**Purpose:** Detect simulation runs whose average waiting time was worse than the scenario average across all competing algorithms.

**DBMS Concept:** Correlated Subquery comparing an aggregated outer group with a dynamic sub-select correlated on ScenarioID.

```sql
SELECT r.RunID, s.Title AS ScenarioTitle, a.Code AS AlgorithmCode,
       ROUND(AVG(m.WaitingTime), 2) AS RunAvgWT
FROM SimulationRuns r
JOIN Scenarios s ON s.ScenarioID = r.ScenarioID
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN RunMetrics m ON m.RunID = r.RunID
GROUP BY r.RunID, s.ScenarioID, s.Title, a.Code
HAVING AVG(m.WaitingTime) > (
    SELECT AVG(m2.WaitingTime)
    FROM SimulationRuns r2
    JOIN RunMetrics m2 ON m2.RunID = r2.RunID
    WHERE r2.ScenarioID = s.ScenarioID
)
ORDER BY s.ScenarioID ASC, RunAvgWT DESC;
```

**Actual Query Output (11 rows):**

| RunID | ScenarioTitle | AlgorithmCode | RunAvgWT |
| --- | --- | --- | --- |
| 5 | Textbook Classic | RR | 22.4 |
| 7 | Textbook Classic | MLFQ | 13.6 |
| 4 | Textbook Classic | RR | 13 |
| 11 | Textbook Classic | RR | 13 |
| 6 | Textbook Classic | MLQ | 11.8 |
| 12 | Convoy Effect Demo | FCFS | 17 |
| 15 | Convoy Effect Demo | FCFS | 17 |
| 18 | Test A Benchmark | FCFS | 5.75 |
| 24 | Quantum Sensitivity (RR) | RR | 35.5 |
| 28 | MLFQ Dynamic Queue Flow | FCFS | 8.67 |
| 29 | Test B Priority Benchmark | PRIORITY_NP | 3.25 |

---

### 6. Processes that Waited Longer than Their Own Burst Time

**Purpose:** Identify severe queuing delays where a process waited in ready queue longer than its actual required CPU computation.

**DBMS Concept:** Multi-table JOIN comparing child table metrics against parent process specification, with computed column and arithmetic filter.

```sql
SELECT r.RunID, s.Title AS ScenarioTitle, a.Code AS AlgorithmCode,
       m.PID, m.WaitingTime, p.BurstTime, (m.WaitingTime - p.BurstTime) AS ExcessWait
FROM RunMetrics m
JOIN SimulationRuns r ON r.RunID = m.RunID
JOIN Scenarios s ON s.ScenarioID = r.ScenarioID
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN Processes p ON p.ScenarioID = r.ScenarioID AND p.PID = m.PID
WHERE m.WaitingTime > p.BurstTime
ORDER BY ExcessWait DESC
LIMIT 12;
```

**Actual Query Output (12 rows):**

| RunID | ScenarioTitle | AlgorithmCode | PID | WaitingTime | BurstTime | ExcessWait |
| --- | --- | --- | --- | --- | --- | --- |
| 24 | Quantum Sensitivity (RR) | RR | P2 | 40 | 12 | 28 |
| 24 | Quantum Sensitivity (RR) | RR | P3 | 36 | 8 | 28 |
| 24 | Quantum Sensitivity (RR) | RR | P1 | 37 | 10 | 27 |
| 26 | Quantum Sensitivity (RR) | RR | P3 | 34 | 8 | 26 |
| 25 | Quantum Sensitivity (RR) | RR | P4 | 31 | 6 | 25 |
| 5 | Textbook Classic | RR | P4 | 29 | 5 | 24 |
| 12 | Convoy Effect Demo | FCFS | P3 | 27 | 3 | 24 |
| 15 | Convoy Effect Demo | FCFS | P3 | 27 | 3 | 24 |
| 24 | Quantum Sensitivity (RR) | RR | P4 | 29 | 6 | 23 |
| 5 | Textbook Classic | RR | P3 | 30 | 9 | 21 |
| 12 | Convoy Effect Demo | FCFS | P2 | 24 | 3 | 21 |
| 15 | Convoy Effect Demo | FCFS | P2 | 24 | 3 | 21 |

---

### 7. Users with No Saved Runs

**Purpose:** Audit user engagement to identify accounts that have registered but have not yet executed or saved any simulations.

**DBMS Concept:** LEFT OUTER JOIN with IS NULL filter (classic SQL anti-join pattern).

```sql
SELECT u.UserID, u.Name, u.Email, u.CreatedAt
FROM Users u
LEFT JOIN SimulationRuns r ON r.RunBy = u.UserID
WHERE r.RunID IS NULL
ORDER BY u.UserID ASC;
```

**Actual Query Output (1 rows):**

| UserID | Name | Email | CreatedAt |
| --- | --- | --- | --- |
| 3 | Charlie Hopper | charlie@gehu.ac.in | 2026-10-28 15:26:11 |

---

### 8. Context-Switch Overhead per Algorithm

**Purpose:** Quantify the system overhead induced by preemptive dispatching across different scheduling strategies.

**DBMS Concept:** Conditional Aggregation using SUM(CASE WHEN ...) to isolate specific slot types without separate subqueries.

```sql
SELECT a.Code AS AlgorithmCode, a.Name AS AlgorithmName,
       COUNT(DISTINCT r.RunID) AS TotalRuns,
       SUM(CASE WHEN g.SlotType = 'CS' THEN 1 ELSE 0 END) AS TotalCSSlots,
       SUM(CASE WHEN g.SlotType = 'CS' THEN (g.EndTime - g.StartTime) ELSE 0 END) AS TotalCSTimeMs
FROM Algorithms a
JOIN SimulationRuns r ON r.AlgorithmID = a.AlgorithmID
JOIN GanttSlots g ON g.RunID = r.RunID
GROUP BY a.AlgorithmID, a.Code, a.Name
ORDER BY TotalCSTimeMs DESC;
```

**Actual Query Output (8 rows):**

| AlgorithmCode | AlgorithmName | TotalRuns | TotalCSSlots | TotalCSTimeMs |
| --- | --- | --- | --- | --- |
| RR | Round Robin | 8 | 44 | 44 |
| FCFS | First-Come, First-Served | 6 | 0 | 0 |
| SJF | Shortest Job First | 5 | 0 | 0 |
| SRTF | Shortest Remaining Time First | 3 | 0 | 0 |
| PRIORITY_NP | Priority Scheduling (Non-Preemptive) | 2 | 0 | 0 |
| PRIORITY_P | Priority Scheduling (Preemptive) | 3 | 0 | 0 |
| MLQ | Multilevel Queue | 1 | 0 | 0 |
| MLFQ | Multilevel Feedback Queue | 2 | 0 | 0 |

---

### 9. CPU Utilization Ranking Across All Runs

**Purpose:** Rank the most efficient simulations in terms of CPU busy time percentage vs idle time and context switch overhead.

**DBMS Concept:** Complex view query against vw_run_summary demonstrating computed ratio rankings.

```sql
SELECT RunID, ScenarioTitle, AlgorithmCode, CpuUtilization, Makespan, ProcessCount, AvgWT, Throughput, ContextSwitches
FROM vw_run_summary
ORDER BY CpuUtilization DESC, Makespan ASC
LIMIT 10;
```

**Actual Query Output (10 rows):**

| RunID | ScenarioTitle | AlgorithmCode | CpuUtilization | Makespan | ProcessCount | AvgWT | Throughput | ContextSwitches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 29 | Test B Priority Benchmark | PRIORITY_NP | 100 | 10 | 4 | 3.25 | 0.4 | 0 |
| 30 | Test B Priority Benchmark | PRIORITY_P | 100 | 10 | 4 | 2.75 | 0.4 | 0 |
| 18 | Test A Benchmark | FCFS | 100 | 22 | 4 | 5.75 | 0.182 | 0 |
| 19 | Test A Benchmark | SJF | 100 | 22 | 4 | 5.25 | 0.182 | 0 |
| 20 | Test A Benchmark | SRTF | 100 | 22 | 4 | 5 | 0.182 | 0 |
| 21 | Starvation & Aging Showcase | PRIORITY_NP | 100 | 24 | 4 | 6.75 | 0.167 | 0 |
| 22 | Starvation & Aging Showcase | PRIORITY_P | 100 | 24 | 4 | 6.75 | 0.167 | 0 |
| 23 | Starvation & Aging Showcase | PRIORITY_P | 100 | 24 | 4 | 6.75 | 0.167 | 0 |
| 27 | MLFQ Dynamic Queue Flow | MLFQ | 100 | 26 | 3 | 7.33 | 0.115 | 0 |
| 28 | MLFQ Dynamic Queue Flow | FCFS | 100 | 26 | 3 | 8.67 | 0.115 | 0 |

---

### 10. The Integrity Check Across All Runs

**Purpose:** Verify that textbook scheduling formulas independently recomputed from raw Gantt slices match stored engine metrics exactly.

**DBMS Concept:** Set theory UNION ALL discrepancy audit via view vw_metrics_mismatch.

```sql
SELECT * FROM vw_metrics_mismatch;
```

**Actual Query Output (0 rows):**

_No rows returned (empty result set)._

---

### 11. A Saved Run's Full Gantt Timeline in Sequence

**Purpose:** Retrieve the chronologically ordered CPU time slices representing the animated execution trace of Run #1.

**DBMS Concept:** Single-table indexed lookup ordered by composite primary key sequence (RunID, Seq).

```sql
SELECT g.RunID, g.Seq, g.SlotType, g.PID, g.StartTime, g.EndTime, (g.EndTime - g.StartTime) AS Duration
FROM GanttSlots g
WHERE g.RunID = 1
ORDER BY g.Seq ASC;
```

**Actual Query Output (5 rows):**

| RunID | Seq | SlotType | PID | StartTime | EndTime | Duration |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | RUN | P1 | 0 | 8 | 8 |
| 1 | 2 | RUN | P2 | 8 | 12 | 4 |
| 1 | 3 | RUN | P3 | 12 | 21 | 9 |
| 1 | 4 | RUN | P4 | 21 | 26 | 5 |
| 1 | 5 | RUN | P5 | 26 | 28 | 2 |

---

### 12. Race Groups and Their Optimal Winners

**Purpose:** Group together simulations that competed simultaneously in Race Mode and extract the top-performing algorithm per race.

**DBMS Concept:** Common Table Expression (CTE) combined with window function RANK() OVER (PARTITION BY RaceGroup).

```sql
WITH RankedRace AS (
    SELECT r.RaceGroup, r.RunID, s.Title AS ScenarioTitle, a.Code AS AlgorithmCode,
           ROUND(AVG(m.WaitingTime), 2) AS AvgWT,
           RANK() OVER (PARTITION BY r.RaceGroup ORDER BY AVG(m.WaitingTime) ASC) AS RaceRank
    FROM SimulationRuns r
    JOIN Scenarios s ON s.ScenarioID = r.ScenarioID
    JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
    JOIN RunMetrics m ON m.RunID = r.RunID
    WHERE r.RaceGroup IS NOT NULL
    GROUP BY r.RaceGroup, r.RunID, s.Title, a.Code
)
SELECT RaceGroup, ScenarioTitle, AlgorithmCode AS WinningAlgorithm, AvgWT AS WinningAvgWT, RunID
FROM RankedRace
WHERE RaceRank = 1
ORDER BY RaceGroup ASC;
```

**Actual Query Output (2 rows):**

| RaceGroup | ScenarioTitle | WinningAlgorithm | WinningAvgWT | RunID |
| --- | --- | --- | --- | --- |
| Race_Convoy_Benchmark | Convoy Effect Demo | SJF | 3 | 16 |
| Race_Textbook_Showdown | Textbook Classic | SRTF | 6.6 | 10 |

---

## 13. Index Evidence: EXPLAIN QUERY PLAN Analysis

To provide concrete evidence of index effectiveness, SQLite's `EXPLAIN QUERY PLAN` is evaluated for Query 3 and Query 11 under both indexed and unindexed execution paths.

### 13.1 Query 11 Plan Comparison: Chronological Gantt Timeline Retrieval

**Indexed Query Plan (Using Primary Key `GanttSlots(RunID, Seq)`):**
```text
• id: 4, parent: 0 | detail: SEARCH g USING INDEX sqlite_autoindex_GanttSlots_1 (RunID=?)
```

**Unindexed Query Plan (Simulated Table Scan without Composite Key):**
```text
• id: 3, parent: 0 | detail: SCAN g
• id: 17, parent: 0 | detail: USE TEMP B-TREE FOR ORDER BY
```

**Analysis:**
When executing Query 11 against the primary key index on `GanttSlots(RunID, Seq)`, SQLite executes a targeted B-tree search directly on the primary key (`SEARCH g USING INDEX sqlite_autoindex_GanttSlots_1 (RunID=?)`). Because the composite index naturally stores entries ordered by `Seq` for any given `RunID`, SQLite retrieves rows in pre-sorted order without performing an explicit sort pass. Conversely, in the unindexed plan, the query planner is forced to execute a full table scan across all Gantt slots (`SCAN g`) and must allocate a temporary sorting structure in memory (`USE TEMP B-TREE FOR ORDER BY`) to order the records by sequence. For workloads with hundreds of simulation runs containing thousands of Gantt slices, the primary key eliminates both full-table I/O and intermediate sorting passes.

### 13.2 Query 3 Plan Comparison: Filtered Multi-Table Aggregation across Runs and Metrics

**Indexed Query Plan (Using Composite Index `idx_runs_scenario_algo` on `SimulationRuns(ScenarioID, AlgorithmID)`):**
```text
• id: 10, parent: 0 | detail: SEARCH r USING COVERING INDEX idx_runs_scenario_algo (ScenarioID=?)
• id: 14, parent: 0 | detail: SEARCH a USING INTEGER PRIMARY KEY (rowid=?)
• id: 17, parent: 0 | detail: SEARCH m USING INDEX sqlite_autoindex_RunMetrics_1 (RunID=?)
• id: 22, parent: 0 | detail: USE TEMP B-TREE FOR GROUP BY
```

**Unindexed Query Plan (Simulated Table Scan without `idx_runs_scenario_algo`):**
```text
• id: 9, parent: 0 | detail: SCAN m
• id: 11, parent: 0 | detail: SEARCH r USING INTEGER PRIMARY KEY (rowid=?)
• id: 16, parent: 0 | detail: SEARCH a USING INTEGER PRIMARY KEY (rowid=?)
• id: 19, parent: 0 | detail: USE TEMP B-TREE FOR GROUP BY
```

**Analysis:**
In the indexed plan, SQLite leverages the composite covering index `idx_runs_scenario_algo` on `SimulationRuns(ScenarioID, AlgorithmID)` to immediately seek only the simulation runs belonging to `ScenarioID = 1` (`SEARCH r USING COVERING INDEX idx_runs_scenario_algo (ScenarioID=?)`). Because the index covers both the filter column (`ScenarioID`) and the join column (`AlgorithmID`), SQLite avoids reading `SimulationRuns` base table pages entirely, and navigates directly into matching metrics via `RunMetrics`'s primary key (`SEARCH m USING INDEX sqlite_autoindex_RunMetrics_1 (RunID=?)`). In contrast, when index usage on `ScenarioID` is inhibited, SQLite cannot prune the outer search space; it reverts to a full table scan over the entire `RunMetrics` relation (`SCAN m`) and performs point lookups into `SimulationRuns` for every metric row in the database before grouping. The index therefore replaces an unconstrained sequential scan over child metrics with targeted logarithmic B-tree seeks.
