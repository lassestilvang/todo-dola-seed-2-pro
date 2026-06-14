'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, RotateCcw, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';

export default function TrashPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedTasks();
  }, []);

  async function loadDeletedTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks/deleted');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load deleted tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRestore(taskId: string) {
    setRestoringId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to restore task:', error);
    } finally {
      setRestoringId(null);
    }
  }

  async function handlePermanentDelete(taskId: string) {
    if (!confirm('Are you sure you want to permanently delete this task? This cannot be undone.')) return;

    setDeletingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}?permanent=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trash</h1>
        <p className="text-gray-400">
          Deleted tasks are stored here for 30 days before being permanently removed.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deleted tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-3 py-2 text-sm rounded-md border bg-background w-full"
          />
        </div>
        <Button variant="outline" onClick={loadDeletedTasks}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-gray-900 animate-pulse h-20" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No deleted tasks found</p>
          {search && (
            <p className="text-sm text-gray-500 mt-1">
              Try clearing your search for "{search}"
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-400 mb-3">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} in trash
          </div>
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <div key={task.id} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.name}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Deleted: {format(new Date(task.updatedAt), 'MMM d, yyyy')}</span>
                      {task.priority !== 'none' && (
                        <span className={task.priority === 'high' ? 'text-red-400' : ''}>
                          Priority: {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(task.id)}
                      disabled={restoringId === task.id}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePermanentDelete(task.id)}
                      disabled={deletingId === task.id}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}