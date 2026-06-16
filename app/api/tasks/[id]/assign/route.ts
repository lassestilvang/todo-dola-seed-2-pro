import { initDb } from '@/lib/db';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { Task, Label, Subtask } from '@/lib/types';

export async function POST(request: Request) {
  try {
    await initDb();
    const url = new URL(request.url);
    const taskId = url.pathname.split('/')[2];
    const body = await request.json();
    const { userId } = body;

    const db = getDb();
    if (!db) {
      return Response.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const now = Date.now();
    db.exec(
      'UPDATE tasks SET assigned_to = ?, updated_at = ? WHERE id = ?',
      [userId, now, taskId]
    );

    db.exec(
      'INSERT INTO task_history (id, task_id, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [randomUUID(), taskId, 'assigned_to', null, userId, now]
    );

    const result = db.exec(
      `SELECT t.*,
        json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
        json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks,
        json_group_array(DISTINCT json_object('fieldId', cfv.field_id, 'value', cfv.value)) as custom_fields,
        json_group_array(DISTINCT re.exception_date) as recurring_exceptions
      FROM tasks t
      LEFT JOIN task_labels tl ON t.id = tl.task_id
      LEFT JOIN labels l ON tl.label_id = l.id
      LEFT JOIN subtasks s ON t.id = s.task_id
      LEFT JOIN task_custom_field_values cfv ON t.id = cfv.task_id
      LEFT JOIN recurring_exceptions re ON t.id = re.parent_taskId
      WHERE t.id = ? AND t.deleted_at IS NULL
      GROUP BY t.id`,
      [taskId]
    );

    if (!result || result.length === 0) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const row = result[0].values[0] as unknown as Record<string, unknown>;
    const columns = result[0].columns as string[];
    const rowData: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      rowData[col] = row[i];
    });

    const labels = JSON.parse(String(rowData.labels || '[]')) as Label[];
    const subtasks = JSON.parse(String(rowData.subtasks || '[]')) as Subtask[];
    const customFields = JSON.parse(String(rowData.custom_fields || '[]')) as { fieldId: string; value: string }[];
    const recurringExceptions = JSON.parse(String(rowData.recurring_exceptions || '[]')) as number[];

    const task = {
      ...rowData,
      completed: Boolean(rowData.completed),
      assignedTo: userId,
      labels: labels.filter((l) => l && l.id),
      subtasks: subtasks.filter((s) => s && s.id).map((s) => ({ ...s, completed: Boolean(s.completed) })),
      customFields: customFields.filter((f) => f && f.fieldId),
      recurringExceptions: recurringExceptions.filter((e) => e !== null && e !== undefined),
    } as Task;

    return Response.json({ data: task });
  } catch (error) {
    console.error('Failed to assign task:', error);
    return Response.json({ error: 'Failed to assign task' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const url = new URL(request.url);
    const taskId = url.pathname.split('/')[2];

    const db = getDb();
    if (!db) {
      return Response.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const now = Date.now();
    db.exec('UPDATE tasks SET assigned_to = NULL, updated_at = ? WHERE id = ?', [now, taskId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to unassign task:', error);
    return Response.json({ error: 'Failed to unassign task' }, { status: 500 });
  }
}