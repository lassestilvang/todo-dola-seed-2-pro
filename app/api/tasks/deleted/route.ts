import { initDb, getDb, saveDb } from '@/lib/db';
import { getDeletedTasks } from '@/lib/db/queries';

// Auto-delete tasks older than 30 days
const TRASH_RETENTION_DAYS = 30;

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    // Clean up old deleted tasks first
    const cutoffDate = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    db.exec('DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoffDate]);
    saveDb();

    const tasks = await getDeletedTasks();
    return Response.json({ data: tasks });
  } catch (error) {
    console.error('Failed to fetch deleted tasks:', error);
    return Response.json({ error: 'Failed to fetch deleted tasks' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    // Clean up old deleted tasks (older than retention period)
    const cutoffDate = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    db.exec('DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoffDate]);
    saveDb();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to clean up trash:', error);
    return Response.json({ error: 'Failed to clean up trash' }, { status: 500 });
  }
}