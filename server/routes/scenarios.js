import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

function formatProcess(p) {
  return {
    id: String(p.PID),
    scenarioId: p.ScenarioID,
    ScenarioID: p.ScenarioID,
    pid: p.PID,
    PID: p.PID,
    arrivalTime: p.ArrivalTime,
    ArrivalTime: p.ArrivalTime,
    burstTime: p.BurstTime,
    BurstTime: p.BurstTime,
    priority: p.Priority !== null && p.Priority !== undefined ? p.Priority : 1,
    Priority: p.Priority !== null && p.Priority !== undefined ? p.Priority : 1,
    queueLevel: p.QueueLevel !== null && p.QueueLevel !== undefined ? p.QueueLevel : 0,
    QueueLevel: p.QueueLevel !== null && p.QueueLevel !== undefined ? p.QueueLevel : 0
  };
}

export function createScenariosRouter(customDb = null) {
  const router = express.Router();
  const db = customDb || getDb();


  // GET /api/scenarios/public - Public scenarios
  router.get('/public', (req, res) => {
    try {
      const scenarios = db.prepare(`
        SELECT
          s.ScenarioID,
          s.Title,
          s.Description,
          s.IsPublic,
          s.CreatedAt,
          s.UpdatedAt,
          u.Name AS OwnerName,
          COALESCE(p.ProcessCount, 0) AS ProcessCount,
          COALESCE(r.RunCount, 0) AS RunCount
        FROM Scenarios s
        JOIN Users u ON u.UserID = s.OwnerID
        LEFT JOIN (
          SELECT ScenarioID, COUNT(*) AS ProcessCount FROM Processes GROUP BY ScenarioID
        ) p ON p.ScenarioID = s.ScenarioID
        LEFT JOIN (
          SELECT ScenarioID, COUNT(*) AS RunCount FROM SimulationRuns GROUP BY ScenarioID
        ) r ON r.ScenarioID = s.ScenarioID
        WHERE s.IsPublic = 1
        ORDER BY s.CreatedAt DESC
      `).all();

      return res.json({ scenarios });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve public scenarios', details: err.message });
    }
  });

  // GET /api/scenarios - My scenarios
  router.get('/', requireAuth, (req, res) => {
    try {
      const scenarios = db.prepare(`
        SELECT
          s.ScenarioID,
          s.Title,
          s.Description,
          s.IsPublic,
          s.CreatedAt,
          s.UpdatedAt,
          COALESCE(p.ProcessCount, 0) AS ProcessCount,
          COALESCE(r.RunCount, 0) AS RunCount
        FROM Scenarios s
        LEFT JOIN (
          SELECT ScenarioID, COUNT(*) AS ProcessCount FROM Processes GROUP BY ScenarioID
        ) p ON p.ScenarioID = s.ScenarioID
        LEFT JOIN (
          SELECT ScenarioID, COUNT(*) AS RunCount FROM SimulationRuns GROUP BY ScenarioID
        ) r ON r.ScenarioID = s.ScenarioID
        WHERE s.OwnerID = ?
        ORDER BY s.UpdatedAt DESC
      `).all(req.user.userId);

      return res.json({ scenarios });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve scenarios', details: err.message });
    }
  });

  // POST /api/scenarios - Create a scenario with its processes in one transaction
  router.post('/', requireAuth, (req, res) => {
    try {
      const { title, description = '', isPublic = 0, processes = [] } = req.body || {};

      if (!title || typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 80) {
        return res.status(400).json({ error: 'Scenario title must be between 1 and 80 characters.' });
      }

      if (!Array.isArray(processes) || processes.length === 0) {
        return res.status(400).json({ error: 'Scenario must contain at least one process.' });
      }

      const cleanTitle = title.trim();

      const createTx = db.transaction(() => {
        // Insert scenario
        const scenario = db.prepare(`
          INSERT INTO Scenarios (OwnerID, Title, Description, IsPublic)
          VALUES (?, ?, ?, ?)
          RETURNING ScenarioID, Title, Description, IsPublic, CreatedAt, UpdatedAt
        `).get(req.user.userId, cleanTitle, description, isPublic ? 1 : 0);

        // Insert processes
        const insertProc = db.prepare(`
          INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        processes.forEach((p, idx) => {
          const pid = (p.pid || `P${idx + 1}`).trim();
          const at = Math.max(0, parseInt(p.arrivalTime) || 0);
          const bt = Math.max(1, parseInt(p.burstTime) || 1);
          const pri = p.priority !== undefined && p.priority !== null ? Math.max(0, parseInt(p.priority)) : 1;
          const ql = p.queueLevel !== undefined && p.queueLevel !== null ? Math.max(0, parseInt(p.queueLevel)) : 0;
          insertProc.run(scenario.ScenarioID, pid, at, bt, pri, ql);
        });

        const savedProcesses = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY ArrivalTime ASC, PID ASC').all(scenario.ScenarioID);
        return { ...scenario, processes: savedProcesses.map(formatProcess) };
      });

      const result = createTx();
      return res.status(201).json({ scenario: result });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'You already have a scenario with this title.' });
      }
      return res.status(422).json({ error: 'Failed to create scenario.', details: err.message });
    }
  });

  // POST /api/scenarios/import - Accept SyncFlow JSON export format
  router.post('/import', requireAuth, (req, res) => {
    try {
      const payload = req.body;
      let title = 'Imported Scenario';
      let description = 'Imported from JSON';
      let processes = [];

      if (Array.isArray(payload)) {
        processes = payload;
        title = `Imported Scenario (${new Date().toLocaleDateString()})`;
      } else if (payload && Array.isArray(payload.processes)) {
        processes = payload.processes;
        title = payload.title || title;
        description = payload.description || description;
      } else {
        return res.status(400).json({ error: 'Invalid JSON import format. Expected array of processes or { processes: [] }' });
      }

      if (processes.length === 0) {
        return res.status(400).json({ error: 'Import payload contains no processes.' });
      }

      // Check for title uniqueness and append timestamp if needed
      let finalTitle = title.trim();
      const existing = db.prepare('SELECT ScenarioID FROM Scenarios WHERE OwnerID = ? AND Title = ?').get(req.user.userId, finalTitle);
      if (existing) {
        finalTitle = `${finalTitle} (${Date.now()})`;
      }

      const importTx = db.transaction(() => {
        const scenario = db.prepare(`
          INSERT INTO Scenarios (OwnerID, Title, Description, IsPublic)
          VALUES (?, ?, ?, 0)
          RETURNING ScenarioID, Title, Description, IsPublic, CreatedAt, UpdatedAt
        `).get(req.user.userId, finalTitle, description);

        const insertProc = db.prepare(`
          INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        processes.forEach((p, idx) => {
          const pid = (p.pid || `P${idx + 1}`).trim();
          const at = Math.max(0, parseInt(p.arrivalTime) || 0);
          const bt = Math.max(1, parseInt(p.burstTime) || 1);
          const pri = p.priority !== undefined && p.priority !== null ? Math.max(0, parseInt(p.priority)) : 1;
          const ql = p.queueLevel !== undefined && p.queueLevel !== null ? Math.max(0, parseInt(p.queueLevel)) : 0;
          insertProc.run(scenario.ScenarioID, pid, at, bt, pri, ql);
        });

        const savedProcesses = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY ArrivalTime ASC, PID ASC').all(scenario.ScenarioID);
        return { ...scenario, processes: savedProcesses.map(formatProcess) };
      });

      const result = importTx();
      return res.status(201).json({ scenario: result });
    } catch (err) {
      return res.status(422).json({ error: 'Failed to import scenario', details: err.message });
    }
  });

  // GET /api/scenarios/:id - A scenario with its processes
  router.get('/:id', optionalAuth, (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const scenario = db.prepare('SELECT * FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);

      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      // If private, only owner can view
      if (!scenario.IsPublic && (!req.user || req.user.userId !== scenario.OwnerID)) {
        return res.status(403).json({ error: 'Access denied. This scenario is private.' });
      }

      const processes = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY ArrivalTime ASC, PID ASC').all(scenarioId);
      return res.json({ scenario: { ...scenario, processes: processes.map(formatProcess) } });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch scenario', details: err.message });
    }
  });

  // PUT /api/scenarios/:id - Update title/description/processes
  router.put('/:id', requireAuth, (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const scenario = db.prepare('SELECT * FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);

      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      if (scenario.OwnerID !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied. You do not own this scenario.' });
      }

      const { title, description, isPublic, processes } = req.body || {};

      const updateTx = db.transaction(() => {
        // Update scenario metadata
        if (title !== undefined || description !== undefined || isPublic !== undefined) {
          db.prepare(`
            UPDATE Scenarios
            SET Title = COALESCE(?, Title),
                Description = COALESCE(?, Description),
                IsPublic = COALESCE(?, IsPublic)
            WHERE ScenarioID = ?
          `).run(title !== undefined ? title.trim() : null, description !== undefined ? description : null, isPublic !== undefined ? (isPublic ? 1 : 0) : null, scenarioId);
        }

        // If processes are provided, attempt to update them
        if (Array.isArray(processes)) {
          // If runs exist, deleting or updating processes will fire triggers and abort
          db.prepare('DELETE FROM Processes WHERE ScenarioID = ?').run(scenarioId);

          const insertProc = db.prepare(`
            INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          processes.forEach((p, idx) => {
            const pid = (p.pid || `P${idx + 1}`).trim();
            const at = Math.max(0, parseInt(p.arrivalTime) || 0);
            const bt = Math.max(1, parseInt(p.burstTime) || 1);
            const pri = p.priority !== undefined && p.priority !== null ? Math.max(0, parseInt(p.priority)) : 1;
            const ql = p.queueLevel !== undefined && p.queueLevel !== null ? Math.max(0, parseInt(p.queueLevel)) : 0;
            insertProc.run(scenarioId, pid, at, bt, pri, ql);
          });
        }

        const updatedScenario = db.prepare('SELECT * FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);
        const updatedProcs = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY ArrivalTime ASC, PID ASC').all(scenarioId);
        return { ...updatedScenario, processes: updatedProcs.map(formatProcess) };
      });

      const result = updateTx();
      return res.json({ scenario: result });
    } catch (err) {
      if (err.message && (err.message.includes('saved runs') || err.message.includes('Cannot modify processes') || err.message.includes('Cannot delete processes'))) {
        return res.status(409).json({
          error: 'This scenario has saved simulation runs and its processes are locked. Use "Save as copy" to modify.',
          canSaveAsCopy: true
        });
      }
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'You already have another scenario with this title.' });
      }
      return res.status(422).json({ error: 'Failed to update scenario', details: err.message });
    }
  });

  // POST /api/scenarios/:id/duplicate - Copy a scenario and its processes in one transaction
  router.post('/:id/duplicate', requireAuth, (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const source = db.prepare('SELECT * FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);

      if (!source) {
        return res.status(404).json({ error: 'Source scenario not found' });
      }

      if (!source.IsPublic && source.OwnerID !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied to private scenario' });
      }

      const dupTx = db.transaction(() => {
        let newTitle = `${source.Title} (Copy)`;
        let counter = 1;
        while (db.prepare('SELECT ScenarioID FROM Scenarios WHERE OwnerID = ? AND Title = ?').get(req.user.userId, newTitle)) {
          counter++;
          newTitle = `${source.Title} (Copy ${counter})`;
        }

        const newScenario = db.prepare(`
          INSERT INTO Scenarios (OwnerID, Title, Description, IsPublic)
          VALUES (?, ?, ?, 0)
          RETURNING ScenarioID, Title, Description, IsPublic, CreatedAt, UpdatedAt
        `).get(req.user.userId, newTitle, source.Description);

        // Copy processes
        db.prepare(`
          INSERT INTO Processes (ScenarioID, PID, ArrivalTime, BurstTime, Priority, QueueLevel)
          SELECT ?, PID, ArrivalTime, BurstTime, Priority, QueueLevel
          FROM Processes
          WHERE ScenarioID = ?
        `).run(newScenario.ScenarioID, source.ScenarioID);

        const procs = db.prepare('SELECT * FROM Processes WHERE ScenarioID = ? ORDER BY ArrivalTime ASC, PID ASC').all(newScenario.ScenarioID);
        return { ...newScenario, processes: procs.map(formatProcess) };
      });

      const result = dupTx();
      return res.status(201).json({ scenario: result });
    } catch (err) {
      return res.status(422).json({ error: 'Failed to duplicate scenario', details: err.message });
    }
  });

  // DELETE /api/scenarios/:id - Owner only; cascades
  router.delete('/:id', requireAuth, (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const scenario = db.prepare('SELECT * FROM Scenarios WHERE ScenarioID = ?').get(scenarioId);

      if (!scenario) {
        return res.status(404).json({ error: 'Scenario not found' });
      }

      if (scenario.OwnerID !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied. You do not own this scenario.' });
      }

      db.prepare('DELETE FROM Scenarios WHERE ScenarioID = ?').run(scenarioId);
      return res.json({ message: 'Scenario and all associated simulation runs deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete scenario', details: err.message });
    }
  });

  // GET /api/scenarios/:id/leaderboard - From vw_algorithm_leaderboard
  router.get('/:id/leaderboard', optionalAuth, (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const leaderboard = db.prepare(`
        SELECT * FROM vw_algorithm_leaderboard
        WHERE ScenarioID = ?
        ORDER BY AlgorithmRank ASC
      `).all(scenarioId);

      return res.json({ scenarioId, leaderboard });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
    }
  });

  return router;
}
