import { initDb, getDb, saveDb } from '@/lib/db';
import { deleteTask, getTaskDependencies, getLists, getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';

interface BulkActionRequest {
  action: 'delete' | 'complete' | 'incomplete' | 'move' | 'reorder' | 'addLabels' | 'removeLabels' | 'clearCompleted' | 'updatePriority';
  ids: string[];
  targetListId?: string;
  tasks?: { id: string; sortOrder: number }[];
  labelIds?: string[];
  priority?: 'high' | 'medium' | 'low' | 'none';
}

async function executeBulkAction(body: BulkActionRequest): Promise<{ success: boolean; affectedCount?: number }> {
  await initDb();
  const { action, ids, targetListId, tasks, labelIds, priority } = body;

  if (!action || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Invalid request body: ids array required');
  }

  const validActions = ['delete', 'complete', 'incomplete', 'move', 'reorder', 'addLabels', 'removeLabels', 'clearCompleted', 'updatePriority'];
  if (!validActions.includes(action)) {
    throw new ApiError(400, `Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const now = Date.now();

  // For complete action, check dependencies
  if (action === 'complete') {
    for (const id of ids) {
      const dependencies = await getTaskDependencies(id);
      for (const dep of dependencies) {
        const depTask = await getTasks({ listId: undefined, completed: true });
        const depTaskObj = depTask.find(t => t.id === dep.dependsOnTaskId);
        if (!depTaskObj) {
          throw new ApiError(400, `Cannot complete: task depends on "${dep.dependsOnTaskId}" which is not completed`);
        }
      }
    }
  }

  // For move action, verify target list exists
  if (action === 'move' && targetListId) {
    const lists = await getLists();
    if (!lists.some(l => l.id === targetListId)) {
      throw new ApiError(404, 'Target list not found');
    }
  }

  for (const id of ids) {
    if (action === 'delete') {
      await deleteTask(id);
    } else if (action === 'complete') {
      db.exec('UPDATE tasks SET completed = 1, completed_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    } else if (action === 'incomplete') {
      db.exec('UPDATE tasks SET completed = 0, completed_at = NULL, updated_at = ? WHERE id = ?', [now, id]);
    } else if (action === 'move') {
      if (!targetListId) {
        throw new ApiError(400, 'targetListId required for move action');
      }
      db.exec('UPDATE tasks SET list_id = ?, updated_at = ? WHERE id = ?', [targetListId, now, id]);
    } else if (action === 'reorder') {
      if (!tasks) {
        throw new ApiError(400, 'tasks array required for reorder action');
      }
      for (const task of tasks) {
        db.exec('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?', [task.sortOrder, now, task.id]);
      }
    } else if (action === 'addLabels') {
      if (!labelIds || labelIds.length === 0) {
        throw new ApiError(400, 'labelIds required for addLabels action');
      }
      for (const labelId of labelIds) {
        db.exec('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    } else if (action === 'removeLabels') {
      if (!labelIds || labelIds.length === 0) {
        throw new ApiError(400, 'labelIds required for removeLabels action');
      }
      for (const labelId of labelIds) {
        db.exec('DELETE FROM task_labels WHERE task_id = ? AND label_id = ?', [id, labelId]);
      }
    } else if (action === 'clearCompleted') {
      // Delete all completed tasks
      db.exec('DELETE FROM tasks WHERE completed = 1');
    } else if (action === 'updatePriority') {
      if (!priority) {
        throw new ApiError(400, 'priority required for updatePriority action');
      }
      db.exec('UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?', [priority, now, id]);
    }
  }

  saveDb();
  return { success: true, affectedCount: ids.length };
}

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  const body = await request.json() as BulkActionRequest;
  const result = await executeBulkAction(body);
  return Response.json({ data: result });
}));