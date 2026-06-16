'use client';

import { useMemo } from 'react';
import type { Task, TaskList } from '@/lib/types';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { List, Calendar, Clock, CheckCircle, AlertCircle, Pause } from 'lucide-react';

interface TaskDistributionProps {
  tasks: Task[];
  lists?: TaskList[];
}

export function TaskDistribution({ tasks, lists }: TaskDistributionProps) {
  const listData = useMemo(() => {
    const listMap = new Map<string, { name: string; emoji: string; count: number; completed: number }>();

    tasks.forEach(task => {
      const listId = task.listId || 'inbox';
      if (!listMap.has(listId)) {
        listMap.set(listId, { name: lists?.find(l => l.id === listId)?.name || 'Unknown', emoji: lists?.find(l => l.id === listId)?.emoji || '📋', count: 0, completed: 0 });
      }
      const stat = listMap.get(listId)!;
      stat.count += 1;
      if (task.completed) stat.completed += 1;
    });

    return Array.from(listMap.entries()).map(([id, stat]) => ({
      id,
      name: stat.name,
      emoji: stat.emoji,
      count: stat.count,
      completed: stat.completed,
      rate: stat.count > 0 ? Math.round((stat.completed / stat.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [tasks, lists]);

  const priorityData = useMemo(() => {
    const data = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 },
      none: { total: 0, completed: 0 },
    };

    tasks.forEach(task => {
      const priority = task.priority || 'none';
      data[priority].total += 1;
      if (task.completed) data[priority].completed += 1;
    });

    return [
      { name: 'High', total: data.high.total, completed: data.high.completed, fill: '#ef4444' },
      { name: 'Medium', total: data.medium.total, completed: data.medium.completed, fill: '#f59e0b' },
      { name: 'Low', total: data.low.total, completed: data.low.completed, fill: '#22c55e' },
      { name: 'None', total: data.none.total, completed: data.none.completed, fill: '#6b7280' },
    ];
  }, [tasks]);

  const deadlineData = useMemo(() => {
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    const overdue = tasks.filter(t => t.deadline && t.deadline < now && !t.completed).length;
    const dueSoon = tasks.filter(t => t.deadline && t.deadline >= now && t.deadline < thirtyDaysFromNow && !t.completed).length;
    const upcoming = tasks.filter(t => t.deadline && t.deadline >= thirtyDaysFromNow).length;
    const noDeadline = tasks.filter(t => !t.deadline).length;

    return [
      { name: 'Overdue', count: overdue, fill: '#ef4444' },
      { name: 'Due Soon', count: dueSoon, fill: '#f59e0b' },
      { name: 'Upcoming', count: upcoming, fill: '#3b82f6' },
      { name: 'No Deadline', count: noDeadline, fill: '#6b7280' },
    ];
  }, [tasks]);

  const ageData = useMemo(() => {
    const now = Date.now();
    const buckets = {
      '0-3d': 0,
      '4-7d': 0,
      '8-14d': 0,
      '15-30d': 0,
      '30+d': 0,
    };

    tasks.forEach(task => {
      const ageDays = Math.round((now - task.createdAt) / (1000 * 60 * 60 * 24));
      if (ageDays <= 3) buckets['0-3d']++;
      else if (ageDays <= 7) buckets['4-7d']++;
      else if (ageDays <= 14) buckets['8-14d']++;
      else if (ageDays <= 30) buckets['15-30d']++;
      else buckets['30+d']++;
    });

    return Object.entries(buckets).map(([name, count]) => ({ name, count, fill: '#8b5cf6' }));
  }, [tasks]);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0,
    overdue: tasks.filter(t => t.deadline && t.deadline < Date.now() && !t.completed).length,
    highPriority: tasks.filter(t => t.priority === 'high' && !t.completed).length,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Task Distribution</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Total Tasks</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">{stats.completed} completed</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Completion Rate</p>
          <p className="text-2xl font-bold">{stats.completionRate}%</p>
          <p className="text-xs text-gray-500">of total tasks</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
          <p className="text-xs text-gray-500">need attention</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <p className="text-sm text-gray-400">High Priority</p>
          <p className="text-2xl font-bold text-red-400">{stats.highPriority}</p>
          <p className="text-xs text-gray-500">urgent tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="text-sm font-medium mb-3">By List</h4>
          <div className="space-y-2">
            {listData.slice(0, 5).map(list => (
              <div key={list.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{list.emoji}</span>
                  <span className="text-sm">{list.name}</span>
                </div>
                <div className="text-right text-xs">
                  <p>{list.completed}/{list.count}</p>
                  <p className={list.rate >= 75 ? 'text-green-400' : list.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                    {list.rate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="text-sm font-medium mb-3">By Priority</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="total" fill="#8884d8" name="Total" />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="text-sm font-medium mb-3">Deadlines</h4>
          <div className="space-y-2">
            {deadlineData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-lg font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h4 className="text-sm font-medium mb-3">Task Age Distribution</h4>
        <div className="flex items-end gap-2 h-24">
          {ageData.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${Math.max(item.count, 1) * 20}%`, backgroundColor: item.fill }}
              />
              <span className="text-xs text-gray-400">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}