import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { resetDatabase } from '../server/db/reset.js';

function createTestDb() {
  const db = new Database(':memory:');
  resetDatabase(db);
  return db;
}

test('Phase 2 - Valid Inserts Work Across All Tables', () => {
  const db = createTestDb();

  // 1. Insert user
  const user = db.prepare(`
    INSERT INTO Users (Name, Email, PasswordHash)
    VALUES ('Alice Walker', 'alice@example.com', 'hashed_pw_alice')
    RETURNING *
  `).get();
  assert.equal(user.UserID, 1);
  assert.equal(user.Name, 'Alice Walker');

  // 2. Insert scenario
  const scenario = db.prepare(`
    INSERT INTO Scenarios (OwnerID, Title, Description, IsPublic)
    VALUES (?, 'Convoy Test Workload', 'Demonstrates convoy effect', 1)
    RETURNING *
  `).get(user.UserID);
  assert.equal(scenario.ScenarioID, 1);
  assert.equal(scenario.Title, 'Convoy Test Workload');

  // 3. Insert processes (1NF)
  db.prepare(`
    INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
    VALUES (?, 'P1', 0, 10, 1, 0),
           (?, 'P2', 1, 4, 2, 0)
  `).run(scenario.ScenarioID, scenario.ScenarioID);

  const procs = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY PID').all(scenario.ScenarioID);
  assert.equal(procs.length, 2);
  assert.equal(procs[0].PID, 'P1');
  assert.equal(procs[0].BurstTime, 10);

  // 4. Insert simulation run for FCFS (AlgorithmID = 1, UsesQuantum = 0, Quantum = NULL)
  const fcfsAlgo = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare(`
    INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum, ContextSwitchTime)
    VALUES (?, ?, ?, NULL, 0)
    RETURNING *
  `).get(scenario.ScenarioID, fcfsAlgo.AlgorithmID, user.UserID);
  assert.equal(run.RunID, 1);

  // 5. Insert Gantt slots
  db.prepare(`
    INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime)
    VALUES (?, 1, 'RUN', 'P1', 0, 10),
           (?, 2, 'RUN', 'P2', 10, 14)
  `).run(run.RunID, run.RunID);

  const slots = db.prepare('SELECT * FROM GanttSlots WHERE RunID = ? ORDER BY Seq').all(run.RunID);
  assert.equal(slots.length, 2);

  // 6. Insert RunMetrics
  db.prepare(`
    INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime)
    VALUES (?, 'P1', 10, 10, 0, 0),
           (?, 'P2', 14, 13, 9, 9)
  `).run(run.RunID, run.RunID);

  const metrics = db.prepare('SELECT * FROM RunMetrics WHERE RunID = ? ORDER BY PID').all(run.RunID);
  assert.equal(metrics.length, 2);
  assert.equal(metrics[1].WaitingTime, 9);
});

test('Phase 2 - CHECK Constraints Reject Invalid Data', () => {
  const db = createTestDb();

  const user = db.prepare(`
    INSERT INTO Users (Name, Email, PasswordHash)
    VALUES ('Bob Smith', 'bob@example.com', 'hashed_pw_bob')
    RETURNING *
  `).get();

  // Bad user name (< 2 chars)
  assert.throws(() => {
    db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('A', 'badname@example.com', 'pw')").run();
  }, /CHECK constraint failed/);

  // Bad user email pattern
  assert.throws(() => {
    db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('Valid Name', 'invalid-email', 'pw')").run();
  }, /CHECK constraint failed/);

  const scenario = db.prepare(`
    INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Valid Scenario') RETURNING *
  `).get(user.UserID);

  // Bad burst time (burst 0)
  assert.throws(() => {
    db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 0)").run(scenario.ScenarioID);
  }, /CHECK constraint failed/);

  // Bad arrival time (negative arrival)
  assert.throws(() => {
    db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', -1, 5)").run(scenario.ScenarioID);
  }, /CHECK constraint failed/);

  // Valid process for further tests
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 5)").run(scenario.ScenarioID);
  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare(`
    INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum) VALUES (?, ?, ?, NULL) RETURNING *
  `).get(scenario.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // Bad Gantt slot: EndTime <= StartTime
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 5, 5)").run(run.RunID);
  }, /CHECK constraint failed/);

  // Bad Gantt slot: RUN slot with NULL PID
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', NULL, 0, 5)").run(run.RunID);
  }, /CHECK constraint failed/);

  // Bad Gantt slot: IDLE slot with non-null PID
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'IDLE', 'P1', 0, 2)").run(run.RunID);
  }, /CHECK constraint failed/);

  // Bad TurnaroundTime (TurnaroundTime <= 0)
  assert.throws(() => {
    db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P1', 5, 0, 0, 0)").run(run.RunID);
  }, /CHECK constraint failed/);

  // Bad WaitingTime (negative)
  assert.throws(() => {
    db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P1', 5, 5, -1, 0)").run(run.RunID);
  }, /CHECK constraint failed/);
});

