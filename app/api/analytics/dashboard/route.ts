import { initDb } from '@/lib/db';
import { getTasks, getGoals, getHabits, getAllHabitCompletions, getTimeBlocks, getReminders } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const [tasks, goals, habits, habitCompletions, timeBlocks, reminders] = await Promise.all([
    getTasks({ view: 'all' }),
    getGoals(),
    getHabits(),
    getAllHabitCompletions(),
    getTimeBlocks(ninetyDaysAgo, now),
    getReminders(),
  ]);

  const recentTasks = tasks.filter(t => t.createdAt >= thirtyDaysAgo);
  const recentCompleted = recentTasks.filter(t => t.completed);

  const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  const timeEfficiency = totalEstimate > 0
    ? Math.min(Math.round((totalActual / totalEstimate) * 100), 100)
    : 100;

  const streak = calculateStreak(recentCompleted);

  const labelCounts: Record<string, number> = {};
  for (const task of recentTasks) {
    for (const label of task.labels || []) {
      labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
    }
  }
  const topLabels = Object.entries(labelCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hourCounts: Record<number, number> = {};
  for (const task of recentCompleted) {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return Response.json({
    data: {
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.completed).length,
        completionRate,
        totalEstimateHours: Math.round(totalEstimate / 60),
        totalActualHours: Math.round(totalActual / 60),
        timeEfficiency,
      },
      recent: {
        tasks: recentTasks.length,
        completed: recentCompleted.length,
        completionRate: recentTasks.length > 0
          ? Math.round((recentCompleted.length / recentTasks.length) * 100)
          : 0,
      },
      streak,
      topLabels,
      peakHours,
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        progress: Math.round((g.currentValue / g.targetValue) * 100),
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        deadline: g.deadline,
      })),
      habits: habits.map(h => ({
        id: h.id,
        name: h.name,
        streak: h.streak,
        lastCompleted: h.lastCompleted,
      })),
      timeBlocks: {
        total: timeBlocks.length,
        completed: timeBlocks.filter(tb => tb.end !== null).length,
      },
      reminders: reminders.filter(r => r.enabled && (!r.sentAt || r.reminderTime > now)).length,
    },
  });
}));

function calculateStreak(completedTasks: { completedAt: number | null }[]): number {
  if (completedTasks.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const completedDates = new Set<string>();
  completedTasks.forEach(t => {
    if (t.completedAt) {
      const d = new Date(t.completedAt);
      d.setHours(0, 0, 0, 0);
      completedDates.add(d.getTime().toString());
    }
  });

  let streak = 0;
  let currentDay = todayTime;

  while (completedDates.has(currentDay.toString())) {
    streak++;
    currentDay -= 24 * 60 * 60 * 1000;
  }

  return streak;
}