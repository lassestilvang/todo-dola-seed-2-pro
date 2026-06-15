import { getTasks, getLabels, getLists } from '@/lib/db/queries';
import type { Label } from '@/lib/types';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { BarChart3, TrendingUp, Clock, Target, Award, Calendar, Tag, Activity, Timer, Zap } from 'lucide-react';
import Link from 'next/link';

function BurndownChart({ tasks }: { tasks: Awaited<ReturnType<typeof getTasks>> }) {
  const data = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, 'MMM d');
    const completedBefore = tasks.filter(t => t.completedAt && t.completedAt <= date.getTime() && t.completed).length;
    const totalBefore = tasks.filter(t => t.createdAt <= date.getTime()).length;
    const remaining = Math.max(0, totalBefore - completedBefore);
    return { date: dateStr, remaining };
  });

  const maxValue = Math.max(...data.map(d => d.remaining), 1);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" /> Burndown Chart (14 Days)
      </h2>
      <div className="flex items-end gap-1 h-40">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t-sm bg-green-500 transition-all hover:opacity-80"
              style={{ height: `${(item.remaining / maxValue) * 100}%` }}
            />
            <span className="text-xs text-gray-400 truncate w-full text-center">{item.date}</span>
            <span className="text-xs font-medium">{item.remaining}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeTrackingReport({ tasks }: { tasks: Awaited<ReturnType<typeof getTasks>> }) {
  const timeData = tasks.map(t => ({
    name: t.name.substring(0, 20),
    estimated: t.estimate || 0,
    actual: t.actualTime || 0,
  })).filter(t => t.estimated > 0 || t.actual > 0);

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);
  const efficiency = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Timer className="w-4 h-4" /> Time Tracking Report
      </h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-400">{Math.round(totalEstimated / 60)}h</p>
          <p className="text-xs text-gray-400">Estimated</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{Math.round(totalActual / 60)}h</p>
          <p className="text-xs text-gray-400">Logged</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{efficiency}%</p>
          <p className="text-xs text-gray-400">Efficiency</p>
        </div>
      </div>
      {timeData.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {timeData.slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="truncate">{t.name}...</span>
              <span className="text-gray-400">{t.estimated}m / {t.actual}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function ProductivityTrends({ tasks, labels }: { tasks: Awaited<ReturnType<typeof getTasks>>; labels: Label[] }) {
  const priorityData = [
    { name: 'High', total: tasks.filter(t => t.priority === 'high').length, completed: tasks.filter(t => t.priority === 'high' && t.completed).length },
    { name: 'Medium', total: tasks.filter(t => t.priority === 'medium').length, completed: tasks.filter(t => t.priority === 'medium' && t.completed).length },
    { name: 'Low', total: tasks.filter(t => t.priority === 'low').length, completed: tasks.filter(t => t.priority === 'low' && t.completed).length },
  ];

  const labelData = tasks.reduce((acc, t) => {
    t.labels?.forEach(l => {
      if (!acc[l.name]) acc[l.name] = { total: 0, completed: 0 };
      acc[l.name].total++;
      if (t.completed) acc[l.name].completed++;
    });
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" /> Completion by Priority
        </h2>
        <div className="space-y-3">
          {priorityData.map(item => {
            const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.name}</span>
                  <span>{item.completed}/{item.total} ({rate}%)</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${rate}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" /> Completion by Label
        </h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {Object.entries(labelData).map(([name, data]) => {
            const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-gray-400">{data.completed}/{data.total} ({rate}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const allTasks = await getTasks({ view: 'all', completed: false });
  const completedTasks = await getTasks({ view: 'all', completed: true });
  const allTasksWithCompleted = [...allTasks, ...completedTasks];
  const labels = await getLabels();

  const totalTasks = allTasksWithCompleted.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const avgTaskAge = allTasksWithCompleted.length > 0
    ? Math.round(allTasksWithCompleted.reduce((sum, t) => sum + (Date.now() - t.createdAt), 0) / allTasksWithCompleted.length / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Reporting</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Tasks</p>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{totalTasks}</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Completion Rate</p>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{completionRate}%</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Avg Task Age</p>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{avgTaskAge}d</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Productivity Score</p>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-1">{totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}%</p>
        </div>
      </div>

      <BurndownChart tasks={allTasksWithCompleted} />

      <TimeTrackingReport tasks={allTasksWithCompleted} />

      <ProductivityTrends tasks={allTasksWithCompleted} labels={labels} />
    </div>
  );
}