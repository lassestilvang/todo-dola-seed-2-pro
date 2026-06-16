'use client';

import { useMemo } from 'react';
import type { TimeBlock, Task } from '@/lib/types';
import { format, parseISO, isWithinInterval, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface TimeBlockAnalysisProps {
  timeBlocks: TimeBlock[];
  tasks: Task[];
}

export function TimeBlockAnalysis({ timeBlocks, tasks }: TimeBlockAnalysisProps) {
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(t => map.set(t.id, t));
    return map;
  }, [tasks]);

  const stats = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBlocks = timeBlocks.filter(tb => {
      const tbDate = parseISO(new Date(tb.start).toISOString());
      return isToday(tbDate);
    });

    const completedBlocks = timeBlocks.filter(tb => tb.end !== null);
    const overdueBlocks = timeBlocks.filter(tb => {
      const tbEnd = tb.end || tb.start;
      return tbEnd < now;
    });

    const totalMinutes = timeBlocks.reduce((sum, tb) => {
      return sum + ((tb.end || Date.now()) - tb.start) / (1000 * 60);
    }, 0);

    return {
      totalBlocks: timeBlocks.length,
      todayBlocks: todayBlocks.length,
      completedBlocks: completedBlocks.length,
      overdueBlocks: overdueBlocks.length,
      totalHours: Math.round(totalMinutes / 60),
      completionRate: timeBlocks.length > 0
        ? Math.round((completedBlocks.length / timeBlocks.length) * 100)
        : 0,
    };
  }, [timeBlocks]);

  const upcomingBlocks = useMemo(() => {
    const now = new Date();
    return timeBlocks
      .filter(tb => tb.start > now.getTime())
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
  }, [timeBlocks]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Time Blocking</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Total Blocks</p>
          <p className="text-2xl font-bold">{stats.totalBlocks}</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Today</p>
          <p className="text-2xl font-bold">{stats.todayBlocks}</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Hours Planned</p>
          <p className="text-2xl font-bold">{stats.totalHours}h</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Completion</p>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
        </div>
      </div>

      {upcomingBlocks.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="text-sm font-medium mb-3">Upcoming Time Blocks</h4>
          <div className="space-y-2">
            {upcomingBlocks.map(block => {
              const task = block.taskId ? taskMap.get(block.taskId) : null;
              const startDate = new Date(block.start);
              const isToday = startDate.getDate() === new Date().getDate();

              return (
                <div key={block.id} className="flex items-center gap-3 text-sm">
                  <div className="w-12 text-right">
                    <span className="text-gray-400">
                      {format(startDate, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={task ? '' : 'font-medium'}>{block.name}</p>
                    {task && <p className="text-xs text-gray-400">{task.name}</p>}
                  </div>
                  {isToday && (
                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                      Today
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}