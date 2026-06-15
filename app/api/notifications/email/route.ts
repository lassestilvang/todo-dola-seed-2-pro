import { initDb } from '@/lib/db';
import { sendNotificationEmail, generateTaskReminderEmail, generateDailySummaryEmail } from '@/lib/utils/email-notifications';

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { action, taskId, userEmail, userName } = body;

    if (action === 'remind') {
      const taskRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/tasks/${taskId}`);
      if (!taskRes.ok) {
        return Response.json({ error: 'Task not found' }, { status: 404 });
      }
      const task = await taskRes.json();

      const email = generateTaskReminderEmail(task, userName);
      const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      };

      const success = await sendNotificationEmail(
        { to: userEmail, ...email },
        config
      );

      return Response.json({ data: {success} });
    }

    if (action === 'daily-summary') {
      // Get tasks from today
      const tasksRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/tasks?view=today&completed=false`);
      const tasks = tasksRes.ok ? await tasksRes.json() : [];

      const email = generateDailySummaryEmail(tasks, userName);
      const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      };

      const success = await sendNotificationEmail(
        { to: userEmail, ...email },
        config
      );

      return Response.json({ data: {success} });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Email notification failed:', error);
    return Response.json({ error: 'Failed to send email' }, { status: 500 });
  }
}