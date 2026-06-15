import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/db/queries';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

interface ScheduleSuggestion {
  taskId: string;
  suggestedDate: number;
  confidence: number;
  reason: string;
}

function calculateOptimalSchedule(
  tasks: Awaited<ReturnType<typeof getTasks>>,
  userPreferences: { workHours?: { start: number; end: number }; maxTasksPerDay?: number } = {}
): ScheduleSuggestion[] {
  const { workHours = { start: 9, end: 17 }, maxTasksPerDay = 8 } = userPreferences;
  const suggestions: ScheduleSuggestion[] = [];

  const incompleteTasks = tasks.filter(t => !t.completed && !t.date);
  const workDayMinutes = (workHours.end - workHours.start) * 60;

  // Sort by priority and estimate
  const sortedTasks = [...incompleteTasks].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 };
    const aScore = priorityWeight[a.priority] + (a.estimate || 0) / 60;
    const bScore = priorityWeight[b.priority] + (b.estimate || 0) / 60;
    return bScore - aScore;
  });

  let currentDate = new Date();
  currentDate = startOfDay(currentDate);
  let tasksToday = 0;

  for (const task of sortedTasks) {
    // Skip if already has a date
    if (task.date) continue;

    // Move to next day if max tasks reached
    if (tasksToday >= maxTasksPerDay) {
      currentDate = addDays(currentDate, 1);
      tasksToday = 0;
    }

    // Set to start of work day
    currentDate.setHours(workHours.start, 0, 0, 0);
    const suggestedDate = currentDate.getTime();

    // Calculate confidence based on priority and estimate
    const priorityWeight = { high: 0.9, medium: 0.7, low: 0.5, none: 0.3 };
    const estimateFactor = task.estimate ? Math.min(1, 2 / (task.estimate / 60)) : 0.5;
    const confidence = Math.round((priorityWeight[task.priority] * estimateFactor) * 100);

    const reason = task.priority === 'high'
      ? 'High priority task scheduled early in work day'
      : task.estimate && task.estimate > 120
        ? 'Large task scheduled for full work day'
        : 'Balanced with other tasks for optimal flow';

    suggestions.push({
      taskId: task.id,
      suggestedDate,
      confidence,
      reason
    });

    // Add estimated time to current day
    if (task.estimate) {
      tasksToday += Math.ceil(task.estimate / 60);
    } else {
      tasksToday += 1;
    }
  }

  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userPreferences } = body;

    const tasks = await getTasks({ completed: false });
    const suggestions = calculateOptimalSchedule(tasks, userPreferences);

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}