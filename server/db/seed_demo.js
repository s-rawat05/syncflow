/**
 * SyncFlow Demo Database Seed Script
 * Populates SQLite with 3 demo users, preset scenarios, Test A & Test B,
 * and executes scheduling algorithms via the real engine in Node.js.
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { getDb } from './connection.js';
import { resetDatabase } from './reset.js';
import { insertSimulationRun } from '../routes/runs.js';
import { runSimulation } from '../../src/engine/schedulerEngine.js';
import { PRESETS } from '../../src/data/presets.js';

dotenv.config();

export function seedDemoData(customDb = null) {
  // Re-initialize fresh schema and algorithm lookups
  resetDatabase(customDb);
  const db = customDb || getDb();

  console.log('Seeding demo database...');

  // 1. Create 3 Demo Users
  const demoPassword = process.env.DEMO_PASSWORD || 'demo_password_123';
  const passwordHash = bcrypt.hashSync(demoPassword, 10);

  const insertUser = db.prepare(`
    INSERT INTO Users (Name, Email, PasswordHash)
    VALUES (?, ?, ?)
    RETURNING UserID
  `);

  const alice = insertUser.get('Alice Turing', 'alice@gehu.ac.in', passwordHash);
  const bob = insertUser.get('Bob Ritchie', 'bob@gehu.ac.in', passwordHash);
  const charlie = insertUser.get('Charlie Hopper', 'charlie@gehu.ac.in', passwordHash);

  console.log(`Created 3 demo users: Alice (#${alice.UserID}), Bob (#${bob.UserID}), Charlie (#${charlie.UserID})`);

  // Helper to insert a scenario and its processes
  const createScenarioHelper = (ownerId, title, description, isPublic, procs) => {
    return db.transaction(() => {
      const sc = db.prepare(`
        INSERT INTO Scenarios (OwnerID, Title, Description, IsPublic)
        VALUES (?, ?, ?, ?)
        RETURNING ScenarioID
      `).get(ownerId, title, description, isPublic ? 1 : 0);

      const insertProc = db.prepare(`
        INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      procs.forEach(p => {
        insertProc.run(
          sc.ScenarioID,
          p.pid,
          p.arrivalTime !== undefined ? p.arrivalTime : 0,
          p.burstTime,
          p.priority !== undefined ? p.priority : null,
          p.queueLevel !== undefined ? p.queueLevel : null
        );
      });

      return sc.ScenarioID;
    })();
  };

  // Helper to simulate and save run in one transaction
  const simulateAndSaveRun = (userId, scenarioId, procs, algoCode, options = {}) => {
    const {
      quantum = null,
      contextSwitchTime = 0,
      agingEnabled = false,
      agingInterval = null,
      raceGroup = null
    } = options;

    const normQuantum = (algoCode === 'RR' || algoCode === 'MLQ') ? (quantum || 2) : null;

    const simResult = runSimulation(algoCode, procs, {
      timeQuantum: normQuantum || 2,
      csOverhead: contextSwitchTime,
      agingEnabled,
      agingInterval: agingInterval || 5
    });

    const queueConfig = [];
    if (algoCode === 'MLQ') {
      queueConfig.push(
        { queueLevel: 0, queueAlgorithm: 'RR', quantum: normQuantum || 2 },
        { queueLevel: 1, queueAlgorithm: 'FCFS', quantum: null }
      );
    } else if (algoCode === 'MLFQ') {
      queueConfig.push(
        { queueLevel: 0, queueAlgorithm: 'RR', quantum: 2 },
        { queueLevel: 1, queueAlgorithm: 'RR', quantum: 4 },
        { queueLevel: 2, queueAlgorithm: 'FCFS', quantum: null }
      );
    }

    return db.transaction(() => {
      return insertSimulationRun(db, {
        userId,
        scenarioId,
        algorithmCode: algoCode,
        quantum: normQuantum,
        contextSwitchTime,
        agingInterval,
        raceGroup,
        queueConfig,
        timeline: simResult.timeline,
        processMetrics: simResult.processMetrics
      });
    })();
  };

  // 2. Scenarios for Alice
  const textbookPreset = PRESETS.find(p => p.id === 'textbook');
  const sc1 = createScenarioHelper(
    alice.UserID,
    'Textbook Classic',
    textbookPreset.description,
    1,
    textbookPreset.processes
  );

  const convoyPreset = PRESETS.find(p => p.id === 'convoy');
  const sc2 = createScenarioHelper(
    alice.UserID,
    'Convoy Effect Demo',
    convoyPreset.description,
    1,
    convoyPreset.processes
  );

  const testAProcesses = [
    { pid: 'P1', arrivalTime: 0, burstTime: 5 },
    { pid: 'P2', arrivalTime: 1, burstTime: 3 },
    { pid: 'P3', arrivalTime: 2, burstTime: 8 },
    { pid: 'P4', arrivalTime: 3, burstTime: 6 }
  ];
  const sc3 = createScenarioHelper(
    alice.UserID,
    'Test A Benchmark',
    'Standard PBL benchmark workload with context-switch 0',
    1,
    testAProcesses
  );

  // 3. Scenarios for Bob
  const starvationPreset = PRESETS.find(p => p.id === 'starvation');
  const sc4 = createScenarioHelper(
    bob.UserID,
    'Starvation & Aging Showcase',
    starvationPreset.description,
    0,
    starvationPreset.processes
  );

  const quantumPreset = PRESETS.find(p => p.id === 'quantum-demo');
  const sc5 = createScenarioHelper(
    bob.UserID,
    'Quantum Sensitivity (RR)',
    quantumPreset.description,
    1,
    quantumPreset.processes
  );

  const mlfqPreset = PRESETS.find(p => p.id === 'mlfq-demo');
  const sc6 = createScenarioHelper(
    bob.UserID,
    'MLFQ Dynamic Queue Flow',
    mlfqPreset.description,
    0,
    mlfqPreset.processes
  );

  const testBProcesses = [
    { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
    { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
    { pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 4 },
    { pid: 'P4', arrivalTime: 3, burstTime: 1, priority: 2 }
  ];
  const sc7 = createScenarioHelper(
    bob.UserID,
    'Test B Priority Benchmark',
    'Preemptive and Non-Preemptive Priority baseline test workload',
    1,
    testBProcesses
  );

  console.log('Seeded 7 scenarios across Alice and Bob (Charlie has 0 runs)');

  // 4. Execute Real Simulations & Persist Runs

  // --- Scenario 1: Textbook Classic (Alice) ---
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'FCFS', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'SJF', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'SRTF', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'RR', { quantum: 2, contextSwitchTime: 0 });
  // Include context switch overhead to generate CS slots for analysis
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'RR', { quantum: 2, contextSwitchTime: 1 });
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'MLQ', { quantum: 2, contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, 'MLFQ', { quantum: 2, contextSwitchTime: 0 });

  // Race Mode Group on Textbook Classic
  const raceGroup1 = 'Race_Textbook_Showdown';
  ['FCFS', 'SJF', 'SRTF', 'RR'].forEach(algo => {
    simulateAndSaveRun(alice.UserID, sc1, textbookPreset.processes, algo, { quantum: 2, raceGroup: raceGroup1 });
  });

  // --- Scenario 2: Convoy Effect Demo (Alice) ---
  simulateAndSaveRun(alice.UserID, sc2, convoyPreset.processes, 'FCFS', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc2, convoyPreset.processes, 'SJF', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc2, convoyPreset.processes, 'RR', { quantum: 2, contextSwitchTime: 0 });

  // Race Mode Group on Convoy Effect
  const raceGroup2 = 'Race_Convoy_Benchmark';
  ['FCFS', 'SJF', 'RR'].forEach(algo => {
    simulateAndSaveRun(alice.UserID, sc2, convoyPreset.processes, algo, { quantum: 2, raceGroup: raceGroup2 });
  });

  // --- Scenario 3: Test A Benchmark (Alice) ---
  simulateAndSaveRun(alice.UserID, sc3, testAProcesses, 'FCFS', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc3, testAProcesses, 'SJF', { contextSwitchTime: 0 });
  simulateAndSaveRun(alice.UserID, sc3, testAProcesses, 'SRTF', { contextSwitchTime: 0 });

  // --- Scenario 4: Starvation & Aging Showcase (Bob) ---
  simulateAndSaveRun(bob.UserID, sc4, starvationPreset.processes, 'PRIORITY_NP', { contextSwitchTime: 0 });
  simulateAndSaveRun(bob.UserID, sc4, starvationPreset.processes, 'PRIORITY_P', { contextSwitchTime: 0 });
  simulateAndSaveRun(bob.UserID, sc4, starvationPreset.processes, 'PRIORITY_P', { contextSwitchTime: 0, agingEnabled: true, agingInterval: 3 });

  // --- Scenario 5: Quantum Sensitivity (Bob) ---
  simulateAndSaveRun(bob.UserID, sc5, quantumPreset.processes, 'RR', { quantum: 2, contextSwitchTime: 1 });
  simulateAndSaveRun(bob.UserID, sc5, quantumPreset.processes, 'RR', { quantum: 4, contextSwitchTime: 1 });
  simulateAndSaveRun(bob.UserID, sc5, quantumPreset.processes, 'RR', { quantum: 6, contextSwitchTime: 1 });

  // --- Scenario 6: MLFQ Dynamic Queue Flow (Bob) ---
  simulateAndSaveRun(bob.UserID, sc6, mlfqPreset.processes, 'MLFQ', { quantum: 2, contextSwitchTime: 0 });
  simulateAndSaveRun(bob.UserID, sc6, mlfqPreset.processes, 'FCFS', { contextSwitchTime: 0 });

  // --- Scenario 7: Test B Priority Benchmark (Bob) ---
  simulateAndSaveRun(bob.UserID, sc7, testBProcesses, 'PRIORITY_NP', { contextSwitchTime: 0 });
  simulateAndSaveRun(bob.UserID, sc7, testBProcesses, 'PRIORITY_P', { contextSwitchTime: 0 });

  // 5. Verification Check across all runs
  const mismatches = db.prepare('SELECT * FROM vw_metrics_mismatch').all();
  if (mismatches.length > 0) {
    console.error('VERIFICATION ERROR! Seeded database has metrics mismatches:', mismatches);
    throw new Error(`Integrity check failed: ${mismatches.length} mismatches in vw_metrics_mismatch`);
  }

  const runCount = db.prepare('SELECT COUNT(*) AS count FROM SimulationRuns').get().count;
  const slotCount = db.prepare('SELECT COUNT(*) AS count FROM GanttSlots').get().count;
  const metricCount = db.prepare('SELECT COUNT(*) AS count FROM RunMetrics').get().count;

  console.log(`Demo seed complete: ${runCount} simulation runs, ${slotCount} Gantt slots, ${metricCount} metrics.`);
  console.log('Integrity check: 0 mismatches in vw_metrics_mismatch ✓');
}

// Execute standalone if called directly
if (process.argv[1]?.endsWith('seed_demo.js')) {
  seedDemoData();
}
