'use client';

import { useMemo } from 'react';
import { Task } from '@/lib/types';
import { format, subDays, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

interface TimeSeriesAnalyticsProps {
  tasks: Task[];
  timeEntries?: { date: number; duration: number }[];
}

export default function TimeSeriesAnalytics({ tasks, timeEntries = [] }: TimeSeriesAnalyticsProps) {
  const completionData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM d'),
        completed: 0,
        created: 0,
      };
    });

    tasks.forEach(task => {
      if (task.completedAt) {
        const dayIndex = last30Days.findIndex(d => d.date === format(new Date(task.completedAt!), 'MMM d'));
        if (dayIndex !== -1) {
          last30Days[dayIndex].completed += 1;
        }
      }
      if (task.createdAt) {
        const dayIndex = last30Days.findIndex(d => d.date === format(new Date(task.createdAt), 'MMM d'));
        if (dayIndex !== -1) {
          last30Days[dayIndex].created += 1;
        }
      }
    });

    return last30Days;
  }, [tasks]);

  const productivityData = useMemo(() => {
    const byPriority = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
      none: tasks.filter(t => t.priority === 'none').length,
    };

    const completedByPriority = {
      high: tasks.filter(t => t.priority === 'high' && t.completed).length,
      medium: tasks.filter(t => t.priority === 'medium' && t.completed).length,
      low: tasks.filter(t => t.priority === 'low' && t.completed).length,
      none: tasks.filter(t => t.priority === 'none' && t.completed).length,
    };

    return [
      { name: 'High', total: byPriority.high, completed: completedByPriority.high },
      { name: 'Medium', total: byPriority.medium, completed: completedByPriority.medium },
      { name: 'Low', total: byPriority.low, completed: completedByPriority.low },
      { name: 'None', total: byPriority.none, completed: completedByPriority.none },
    ];
  }, [tasks]);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0,
    avgTime: timeEntries.length > 0 ? Math.round(timeEntries.reduce((sum, e) => sum + e.duration, 0) / timeEntries.length) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Tasks</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.completionRate}%</div>
          <div className="text-sm text-muted-foreground">Completion Rate</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.avgTime}</div>
          <div className="text-sm text-muted-foreground">Avg Time (min)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Tasks Created vs Completed (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" />
              <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Completion by Priority</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}