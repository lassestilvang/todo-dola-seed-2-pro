import { initDb } from '@/lib/db';
import { getTasks, getTaskHistory } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

// Burndown chart data
async function getBurndownData() {
  const tasks = await getTasks({ completed: false });
  const completedTasks = await getTasks({ completed: true });

  // Group completed tasks by date
  const completedByDate: Record<string, number> = {};
  for (const task of completedTasks) {
    if (task.completedAt) {
      const date = new Date(task.completedAt).toISOString().split('T')[0];
      completedByDate[date] = (completedByDate[date] || 0) + 1;
    }
  }

  return {
    totalTasks: tasks.length + completedTasks.length,
    completedTasks: completedTasks.length,
    completionRate: completedTasks.length / (tasks.length + completedTasks.length) * 100,
    completedByDate,
  };
}

// Time-in-state analysis
async function getTimeInState() {
  const tasks = await getTasks({ view: 'all', completed: false });
  const completedTasks = await getTasks({ completed: true });

  const allTasks = [...tasks, ...completedTasks];
  const now = Date.now();

  const timeInState = {
    avgOpenDays: 0,
    avgClosedDays: 0,
    tasksByAge: {
      '0-7d': 0,
      '8-30d': 0,
      '31-90d': 0,
      '90+d': 0,
    },
  };

  for (const task of allTasks) {
    const ageDays = Math.floor((now - task.createdAt) / (1000 * 60 * 60 * 24));

    if (task.completed) {
      timeInState.avgClosedDays += ageDays;
    } else {
      timeInState.avgOpenDays += ageDays;
    }

    if (ageDays <= 7) timeInState.tasksByAge['0-7d']++;
    else if (ageDays <= 30) timeInState.tasksByAge['8-30d']++;
    else if (ageDays <= 90) timeInState.tasksByAge['31-90d']++;
    else timeInState.tasksByAge['90+d']++;
  }

  const totalTasks = allTasks.length || 1;
  timeInState.avgOpenDays = Math.round(timeInState.avgOpenDays / totalTasks);
  timeInState.avgClosedDays = Math.round(timeInState.avgClosedDays / totalTasks);

  return timeInState;
}

// Velocity tracking
async function getVelocityData() {
  const tasks = await getTasks({ completed: true });

  // Group by week
  const velocityByWeek: Record<string, number> = {};
  for (const task of tasks) {
    if (task.completedAt) {
      const week = new Date(task.completedAt);
      week.setDate(week.getDate() - week.getDay()); // Start of week
      const weekKey = week.toISOString().split('T')[0];
      velocityByWeek[weekKey] = (velocityByWeek[weekKey] || 0) + 1;
    }
  }

  const velocities = Object.values(velocityByWeek);
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / (velocities.length || 1);

  return {
    velocities: velocityByWeek,
    avgVelocity: Math.round(avgVelocity),
    trend: velocities.length > 1 ? (velocities[velocities.length - 1] > velocities[0] ? 'up' : 'down') : 'stable',
  };
}

export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('type') || 'summary';

  await initDb();

  switch (reportType) {
    case 'burndown':
      return NextResponse.json({ data: await getBurndownData() });
    case 'time-in-state':
      return NextResponse.json({ data: await getTimeInState() });
    case 'velocity':
      return NextResponse.json({ data: await getVelocityData() });
    default:
      return NextResponse.json({
        data: {
          burndown: await getBurndownData(),
          timeInState: await getTimeInState(),
          velocity: await getVelocityData(),
        },
      });
  }
}));