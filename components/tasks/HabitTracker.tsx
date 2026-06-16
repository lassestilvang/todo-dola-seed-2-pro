'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, Check, X } from 'lucide-react';
import type { Task } from '@/lib/types';

interface HabitTrackProps {
  tasks: Task[];
  onHabitComplete?: (taskId: string, date: number) => void;
}

export default function HabitTracker({ tasks, onHabitComplete }: HabitTrackProps) {
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  // Filter for habit-like tasks (recurring or marked with a specific label)
  const habitTasks = tasks.filter(t => {
    if (t.recurringType) return true;
    if (t.labels?.some(l => l.name.toLowerCase().includes('habit'))) return true;
    return false;
  });

  const today = new Date().toDateString();

  useEffect(() => {
    // Load completed habits from localStorage
    const saved = localStorage.getItem(`habits_${today}`);
    if (saved) {
      setCompletedToday(new Set(JSON.parse(saved)));
    }
  }, [today]);

  const handleComplete = (taskId: string) => {
    const newCompleted = new Set(completedToday);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
      onHabitComplete?.(taskId, Date.now());
    }
    setCompletedToday(newCompleted);
    localStorage.setItem(`habits_${today}`, JSON.stringify(Array.from(newCompleted)));
  };

  const streakCount = (taskId: string): number => {
    // Calculate streak based on localStorage history
    let streak = 0;
    let date = new Date();

    while (true) {
      const dateStr = date.toDateString();
      const saved = localStorage.getItem(`habits_${dateStr}`);
      if (saved && JSON.parse(saved).includes(taskId)) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  if (habitTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <Flame className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <p className="text-gray-500">No habits found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Mark tasks as recurring or add "habit" label to track streaks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Habit Tracker</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {habitTasks.map(task => {
          const isCompleted = completedToday.has(task.id);
          const streak = streakCount(task.id);

          return (
            <div
              key={task.id}
              className={`border rounded-lg p-3 transition-colors ${
                isCompleted ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{task.name}</h4>
                <button
                  onClick={() => handleComplete(task.id)}
                  className={`p-1 rounded ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>

              {streak > 0 && (
                <div className="flex items-center gap-1 text-orange-400">
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{streak}</span>
                  <span className="text-xs">day streak</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}