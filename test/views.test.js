import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { resetDatabase } from '../server/db/reset.js';
import { simulateFCFS, simulateSJF } from '../src/engine/schedulerEngine.js';

function createTestDb() {
  const db = new Database(':memory:');
  resetDatabase(db);
  return db;
}

// Helper to save simulation result directly into DB
function saveSimulationToDb(db, { userId, scenarioId, algorithmCode, simulationResult, quantum = null, csTime = 0, agingInterval = null, raceGroup = null }) {
  const algo = db.prepare('SELECT AlgorithmID FROM Algorithms WHERE Code = ?').get(algorithmCode);

  const saveTx = db.transaction(() => {
    const run = db.prepare(`
      INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum, ContextSwitchTime, AgingInterval, RaceGroup)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING RunID
    `).get(scenarioId, algo.AlgorithmID, userId, quantum, csTime, agingInterval, raceGroup);

    const runId = run.RunID;

    // Insert Gantt slots
    const insertSlot = db.prepare(`
      INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    simulationResult.timeline.forEach((slot, idx) => {
      const slotType = slot.type.toUpperCase();
      const pid = slotType === 'RUN' ? slot.pid : null;
      insertSlot.run(runId, idx + 1, slotType, pid, slot.start, slot.end);
    });

    // Insert RunMetrics
    const insertMetric = db.prepare(`
      INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    simulationResult.processMetrics.forEach(m => {
      insertMetric.run(runId, m.pid, m.completionTime, m.turnaroundTime, m.waitingTime, m.responseTime);
    });

    return runId;
  });

  return saveTx();
}

test('Phase 3 - Correct Run (Test A FCFS): vw_metrics_mismatch returns 0 rows', () => {
  const db = createTestDb();

  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Alice', 'alice@test.com', 'hash') RETURNING *").get();
  const scenario = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Test A Scenario') RETURNING *").get(user.UserID);

  // Test A processes: (P1,0,5) (P2,1,3) (P3,2,8) (P4,3,6)
  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 1 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8, priority: 1 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 6, priority: 1 }
  ];

  const insertProc = db.prepare('INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority) VALUES (?, ?, ?, ?, ?)');
  processes.forEach(p => insertProc.run(scenario.ScenarioID, p.pid, p.arrivalTime, p.burstTime, p.priority));

  const fcfsResult = simulateFCFS(processes, { csOverhead: 0 });
  const runId = saveSimulationToDb(db, {
    userId: user.UserID,
    scenarioId: scenario.ScenarioID,
    algorithmCode: 'FCFS',
    simulationResult: fcfsResult,
    csTime: 0
  });

  // Check vw_metrics_recomputed
  const recomputed = db.prepare('SELECT * FROM vw_metrics_recomputed WHERE RunID = ? ORDER BY PID').all(runId);
  assert.equal(recomputed.length, 4);
  assert.equal(recomputed[0].PID, 'P1');
  assert.equal(recomputed[0].CompletionTime, 5);
  assert.equal(recomputed[0].WaitingTime, 0);
  assert.equal(recomputed[1].PID, 'P2');
  assert.equal(recomputed[1].CompletionTime, 8);
  assert.equal(recomputed[1].WaitingTime, 4);
  assert.equal(recomputed[2].PID, 'P3');
  assert.equal(recomputed[2].CompletionTime, 16);
  assert.equal(recomputed[2].WaitingTime, 6);
  assert.equal(recomputed[3].PID, 'P4');
  assert.equal(recomputed[3].CompletionTime, 22);
  assert.equal(recomputed[3].WaitingTime, 13);

  // Check vw_metrics_mismatch
  const mismatches = db.prepare('SELECT * FROM vw_metrics_mismatch WHERE RunID = ?').all(runId);
  assert.equal(mismatches.length, 0, 'vw_metrics_mismatch must return exactly 0 rows for a valid run');
});

