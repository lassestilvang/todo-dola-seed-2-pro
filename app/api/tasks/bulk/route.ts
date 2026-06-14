import { initDb, getDb, saveDb } from '@/lib/db';
import { deleteTask, getTaskDependencies } from '@/lib/db/queries';

interface BulkActionRequest {
  action: 'delete' | 'complete' | 'incomplete' | 'move' | 'reorder' | 'addLabels' | 'removeLabels' | 'clearCompleted';
  ids: string[];
  targetListId?: string;
  tasks?: { id: string; sortOrder: number }[];
  labelIds?: string[];
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json() as BulkActionRequest;
    const { action, ids, targetListId, tasks, labelIds } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!['delete', 'complete', 'incomplete', 'move', 'reorder', 'addLabels', 'removeLabels', 'clearCompleted'].includes(action)) {
      return Response.json({ error: 'Invalid action. Must be "delete", "complete", "incomplete", "move", "reorder", "addLabels", "removeLabels", or "clearCompleted"' }, { status: 400 });
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const now = Date.now();

    // For complete action, check dependencies
    if (action === 'complete') {
      for (const id of ids) {
        const dependencies = await getTaskDependencies(id);
        for (const dep of dependencies) {
          const depTask = await db.exec('SELECT completed FROM tasks WHERE id = ?', [dep.dependsOnTaskId]);
          const isCompleted = depTask[0]?.values[0]?.[0] === 1;
          if (!isCompleted) {
            return Response.json({
              error: `Cannot complete: task depends on "${dep.dependsOnTaskId}" which is not completed`,
            }, { status: 400 });
          }
        }
      }
    }

    for (const id of ids) {
      if (action === 'delete') {
        await deleteTask(id);
      } else if (action === 'complete') {
        db.exec('UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?', [now, id]);
      } else if (action === 'incomplete') {
        db.exec('UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ?', [id]);
      } else if (action === 'move') {
        if (!targetListId) {
          return Response.json({ error: 'targetListId required for move action' }, { status: 400 });
        }
        db.exec('UPDATE tasks SET list_id = ? WHERE id = ?', [targetListId, id]);
      } else if (action === 'reorder') {
        if (!tasks) {
          return Response.json({ error: 'tasks array required for reorder action' }, { status: 400 });
        }
        for (const task of tasks) {
          db.exec('UPDATE tasks SET sort_order = ? WHERE id = ?', [task.sortOrder, task.id]);
        }
      } else if (action === 'addLabels') {
        if (!labelIds || labelIds.length === 0) {
          return Response.json({ error: 'labelIds required for addLabels action' }, { status: 400 });
        }
        for (const labelId of labelIds) {
          db.exec('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
        }
      } else if (action === 'removeLabels') {
        if (!labelIds || labelIds.length === 0) {
          return Response.json({ error: 'labelIds required for removeLabels action' }, { status: 400 });
        }
        for (const labelId of labelIds) {
          db.exec('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [id, labelId]);
        }
      } else if (action === 'clearCompleted') {
        // Delete all completed tasks
        db.exec('DELETE FROM tasks WHERE completed = 1');
      }
    }

    saveDb();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to process bulk action:', error);
    return Response.json({ error: 'Failed to process bulk action' }, { status: 500 });
  }
}