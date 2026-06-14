import { initDb, getDb } from '@/lib/db';
import { getUpcomingReminders } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check') {
      // Check for upcoming reminders and return tasks that need notification
      await initDb();
      const tasks = await getUpcomingReminders();

      const now = Date.now();
      const notifications = tasks
        .filter(task => task.reminder && task.reminder <= now + 60000) // Within 1 minute
        .map(task => ({
          taskId: task.id,
          taskName: task.name,
          reminder: task.reminder,
        }));

      return Response.json({ notifications });
    }

    if (action === 'permission') {
      // Check notification permission
      return Response.json({
        supported: typeof window !== 'undefined' && 'Notification' in window,
        permission: typeof window !== 'undefined' ? Notification.permission : 'default'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to check notifications:', error);
    return Response.json({ error: 'Failed to check notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, taskId, permission } = await request.json();

    if (action === 'request-permission') {
      // This endpoint just returns the permission state
      // The client should use the Notification API directly
      return Response.json({
        supported: typeof window !== 'undefined' && 'Notification' in window,
        message: 'Use Notification.requestPermission() on the client'
      });
    }

    if (action === 'mark-reminded') {
      // Mark a reminder as sent (for recurring tasks)
      await initDb();
      const db = getDb();
      if (!db) throw new Error('Database not initialized');

      const now = Date.now();
      db.exec(
        'UPDATE tasks SET reminder = ? WHERE id = ?',
        [now + 86400000, taskId] // Set next reminder for 24h later
      );

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to handle notification:', error);
    return Response.json({ error: 'Failed to handle notification' }, { status: 500 });
  }
}