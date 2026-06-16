'use client';

import { useMemo } from 'react';
import type { Task, Label } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Tag, TrendingUp, TrendingDown } from 'lucide-react';

interface LabelPerformanceProps {
  tasks: Task[];
}

export function LabelPerformance({ tasks }: LabelPerformanceProps) {
  const labelData = useMemo(() => {
    const labelStats: Record<string, { total: number; completed: number; label: Label | null }> = {};

    tasks.forEach(task => {
      if (task.labels && task.labels.length > 0) {
        task.labels.forEach(label => {
          if (!labelStats[label.id]) {
            labelStats[label.id] = { total: 0, completed: 0, label };
          }
          labelStats[label.id].total += 1;
          if (task.completed) {
            labelStats[label.id].completed += 1;
          }
        });
      }
    });

    return Object.values(labelStats)
      .map(stat => ({
        name: stat.label?.name || 'Unknown',
        emoji: stat.label?.emoji || '🏷️',
        color: stat.label?.color || '#3b82f6',
        total: stat.total,
        completed: stat.completed,
        rate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [tasks]);

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  const topLabels = labelData.slice(0, 5);
  const lowPerformingLabels = labelData.filter(l => l.rate < 50).slice(0, 3);

  if (labelData.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-gray-900 border border-gray-800 text-center">
        <Tag className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400">No labels used yet</p>
        <p className="text-xs text-gray-500 mt-1">Create labels to track task categories</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Label Performance</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h4 className="text-sm font-medium mb-3">Task Distribution by Label</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={labelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total"
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                  if (midAngle === undefined || cx === undefined || cy === undefined || name === undefined) {
                    return null;
                  }
                  const RADIAN = Math.PI / 180;
                  const radius = (innerRadius || 0) + ((outerRadius || 0) - (innerRadius || 0)) * 1.2;
                  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN);
                  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="#fff" textAnchor={(x as number) > (cx as number) ? 'start' : 'end'} fontSize={10}>
                      {name.substring(0, 8)}
                    </text>
                  );
                }}
              >
                {labelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h4 className="text-sm font-medium mb-3">Top Labels</h4>
            <div className="space-y-2">
              {topLabels.map((label, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: label.color }}>{label.emoji}</span>
                    <span className="text-sm">{label.name}</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-gray-400">{label.completed}/{label.total} completed</p>
                    <p className={label.rate >= 75 ? 'text-green-400' : label.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                      {label.rate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lowPerformingLabels.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <h4 className="text-sm font-medium">Needs Attention</h4>
              </div>
              <p className="text-xs text-gray-400 mb-2">Labels with low completion rates:</p>
              <div className="space-y-1">
                {lowPerformingLabels.map((label, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{label.name}</span>
                    <span className="text-red-400">{label.rate}% completion</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}