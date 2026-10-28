import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { signToken, requireAuth } from '../middleware/auth.js';

export function createAuthRouter(customDb = null) {
  const router = express.Router();
  const db = customDb || getDb();

  // POST /api/auth/signup
  router.post('/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
        return res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
      }

      if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      // Check if email already exists
      const existing = db.prepare('SELECT UserID FROM Users WHERE LOWER(Email) = ?').get(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const insertStmt = db.prepare(`
        INSERT INTO Users (Name, Email, PasswordHash)
        VALUES (?, ?, ?)
        RETURNING UserID, Name, Email, CreatedAt
      `);

      const newUser = insertStmt.get(cleanName, cleanEmail, passwordHash);
      const token = signToken(newUser);

      return res.status(201).json({
        token,
        user: {
          id: newUser.UserID,
          name: newUser.Name,
          email: newUser.Email,
          createdAt: newUser.CreatedAt
        }
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create user account.', details: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const user = db.prepare('SELECT * FROM Users WHERE LOWER(Email) = ?').get(cleanEmail);

      // Constant time / generic rejection to avoid username enumeration
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(String(password), user.PasswordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signToken(user);

      return res.json({
        token,
        user: {
          id: user.UserID,
          name: user.Name,
          email: user.Email,
          createdAt: user.CreatedAt
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Login authentication failed.', details: err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, (req, res) => {
    try {
      const user = db.prepare('SELECT UserID as id, Name as name, Email as email, CreatedAt as createdAt FROM Users WHERE UserID = ?').get(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User profile not found.' });
      }
      return res.json({ user });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve user profile.', details: err.message });
    }
  });

  return router;
}
