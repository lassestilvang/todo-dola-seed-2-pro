'use client';

import { useState, useEffect } from 'react';
import TaskCard from './TaskCard';
import type { Task } from '@/lib/types';

interface TaskListViewProps {
  view: 'today' | 'next7' | 'upcoming' | 'all';
  title: string;
}

export default function TaskListView({ view, title }: TaskListViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      const res = await fetch(`/api/tasks?view=${view}&completed=${showCompleted}`);
      const data = await res.json();
      setTasks(data);
      setLoading(false);
    }

    loadTasks();
  }, [view, showCompleted]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded"
            />
            Show completed
          </label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-gray-900 animate-pulse h-20" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
          <p className="text-gray-400">No tasks here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}