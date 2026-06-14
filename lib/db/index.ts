import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { getPendingMigrations, applyMigration } from './migrations';

const dbPath = path.join(/* turbopackIgnore: true */ process.cwd(), 'db', 'planner.db');

let dbInstance: Database | null = null;
let SQLInstance: SqlJsStatic | null = null;

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // Use the Node.js compatible build
  SQLInstance = await initSqlJs({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        const possiblePaths = [
          path.resolve(__dirname, '../../node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm.wasm'),
          path.resolve(process.cwd(), 'node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm.wasm'),
          path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        ];
        for (const p of possiblePaths) {
          if (existsSync(p)) return p;
        }
        return 'sql-wasm.wasm';
      }
      return file;
    }
  });

  // Ensure db directory exists
  const dbDir = path.dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Load existing DB or create new one
  let newDb: Database;
  if (existsSync(dbPath)) {
    const dbBuffer = new Uint8Array(readFileSync(dbPath));
    newDb = new SQLInstance.Database(dbBuffer);
  } else {
    newDb = new SQLInstance.Database();
  }

  dbInstance = newDb;

  // Run migrations
  const pendingMigrations = getPendingMigrations({ exec: dbInstance.exec.bind(dbInstance) });
  for (const migration of pendingMigrations) {
    applyMigration({ exec: dbInstance.exec.bind(dbInstance) }, migration);
  }

  // Initialize inbox list if it doesn't exist
  const results = dbInstance.exec('SELECT 1 FROM lists WHERE is_inbox = 1');
  const inboxExists = results && results.length > 0;
  if (!inboxExists) {
    const now = Date.now();
    dbInstance.exec(
      `INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES ('inbox', 'Inbox', '📥', '#3b82f6', 1, 0, ${now}, ${now})`
    );
  }

  return dbInstance;
}

export function getDb(): Database | null {
  return dbInstance;
}

export function saveDb(): void {
  if (dbInstance) {
    const data = dbInstance.export();
    writeFileSync(dbPath, Buffer.from(data));
  }
}

export function resetDb(): void {
  dbInstance = null;
  SQLInstance = null;
}

export async function clearDb(): Promise<void> {
  const db = await initDb();
  db.exec('DELETE FROM task_history');
  db.exec('DELETE FROM template_labels');
  db.exec('DELETE FROM task_templates');
  db.exec('DELETE FROM subtasks');
  db.exec('DELETE FROM task_labels');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM labels');
  db.exec('DELETE FROM lists WHERE id != \'inbox\'');
  db.exec('DELETE FROM task_dependencies');
  db.exec('DELETE FROM time_entries');
  saveDb();
}