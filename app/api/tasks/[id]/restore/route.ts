import { initDb, getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const data = await request.json();

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const now = Date.now();
    const taskId = randomUUID();

    // Re-insert the task with a new ID
    db.exec(
      `INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, data.listId || 'inbox', data.name, data.description, data.date, data.deadline, data.reminder, data.estimate, data.actualTime, data.priority || 'none', now, now]
    );

    // Restore labels
    if (data.labels && data.labels.length > 0) {
      for (const labelId of data.labels) {
        db.exec('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [taskId, labelId]);
      }
    }

    // Restore subtasks
    if (data.subtasks && data.subtasks.length > 0) {
      for (let i = 0; i < data.subtasks.length; i++) {
        const subtask = data.subtasks[i];
        db.exec(
          'INSERT INTO subtasks (id, task_id, name, completed, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [subtask.id || randomUUID(), taskId, subtask.name, subtask.completed ? 1 : 0, i + 1, now, now]
        );
      }
    }

    saveDb();

    // Return the restored task
    const restored = {
      ...data,
      id: taskId,
      createdAt: now,
      updatedAt: now,
    };

    return Response.json(restored, { status: 201 });
  } catch (error) {
    console.error('Failed to restore task:', error);
    return Response.json({ error: 'Failed to restore task' }, { status: 500 });
  }
}