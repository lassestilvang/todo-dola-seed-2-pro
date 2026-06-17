import type { Goal, GoalMilestone, Task } from '@/lib/types';

export interface MilestoneSuggestion {
  name: string;
  targetValue: number;
  reason: string;
}

export function getMilestoneSuggestions(goal: Goal): MilestoneSuggestion[] {
  const suggestions: MilestoneSuggestion[] = [];
  const progress = (goal.currentValue / goal.targetValue) * 100;

  // Generate milestones based on goal unit
  if (goal.unit === 'tasks' || goal.unit === 'hours') {
    const remaining = goal.targetValue - goal.currentValue;
    const quarter = Math.ceil(goal.targetValue / 4);

    if (progress < 25) {
      suggestions.push({
        name: `First ${quarter} ${goal.unit}`,
        targetValue: quarter,
        reason: 'Start strong with an early milestone',
      });
    }
    if (progress < 50) {
      suggestions.push({
        name: `${quarter * 2} ${goal.unit}`,
        targetValue: quarter * 2,
        reason: 'Halfway milestone',
      });
    }
    if (progress < 75) {
      suggestions.push({
        name: `${quarter * 3} ${goal.unit}`,
        targetValue: quarter * 3,
        reason: 'Three quarters complete',
      });
    }
  } else if (goal.unit === '%') {
    if (progress < 25) {
      suggestions.push({
        name: 'First 25%',
        targetValue: 25,
        reason: 'Kickoff milestone',
      });
    }
    if (progress < 50) {
      suggestions.push({
        name: 'Halfway (50%)',
        targetValue: 50,
        reason: 'Midpoint achievement',
      });
    }
    if (progress < 75) {
      suggestions.push({
        name: 'Almost there (75%)',
        targetValue: 75,
        reason: 'Final push milestone',
      });
    }
  }

  return suggestions;
}

export function updateGoalProgress(
  goal: Goal,
  completedTasks: Task[],
  taskKeyword?: string
): { updatedGoal: Goal; progressDelta: number } {
  const now = Date.now();
  let progressDelta = 0;

  // Calculate progress from completed tasks
  if (goal.taskId && completedTasks.some(t => t.id === goal.taskId && t.completed)) {
    progressDelta = goal.targetValue - goal.currentValue;
  }

  // Calculate progress from keyword matching
  if (taskKeyword) {
    const keywordTasks = completedTasks.filter(t =>
      t.labels?.some(l => l.name.toLowerCase().includes(taskKeyword.toLowerCase()))
    );
    progressDelta += keywordTasks.length;
  }

  const updatedGoal = {
    ...goal,
    currentValue: Math.min(goal.currentValue + progressDelta, goal.targetValue),
    updatedAt: now,
  };

  return { updatedGoal, progressDelta };
}

export function checkGoalMilestones(
  goal: Goal,
  milestones: GoalMilestone[]
): { milestone: GoalMilestone; completed: boolean }[] {
  return milestones.map(milestone => ({
    milestone,
    completed: milestone.currentValue >= milestone.targetValue,
  }));
}

export function getGoalProgress(goal: Goal): number {
  return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
}