'use client';

import { useMemo } from 'react';
import { Task, TaskDependency } from '@/lib/types';
import { format, addDays, startOfWeek } from 'date-fns';

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
}

export default function GanttChart({ tasks, dependencies }: GanttChartProps) {
  const chartData = useMemo(() => {
    const startDate = new Date(Math.min(...tasks.map(t => t.date || t.createdAt)));
    const endDate = new Date(Math.max(...tasks.map(t => t.deadline || t.date || t.createdAt)));

    const weeks = [];
    let current = startOfWeek(startDate);
    while (current <= endDate) {
      weeks.push(new Date(current));
      current = addDays(current, 7);
    }

    return { startDate, endDate, weeks };
  }, [tasks]);

  const getTaskPosition = (task: Task) => {
    if (!task.date) return null;

    const start = new Date(task.date);
    const end = task.deadline ? new Date(task.deadline) : start;

    return { start, end };
  };

  const getDependencyLines = () => {
    return dependencies.map(dep => {
      const fromTask = tasks.find(t => t.id === dep.taskId);
      const toTask = tasks.find(t => t.id === dep.dependsOnTaskId);

      if (!fromTask || !toTask) return null;

      const fromPos = getTaskPosition(fromTask);
      const toPos = getTaskPosition(toTask);

      if (!fromPos || !toPos) return null;

      return {
        from: { x: fromPos.end.getTime(), y: 0 },
        to: { x: toPos.start.getTime(), y: 0 },
      };
    }).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gantt Chart</h2>
        <div className="text-sm text-muted-foreground">
          {chartData.startDate.toLocaleDateString()} - {chartData.endDate.toLocaleDateString()}
        </div>
      </div>

      <div className="border rounded-lg p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Week headers */}
          <div className="flex mb-4">
            <div className="w-48 flex-shrink-0" />
            <div className="flex-1 flex gap-2">
              {chartData.weeks.map((week, i) => (
                <div key={i} className="flex-1 text-center text-xs">
                  <div className="font-medium">{format(week, 'MMM d')}</div>
                  <div className="text-muted-foreground">Week {i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map(task => {
              const pos = getTaskPosition(task);
              if (!pos) return null;

              const startOffset = pos.start.getTime() - chartData.startDate.getTime();
              const duration = pos.end.getTime() - pos.start.getTime();
              const weekWidth = (7 * 24 * 60 * 60 * 1000);
              const left = (startOffset / weekWidth) * 100;
              const width = (duration / weekWidth) * 100;

              return (
                <div key={task.id} className="flex items-center">
                  <div className="w-48 flex-shrink-0 text-sm font-medium">{task.name}</div>
                  <div className="flex-1 h-8 bg-gray-800 rounded relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-8 rounded ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' :
                        task.priority === 'low' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{
                        left: `${Math.max(0, Math.min(100, left))}%`,
                        width: `${Math.max(1, Math.min(100, width))}%`,
                      }}
                      title={task.name}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>High Priority</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span>Medium Priority</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Low Priority</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>No Priority</span>
        </div>
      </div>
    </div>
  );
}