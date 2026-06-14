type Migration = {
  version: number;
  name: string;
  sql: string;
};

// Migration for custom fields
const customFieldsMigration: Migration = {
  version: 2,
  name: 'add_custom_fields',
  sql: `
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'boolean', 'select')),
      options TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_custom_field_values (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      field_id TEXT NOT NULL,
      value TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_task ON task_custom_field_values(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_field ON task_custom_field_values(field_id);
  `,
};

// Migration for notifications
const notificationsMigration: Migration = {
  version: 3,
  name: 'add_notifications',
  sql: `
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('reminder', 'due', 'completed', 'mention')),
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(task_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  `,
};

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT,
        color TEXT,
        is_inbox INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        date INTEGER,
        deadline INTEGER,
        reminder INTEGER,
        estimate INTEGER,
        actual_time INTEGER,
        priority TEXT CHECK (priority IN ('high', 'medium', 'low', 'none')) DEFAULT 'none',
        completed INTEGER DEFAULT 0,
        completed_at INTEGER,
        recurring_type TEXT,
        recurring_config TEXT,
        attachment_path TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS task_labels (
        task_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        PRIMARY KEY (task_id, label_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        completed_at INTEGER,
        sort_order INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS task_history (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        depends_on_task_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS task_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        list_id TEXT,
        priority TEXT CHECK (priority IN ('high', 'medium', 'low', 'none')) DEFAULT 'none',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_labels (
        template_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        PRIMARY KEY (template_id, label_id),
        FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recurring_exceptions (
        id TEXT PRIMARY KEY,
        parent_taskId TEXT NOT NULL,
        exception_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (parent_taskId) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_parent ON recurring_exceptions(parent_taskId);
      CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_date ON recurring_exceptions(exception_date);

      CREATE TABLE IF NOT EXISTS task_notes (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);

      CREATE TABLE IF NOT EXISTS shared_tasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        share_token TEXT NOT NULL UNIQUE,
        shared_by TEXT,
        shared_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        author TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_shared_tasks_token ON shared_tasks(share_token);
      CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_templates ON task_templates(list_id);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
      CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_reverse ON task_dependencies(depends_on_task_id);
      CREATE INDEX IF NOT EXISTS idx_task_templates ON task_templates(list_id);

      CREATE TABLE IF NOT EXISTS custom_views (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        filter_config TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_custom_views_default ON custom_views(is_default);
    `,
  },
  customFieldsMigration,
  notificationsMigration,
];

type DbExec = { exec: (sql: string, params?: (string | number | null)[]) => unknown[] };

interface MigrationRow {
  values: (number | null)[];
}

export function getPendingMigrations(db: DbExec) {
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  // Get applied migrations
  const result = db.exec('SELECT version FROM migrations ORDER BY version DESC LIMIT 1') as MigrationRow[];
  const lastApplied = result[0]?.values[0] ?? undefined;

  return migrations.filter(m => !lastApplied || m.version > lastApplied);
}

export function applyMigration(db: DbExec, migration: Migration) {
  db.exec(migration.sql);
  db.exec(
    'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)',
    [migration.version, migration.name, Date.now()] as (string | number | null)[]
  );
}