test('Phase 3 - Tampered Run: vw_metrics_mismatch detects METRIC_MISMATCH', () => {
  const db = createTestDb();

  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Alice', 'alice@test.com', 'hash') RETURNING *").get();
  const scenario = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Test A Scenario') RETURNING *").get(user.UserID);

  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3 }
  ];

  processes.forEach(p => db.prepare('INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, ?, ?, ?)').run(scenario.ScenarioID, p.pid, p.arrivalTime, p.burstTime));

  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy) VALUES (?, ?, ?) RETURNING *").get(scenario.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // Slots: P1[0,5], P2[5,8]
  db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 0, 5)").run(run.RunID);
  db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 2, 'RUN', 'P2', 5, 8)").run(run.RunID);

  // Insert P1 correctly: WT = 0
  db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P1', 5, 5, 0, 0)").run(run.RunID);

  // Insert P2 with WRONG WaitingTime: WT = 99 (recomputed should be 5 - 1 = 4)
  db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P2', 8, 7, 99, 4)").run(run.RunID);

  const mismatches = db.prepare('SELECT * FROM vw_metrics_mismatch WHERE RunID = ?').all(run.RunID);
  assert.equal(mismatches.length, 1);
  assert.equal(mismatches[0].PID, 'P2');
  assert.equal(mismatches[0].ProblemType, 'METRIC_MISMATCH');
});

test('Phase 3 - Missing/Incomplete Data Anomalies in vw_metrics_mismatch', () => {
  const db = createTestDb();

  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Alice', 'alice@test.com', 'hash') RETURNING *").get();
  const scenario = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Anomaly Sc') RETURNING *").get(user.UserID);

  // Processes: P1 and P2
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 5)").run(scenario.ScenarioID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P2', 0, 4)").run(scenario.ScenarioID);

  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy) VALUES (?, ?, ?) RETURNING *").get(scenario.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // Only P1 gets a Gantt slot, but executed for 6 units (burst is 5)
  db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 0, 6)").run(run.RunID);

  // Only P1 gets metrics
  db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P1', 6, 6, 1, 0)").run(run.RunID);

  const mismatches = db.prepare('SELECT * FROM vw_metrics_mismatch WHERE RunID = ? ORDER BY ProblemType').all(run.RunID);

  // Expected anomalies:
  // 1. EXECUTED_NOT_EQUAL_BURST for P1 (executed 6 vs burst 5)
  // 2. METRICS_MISSING for P2
  // 3. PROCESS_NEVER_RAN for P2
  const problemTypes = mismatches.map(m => m.ProblemType);
  assert.ok(problemTypes.includes('EXECUTED_NOT_EQUAL_BURST'), 'Should detect execution time not matching burst');
  assert.ok(problemTypes.includes('PROCESS_NEVER_RAN'), 'Should detect unexecuted process P2');
  assert.ok(problemTypes.includes('METRICS_MISSING'), 'Should detect missing metrics for P2');
});

