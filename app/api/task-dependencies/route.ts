import { initDb, getDb, saveDb } from '@/lib/db';
import { addTaskDependency, removeTaskDependency, getTaskDependencies, wouldCreateCircularDependency } from '@/lib/db/queries';
import { randomUUID } from 'crypto';

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
      `SELECT td.id, td.task_id as taskId, td.depends_on_task_id as dependsOnTaskId, t.name as taskName
       FROM task_dependencies td
       JOIN tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id = ?
       ORDER BY t.name`,
      [taskId]
    );

    const dependencies = result[0]?.values.map((row: unknown[]) => ({
      id: row[0],
      taskId: row[1],
      dependsOnTaskId: row[2],
      taskName: row[3],
    })) || [];

    return Response.json({ data: dependencies });
  } catch (error) {
    console.error('Failed to fetch dependencies:', error);
    return Response.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, dependsOnTaskId } = await request.json();

    if (!taskId || !dependsOnTaskId) {
      return Response.json({ error: 'taskId and dependsOnTaskId are required' }, { status: 400 });
    }

    // Cannot depend on yourself
    if (taskId === dependsOnTaskId) {
      return Response.json({ error: 'Cannot create a dependency on itself' }, { status: 400 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    // Check if dependency already exists
    const existing = db.exec(
      'SELECT id FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?',
      [taskId, dependsOnTaskId]
    );
    if (existing[0]?.values.length > 0) {
      return Response.json({ error: 'Dependency already exists' }, { status: 400 });
    }

    // Check for circular dependency
    const wouldBeCircular = await wouldCreateCircularDependency(taskId, dependsOnTaskId);
    if (wouldBeCircular) {
      return Response.json({ error: 'Adding this dependency would create a circular dependency' }, { status: 400 });
    }

    const dependency = await addTaskDependency(taskId, dependsOnTaskId);
    return Response.json({ data: dependency }, { status: 201 });
  } catch (error) {
    console.error('Failed to add dependency:', error);
    return Response.json({ error: 'Failed to add dependency' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const dependsOnTaskId = searchParams.get('dependsOnTaskId');

    if (!taskId || !dependsOnTaskId) {
      return Response.json({ error: 'taskId and dependsOnTaskId are required' }, { status: 400 });
    }

    await removeTaskDependency(taskId, dependsOnTaskId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to remove dependency:', error);
    return Response.json({ error: 'Failed to remove dependency' }, { status: 500 });
  }
}