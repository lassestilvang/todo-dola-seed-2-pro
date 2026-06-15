import { initDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { provider, event, taskId, message } = body;

    if (!provider || !event || !taskId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const taskRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/tasks/${taskId}`);
    const task = taskRes.ok ? await taskRes.json() : null;

    const notification = {
      id: crypto.randomUUID(),
      taskId,
      provider,
      event,
      message: message || `${event} for task: ${task?.name || taskId}`,
      createdAt: Date.now(),
    };

    // Send to webhook or chat platform
    if (process.env.SLACK_WEBHOOK_URL && provider === 'slack') {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message || `Task update: ${task?.name || taskId}`,
        }),
      });
    }

    if (process.env.DISCORD_WEBHOOK_URL && provider === 'discord') {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message || `**${event}**: ${task?.name || taskId}`,
        }),
      });
    }

    return Response.json({ data: notification });
  } catch (error) {
    console.error('Notification failed:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

// Get notification settings for a task
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return Response.json({ error: 'taskId required' }, { status: 400 });
  }

  // Return notification settings
  return Response.json({ data: {
    taskId,
    providers: ['slack', 'discord', 'email'],
    events: ['created', 'completed', 'updated', 'comment'],
  }});
}
