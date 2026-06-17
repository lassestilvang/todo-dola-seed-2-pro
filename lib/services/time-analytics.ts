import type { Task, TimeEntry } from '@/lib/types';

export interface TimeAllocation {
  label: string;
  hours: number;
  percentage: number;
  color: string;
}

export interface ProductivityCorrelation {
  date: number;
  tasksCompleted: number;
  timeSpent: number;
  productivityScore: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function calculateTimeAllocation(
  tasks: Task[],
  timeEntries: TimeEntry[]
): TimeAllocation[] {
  const labelHours: Record<string, number> = {};
  const now = Date.now();

  // Calculate hours per label
  for (const entry of timeEntries) {
    if (!entry.endedAt) continue;
    const hours = (entry.endedAt - entry.startedAt) / (1000 * 60 * 60);

    // Find task to get labels
    const task = tasks.find(t => t.id === entry.taskId);
    if (task && task.labels) {
      for (const label of task.labels) {
        labelHours[label.name] = (labelHours[label.name] || 0) + hours;
      }
    } else {
      labelHours['Uncategorized'] = (labelHours['Uncategorized'] || 0) + hours;
    }
  }

  const totalHours = Object.values(labelHours).reduce((sum, h) => sum + h, 0);

  return Object.entries(labelHours)
    .map(([label, hours], index) => ({
      label,
      hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.hours - a.hours);
}

export function calculateProductivityCorrelation(
  tasks: Task[],
  timeEntries: TimeEntry[],
  days = 30
): ProductivityCorrelation[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const correlations: ProductivityCorrelation[] = [];

  // Group tasks by day
  const taskByDay: Record<string, { completed: number; timeSpent: number }> = {};

  for (let i = 0; i < days; i++) {
    const dayStart = now - (i * dayMs);
    const dayEnd = dayStart + dayMs;
    taskByDay[dayStart.toString()] = { completed: 0, timeSpent: 0 };
  }

  // Count completed tasks per day
  for (const task of tasks) {
    if (task.completed && task.completedAt) {
      const dayKey = Math.floor(task.completedAt / dayMs) * dayMs;
      if (taskByDay[dayKey]) {
        taskByDay[dayKey].completed++;
      }
    }
  }

  // Calculate time spent per day
  for (const entry of timeEntries) {
    if (!entry.endedAt) continue;
    const dayKey = Math.floor(entry.startedAt / dayMs) * dayMs;
    if (taskByDay[dayKey]) {
      taskByDay[dayKey].timeSpent += (entry.endedAt - entry.startedAt) / (1000 * 60 * 60);
    }
  }

  // Build correlation data
  for (const [dayKey, data] of Object.entries(taskByDay).reverse()) {
    const productivityScore = data.timeSpent > 0
      ? Math.round((data.completed / data.timeSpent) * 100)
      : data.completed * 10;

    correlations.push({
      date: parseInt(dayKey),
      tasksCompleted: data.completed,
      timeSpent: Math.round(data.timeSpent * 100) / 100,
      productivityScore: Math.min(productivityScore, 100),
    });
  }

  return correlations;
}

export function getFocusTimeVsTaskCompletion(
  timeEntries: TimeEntry[],
  tasks: Task[]
): { focusHours: number; completedTasks: number; ratio: number } {
  let focusHours = 0;
  let completedTasks = 0;

  for (const entry of timeEntries) {
    if (entry.endedAt) {
      focusHours += (entry.endedAt - entry.startedAt) / (1000 * 60 * 60);
    }
  }

  completedTasks = tasks.filter(t => t.completed).length;

  const ratio = focusHours > 0 ? Math.round((completedTasks / focusHours) * 100) / 100 : 0;

  return { focusHours, completedTasks, ratio };
}