test('Phase 3 - Summary and Leaderboard Match Hand Calculations for Test A', () => {
  const db = createTestDb();

  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Alice', 'alice@test.com', 'hash') RETURNING *").get();
  const scenario = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Test A Workload') RETURNING *").get(user.UserID);

  const processes = [
    { id: '1', pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 1 },
    { id: '2', pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { id: '3', pid: 'P3', arrivalTime: 2, burstTime: 8, priority: 1 },
    { id: '4', pid: 'P4', arrivalTime: 3, burstTime: 6, priority: 1 }
  ];

  processes.forEach(p => db.prepare('INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority) VALUES (?, ?, ?, ?, ?)')
    .run(scenario.ScenarioID, p.pid, p.arrivalTime, p.burstTime, p.priority));

  // Run 1: FCFS
  const fcfsResult = simulateFCFS(processes, { csOverhead: 0 });
  const fcfsRunId = saveSimulationToDb(db, {
    userId: user.UserID,
    scenarioId: scenario.ScenarioID,
    algorithmCode: 'FCFS',
    simulationResult: fcfsResult
  });

  // Run 2: SJF
  const sjfResult = simulateSJF(processes, { csOverhead: 0 });
  const sjfRunId = saveSimulationToDb(db, {
    userId: user.UserID,
    scenarioId: scenario.ScenarioID,
    algorithmCode: 'SJF',
    simulationResult: sjfResult
  });

  // Test vw_run_summary for FCFS
  const fcfsSummary = db.prepare('SELECT * FROM vw_run_summary WHERE RunID = ?').get(fcfsRunId);
  assert.equal(fcfsSummary.ScenarioTitle, 'Test A Workload');
  assert.equal(fcfsSummary.AlgorithmCode, 'FCFS');
  assert.equal(fcfsSummary.ProcessCount, 4);
  assert.equal(fcfsSummary.AvgWT, 5.75);
  assert.equal(fcfsSummary.AvgTAT, 11.25);
  assert.equal(fcfsSummary.Makespan, 22);
  assert.equal(fcfsSummary.CpuUtilization, 100.0);
  assert.equal(fcfsSummary.Throughput, 0.182); // 4 / 22 = 0.1818... -> 0.182
  assert.equal(fcfsSummary.ContextSwitches, 0);

  // Test vw_run_summary for SJF
  const sjfSummary = db.prepare('SELECT * FROM vw_run_summary WHERE RunID = ?').get(sjfRunId);
  assert.equal(sjfSummary.AlgorithmCode, 'SJF');
  assert.equal(sjfSummary.AvgWT, 5.25);
  assert.equal(sjfSummary.Makespan, 22);

  // Test vw_algorithm_leaderboard
  const leaderboard = db.prepare('SELECT * FROM vw_algorithm_leaderboard WHERE ScenarioID = ? ORDER BY AlgorithmRank').all(scenario.ScenarioID);
  assert.equal(leaderboard.length, 2);

  // SJF (AvgWT 5.25) should be Rank 1
  assert.equal(leaderboard[0].AlgorithmCode, 'SJF');
  assert.equal(leaderboard[0].AvgWT, 5.25);
  assert.equal(leaderboard[0].AlgorithmRank, 1);

  // FCFS (AvgWT 5.75) should be Rank 2
  assert.equal(leaderboard[1].AlgorithmCode, 'FCFS');
  assert.equal(leaderboard[1].AvgWT, 5.75);
  assert.equal(leaderboard[1].AlgorithmRank, 2);
});

test('Phase 3 - User Activity View Includes Inactive Users', () => {
  const db = createTestDb();

  const userActive = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Active User', 'active@test.com', 'h') RETURNING *").get();
  const userInactive = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Inactive User', 'inactive@test.com', 'h') RETURNING *").get();

  const sc = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Active Sc') RETURNING *").get(userActive.UserID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 5)").run(sc.ScenarioID);

  const fcfs = simulateFCFS([{ pid: 'P1', arrivalTime: 0, burstTime: 5 }]);
  saveSimulationToDb(db, {
    userId: userActive.UserID,
    scenarioId: sc.ScenarioID,
    algorithmCode: 'FCFS',
    simulationResult: fcfs
  });

  const activity = db.prepare('SELECT * FROM vw_user_activity ORDER BY UserID').all();
  assert.equal(activity.length, 2);

  // Active user
  assert.equal(activity[0].UserID, userActive.UserID);
  assert.equal(activity[0].ScenarioCount, 1);
  assert.equal(activity[0].RunCount, 1);
  assert.equal(activity[0].MostUsedAlgorithm, 'FCFS');

  // Inactive user must still appear via LEFT JOIN
  assert.equal(activity[1].UserID, userInactive.UserID);
  assert.equal(activity[1].ScenarioCount, 0);
  assert.equal(activity[1].RunCount, 0);
  assert.equal(activity[1].MostUsedAlgorithm, 'None');
});
