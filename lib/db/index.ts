import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { getPendingMigrations, applyMigration } from './migrations';

const dbPath = path.join(/* turbopackIgnore: true */ process.cwd(), 'db', 'planner.db');

let dbInstance: Database | null = null;
let SQLInstance: SqlJsStatic | null = null;

// Connection pool simulation for sql.js (single connection per process)
const connectionPool: {
  active: boolean;
  lastUsed: number;
  queryCount: number;
} = {
  active: false,
  lastUsed: 0,
  queryCount: 0
};

export class DbError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DbError';
  }
}

export class TransactionError extends DbError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'TX_ERROR');
    this.name = 'TransactionError';
  }
}

export type Transaction = {
  exec: (sql: string, params?: (string | number | null)[]) => unknown[];
  finalize: () => void;
};

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    SQLInstance = await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          const possiblePaths = [
            path.resolve(__dirname, '../../node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm.wasm'),
            path.resolve(process.cwd(), 'node_modules/.pnpm/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm.wasm'),
            path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
            'sql-wasm.wasm',
          ];
          for (const p of possiblePaths) {
            if (existsSync(p)) return p;
          }
          return 'sql-wasm.wasm';
        }
        return file;
      }
    });

    const dbDir = path.dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    let newDb: Database;
    if (existsSync(dbPath)) {
      const dbBuffer = new Uint8Array(readFileSync(dbPath));
      newDb = new SQLInstance.Database(dbBuffer);
    } else {
      newDb = new SQLInstance.Database();
    }

    dbInstance = newDb;

    const pendingMigrations = getPendingMigrations({ exec: dbInstance.exec.bind(dbInstance) });
    for (const migration of pendingMigrations) {
      applyMigration({ exec: dbInstance.exec.bind(dbInstance) }, migration);
    }

    const results = dbInstance.exec('SELECT 1 FROM lists WHERE is_inbox = 1');
    const inboxExists = results && results.length > 0;
    if (!inboxExists) {
      const now = Date.now();
      dbInstance.exec(
        `INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES ('inbox', 'Inbox', '📥', '#3b82f6', 1, 0, ${now}, ${now})`
      );
    }

    return dbInstance;
  } catch (error) {
    throw new DbError(
      error instanceof Error ? error.message : 'Failed to initialize database',
      'DB_INIT_ERROR'
    );
  }
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

export function runInTransaction<T>(fn: (tx: Transaction) => T): T {
  const db = getDb();
  if (!db) throw new DbError('Database not initialized', 'DB_NOT_INITIALIZED');

  // Track connection pool usage
  connectionPool.active = true;
  connectionPool.lastUsed = Date.now();
  connectionPool.queryCount++;

  // Use SAVEPOINT for proper transaction rollback support
  db.exec('SAVEPOINT tx_start');

  let result: T;
  let success = false;

  try {
    result = fn({
      exec: (sql: string, params?: (string | number | null)[]) => db.exec(sql, params),
      finalize: () => {
        if (!success) {
          throw new DbError('Transaction was not finalized', 'TX_FINALIZE_ERROR');
        }
      }
    });
    success = true;
    db.exec('RELEASE SAVEPOINT tx_start');
  } catch (error) {
    // Rollback on error
    try {
      db.exec('ROLLBACK TO SAVEPOINT tx_start');
      db.exec('RELEASE SAVEPOINT tx_start');
    } catch {
      // Ignore rollback errors
    }
    const originalError = error instanceof Error ? error : undefined;
    throw new TransactionError(
      error instanceof DbError ? error.message : 'Transaction failed',
      originalError
    );
  } finally {
    saveDb();
    connectionPool.active = false;
  }

  return result;
}

// Query optimization helpers
export function buildPaginatedQuery(
  baseQuery: string,
  countQuery: string,
  params: unknown[],
  limit: number,
  offset: number,
  runQueryFn: (sql: string, params: unknown[]) => Record<string, unknown>[]
): { paginatedQuery: string; count: number; totalPages: number } {
  const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
  const countRows = runQueryFn(countQuery, params);
  const count = countRows.length;
  const totalPages = Math.ceil(count / limit) || 0;

  return { paginatedQuery, count, totalPages };
}

// Batch insert for better performance
export function batchInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize: number = 100
): void {
  const db = getDb();
  if (!db) throw new DbError('Database not initialized', 'DB_NOT_INITIALIZED');

  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      db.exec(sql, row as (string | number | null)[]);
    }
  }
}

