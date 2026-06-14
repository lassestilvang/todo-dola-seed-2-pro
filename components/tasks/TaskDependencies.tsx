'use client';

import { useState, useEffect } from 'react';
import { Link, Unlink, Plus, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';

interface TaskDependenciesProps {
  taskId: string;
  dependencies?: { id: string; taskId: string; dependsOnTaskId: string; task?: Task | null }[];
  onDependencyChange: () => void;
}

export default function TaskDependencies({
  taskId,
  dependencies = [],
  onDependencyChange,
}: TaskDependenciesProps) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockingTasks, setBlockingTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, blockingRes] = await Promise.all([
          fetch('/api/tasks?view=all&completed=false'),
          fetch(`/api/task-dependencies?taskId=${taskId}`)
        ]);

        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          setAvailableTasks(tasks.filter((t: Task) => t.id !== taskId));
        }

        if (blockingRes.ok) {
          const deps = await blockingRes.json();
          const blockingTaskIds = deps.map((d: { dependsOnTaskId: string }) => d.dependsOnTaskId);
          if (blockingTaskIds.length > 0) {
            const tasksRes2 = await fetch(`/api/tasks?view=all&completed=false`);
            if (tasksRes2.ok) {
              const allTasks = await tasksRes2.json();
              setBlockingTasks(allTasks.filter((t: Task) => blockingTaskIds.includes(t.id)));
            }
          } else {
            setBlockingTasks([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    }
    fetchData();
  }, [taskId]);

  const handleAdd = async () => {
    if (!selectedTaskId || selectedTaskId === taskId || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/task-dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, dependsOnTaskId: selectedTaskId }),
      });

      if (res.ok) {
        toast.success('Dependency added');
        setSelectedTaskId('');
        onDependencyChange();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add dependency');
      }
    } catch {
      toast.error('Failed to add dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (dependencyId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/task-dependencies?id=${dependencyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Dependency removed');
        onDependencyChange();
      } else {
        toast.error('Failed to remove dependency');
      }
    } catch {
      toast.error('Failed to remove dependency');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = availableTasks.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Link className="w-4 h-4" />
        Dependencies
        {dependencies.length > 0 && (
          <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">
            {dependencies.length}
          </span>
        )}
      </h3>

      {/* Blocking tasks (this task is waiting on) */}
      {blockingTasks.length > 0 && (
        <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
          <p className="text-xs text-blue-400 mb-1 font-medium">Blocking this task:</p>
          <ul className="space-y-1">
            {blockingTasks.map(t => (
              <li key={t.id} className="text-sm text-blue-300">
                {t.completed ? '✓' : '•'} {t.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dependencies.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {dependencies.map(dep => (
            <li key={dep.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{dep.task?.name || 'Unknown task'}</span>
              {dep.task?.completed && (
                <span className="text-xs text-green-400">Done</span>
              )}
              <button
                onClick={() => handleRemove(dep.id)}
                disabled={loading}
                className="p-1 rounded hover:bg-red-500/20"
                title="Remove dependency"
              >
                <Unlink className="w-3 h-3 text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 mb-3">No dependencies</p>
      )}

      {!showSelector ? (
        <Button size="sm" variant="outline" onClick={() => setShowSelector(true)} disabled={loading}>
          <Plus className="w-3 h-3 mr-1" />
          Add Dependency
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              disabled={loading}
            />
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-700 rounded">
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No tasks found</p>
            ) : (
              filteredTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  disabled={loading || t.id === taskId || t.completed}
                  className={`w-full text-left p-2 text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                    t.completed ? 'text-gray-500' : ''
                  }`}
                >
                  {t.name}
                  {t.completed && ' (completed)'}
                </button>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={loading || !selectedTaskId}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSelector(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}