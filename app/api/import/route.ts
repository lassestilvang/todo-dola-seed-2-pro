import { initDb, getDb, saveDb } from '@/lib/db';
import { TaskListSchema, LabelSchema } from '@/lib/schemas';
import type { TaskList, Label, Task, Subtask, TaskHistoryEntry, Comment, TaskDependency, TimeEntry } from '@/lib/types';

type ImportData = {
  lists?: Partial<TaskList>[];
  labels?: Partial<Label>[];
  tasks?: Partial<Task>[];
  task_labels?: { task_id: string; label_id: string }[];
  subtasks?: Partial<Subtask>[];
  task_history?: TaskHistoryEntry[];
  comments?: Partial<Comment>[];
  task_dependencies?: Partial<TaskDependency>[];
  time_entries?: Partial<TimeEntry>[];
  task_templates?: any[];
  template_labels?: { template_id: string; label_id: string }[];
  shared_tasks?: any[];
};

const PRIORITY_MAP: Record<number, 'high' | 'medium' | 'low' | 'none'> = { 1: 'high', 2: 'medium', 3: 'low', 4: 'none' };

function normalizeTodoistTask(task: any): Partial<Task> {
  return {
    id: task.id?.toString(),
    name: task.content || '',
    description: task.notes || null,
    date: task.due?.date ? new Date(task.due.date).getTime() : null,
    priority: task.priority ? PRIORITY_MAP[task.priority] || 'none' : 'none',
    completed: Boolean(task.checked),
    completedAt: task.checked ? Date.now() : null,
    estimate: null,
    actualTime: null,
    listId: 'inbox',
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeTrelloCard(card: any, listId: string): Partial<Task> {
  return {
    id: card.id,
    name: card.name,
    description: card.desc || null,
    date: null,
    priority: 'none',
    completed: false,
    completedAt: null,
    estimate: null,
    actualTime: null,
    listId,
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'dola';

    const contentType = request.headers.get('content-type') || '';
    let data: ImportData;

    // Handle different import formats
    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Check for Todoist format
      if (format === 'todoist' && body.items && Array.isArray(body.items)) {
        data = {
          tasks: body.items.map((t: any) => normalizeTodoistTask(t)),
        };
      }
      // Check for Trello format
      else if (format === 'trello' && body.cards && Array.isArray(body.cards)) {
        data = {
          tasks: body.cards.map((c: any) => normalizeTrelloCard(c, c.idList)),
        };
      }
      // Default: try to auto-detect format
      else if (body.tasks && Array.isArray(body.tasks)) {
        data = body as ImportData;
      }
      else if (body.cards && Array.isArray(body.cards)) {
        data = {
          tasks: body.cards.map((c: any) => normalizeTrelloCard(c, c.idList)),
        };
      }
      else {
        data = body as ImportData;
      }
    } else {
      const text = await request.text();
      data = JSON.parse(text) as ImportData;
    }

    // Validate import data structure
    if (data.lists) {
      for (const list of data.lists) {
        const validated = TaskListSchema.partial().safeParse(list);
        if (!validated.success) {
          return Response.json({ error: `Invalid list data: ${validated.error.message}` }, { status: 400 });
        }
      }
    }

    if (data.labels) {
      for (const label of data.labels) {
        const validated = LabelSchema.partial().safeParse(label);
        if (!validated.success) {
          return Response.json({ error: `Invalid label data: ${validated.error.message}` }, { status: 400 });
        }
      }
    }

    // Clear existing data
    db.exec('DELETE FROM shared_tasks');
    db.exec('DELETE FROM template_labels');
    db.exec('DELETE FROM task_templates');
    db.exec('DELETE FROM task_history');
    db.exec('DELETE FROM time_entries');
    db.exec('DELETE FROM task_dependencies');
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM subtasks');
    db.exec('DELETE FROM task_labels');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM labels');
    db.exec('DELETE FROM lists');

    // Import data
    if (data.lists) {
      for (const list of data.lists) {
        db.exec(
          'INSERT OR REPLACE INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, COALESCE(?, 0), ?, ?)',
          [list.id, list.name, list.emoji, list.color, list.isInbox ? 1 : 0, list.sortOrder, list.createdAt, list.updatedAt] as never[]
        );
      }
    }

    if (data.labels) {
      for (const label of data.labels) {
        db.exec(
          'INSERT OR REPLACE INTO labels (id, name, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [label.id, label.name, label.emoji, label.color, label.createdAt, label.updatedAt] as never[]
        );
      }
    }

    if (data.tasks) {
      for (const task of data.tasks) {
        db.exec(
          `INSERT OR REPLACE INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, completed, completed_at, recurring_type, recurring_config, attachment_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [task.id, task.listId, task.name, task.description, task.date, task.deadline, task.reminder, task.estimate, task.actualTime, task.priority, task.completed ? 1 : 0, task.completedAt, task.recurringType, task.recurringConfig, task.attachmentPath, task.createdAt, task.updatedAt] as never[]
        );
      }
    }

    // Import task_labels
    if (data.task_labels) {
      for (const tl of data.task_labels) {
        db.exec('INSERT OR REPLACE INTO task_labels (task_id, label_id) VALUES (?, ?)', [tl.task_id, tl.label_id] as never[]);
      }
    }

    // Import subtasks
    if (data.subtasks) {
      for (const subtask of data.subtasks) {
        db.exec(
          'INSERT OR REPLACE INTO subtasks (id, task_id, name, completed, completed_at, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [subtask.id, subtask.taskId, subtask.name, subtask.completed ? 1 : 0, subtask.completedAt, subtask.sortOrder, subtask.createdAt, subtask.updatedAt] as never[]
        );
      }
    }

    // Import task_history
    if (data.task_history) {
      for (const th of data.task_history) {
        db.exec(
          'INSERT OR REPLACE INTO task_history (id, task_id, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, ?)',
          [th.id, th.taskId, th.field, th.oldValue, th.newValue, th.changedAt] as never[]
        );
      }
    }

    // Import comments
    if (data.comments) {
      for (const comment of data.comments) {
        db.exec(
          'INSERT OR REPLACE INTO comments (id, task_id, author, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [comment.id, comment.taskId, comment.author, comment.content, comment.createdAt, comment.updatedAt] as never[]
        );
      }
    }

    // Import task_dependencies
    if (data.task_dependencies) {
      for (const dep of data.task_dependencies) {
        db.exec(
          'INSERT OR REPLACE INTO task_dependencies (id, task_id, depends_on_task_id, created_at) VALUES (?, ?, ?, ?)',
          [dep.id, dep.taskId, dep.dependsOnTaskId, dep.createdAt] as never[]
        );
      }
    }

    // Import time_entries
    if (data.time_entries) {
      for (const te of data.time_entries) {
        db.exec(
          'INSERT OR REPLACE INTO time_entries (id, task_id, duration, description, started_at, ended_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [te.id, te.taskId, te.duration, te.description, te.startedAt, te.endedAt, te.startedAt] as never[]
        );
      }
    }

    // Import task_templates
    if (data.task_templates) {
      for (const template of data.task_templates) {
        db.exec(
          'INSERT OR REPLACE INTO task_templates (id, name, description, list_id, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [template.id, template.name, template.description, template.listId, template.priority, template.createdAt, template.updatedAt] as never[]
        );
      }
    }

    // Import template_labels
    if (data.template_labels) {
      for (const tl of data.template_labels) {
        db.exec('INSERT OR REPLACE INTO template_labels (template_id, label_id) VALUES (?, ?)', [tl.template_id, tl.label_id] as never[]);
      }
    }

    // Import shared_tasks
    if (data.shared_tasks) {
      for (const st of data.shared_tasks) {
        db.exec(
          'INSERT OR REPLACE INTO shared_tasks (id, task_id, share_token, shared_by, shared_at) VALUES (?, ?, ?, ?, ?)',
          [st.id, st.task_id, st.share_token, st.shared_by, st.shared_at] as never[]
        );
      }
    }

    saveDb();

    // Return stats about imported data
    const stats = {
      lists: data.lists?.length || 0,
      labels: data.labels?.length || 0,
      tasks: data.tasks?.length || 0,
      subtasks: data.subtasks?.length || 0,
      comments: data.comments?.length || 0,
      dependencies: data.task_dependencies?.length || 0,
      templates: data.task_templates?.length || 0,
    };

    const totalItems = Object.values(stats).reduce((a: number, b: number) => a + b, 0);

    return Response.json({ success: true, stats, totalItems });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to import' }, { status: 500 });
  }
}