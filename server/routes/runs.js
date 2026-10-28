import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

export function insertSimulationRun(db, {
  userId,
  scenarioId,
  algorithmCode,
  quantum = null,
  contextSwitchTime = 0,
  agingInterval = null,
  raceGroup = null,
  queueConfig = [],
  timeline = [],
  processMetrics = [],
  failAfterSlots = null
}) {
  const algo = db.prepare('SELECT AlgorithmID FROM Algorithms WHERE Code = ?').get(algorithmCode);
  if (!algo) {
    throw new Error(`Unknown algorithm code: ${algorithmCode}`);
  }

  const run = db.prepare(`
    INSERT INTO SimulationRuns (ScenarioID, AlgorithmID, RunBy, Quantum, ContextSwitchTime, AgingInterval, RaceGroup)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING RunID
  `).get(
    scenarioId,
    algo.AlgorithmID,
    userId,
    quantum !== undefined && quantum !== null ? parseInt(quantum) : null,
    parseInt(contextSwitchTime) || 0,
    agingInterval ? parseInt(agingInterval) : null,
    raceGroup || null
  );

  const runId = run.RunID;

  // Insert RunQueueConfig if provided
  if (Array.isArray(queueConfig) && queueConfig.length > 0) {
    const insertQueue = db.prepare(`
      INSERT INTO RunQueueConfig (RunID, QueueLevel, QueueAlgorithm, Quantum)
      VALUES (?, ?, ?, ?)
    `);
    queueConfig.forEach(qc => {
      insertQueue.run(runId, qc.queueLevel, qc.queueAlgorithm, qc.quantum || null);
    });
  }

  // Insert Gantt slots
  const insertSlot = db.prepare(`
    INSERT INTO GanttSlots (RunID, Seq, SlotType, PID, StartTime, EndTime)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  timeline.forEach((slot, idx) => {
    if (failAfterSlots !== null && failAfterSlots !== undefined && process.env.NODE_ENV !== 'production') {
      if (idx >= parseInt(failAfterSlots)) {
        throw new Error(`Simulated rollback triggered after ${failAfterSlots} slots.`);
      }
    }

    const slotType = String(slot.type || slot.slotType || slot.SlotType || 'RUN').toUpperCase();
    const pid = slotType === 'RUN' ? (slot.pid || slot.PID) : null;
    const start = slot.start !== undefined ? slot.start : (slot.StartTime !== undefined ? slot.StartTime : slot.startTime);
    const end = slot.end !== undefined ? slot.end : (slot.EndTime !== undefined ? slot.EndTime : slot.endTime);
    insertSlot.run(runId, idx + 1, slotType, pid, start, end);
  });

  // Insert RunMetrics
  const insertMetric = db.prepare(`
    INSERT INTO RunMetrics (RunID, PID, CompletionTime, TurnaroundTime, WaitingTime, ResponseTime)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const metricsList = Array.isArray(processMetrics) ? processMetrics : Object.values(processMetrics || {});
  metricsList.forEach(m => {
    const pid = m.pid || m.PID;
    const ct = m.completionTime !== undefined ? m.completionTime : m.CompletionTime;
    const tat = m.turnaroundTime !== undefined ? m.turnaroundTime : m.TurnaroundTime;
    const wt = m.waitingTime !== undefined ? m.waitingTime : m.WaitingTime;
    const rt = m.responseTime !== undefined ? m.responseTime : m.ResponseTime;
    insertMetric.run(runId, pid, ct, tat, wt, rt);
  });

  return runId;
}

export function createRunsRouter(customDb = null) {
  const router = express.Router();
  const db = customDb || getDb();

  // GET /api/runs?scenarioId= - Run history from vw_run_summary
  router.get('/', requireAuth, (req, res) => {
    try {
      const { scenarioId } = req.query;

      let query = `
        SELECT * FROM vw_run_summary
        WHERE RunBy = ?
      `;
      const params = [req.user.userId];

      if (scenarioId) {
        query += ' AND ScenarioID = ?';
        params.push(parseInt(scenarioId));
      }

      query += ' ORDER BY CreatedAt DESC';

      const runs = db.prepare(query).all(...params);
      return res.json({ runs });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve run history', details: err.message });
    }
  });

  // GET /api/runs/:id/verify - Metrics mismatch view for this run
  router.get('/:id/verify', requireAuth, (req, res) => {
    try {
      const runId = parseInt(req.params.id);
      const run = db.prepare('SELECT RunID, RunBy FROM SimulationRuns WHERE RunID = ?').get(runId);

      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const mismatches = db.prepare('SELECT * FROM vw_metrics_mismatch WHERE RunID = ?').all(runId);

      return res.json({
        runId,
        isVerified: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to verify run', details: err.message });
    }
  });

  // GET /api/runs/:id - Full run details (summary, queue config, slots, metrics)
  router.get('/:id', requireAuth, (req, res) => {
    try {
      const runId = parseInt(req.params.id);
      const summary = db.prepare('SELECT * FROM vw_run_summary WHERE RunID = ?').get(runId);

      if (!summary) {
        return res.status(404).json({ error: 'Run not found' });
      }

      const queueConfig = db.prepare('SELECT * FROM RunQueueConfig WHERE RunID = ? ORDER BY QueueLevel ASC').all(runId);
      const slots = db.prepare('SELECT * FROM GanttSlots WHERE RunID = ? ORDER BY Seq ASC').all(runId);
      const metrics = db.prepare('SELECT * FROM RunMetrics WHERE RunID = ? ORDER BY PID ASC').all(runId);

      return res.json({
        run: summary,
        queueConfig,
        slots,
        metrics
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch run details', details: err.message });
    }
  });

  // POST /api/runs - Save single simulation run in one transaction
  router.post('/', requireAuth, (req, res) => {
    try {
      const {
        scenarioId,
        algorithmCode,
        quantum,
        contextSwitchTime,
        agingInterval,
        raceGroup,
        queueConfig = [],
        timeline = [],
        processMetrics = [],
        failAfterSlots
      } = req.body || {};

      if (!scenarioId || !algorithmCode) {
        return res.status(400).json({ error: 'scenarioId and algorithmCode are required.' });
      }

      // Check scenario exists
      const scenario = db.prepare('SELECT ScenarioID FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Referenced ScenarioID not found.' });
      }

      // Run save within transaction
      const saveTx = db.transaction(() => {
        return insertSimulationRun(db, {
          userId: req.user.userId,
          scenarioId: parseInt(scenarioId),
          algorithmCode,
          quantum,
          contextSwitchTime,
          agingInterval,
          raceGroup,
          queueConfig,
          timeline,
          processMetrics,
          failAfterSlots
        });
      });

      const runId = saveTx();
      const summary = db.prepare('SELECT * FROM vw_run_summary WHERE RunID = ?').get(runId);

      return res.status(201).json({
        message: 'Simulation run successfully saved.',
        runId,
        run: summary
      });
    } catch (err) {
      return res.status(422).json({
        error: 'Failed to save simulation run: transaction rolled back.',
        details: err.message
      });
    }
  });

  // POST /api/runs/race - Save several runs from Race Mode with shared RaceGroup in one transaction
  router.post('/race', requireAuth, (req, res) => {
    try {
      const {
        scenarioId,
        raceGroup: inputRaceGroup,
        runs = []
      } = req.body || {};

      if (!scenarioId || !Array.isArray(runs) || runs.length === 0) {
        return res.status(400).json({ error: 'scenarioId and a non-empty runs array are required.' });
      }

      const raceGroup = inputRaceGroup || `race_${Date.now()}`;

      const raceTx = db.transaction(() => {
        const runIds = [];
        for (const r of runs) {
          const runId = insertSimulationRun(db, {
            userId: req.user.userId,
            scenarioId: parseInt(scenarioId),
            algorithmCode: r.algorithmCode,
            quantum: r.quantum,
            contextSwitchTime: r.contextSwitchTime,
            agingInterval: r.agingInterval,
            raceGroup,
            queueConfig: r.queueConfig || [],
            timeline: r.timeline || [],
            processMetrics: r.processMetrics || [],
            failAfterSlots: r.failAfterSlots
          });
          runIds.push(runId);
        }
        return runIds;
      });

      const savedRunIds = raceTx();
      return res.status(201).json({
        message: 'Race runs successfully saved.',
        raceGroup,
        runIds: savedRunIds
      });
    } catch (err) {
      return res.status(422).json({
        error: 'Failed to save race runs: transaction rolled back.',
        details: err.message
      });
    }
  });

  return router;
}
