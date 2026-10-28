import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resetDatabase(customDb = null) {
  const db = customDb || getDb();

  // Disable FKs temporarily while dropping tables
  db.pragma('foreign_keys = OFF');

  // Fetch all existing user views, triggers, and tables
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all();
  views.forEach(v => db.exec(`DROP VIEW IF EXISTS ${v.name}`));

  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
  triggers.forEach(t => db.exec(`DROP TRIGGER IF EXISTS ${t.name}`));

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  tables.forEach(t => db.exec(`DROP TABLE IF EXISTS ${t.name}`));

  // Re-enable FKs
  db.pragma('foreign_keys = ON');

  // Read schema.sql and seed_lookup.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedLookupPath = path.join(__dirname, 'seed_lookup.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedLookupSql = fs.readFileSync(seedLookupPath, 'utf8');

  // Execute schema creation and lookup seeding
  db.exec(schemaSql);
  db.exec(seedLookupSql);

  return db;
}

// If executed directly from command line (e.g. npm run db:reset)
if (process.argv[1] && process.argv[1].endsWith('reset.js')) {
  try {
    resetDatabase();
    console.log('Database successfully reset and seeded with algorithm lookup data.');
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('Database reset failed:', err);
    process.exit(1);
  }
}
