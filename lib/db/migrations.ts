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

// Migration for task assignment
const taskAssignmentMigration: Migration = {
  version: 4,
  name: 'add_task_assignment',
  sql: `
    ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  `,
};

// Migration for performance indexes
const performanceIndexesMigration: Migration = {
  version: 5,
  name: 'add_performance_indexes',
  sql: `
    -- Composite indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_tasks_list_completed ON tasks(list_id, completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_date_priority ON tasks(date, priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder) WHERE reminder IS NOT NULL AND completed = 0;
    CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);
  `,
};

// Migration for habits tracker
const habitsMigration: Migration = {
  version: 6,
  name: 'add_habits',
  sql: `
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      streak INTEGER DEFAULT 0,
      last_completed INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_habits_streak ON habits(streak DESC);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_at);
  `,
};

// Migration for workspaces
const workspacesMigration: Migration = {
  version: 7,
  name: 'add_workspaces',
  sql: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

    ALTER TABLE tasks ADD COLUMN workspace_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
  `,
};

// Migration for integrations table
const integrationsMigration: Migration = {
  version: 8,
  name: 'add_integrations',
  sql: `
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('notion', 'slack', 'caldav', 'webhook')),
      config TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
    CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);
  `,
};

// Migration for reminders table
const remindersMigration: Migration = {
  version: 9,
  name: 'add_reminders',
  sql: `
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      reminder_time INTEGER NOT NULL,
      sent_at INTEGER,
      channel TEXT NOT NULL CHECK (channel IN ('email', 'in-app', 'slack', 'discord')) DEFAULT 'email',
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time);
    CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled);
  `,
};

// Migration for additional indexes and pagination support
const additionalIndexesMigration: Migration = {
  version: 10,
  name: 'add_additional_indexes',
  sql: `
    -- Additional indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_tasks_priority_deadline ON tasks(priority, deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_lists_sort_order ON lists(sort_order);
    CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);
    CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);
    CREATE INDEX IF NOT EXISTS idx_task_history_field ON task_history(field);
    CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);
  `,
};

// Migration for task links
const taskLinksMigration: Migration = {
  version: 11,
  name: 'add_task_links',
  sql: `
    CREATE TABLE IF NOT EXISTS task_links (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      linked_task_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('blocks', 'related', 'depends_on', 'duplicate')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_task_links_task ON task_links(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_links_linked ON task_links(linked_task_id);
    CREATE INDEX IF NOT EXISTS idx_task_links_type ON task_links(type);
  `,
};

// Migration for recurring task completions
const recurringCompletionsMigration: Migration = {
  version: 12,
  name: 'add_recurring_completions',
  sql: `
    CREATE TABLE IF NOT EXISTS recurring_completions (
      id TEXT PRIMARY KEY,
      parent_task_id TEXT NOT NULL,
      completed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recurring_completions_parent ON recurring_completions(parent_task_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_completions_date ON recurring_completions(completed_at);

    ALTER TABLE tasks ADD COLUMN parent_task_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON tasks(parent_task_id);
  `,
};

// Migration for note attachments
const noteAttachmentsMigration: Migration = {
  version: 13,
  name: 'add_note_attachments',
  sql: `
    CREATE TABLE IF NOT EXISTS note_attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES task_notes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(note_id);
  `,
};

// Migration for share token expiration
const shareTokenExpirationMigration: Migration = {
  version: 17,
  name: 'add_share_token_expiration',
  sql: `
    ALTER TABLE shared_tasks ADD COLUMN expires_at INTEGER;
    CREATE INDEX IF NOT EXISTS idx_shared_tasks_expires ON shared_tasks(expires_at);
  `,
};

// Migration for goals tracking
const goalsMigration: Migration = {
  version: 14,
  name: 'add_goals',
  sql: `
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_value INTEGER NOT NULL,
      current_value INTEGER DEFAULT 0,
      unit TEXT NOT NULL CHECK (unit IN ('%', 'tasks', 'hours', 'days', 'points')),
      deadline INTEGER,
      task_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goal_milestones (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      current_value INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);
    CREATE INDEX IF NOT EXISTS idx_goals_task ON goals(task_id);
    CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
    CREATE INDEX IF NOT EXISTS idx_goal_milestones_completed ON goal_milestones(completed);
  `,
};

// Migration for time blocking
const timeBlocksMigration: Migration = {
  version: 15,
  name: 'add_time_blocks',
  sql: `
    CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      start INTEGER NOT NULL,
      end INTEGER NOT NULL,
      color TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_time_blocks_start ON time_blocks(start);
    CREATE INDEX IF NOT EXISTS idx_time_blocks_end ON time_blocks(end);
    CREATE INDEX IF NOT EXISTS idx_time_blocks_task ON time_blocks(task_id);
  `,
};

// Migration for activity feed
const activitiesMigration: Migration = {
  version: 16,
  name: 'add_activities',
  sql: `
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('task_created', 'task_completed', 'task_updated', 'comment_added', 'task_assigned', 'label_added')),
      task_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      details TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activities_task ON activities(task_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
  `,
};

// Migration for gamification tracking
const gamificationMigration: Migration = {
  version: 20,
  name: 'add_gamification',
  sql: `
    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

    CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      tasks_completed INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
  `,
};

// Migration for context-aware data
const contextDataMigration: Migration = {
  version: 21,
  name: 'add_context_data',
  sql: `
    CREATE TABLE IF NOT EXISTS user_context (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      location_lat REAL,
      location_lng REAL,
      place_name TEXT,
      time_zone TEXT,
      preferred_hours TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_context_user ON user_context(user_id);
  `,
};

// Migration for push subscriptions
const pushSubscriptionsMigration: Migration = {
  version: 23,
  name: 'add_push_subscriptions',
  sql: `
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT,
      device_info TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_token ON push_subscriptions(token);
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
  `,
};

// Migration for task assignments table
const taskAssignmentsMigration: Migration = {
  version: 22,
  name: 'add_task_assignments',
  sql: `
    CREATE TABLE IF NOT EXISTS task_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_by TEXT,
      assigned_at INTEGER NOT NULL,
      due_date INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
  `,
};

// Sort migrations by version
const sortedMigrations = (migrations: Migration[]): Migration[] => {
  return [...migrations].sort((a, b) => a.version - b.version);
};

export const migrations: Migration[] = sortedMigrations([
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
  {
    version: 24,
    name: 'add_user_preferences',
    sql: `
      ALTER TABLE users ADD COLUMN preferences TEXT;
    `,
  },
  customFieldsMigration,
  notificationsMigration,
  taskAssignmentMigration,
  performanceIndexesMigration,
  habitsMigration,
  workspacesMigration,
  integrationsMigration,
  remindersMigration,
  taskLinksMigration,
  recurringCompletionsMigration,
  noteAttachmentsMigration,
  shareTokenExpirationMigration,
  goalsMigration,
  timeBlocksMigration,
  activitiesMigration,
  gamificationMigration,
  contextDataMigration,
  taskAssignmentsMigration,
  additionalIndexesMigration,
  pushSubscriptionsMigration,
]);

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