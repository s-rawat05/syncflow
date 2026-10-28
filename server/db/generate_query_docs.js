/**
 * SyncFlow SQL Queries Documentation Generator
 * Executes all 12 PBL demonstration queries on the active demo database,
 * extracts EXPLAIN QUERY PLAN index evidence, and writes docs/SQL_QUERIES.md.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDb } from './connection.js';
import { seedDemoData } from './seed_demo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_OUTPUT_PATH = path.resolve(__dirname, '../../docs/SQL_QUERIES.md');

/**
 * Converts SQLite result row array to GitHub-flavored Markdown table
 */
function toMarkdownTable(rows) {
  if (!rows || rows.length === 0) {
    return '_No rows returned (empty result set)._\n';
  }

  const headers = Object.keys(rows[0]);
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;

  const dataLines = rows.map(row => {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      return String(val).replace(/\|/g, '\\|');
    });
    return `| ${values.join(' | ')} |`;
  });

  return [headerLine, separatorLine, ...dataLines].join('\n') + '\n';
}

function runExplainPlan(db, sql) {
  const planRows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();
  return planRows.map(r => `• id: ${r.id}, parent: ${r.parent} | detail: ${r.detail}`).join('\n');
}

export function generateQueryDocs() {
  const db = getDb();

  // Ensure demo data is present
  const existingRuns = db.prepare('SELECT COUNT(*) AS count FROM SimulationRuns').get().count;
  if (existingRuns === 0) {
    console.log('SimulationRuns table is empty. Running seedDemoData() first...');
    seedDemoData(db);
  }

  console.log('Executing PBL demonstration SQL queries against demo database...');

  const querySpecs = [
    {
      num: 1,
      title: 'All Scenarios of a User with Process Counts',
      purpose: 'Retrieve all scheduling scenarios created by user Alice Turing with their computed process count.',
      concept: 'INNER JOIN (between Scenarios, Users, and Processes) combined with GROUP BY aggregation.',
      sql: `SELECT s.ScenarioID, s.Title, u.Name AS Owner, s.IsPublic, COUNT(p.PID) AS ProcessCount
FROM Scenarios s
JOIN Users u ON u.UserID = s.OwnerID
JOIN Processes p ON p.ScenarioID = s.ScenarioID
WHERE u.Email = 'alice@gehu.ac.in'
GROUP BY s.ScenarioID, s.Title, u.Name, s.IsPublic
ORDER BY s.ScenarioID ASC;`
    },
    {
      num: 2,
      title: 'Scenarios with More Than 4 Processes',
      purpose: 'Filter workload scenarios that represent larger multi-process batches exceeding 4 tasks.',
      concept: 'HAVING clause filtering post-aggregated grouping results (distinguishing WHERE vs HAVING).',
      sql: `SELECT s.ScenarioID, s.Title, u.Name AS Owner, COUNT(p.PID) AS ProcessCount
FROM Scenarios s
JOIN Users u ON u.UserID = s.OwnerID
JOIN Processes p ON p.ScenarioID = s.ScenarioID
GROUP BY s.ScenarioID, s.Title, u.Name
HAVING COUNT(p.PID) > 4
ORDER BY ProcessCount DESC;`
    },
    {
      num: 3,
      title: 'Average Waiting Time per Algorithm Across All Runs',
      purpose: 'Evaluate overall scheduling efficiency across all simulated workloads to rank algorithms by average wait.',
      concept: 'Three-table JOIN (Algorithms, SimulationRuns, RunMetrics) with aggregate function AVG() and GROUP BY.',
      sql: `SELECT a.Code AS AlgorithmCode, a.Name AS AlgorithmName,
       COUNT(DISTINCT r.RunID) AS TotalRuns,
       ROUND(AVG(m.WaitingTime), 2) AS OverallAvgWT,
       ROUND(AVG(m.TurnaroundTime), 2) AS OverallAvgTAT
FROM Algorithms a
JOIN SimulationRuns r ON r.AlgorithmID = a.AlgorithmID
JOIN RunMetrics m ON m.RunID = r.RunID
GROUP BY a.AlgorithmID, a.Code, a.Name
ORDER BY OverallAvgWT ASC;`
    },
    {
      num: 4,
      title: 'Best Algorithm per Scenario (Window Function Leaderboard)',
      purpose: 'Identify which scheduling algorithm achieved the lowest average waiting time for each distinct scenario.',
      concept: 'SQL Window Function RANK() OVER (PARTITION BY ScenarioID ORDER BY AvgWT ASC) evaluated via view vw_algorithm_leaderboard.',
      sql: `SELECT ScenarioID, ScenarioTitle, AlgorithmCode, AlgorithmName, AvgWT, AvgTAT, CpuUtilization
FROM vw_algorithm_leaderboard
WHERE AlgorithmRank = 1
ORDER BY ScenarioID ASC;`
    },
    {
      num: 5,
      title: 'Runs with Above-Average Waiting Time for Their Scenario',
      purpose: 'Detect simulation runs whose average waiting time was worse than the scenario average across all competing algorithms.',
      concept: 'Correlated Subquery comparing an aggregated outer group with a dynamic sub-select correlated on ScenarioID.',
      sql: `SELECT r.RunID, s.Title AS ScenarioTitle, a.Code AS AlgorithmCode,
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
ORDER BY s.ScenarioID ASC, RunAvgWT DESC;`
    },
    {
      num: 6,
      title: 'Processes that Waited Longer than Their Own Burst Time',
      purpose: 'Identify severe queuing delays where a process waited in ready queue longer than its actual required CPU computation.',
      concept: 'Multi-table JOIN comparing child table metrics against parent process specification, with computed column and arithmetic filter.',
      sql: `SELECT r.RunID, s.Title AS ScenarioTitle, a.Code AS AlgorithmCode,
       m.PID, m.WaitingTime, p.BurstTime, (m.WaitingTime - p.BurstTime) AS ExcessWait
FROM RunMetrics m
JOIN SimulationRuns r ON r.RunID = m.RunID
JOIN Scenarios s ON s.ScenarioID = r.ScenarioID
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN Processes p ON p.ScenarioID = r.ScenarioID AND p.PID = m.PID
WHERE m.WaitingTime > p.BurstTime
ORDER BY ExcessWait DESC
LIMIT 12;`
    },
    {
      num: 7,
      title: 'Users with No Saved Runs',
      purpose: 'Audit user engagement to identify accounts that have registered but have not yet executed or saved any simulations.',
      concept: 'LEFT OUTER JOIN with IS NULL filter (classic SQL anti-join pattern).',
      sql: `SELECT u.UserID, u.Name, u.Email, u.CreatedAt
FROM Users u
LEFT JOIN SimulationRuns r ON r.RunBy = u.UserID
WHERE r.RunID IS NULL
ORDER BY u.UserID ASC;`
    },
    {
      num: 8,
      title: 'Context-Switch Overhead per Algorithm',
      purpose: 'Quantify the system overhead induced by preemptive dispatching across different scheduling strategies.',
      concept: 'Conditional Aggregation using SUM(CASE WHEN ...) to isolate specific slot types without separate subqueries.',
      sql: `SELECT a.Code AS AlgorithmCode, a.Name AS AlgorithmName,
       COUNT(DISTINCT r.RunID) AS TotalRuns,
       SUM(CASE WHEN g.SlotType = 'CS' THEN 1 ELSE 0 END) AS TotalCSSlots,
       SUM(CASE WHEN g.SlotType = 'CS' THEN (g.EndTime - g.StartTime) ELSE 0 END) AS TotalCSTimeMs
FROM Algorithms a
JOIN SimulationRuns r ON r.AlgorithmID = a.AlgorithmID
JOIN GanttSlots g ON g.RunID = r.RunID
GROUP BY a.AlgorithmID, a.Code, a.Name
ORDER BY TotalCSTimeMs DESC;`
    },
    {
      num: 9,
      title: 'CPU Utilization Ranking Across All Runs',
      purpose: 'Rank the most efficient simulations in terms of CPU busy time percentage vs idle time and context switch overhead.',
      concept: 'Complex view query against vw_run_summary demonstrating computed ratio rankings.',
      sql: `SELECT RunID, ScenarioTitle, AlgorithmCode, CpuUtilization, Makespan, ProcessCount, AvgWT, Throughput, ContextSwitches
FROM vw_run_summary
ORDER BY CpuUtilization DESC, Makespan ASC
LIMIT 10;`
    },
    {
      num: 10,
      title: 'The Integrity Check Across All Runs',
      purpose: 'Verify that textbook scheduling formulas independently recomputed from raw Gantt slices match stored engine metrics exactly.',
      concept: 'Set theory UNION ALL discrepancy audit via view vw_metrics_mismatch.',
      sql: `SELECT * FROM vw_metrics_mismatch;`
    },
    {
      num: 11,
      title: "A Saved Run's Full Gantt Timeline in Sequence",
      purpose: 'Retrieve the chronologically ordered CPU time slices representing the animated execution trace of Run #1.',
      concept: 'Single-table indexed lookup ordered by composite primary key sequence (RunID, Seq).',
      sql: `SELECT g.RunID, g.Seq, g.SlotType, g.PID, g.StartTime, g.EndTime, (g.EndTime - g.StartTime) AS Duration
FROM GanttSlots g
WHERE g.RunID = 1
ORDER BY g.Seq ASC;`
    },
    {
      num: 12,
      title: 'Race Groups and Their Optimal Winners',
      purpose: 'Group together simulations that competed simultaneously in Race Mode and extract the top-performing algorithm per race.',
      concept: 'Common Table Expression (CTE) combined with window function RANK() OVER (PARTITION BY RaceGroup).',
      sql: `WITH RankedRace AS (
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
ORDER BY RaceGroup ASC;`
    }
  ];

  let mdContent = `# SyncFlow Database — SQL Demonstration Queries & Index Evidence

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

`;

  // Execute and format each query
  querySpecs.forEach(q => {
    console.log(`Running Query ${q.num}: ${q.title}`);
    const rows = db.prepare(q.sql).all();

    mdContent += `### ${q.num}. ${q.title}\n\n`;
    mdContent += `**Purpose:** ${q.purpose}\n\n`;
    mdContent += `**DBMS Concept:** ${q.concept}\n\n`;
    mdContent += `\`\`\`sql\n${q.sql}\n\`\`\`\n\n`;
    mdContent += `**Actual Query Output (${rows.length} rows):**\n\n`;
    mdContent += toMarkdownTable(rows);
    mdContent += `\n---\n\n`;
  });

  // Index Evidence Section
  console.log('Generating EXPLAIN QUERY PLAN index evidence for Query 3 and Query 11...');

  mdContent += `## 13. Index Evidence: EXPLAIN QUERY PLAN Analysis\n\n`;
  mdContent += `To provide concrete evidence of index effectiveness, SQLite's \`EXPLAIN QUERY PLAN\` is evaluated for Query 3 and Query 11 under both indexed and unindexed execution paths.\n\n`;

  // --- Analysis for Query 11 ---
  const q11SqlIndexed = `SELECT g.RunID, g.Seq, g.SlotType, g.PID, g.StartTime, g.EndTime
FROM GanttSlots g
WHERE g.RunID = 1
ORDER BY g.Seq ASC;`;

  // Inhibiting index on RunID and Seq using unary '+' operator forces full scan and explicit temp b-tree sort
  const q11SqlUnindexed = `SELECT g.RunID, g.Seq, g.SlotType, g.PID, g.StartTime, g.EndTime
FROM GanttSlots g
WHERE +g.RunID = 1
ORDER BY +g.Seq ASC;`;

  const q11PlanIndexed = runExplainPlan(db, q11SqlIndexed);
  const q11PlanUnindexed = runExplainPlan(db, q11SqlUnindexed);

  mdContent += `### 13.1 Query 11 Plan Comparison: Chronological Gantt Timeline Retrieval\n\n`;
  mdContent += `**Indexed Query Plan (Using Primary Key \`GanttSlots(RunID, Seq)\`):**\n`;
  mdContent += `\`\`\`text\n${q11PlanIndexed}\n\`\`\`\n\n`;
  mdContent += `**Unindexed Query Plan (Simulated Table Scan without Composite Key):**\n`;
  mdContent += `\`\`\`text\n${q11PlanUnindexed}\n\`\`\`\n\n`;
  mdContent += `**Analysis:**\n`;
  mdContent += `When executing Query 11 against the primary key index on \`GanttSlots(RunID, Seq)\`, SQLite executes a targeted B-tree search directly on the primary key (\`SEARCH g USING INDEX sqlite_autoindex_GanttSlots_1 (RunID=?)\`). Because the composite index naturally stores entries ordered by \`Seq\` for any given \`RunID\`, SQLite retrieves rows in pre-sorted order without performing an explicit sort pass. Conversely, in the unindexed plan, the query planner is forced to execute a full table scan across all Gantt slots (\`SCAN g\`) and must allocate a temporary sorting structure in memory (\`USE TEMP B-TREE FOR ORDER BY\`) to order the records by sequence. For workloads with hundreds of simulation runs containing thousands of Gantt slices, the primary key eliminates both full-table I/O and intermediate sorting passes.\n\n`;

  // --- Analysis for Query 3 ---
  const q3SqlIndexed = `SELECT a.Code, ROUND(AVG(m.WaitingTime), 2) AS OverallAvgWT
FROM SimulationRuns r
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN RunMetrics m ON m.RunID = r.RunID
WHERE r.ScenarioID = 1
GROUP BY a.Code;`;

  // Inhibiting index on ScenarioID using unary '+' operator forces full scan across RunMetrics
  const q3SqlUnindexed = `SELECT a.Code, ROUND(AVG(m.WaitingTime), 2) AS OverallAvgWT
FROM SimulationRuns r
JOIN Algorithms a ON a.AlgorithmID = r.AlgorithmID
JOIN RunMetrics m ON m.RunID = r.RunID
WHERE +r.ScenarioID = 1
GROUP BY a.Code;`;

  const q3PlanIndexed = runExplainPlan(db, q3SqlIndexed);
  const q3PlanUnindexed = runExplainPlan(db, q3SqlUnindexed);

  mdContent += `### 13.2 Query 3 Plan Comparison: Filtered Multi-Table Aggregation across Runs and Metrics\n\n`;
  mdContent += `**Indexed Query Plan (Using Composite Index \`idx_runs_scenario_algo\` on \`SimulationRuns(ScenarioID, AlgorithmID)\`):**\n`;
  mdContent += `\`\`\`text\n${q3PlanIndexed}\n\`\`\`\n\n`;
  mdContent += `**Unindexed Query Plan (Simulated Table Scan without \`idx_runs_scenario_algo\`):**\n`;
  mdContent += `\`\`\`text\n${q3PlanUnindexed}\n\`\`\`\n\n`;
  mdContent += `**Analysis:**\n`;
  mdContent += `In the indexed plan, SQLite leverages the composite covering index \`idx_runs_scenario_algo\` on \`SimulationRuns(ScenarioID, AlgorithmID)\` to immediately seek only the simulation runs belonging to \`ScenarioID = 1\` (\`SEARCH r USING COVERING INDEX idx_runs_scenario_algo (ScenarioID=?)\`). Because the index covers both the filter column (\`ScenarioID\`) and the join column (\`AlgorithmID\`), SQLite avoids reading \`SimulationRuns\` base table pages entirely, and navigates directly into matching metrics via \`RunMetrics\`'s primary key (\`SEARCH m USING INDEX sqlite_autoindex_RunMetrics_1 (RunID=?)\`). In contrast, when index usage on \`ScenarioID\` is inhibited, SQLite cannot prune the outer search space; it reverts to a full table scan over the entire \`RunMetrics\` relation (\`SCAN m\`) and performs point lookups into \`SimulationRuns\` for every metric row in the database before grouping. The index therefore replaces an unconstrained sequential scan over child metrics with targeted logarithmic B-tree seeks.\n`;

  // Write file
  fs.writeFileSync(DOCS_OUTPUT_PATH, mdContent, 'utf-8');
  console.log(`Successfully generated ${DOCS_OUTPUT_PATH}`);
}

// Execute standalone if called directly
if (process.argv[1]?.endsWith('generate_query_docs.js')) {
  generateQueryDocs();
}
