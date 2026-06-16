'use client';

import { useMemo } from 'react';
import type { Task } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { TrendingUp, Clock, Target, Zap, Award, Calendar } from 'lucide-react';

interface ProductivityInsightsProps {
  tasks: Task[];
}

interface ProductivityMetric {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export function ProductivityInsights({ tasks }: ProductivityInsightsProps) {
  const metrics = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentTasks = tasks.filter(t => t.createdAt >= weekAgo);
    const recentCompleted = recentTasks.filter(t => t.completed);

    const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

    const completionRate = tasks.length > 0
      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
      : 0;

    const efficientTasks = totalEstimate > 0
      ? Math.round((totalActual / totalEstimate) * 100)
      : 100;

    const avgTaskAge = tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + (now - t.createdAt), 0) / tasks.length / (1000 * 60 * 60 * 24))
      : 0;

    const streak = calculateStreak(recentCompleted);

    return [
      {
        label: 'Completion Rate',
        value: `${completionRate}%`,
        change: `${recentCompleted.length}/${recentTasks.length} this week`,
        icon: <Target className="w-4 h-4" />,
        color: 'text-blue-400',
      },
      {
        label: 'Time Efficiency',
        value: `${efficientTasks}%`,
        change: `${Math.round(totalActual / 60)}h logged of ${Math.round(totalEstimate / 60)}h estimated`,
        icon: <Clock className="w-4 h-4" />,
        color: 'text-green-400',
      },
      {
        label: 'Avg Task Age',
        value: `${avgTaskAge}d`,
        change: 'days since creation',
        icon: <Calendar className="w-4 h-4" />,
        color: 'text-purple-400',
      },
      {
        label: 'Current Streak',
        value: `${streak}`,
        change: 'days in a row',
        icon: <Award className="w-4 h-4" />,
        color: 'text-yellow-400',
      },
    ];
  }, [tasks]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Productivity Insights</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{metric.label}</p>
              <span className={metric.color}>{metric.icon}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
            <p className="text-xs text-gray-500 mt-1">{metric.change}</p>
          </div>
        ))}
      </div>

      <WeeklyPattern tasks={tasks} />
    </div>
  );
}

function calculateStreak(completedTasks: Task[]): number {
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

function WeeklyPattern({ tasks }: { tasks: Task[] }) {
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const data = days.map(day => ({ day, count: 0 }));

    tasks.forEach(task => {
      if (task.completedAt) {
        const dayOfWeek = new Date(task.completedAt).getDay();
        data[dayOfWeek].count++;
      }
    });

    return data;
  }, [tasks]);

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h4 className="text-sm font-medium mb-3">Weekly Completion Pattern</h4>
      <div className="flex items-end gap-1 h-24">
        {weeklyData.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t-sm bg-blue-500 transition-all hover:bg-blue-400"
              style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: '4px' }}
            />
            <span className="text-xs text-gray-400">{day.day.slice(0, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}