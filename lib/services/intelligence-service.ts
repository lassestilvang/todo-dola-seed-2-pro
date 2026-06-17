import type { Task, Goal, Habit, Priority } from '@/lib/types';

export interface ProductivityInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'achievement' | 'warning';
  title: string;
  description: string;
  value?: number;
  target?: number;
  confidence: number;
  createdAt: number;
}

export interface ProductivityMetrics {
  completionRate: number;
  averageTaskTime: number;
  streak: number;
  productivityScore: number;
  topLabels: { label: string; count: number }[];
  peakHours: { hour: number; count: number }[];
}

export function calculateMetrics(tasks: Task[], timeEntries: { startedAt: number; endedAt: number | null }[] = []): ProductivityMetrics {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Filter tasks from last 30 days
  const recentTasks = tasks.filter(t => t.createdAt >= thirtyDaysAgo);
  const completedTasks = recentTasks.filter(t => t.completed);

  // Completion rate
  const completionRate = recentTasks.length > 0
    ? completedTasks.length / recentTasks.length
    : 0;

  // Average task time
  const totalTime = timeEntries.reduce((sum, entry) => {
    if (entry.endedAt) {
      return sum + (entry.endedAt - entry.startedAt);
    }
    return sum;
  }, 0);
  const averageTaskTime = timeEntries.length > 0 ? totalTime / timeEntries.length / 60000 : 0; // in minutes

  // Streak calculation
  const sortedTasks = [...completedTasks].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const task of sortedTasks) {
    if (task.completedAt) {
      const taskDate = new Date(task.completedAt);
      taskDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }
  }

  // Productivity score (0-100)
  const productivityScore = Math.round(
    completionRate * 40 +
    Math.min(averageTaskTime / 60, 1) * 30 +
    Math.min(streak / 7, 1) * 30
  );

  // Top labels
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

  // Peak hours
  const hourCounts: Record<number, number> = {};
  for (const task of completedTasks) {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    completionRate,
    averageTaskTime,
    streak,
    productivityScore,
    topLabels,
    peakHours,
  };
}

export function generateInsights(metrics: ProductivityMetrics, tasks: Task[], goals: Goal[] = [], habits: Habit[] = []): ProductivityInsight[] {
  const insights: ProductivityInsight[] = [];
  const now = Date.now();

  // Completion rate insight
  if (metrics.completionRate < 0.5) {
    insights.push({
      id: 'low-completion',
      type: 'warning',
      title: 'Low Completion Rate',
      description: `You've completed ${Math.round(metrics.completionRate * 100)}% of your tasks this month. Consider breaking down larger tasks into smaller, more manageable ones.`,
      value: metrics.completionRate,
      confidence: 0.8,
      createdAt: now,
    });
  } else if (metrics.completionRate > 0.8) {
    insights.push({
      id: 'high-completion',
      type: 'achievement',
      title: 'Excellent Productivity!',
      description: `You've completed ${Math.round(metrics.completionRate * 100)}% of your tasks. Keep up the great work!`,
      value: metrics.completionRate,
      confidence: 0.9,
      createdAt: now,
    });
  }

  // Streak insight
  if (metrics.streak >= 7) {
    insights.push({
      id: 'productivity-streak',
      type: 'achievement',
      title: 'Productivity Streak',
      description: `You've maintained a ${metrics.streak}-day streak of task completion!`,
      value: metrics.streak,
      confidence: 0.95,
      createdAt: now,
    });
  }

  // Peak hours insight
  if (metrics.peakHours.length > 0) {
    const peak = metrics.peakHours[0];
    insights.push({
      id: 'peak-hours',
      type: 'recommendation',
      title: 'Peak Productivity Hours',
      description: `You're most productive between ${peak.hour}:00 and ${peak.hour + 1}:00. Schedule important tasks during this time.`,
      value: peak.hour,
      confidence: 0.7,
      createdAt: now,
    });
  }

  // Goal progress
  for (const goal of goals) {
    const progress = (goal.currentValue / goal.targetValue) * 100;
    if (progress < 25 && goal.deadline && goal.deadline > now) {
      insights.push({
        id: `goal-warning-${goal.id}`,
        type: 'warning',
        title: `Goal in Progress: ${goal.name}`,
        description: `Only ${Math.round(progress)}% complete. Consider increasing focus to meet the deadline.`,
        value: progress,
        target: 100,
        confidence: 0.75,
        createdAt: now,
      });
    } else if (progress >= 100) {
      insights.push({
        id: `goal-complete-${goal.id}`,
        type: 'achievement',
        title: `Goal Achieved: ${goal.name}`,
        description: 'Congratulations on reaching your goal!',
        value: 100,
        confidence: 1.0,
        createdAt: now,
      });
    }
  }

  // Habit streak
  for (const habit of habits) {
    if (habit.streak >= 7) {
      insights.push({
        id: `habit-streak-${habit.id}`,
        type: 'achievement',
        title: `Habit Streak: ${habit.name}`,
        description: `You've maintained this habit for ${habit.streak} days!`,
        value: habit.streak,
        confidence: 0.9,
        createdAt: now,
      });
    }
  }

  // Pattern insight
  if (metrics.topLabels.length > 0) {
    insights.push({
      id: 'focus-areas',
      type: 'pattern',
      title: 'Focus Areas',
      description: `Your top productivity labels: ${metrics.topLabels.map(l => l.label).join(', ')}`,
      value: metrics.topLabels[0].count,
      confidence: 0.6,
      createdAt: now,
    });
  }

  return insights.sort((a, b) => {
    const priority = { achievement: 0, pattern: 1, recommendation: 2, warning: 3 };
    return priority[a.type] - priority[b.type];
  });
}

