import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const ReportSchema = z.enum(['burndown', 'velocity', 'time-in-state', 'summary']);

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const type = ReportSchema.parse(searchParams.get('type') || 'summary');
  const format = searchParams.get('format') || 'json';

  const tasks = await getTasks();
  const completedTasks = tasks.filter(t => t.completed);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  const report = {
    burndown: {
      type: 'burndown',
      data: generateBurndownData(tasks),
      generatedAt: Date.now(),
    },
    velocity: {
      type: 'velocity',
      data: generateVelocityData(tasks),
      generatedAt: Date.now(),
    },
    'time-in-state': {
      type: 'time-in-state',
      data: generateTimeInStateData(tasks),
      generatedAt: Date.now(),
    },
    summary: {
      type: 'summary',
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100) / 100,
      generatedAt: Date.now(),
    },
  }[type];

  if (format === 'csv') {
    return new Response(JSON.stringify(report), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (format === 'pdf') {
    // In production, use a PDF library like pdfmake or puppeteer
    return new Response(JSON.stringify({ ...report, format: 'pdf-requires-server' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.json({ data: report });
}));

function generateBurndownData(tasks: any[]) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const dailyData: Record<string, { total: number; completed: number }> = {};

  // Initialize last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    dailyData[key] = { total: 0, completed: 0 };
  }

  // Count tasks by day
  for (const task of tasks) {
    const created = new Date(task.createdAt);
    const completed = task.completedAt ? new Date(task.completedAt) : null;

    const createdKey = created.toISOString().split('T')[0];
    if (dailyData[createdKey]) {
      dailyData[createdKey].total++;
    }

    if (completed) {
      const completedKey = completed.toISOString().split('T')[0];
      if (dailyData[completedKey]) {
        dailyData[completedKey].completed++;
      }
    }
  }

  return Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      remaining: data.total - data.completed,
      completed: data.completed,
    }));
}

function generateVelocityData(tasks: any[]) {
  const completedTasks = tasks.filter(t => t.completed && t.completedAt);
  const weeklyCounts: Record<string, number> = {};

  for (const task of completedTasks) {
    const week = getWeekKey(task.completedAt);
    weeklyCounts[week] = (weeklyCounts[week] || 0) + 1;
  }

  return Object.entries(weeklyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, completed: count }));
}

function generateTimeInStateData(tasks: any[]) {
  return tasks.reduce((acc, task) => {
    const state = task.completed ? 'completed' : task.date ? 'scheduled' : 'pending';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function getWeekKey(timestamp: number) {
  const date = new Date(timestamp);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().split('T')[0];
}