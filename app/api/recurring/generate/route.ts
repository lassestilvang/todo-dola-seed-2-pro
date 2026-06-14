import { initDb } from '@/lib/db';
import { getTasks, generateRecurringTasks } from '@/lib/db/queries';

export async function POST() {
  try {
    await initDb();

    // Get all tasks with recurring settings
    const recurringTasks = await getTasks({ recurring: true, completed: false });

    let generatedCount = 0;

    for (const task of recurringTasks) {
      if (task.recurringType && task.recurringConfig && task.date) {
        const config = JSON.parse(task.recurringConfig);
        const nextDate = task.date + (config.interval || 1) * getIntervalMs(config.type);

        // Generate if next occurrence is due
        if (nextDate <= Date.now()) {
          const newTasks = await generateRecurringTasks(task.id);
          generatedCount += newTasks.length;
        }
      }
    }

    return Response.json({ generated: generatedCount });
  } catch (error) {
    console.error('Failed to generate recurring tasks:', error);
    return Response.json({ error: 'Failed to generate recurring tasks' }, { status: 500 });
  }
}

function getIntervalMs(type: string): number {
  switch (type) {
    case 'daily': return 24 * 60 * 60 * 1000;
    case 'weekly': return 7 * 24 * 60 * 60 * 1000;
    case 'monthly': return 30 * 24 * 60 * 60 * 1000;
    case 'yearly': return 365 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}