export function getRecommendations(metrics: ProductivityMetrics, tasks: Task[]): string[] {
  const recommendations: string[] = [];

  // Based on productivity score
  if (metrics.productivityScore < 50) {
    recommendations.push('Try the Pomodoro technique for focused work sessions');
    recommendations.push('Break down large tasks into smaller subtasks');
  } else if (metrics.productivityScore < 75) {
    recommendations.push('Consider time blocking for complex tasks');
    recommendations.push('Use the Eisenhower matrix to prioritize tasks');
  }

  // Based on completion rate
  if (metrics.completionRate < 0.6) {
    recommendations.push('Reduce daily task load to improve completion rate');
    recommendations.push('Set realistic deadlines and buffer time');
  }

  // Based on average task time
  if (metrics.averageTaskTime > 120) {
    recommendations.push('Track time more precisely to improve estimates');
    recommendations.push('Use the 80/20 rule to focus on high-impact tasks');
  }

  // Based on streak
  if (metrics.streak > 0 && metrics.streak < 3) {
    recommendations.push('Build consistency by doing one small task daily');
  }

  return recommendations.slice(0, 5);
}

// Auto-prioritization based on task analysis
export interface PrioritySuggestion {
  taskId: string;
  suggestedPriority: Priority;
  reason: string;
  confidence: number;
}

export function getAutoPrioritySuggestions(tasks: Task[]): PrioritySuggestion[] {
  const suggestions: PrioritySuggestion[] = [];
  const now = Date.now();

  for (const task of tasks) {
    if (task.completed || task.priority === 'high') continue; // Skip completed or already high priority

    let suggestedPriority: Priority = 'none';
    let reason = '';
    let confidence = 0;

    // Check for urgent deadline (due within 24 hours)
    if (task.deadline && task.deadline <= now + 24 * 60 * 60 * 1000) {
      suggestedPriority = 'high';
      reason = 'Due within 24 hours';
      confidence = 0.9;
    }
    // Check for upcoming deadline (due within 7 days)
    else if (task.deadline && task.deadline <= now + 7 * 24 * 60 * 60 * 1000) {
      suggestedPriority = 'medium';
      reason = 'Due within 7 days';
      confidence = 0.7;
    }
    // Check for labels indicating importance
    else if (task.labels && task.labels.some(l => l.name.toLowerCase().includes('urgent'))) {
      suggestedPriority = 'high';
      reason = 'Has "urgent" label';
      confidence = 0.8;
    }
    else if (task.labels && task.labels.some(l => l.name.toLowerCase().includes('important'))) {
      suggestedPriority = 'medium';
      reason = 'Has "important" label';
      confidence = 0.7;
    }
    // Check for high-value labels
    else if (task.labels && task.labels.length > 2) {
      suggestedPriority = 'medium';
      reason = 'Multiple labels suggest complexity';
      confidence = 0.6;
    }

    if (confidence > 0.5) {
      suggestions.push({
        taskId: task.id,
        suggestedPriority,
        reason,
        confidence,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}