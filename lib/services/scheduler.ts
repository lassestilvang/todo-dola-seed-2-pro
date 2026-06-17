import { getDb, initDb } from '@/lib/db';
import { sendEmail, sendTaskReminderEmail } from '@/lib/utils/email-service';
import { getTasks } from '@/lib/db/queries';
import { getReminders } from '@/lib/db/reminders';
import type { Reminder } from '@/lib/types';

// Simple in-memory scheduler (for production, use a proper job queue)
let isRunning = false;
const scheduledJobs: Map<string, NodeJS.Timeout | number> = new Map();

function checkDueReminders() {
  const now = Date.now();

  // Check for reminders due in the next 5 minutes
  const fiveMinutes = 5 * 60 * 1000;

  getReminders().then(reminders => {
    reminders.forEach((reminder: Reminder) => {
      if (!reminder.enabled) return;

      const timeUntilDue = reminder.reminderTime - now;

      if (timeUntilDue <= fiveMinutes && timeUntilDue > -fiveMinutes) {
        // Send reminder
        getTasks().then(tasks => {
          const task = tasks.find(t => t.id === reminder.taskId);
          if (task) {
            if (reminder.channel === 'email') {
              // Send email reminder
              sendTaskReminderEmail(
                { id: task.id, name: task.name, description: task.description, deadline: task.deadline },
                'User',
                process.env.SMTP_USER || ''
              ).catch(console.error);
            }
            // For in-app, slack, discord - would need respective integrations
          }
        });
      }
    });
  });
}

export function startReminderScheduler() {
  if (isRunning) return;

  isRunning = true;

  // Check every minute
  const interval = setInterval(checkDueReminders, 60 * 1000);
  scheduledJobs.set('reminders', interval);

  console.log('Reminder scheduler started');
}

export function stopReminderScheduler() {
  const interval = scheduledJobs.get('reminders');
  if (interval) {
    clearInterval(interval);
    scheduledJobs.delete('reminders');
  }
  isRunning = false;
  console.log('Reminder scheduler stopped');
}

export function scheduleDailySummary(userId: string, email: string, time: string) {
  // Parse time (e.g., "09:00")
  const [hours, minutes] = time.split(':').map(Number);

  const scheduleForNextRun = () => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilRun = nextRun.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      sendDailySummary(email);
      scheduleForNextRun();
    }, msUntilRun);

    return timeout;
  };

  const timeout = scheduleForNextRun();
  scheduledJobs.set(`daily-summary-${userId}`, timeout);
}

async function sendDailySummary(email: string) {
  const todayTasks = await getTasks({ view: 'today', completed: false });

  const subject = `Daily Task Summary - ${new Date().toLocaleDateString()}`;
  const html = `
    <h2>Your Daily Task Summary</h2>
    <p>You have ${todayTasks.length} tasks due today.</p>
    <ul>
      ${todayTasks.map(t => `<li>${t.name}</li>`).join('')}
    </ul>
  `;

  await sendEmail(email, subject, html);
}

// For serverless deployments, use scheduled functions
export function getSchedulerStatus() {
  return {
    isRunning,
    scheduledJobs: Array.from(scheduledJobs.keys()),
  };
}