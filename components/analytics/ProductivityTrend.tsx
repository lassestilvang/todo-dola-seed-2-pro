'use client';

import { useMemo } from 'react';
import { Task } from '@/lib/types';
import { format, subDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Clock, Target, Award } from 'lucide-react';

interface ProductivityTrendProps {
  tasks: Task[];
}

interface TrendMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export function ProductivityTrend({ tasks }: ProductivityTrendProps) {
  const trendData = useMemo(() => {
    const weeks: { name: string; completed: number; created: number; efficiency: number }[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7));
      const weekEnd = endOfWeek(subDays(now, i * 7));

      const weekTasks = tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = parseISO(new Date(t.completedAt).toISOString());
        return completedDate >= weekStart && completedDate <= weekEnd;
      });

      const createdTasks = tasks.filter(t => {
        const createdDate = parseISO(new Date(t.createdAt).toISOString());
        return createdDate >= weekStart && createdDate <= weekEnd;
      });

      const efficiency = weekTasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);
      const estimated = weekTasks.reduce((sum, t) => sum + (t.estimate || 0), 0);

      weeks.push({
        name: `W${4 - i}`,
        completed: weekTasks.length,
        created: createdTasks.length,
        efficiency: estimated > 0 ? Math.round((efficiency / estimated) * 100) : 100,
      });
    }

    return weeks;
  }, [tasks]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;

    const recentTasks = tasks.filter(t => t.createdAt >= monthAgo);
    const olderTasks = tasks.filter(t => t.createdAt >= twoMonthsAgo && t.createdAt < monthAgo);

    const recentCompletion = recentTasks.filter(t => t.completed).length / Math.max(recentTasks.length, 1);
    const olderCompletion = olderTasks.filter(t => t.completed).length / Math.max(olderTasks.length, 1);

    const recentAvgAge = recentTasks.length > 0
      ? recentTasks.reduce((sum, t) => sum + (now - t.createdAt), 0) / recentTasks.length / (1000 * 60 * 60 * 24)
      : 0;

    const olderAvgAge = olderTasks.length > 0
      ? olderTasks.reduce((sum, t) => sum + (now - t.createdAt), 0) / olderTasks.length / (1000 * 60 * 60 * 24)
      : 0;

    return [
      {
        label: 'Completion Rate',
        value: `${Math.round(recentCompletion * 100)}%`,
        change: `${Math.round((recentCompletion - olderCompletion) * 100)}% from last month`,
        trend: recentCompletion > olderCompletion ? 'up' : recentCompletion < olderCompletion ? 'down' : 'neutral',
      },
      {
        label: 'Avg Task Age',
        value: `${Math.round(recentAvgAge)}d`,
        change: `${Math.round(recentAvgAge - olderAvgAge)}d difference`,
        trend: recentAvgAge < olderAvgAge ? 'up' : recentAvgAge > olderAvgAge ? 'down' : 'neutral',
      },
      {
        label: 'Weekly Avg',
        value: `${Math.round(recentTasks.length / 4)}`,
        change: `${Math.round((recentTasks.length / 4) - (olderTasks.length / 4))} from last month`,
        trend: recentTasks.length > olderTasks.length ? 'up' : recentTasks.length < olderTasks.length ? 'down' : 'neutral',
      },
    ];
  }, [tasks]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Productivity Trends</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <p className="text-sm text-gray-400">{metric.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{metric.value}</p>
              {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
              {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
            </div>
            <p className="text-xs text-gray-500 mt-1">{metric.change}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h4 className="text-sm font-medium mb-3">Weekly Performance (Last 4 Weeks)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" strokeWidth={2} />
            <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
            <Line type="monotone" dataKey="efficiency" stroke="#f59e0b" name="Efficiency %" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}