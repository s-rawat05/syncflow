import express from 'express';
import { getDb } from '../db/connection.js';

export function createAlgorithmsRouter(customDb = null) {
  const router = express.Router();
  const db = customDb || getDb();

  // GET /api/algorithms
  router.get('/', (req, res) => {
    try {
      const algorithms = db.prepare(`
        SELECT AlgorithmID, Code, Name, IsPreemptive, UsesQuantum, UsesPriority, UsesQueues
        FROM Algorithms
        ORDER BY AlgorithmID ASC
      `).all();
      return res.json({ algorithms });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve algorithms', details: err.message });
    }
  });

  return router;
}
