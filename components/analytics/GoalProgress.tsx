'use client';

import { useMemo } from 'react';
import type { Goal, GoalMilestone } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';
import { Target, Calendar, Award, TrendingUp, AlertCircle } from 'lucide-react';

interface GoalProgressProps {
  goals: Goal[];
  milestones?: GoalMilestone[];
}

export function GoalProgress({ goals, milestones = [] }: GoalProgressProps) {
  const goalMilestones = useMemo(() => {
    const grouped: Record<string, GoalMilestone[]> = {};
    milestones.forEach(m => {
      if (!grouped[m.goalId]) grouped[m.goalId] = [];
      grouped[m.goalId].push(m);
    });
    return grouped;
  }, [milestones]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGoalStatus = (goal: Goal) => {
    const percentage = (goal.currentValue / goal.targetValue) * 100;
    if (percentage >= 100) return { label: 'Completed', color: 'text-green-400', icon: Award };
    if (goal.deadline && goal.deadline < Date.now()) return { label: 'Overdue', color: 'text-red-400', icon: AlertCircle };
    const daysLeft = goal.deadline ? differenceInDays(goal.deadline, Date.now()) : null;
    if (daysLeft && daysLeft < 7) return { label: 'Due Soon', color: 'text-yellow-400', icon: Calendar };
    return { label: 'In Progress', color: 'text-blue-400', icon: Target };
  };

  if (goals.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-gray-900 border border-gray-800 text-center">
        <Target className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400">No goals set yet</p>
        <p className="text-xs text-gray-500 mt-1">Create goals to track your progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Goal Progress</h3>

      <div className="space-y-4">
        {goals.map(goal => {
          const percentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
          const status = getGoalStatus(goal);
          const StatusIcon = status.icon;
          const goalMs = goalMilestones[goal.id] || [];
          const completedMs = goalMs.filter(m => m.completed);

          return (
            <div key={goal.id} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{goal.name}</h4>
                <span className={`text-xs ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                </span>
              </div>

              {goal.description && (
                <p className="text-sm text-gray-400 mb-3">{goal.description}</p>
              )}

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{Math.round(goal.currentValue)} / {goal.targetValue} {goal.unit}</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-800">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {goal.deadline && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Due: {format(new Date(goal.deadline), 'MMM d, yyyy')}
                      {' '}({differenceInDays(goal.deadline, Date.now())} days left)
                    </span>
                  </div>
                )}

                {goalMs.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Milestones ({completedMs.length}/{goalMs.length})</span>
                      <span>{Math.round((completedMs.length / goalMs.length) * 100)}%</span>
                    </div>
                    <div className="flex gap-1">
                      {goalMs.map(m => (
                        <div
                          key={m.id}
                          className={`w-2 h-2 rounded-full ${m.completed ? 'bg-green-500' : 'bg-gray-600'}`}
                          title={m.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}