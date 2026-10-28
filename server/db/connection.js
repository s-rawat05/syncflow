import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance = null;

export function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const rawPath = customPath || process.env.DB_PATH || './server/db/syncflow.sqlite';
  let resolvedPath = rawPath;

  if (rawPath !== ':memory:') {
    resolvedPath = path.resolve(process.cwd(), rawPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(resolvedPath);

  // Enforce foreign key constraints across all operations
  db.pragma('foreign_keys = ON');

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}
