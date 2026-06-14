'use client';

import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import Link from 'next/link';
import { Clock, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import type { Task } from '@/lib/types';

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const res = await fetch('/api/tasks?view=today&completed=false');
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const now = new Date();
  const currentHour = now.getHours();

  const timeBlocks = Array.from({ length: 24 }, (_, i) => i);

  const getTasksForHour = (hour: number) => {
    return tasks.filter(task => {
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      return taskDate.getHours() === hour;
    });
  };

  const completedTasks = tasks.filter(t => t.completed);
  const activeTasks = tasks.filter(t => !t.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-gray-400">
          {format(now, 'EEEE, MMMM d')} • {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-gray-900 animate-pulse h-20" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No tasks scheduled for today</p>
          <p className="text-sm text-gray-400">
            Tasks with today's date will appear here.{' '}
            <Link href="/" className="text-blue-400 hover:underline">
              Create one?
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Time-based view */}
          <div className="space-y-4">
            {timeBlocks.map(hour => {
              const hourTasks = getTasksForHour(hour);
              const isCurrentHour = hour === currentHour;

              return (
                <div key={hour} className={`border rounded-lg p-4 ${
                  isCurrentHour ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-sm font-medium ${
                      isCurrentHour ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                    </span>
                    <div className="h-px bg-gray-700 flex-1" />
                  </div>

                  {hourTasks.length === 0 ? (
                    <p className="text-xs text-gray-500">No tasks scheduled</p>
                  ) : (
                    <ul className="space-y-2">
                      {hourTasks.map(task => (
                        <li key={task.id} className="flex items-center gap-3 pl-4">
                          <button
                            onClick={async () => {
                              await fetch(`/api/tasks/${task.id}/toggle`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ completed: !task.completed }),
                              });
                              window.location.reload();
                            }}
                            className="cursor-pointer"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          <div className="flex-1">
                            <Link href={`/task/${task.id}`} className="text-sm hover:text-blue-400">
                              {task.name}
                            </Link>
                            {task.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          {task.estimate && (
                            <span className="text-xs text-gray-400">{task.estimate}m</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Completed tasks section */}
          {completedTasks.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Completed ({completedTasks.length})
              </h2>
              <ul className="space-y-2">
                {completedTasks.map(task => (
                  <li key={task.id} className="flex items-center gap-3 text-gray-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <Link href={`/task/${task.id}`} className="text-sm line-through flex-1">
                      {task.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
