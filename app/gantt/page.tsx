'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Task } from '@/lib/types';
import { BarChart3, Download } from 'lucide-react';

export default function GanttPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const res = await fetch('/api/tasks?view=all&completed=false');
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

  const ganttTasks = tasks
    .filter(t => t.date)
    .map(t => ({
      id: t.id,
      name: t.name,
      start: new Date(t.date!),
      end: t.deadline ? new Date(t.deadline) : new Date(t.date!),
      progress: t.completed ? 100 : 0,
      dependencies: [],
    }));

  const handleExport = () => {
    const data = {
      tasks: ganttTasks,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Gantt Chart</h1>
        <div className="h-96 bg-gray-900 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gantt Chart</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex-1 border rounded-lg p-4">
        {ganttTasks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-500">No tasks with dates to display</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add dates to tasks to see them in the Gantt chart
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <div className="text-sm text-muted-foreground mb-4">
              Showing {ganttTasks.length} tasks with dates
            </div>
            {/* Simple Gantt visualization */}
            <div className="space-y-2">
              {ganttTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4">
                  <div className="w-48 text-sm font-medium truncate">{task.name}</div>
                  <div className="flex-1 bg-gray-800 rounded h-6 relative">
                    <div
                      className="absolute top-0 h-6 bg-blue-500 rounded"
                      style={{
                        left: '0%',
                        width: `${task.progress}%`,
                      }}
                    />
                  </div>
                  <div className="w-32 text-xs text-muted-foreground">
                    {task.start.toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}