'use client';

import { useMemo } from 'react';
import type { Task, Goal, Habit, HabitCompletion, TimeBlock, Reminder } from '@/lib/types';
import { ProductivityInsights } from './ProductivityInsights';
import { ProductivityTrend } from './ProductivityTrend';
import { GoalProgress } from './GoalProgress';
import { HabitTracker } from './HabitTracker';
import { TimeBlockAnalysis } from './TimeBlockAnalysis';
import { LabelPerformance } from './LabelPerformance';
import { TaskDistribution } from './TaskDistribution';

interface EnhancedDashboardProps {
  tasks: Task[];
  goals?: Goal[];
  habits?: Habit[];
  habitCompletions?: HabitCompletion[];
  timeBlocks?: TimeBlock[];
  reminders?: Reminder[];
}

export function EnhancedDashboard({
  tasks,
  goals = [],
  habits = [],
  habitCompletions = [],
  timeBlocks = [],
  reminders = [],
}: EnhancedDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enhanced Dashboard</h1>
        <p className="text-sm text-gray-400">Comprehensive productivity overview</p>
      </div>

      <ProductivityInsights tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductivityTrend tasks={tasks} />
        <TaskDistribution tasks={tasks} />
      </div>

      <LabelPerformance tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalProgress goals={goals} />
        <HabitTracker habits={habits} completions={habitCompletions} />
      </div>

      {timeBlocks.length > 0 && <TimeBlockAnalysis timeBlocks={timeBlocks} tasks={tasks} />}

      {reminders.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-lg font-semibold mb-3">Upcoming Reminders</h3>
          <div className="space-y-2">
            {reminders
              .filter(r => r.enabled && (!r.sentAt || r.reminderTime > Date.now()))
              .sort((a, b) => (a.reminderTime || 0) - (b.reminderTime || 0))
              .slice(0, 5)
              .map(reminder => {
                const isOverdue = reminder.reminderTime < Date.now();
                return (
                  <div
                    key={reminder.id}
                    className={`text-sm p-2 rounded ${isOverdue ? 'bg-red-500/20' : 'bg-gray-800'}`}
                  >
                    <span className={isOverdue ? 'text-red-300' : 'text-gray-300'}>
                      {isOverdue ? '⚠️ Overdue' : '🔔'} Reminder
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}