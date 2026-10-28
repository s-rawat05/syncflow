import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { createAuthRouter } from './routes/auth.js';
import { createAlgorithmsRouter } from './routes/algorithms.js';
import { createScenariosRouter } from './routes/scenarios.js';
import { createRunsRouter } from './routes/runs.js';
import { createMeRouter } from './routes/me.js';

dotenv.config();

export function createApp(customDb = null) {
  const app = express();

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API Routers
  app.use('/api/auth', createAuthRouter(customDb));
  app.use('/api/algorithms', createAlgorithmsRouter(customDb));
  app.use('/api/scenarios', createScenariosRouter(customDb));
  app.use('/api/runs', createRunsRouter(customDb));
  app.use('/api/me', createMeRouter(customDb));

  return app;
}