// Get connection pool stats
export function getDbStats(): {
  active: boolean;
  lastUsed: number;
  queryCount: number;
  isInitialized: boolean;
} {
  return {
    active: connectionPool.active,
    lastUsed: connectionPool.lastUsed,
    queryCount: connectionPool.queryCount,
    isInitialized: dbInstance !== null
  };
}

export function resetDb(): void {
  dbInstance = null;
  SQLInstance = null;
}

export async function clearDb(): Promise<void> {
  const db = await initDb();
  db.exec('DELETE FROM habit_completions');
  db.exec('DELETE FROM habits');
  db.exec('DELETE FROM task_history');
  db.exec('DELETE FROM template_labels');
  db.exec('DELETE FROM task_templates');
  db.exec('DELETE FROM subtasks');
  db.exec('DELETE FROM task_labels');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM labels');
  db.exec('DELETE FROM lists WHERE id != \'inbox\'');
  db.exec('DELETE FROM task_dependencies');
  db.exec('DELETE FROM task_links');
  db.exec('DELETE FROM time_entries');
  db.exec('DELETE FROM task_notes');
  db.exec('DELETE FROM shared_tasks');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM custom_views');
  db.exec('DELETE FROM custom_fields');
  db.exec('DELETE FROM task_custom_field_values');
  db.exec('DELETE FROM recurring_exceptions');
  db.exec('DELETE FROM recurring_completions');
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM reminders');
  db.exec('DELETE FROM task_assignments');
  db.exec('DELETE FROM push_subscriptions');
  db.exec('DELETE FROM user_badges');
  db.exec('DELETE FROM user_progress');
  db.exec('DELETE FROM user_context');
  saveDb();
}

// Export database as JSON
export async function exportDb(): Promise<{
  version: string;
  exportedAt: number;
  data: Record<string, unknown[]>;
}> {
  const db = await initDb();

  const tables = [
    'lists', 'labels', 'tasks', 'subtasks', 'task_labels',
    'task_history', 'time_entries', 'task_dependencies',
    'task_templates', 'template_labels', 'task_notes',
    'shared_tasks', 'comments', 'custom_views',
    'custom_fields', 'task_custom_field_values', 'recurring_exceptions', 'recurring_completions',
    'notifications', 'reminders', 'task_links', 'habits', 'habit_completions',
    'workspaces', 'workspace_members', 'integrations', 'activities', 'goals',
    'goal_milestones', 'time_blocks', 'migrations', 'task_assignments',
    'push_subscriptions', 'user_badges', 'user_progress', 'user_context'
  ];

  const data: Record<string, unknown[]> = {};

  for (const table of tables) {
    const result = db.exec(`SELECT * FROM ${table}`);
    if (result.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values;
      data[table] = values.map((row: unknown[]) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
    } else {
      data[table] = [];
    }
  }

  return {
    version: '1.1',
    exportedAt: Date.now(),
    data,
  };
}

// Import database from JSON
export async function importDb(exportData: {
  version: string;
  exportedAt: number;
  data: Record<string, unknown[]>;
}): Promise<void> {
  const db = await initDb();
  const { data } = exportData;

  // Clear existing data in reverse dependency order
  const tablesToRemove = [
    'task_history', 'template_labels', 'task_templates', 'subtasks',
    'task_labels', 'tasks', 'labels', 'task_dependencies',
    'time_entries', 'task_notes', 'shared_tasks', 'comments', 'custom_views',
    'custom_fields', 'task_custom_field_values', 'recurring_exceptions', 'recurring_completions',
    'notifications', 'reminders', 'task_links', 'habits', 'habit_completions',
    'workspaces', 'workspace_members', 'integrations', 'activities', 'goals',
    'goal_milestones', 'time_blocks', 'migrations', 'task_assignments'
  ];

  for (const table of tablesToRemove) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.exec('DELETE FROM lists WHERE id != \'inbox\'');

  // Insert new data
  const insertTable = (table: string, rows: unknown[]) => {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    for (const row of rows as Record<string, unknown>[]) {
      const values = columns.map(col => row[col] as string | number | null);
      db.exec(sql, values);
    }
  };

  for (const [table, rows] of Object.entries(data)) {
    if (rows.length > 0) {
      insertTable(table, rows);
    }
  }

  saveDb();
}