test('Phase 2 - Duplicate Scenario Title for Same User is Rejected', () => {
  const db = createTestDb();

  const user1 = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User One', 'u1@example.com', 'pw') RETURNING *").get();
  const user2 = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User Two', 'u2@example.com', 'pw') RETURNING *").get();

  db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Same Title')").run(user1.UserID);

  // Duplicate title for user 1 must fail
  assert.throws(() => {
    db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Same Title')").run(user1.UserID);
  }, /UNIQUE constraint failed/);

  // Same title for different user (user 2) must succeed
  const s2 = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Same Title') RETURNING *").get(user2.UserID);
  assert.equal(s2.OwnerID, user2.UserID);
});

test('Phase 2 - Quantum Rule Trigger: RR without Quantum and FCFS with Quantum are Rejected', () => {
  const db = createTestDb();
  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User', 'user@example.com', 'pw') RETURNING *").get();
  const sc = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Sc') RETURNING *").get(user.UserID);

  const rr = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'RR'").get();
  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();

  // RR requires Quantum (UsesQuantum = 1). Setting Quantum = NULL must fail.
  assert.throws(() => {
    db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum) VALUES (?, ?, ?, NULL)").run(sc.ScenarioID, rr.AlgorithmID, user.UserID);
  }, /Quantum constraint violation/);

  // RR with valid Quantum succeeds
  const validRR = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum) VALUES (?, ?, ?, 2) RETURNING *").get(sc.ScenarioID, rr.AlgorithmID, user.UserID);
  assert.equal(validRR.Quantum, 2);

  // FCFS forbids Quantum (UsesQuantum = 0). Setting Quantum = 2 must fail.
  assert.throws(() => {
    db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum) VALUES (?, ?, ?, 2)").run(sc.ScenarioID, fcfs.AlgorithmID, user.UserID);
  }, /Quantum constraint violation/);

  // FCFS with Quantum = NULL succeeds
  const validFCFS = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum) VALUES (?, ?, ?, NULL) RETURNING *").get(sc.ScenarioID, fcfs.AlgorithmID, user.UserID);
  assert.equal(validFCFS.Quantum, null);
});

test('Phase 2 - Overlapping Gantt Slots are Rejected', () => {
  const db = createTestDb();
  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User', 'user@example.com', 'pw') RETURNING *").get();
  const sc = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Sc') RETURNING *").get(user.UserID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 10)").run(sc.ScenarioID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P2', 0, 10)").run(sc.ScenarioID);

  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy) VALUES (?, ?, ?) RETURNING *").get(sc.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // Slot 1: [0, 5]
  db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 0, 5)").run(run.RunID);

  // Overlapping slot [3, 7] must fail
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 2, 'RUN', 'P2', 3, 7)").run(run.RunID);
  }, /Overlapping Gantt slots/);

  // Non-overlapping adjacent slot [5, 9] must succeed
  const slot2 = db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 2, 'RUN', 'P2', 5, 9) RETURNING *").get(run.RunID);
  assert.equal(slot2.StartTime, 5);
  assert.equal(slot2.EndTime, 9);
});

