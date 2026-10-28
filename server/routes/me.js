import express from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

export function createMeRouter(customDb = null) {
  const router = express.Router();
  const db = customDb || getDb();

  // GET /api/me/stats - From vw_user_activity
  router.get('/stats', requireAuth, (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT * FROM vw_user_activity
        WHERE UserID = ?
      `).get(req.user.userId);

      if (!stats) {
        return res.status(404).json({ error: 'User statistics not found.' });
      }

      return res.json({ stats });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve user statistics', details: err.message });
    }
  });

  return router;
}
