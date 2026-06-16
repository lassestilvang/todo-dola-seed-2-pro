'use client';

import { useMemo } from 'react';
import type { Habit, HabitCompletion } from '@/lib/types';
import { format, subDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Award, Flame, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface HabitTrackerProps {
  habits: Habit[];
  completions?: HabitCompletion[];
}

export function HabitTracker({ habits, completions = [] }: HabitTrackerProps) {
  const habitCompletions = useMemo(() => {
    const grouped: Record<string, HabitCompletion[]> = {};
    completions.forEach(c => {
      if (!grouped[c.habitId]) grouped[c.habitId] = [];
      grouped[c.habitId].push(c);
    });
    return grouped;
  }, [completions]);

  const getWeekData = (habitId: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekStart = startOfWeek(now);

    return days.map((day, i) => {
      const date = subDays(weekStart, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const completed = habitCompletions[habitId]?.some(c =>
        format(parseISO(c.completedAt.toString()), 'yyyy-MM-dd') === dateStr
      );

      return { day, completed };
    });
  };

  const getStreakTrend = (habit: Habit) => {
    if (habit.streak >= 7) return 'up';
    if (habit.streak >= 3) return 'neutral';
    return 'down';
  };

  if (habits.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-gray-900 border border-gray-800 text-center">
        <Flame className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400">No habits tracked yet</p>
        <p className="text-xs text-gray-500 mt-1">Create habits to build streaks</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Habit Tracker</h3>

      <div className="space-y-4">
        {habits.map(habit => {
          const weekData = getWeekData(habit.id);
          const streakTrend = getStreakTrend(habit);
          const lastCompleted = habit.lastCompleted ? format(new Date(habit.lastCompleted), 'MMM d') : 'Never';

          return (
            <div key={habit.id} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{habit.name}</h4>
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-sm font-medium">{habit.streak}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {streakTrend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
                  {streakTrend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
                  <span className="text-gray-400">Last: {lastCompleted}</span>
                </div>
              </div>

              {habit.description && (
                <p className="text-sm text-gray-400 mb-3">{habit.description}</p>
              )}

              <div className="flex items-end gap-1 h-16">
                {weekData.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all ${day.completed ? 'bg-orange-500' : 'bg-gray-700'
                        }`}
                      style={{ height: day.completed ? '100%' : '25%' }}
                    />
                    <span className="text-xs text-gray-400">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h4 className="text-sm font-medium mb-3">Habit Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-orange-400">
              {habits.reduce((sum, h) => sum + h.streak, 0)}
            </p>
            <p className="text-xs text-gray-400">Total Streak Days</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {habits.filter(h => h.streak >= 7).length}
            </p>
            <p className="text-xs text-gray-400">7+ Day Streaks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {habits.filter(h => h.lastCompleted && Date.now() - h.lastCompleted < 24 * 60 * 60 * 1000).length}
            </p>
            <p className="text-xs text-gray-400">Active Today</p>
          </div>
        </div>
      </div>
    </div>
  );
}