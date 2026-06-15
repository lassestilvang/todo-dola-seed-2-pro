import { initDb, getDb, saveDb } from '@/lib/db';
import {
  createTaskLink,
  deleteTaskLink,
  getTaskById,
} from '@/lib/db/queries';
import { TaskLinkCreateSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(
      `SELECT tl.id, tl.task_id as taskId, tl.linked_task_id as linkedTaskId, tl.type, tl.created_at as createdAt,
              t.name as linkedTaskName
       FROM task_links tl
       JOIN tasks t ON tl.linked_task_id = t.id
       WHERE tl.task_id = ?
       ORDER BY tl.created_at DESC`,
      [taskId]
    );

    const links = result[0]?.values.map((row: unknown[]) => ({
      id: row[0],
      taskId: row[1],
      linkedTaskId: row[2],
      type: row[3],
      createdAt: row[4],
      linkedTaskName: row[5],
    })) || [];

    return Response.json({ data: links });
  } catch (error) {
    console.error('Failed to fetch task links:', error);
    return Response.json({ error: 'Failed to fetch task links' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const validated = TaskLinkCreateSchema.safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Validation failed', details: validated.error }, { status: 400 });
    }

    const { taskId, linkedTaskId, type } = validated.data;

    // Cannot link to yourself
    if (taskId === linkedTaskId) {
      return Response.json({ error: 'Cannot link a task to itself' }, { status: 400 });
    }

    // Verify both tasks exist
    const [task, linkedTask] = await Promise.all([
      getTaskById(taskId),
      getTaskById(linkedTaskId),
    ]);

    if (!task) {
      return Response.json({ error: 'Source task not found' }, { status: 404 });
    }

    if (!linkedTask) {
      return Response.json({ error: 'Linked task not found' }, { status: 404 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    // Check if link already exists
    const existing = db.exec(
      'SELECT id FROM task_links WHERE task_id = ? AND linked_task_id = ? AND type = ?',
      [taskId, linkedTaskId, type]
    );
    if (existing[0]?.values.length > 0) {
      return Response.json({ error: 'Link already exists' }, { status: 400 });
    }

    const link = await createTaskLink(taskId, linkedTaskId, type);
    return Response.json({ data: link }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task link:', error);
    return Response.json({ error: 'Failed to create task link' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteTaskLink(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task link:', error);
    return Response.json({ error: 'Failed to delete task link' }, { status: 500 });
  }
}