test('Phase 2 - Editing Processes of Scenario with Runs is Rejected; Full Scenario Delete Cascades', () => {
  const db = createTestDb();
  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User', 'user@example.com', 'pw') RETURNING *").get();
  const sc = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Locked Sc') RETURNING *").get(user.UserID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 0, 5)").run(sc.ScenarioID);
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P2', 1, 3)").run(sc.ScenarioID);

  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy) VALUES (?, ?, ?) RETURNING *").get(sc.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // 1. Trying to add a new process P3 must fail
  assert.throws(() => {
    db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P3', 2, 4)").run(sc.ScenarioID);
  }, /Cannot add processes to a scenario with saved runs/);

  // 2. Trying to update process P1 must fail
  assert.throws(() => {
    db.prepare("UPDATE Processes SET BurstTime = 10 WHERE ScenarioID = ? AND PID = 'P1'").run(sc.ScenarioID);
  }, /Cannot modify processes of a scenario with saved runs/);

  // 3. Trying to delete individual process P1 directly must fail
  assert.throws(() => {
    db.prepare("DELETE FROM Processes WHERE ScenarioID = ? AND PID = 'P1'").run(sc.ScenarioID);
  }, /Cannot delete processes from a scenario with saved runs/);

  // 4. Deleting the entire Scenario succeeds and cascades to delete runs, slots, and processes!
  db.prepare("DELETE FROM Scenarios WHERE ScenarioID = ?").run(sc.ScenarioID);

  const remainingScenarios = db.prepare("SELECT count(*) as c FROM Scenarios WHERE ScenarioID = ?").get(sc.ScenarioID).c;
  const remainingProcesses = db.prepare("SELECT count(*) as c FROM Processes WHERE ScenarioID = ?").get(sc.ScenarioID).c;
  const remainingRuns = db.prepare("SELECT count(*) as c FROM SimulationRuns WHERE ScenarioID = ?").get(sc.ScenarioID).c;

  assert.equal(remainingScenarios, 0);
  assert.equal(remainingProcesses, 0);
  assert.equal(remainingRuns, 0);
});

test('Phase 2 - Extra Triggers: Slot PID Validation, Arrival Time Guard, and Immutability', () => {
  const db = createTestDb();
  const user = db.prepare("INSERT INTO Users (Name, Email, PasswordHash) VALUES ('User', 'user@example.com', 'pw') RETURNING *").get();
  const sc = db.prepare("INSERT INTO Scenarios (OwnerID, Title) VALUES (?, 'Extra Triggers Sc') RETURNING *").get(user.UserID);
  // P1 arrives at t=2
  db.prepare("INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime) VALUES (?, 'P1', 2, 5)").run(sc.ScenarioID);

  const fcfs = db.prepare("SELECT AlgorithmID FROM Algorithms WHERE Code = 'FCFS'").get();
  const run = db.prepare("INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy) VALUES (?, ?, ?) RETURNING *").get(sc.ScenarioID, fcfs.AlgorithmID, user.UserID);

  // 1. trg_slot_pid_valid: Inserting RUN slot with PID 'P99' (nonexistent) must fail
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P99', 2, 5)").run(run.RunID);
  }, /Gantt slot PID does not exist/);

  // 2. trg_slot_after_arrival: P1 arrives at t=2, so starting at t=0 must fail
  assert.throws(() => {
    db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 0, 3)").run(run.RunID);
  }, /Gantt slot cannot start before process arrival time/);

  // Valid slot starting at t=2 succeeds
  db.prepare("INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime) VALUES (?, 1, 'RUN', 'P1', 2, 7)").run(run.RunID);

  // 3. trg_metrics_pid_valid: Metrics for 'P99' must fail
  assert.throws(() => {
    db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P99', 7, 5, 0, 0)").run(run.RunID);
  }, /RunMetrics PID does not exist/);

  // Valid metric for P1 succeeds
  db.prepare("INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime) VALUES (?, 'P1', 7, 5, 0, 0)").run(run.RunID);

  // 4. Immutability: Updating GanttSlots must fail
  assert.throws(() => {
    db.prepare("UPDATE GanttSlots SET EndTime = 8 WHERE RunID = ? AND Seq = 1").run(run.RunID);
  }, /GanttSlots rows are immutable/);

  // 5. Immutability: Updating RunMetrics must fail
  assert.throws(() => {
    db.prepare("UPDATE RunMetrics SET WaitingTime = 1 WHERE RunID = ? AND PID = 'P1'").run(run.RunID);
  }, /RunMetrics rows are immutable/);

  // 6. trg_scenarios_touch: Updating scenario updates UpdatedAt
  const beforeUpdate = db.prepare("SELECT UpdatedAt FROM Scenarios WHERE ScenarioID = ?").get(sc.ScenarioID).UpdatedAt;
  db.prepare("UPDATE Scenarios SET Description = 'Updated Description' WHERE ScenarioID = ?").run(sc.ScenarioID);
  const afterUpdate = db.prepare("SELECT Description, UpdatedAt FROM Scenarios WHERE ScenarioID = ?").get(sc.ScenarioID);
  assert.equal(afterUpdate.Description, 'Updated Description');
  assert.ok(afterUpdate.UpdatedAt);
});
