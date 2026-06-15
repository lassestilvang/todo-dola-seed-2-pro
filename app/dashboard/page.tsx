import { getTasks, getLabels, getLists } from '@/lib/db/queries';
import { format } from 'date-fns';
import { Clock, AlertCircle, CheckCircle, TrendingUp, Calendar, Tag, BarChart3, PieChart, Activity, TrendingDown, Target, Zap, Award, TrendingDown as TrendingDownIcon } from 'lucide-react';
import Link from 'next/link';
import TimeSeriesAnalytics from '@/components/analytics/TimeSeriesAnalytics';

// Simple Bar Chart Component
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t-sm transition-all hover:opacity-80"
            style={{ height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-400 truncate w-full text-center">{item.label}</span>
          <span className="text-xs font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Progress Ring Component
function ProgressRing({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  icon?: React.ReactNode;
}

function StatCard({ title, value, subtitle, trend, icon }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {trend && <p className="text-xs text-green-400 mt-1">{trend}</p>}
    </div>
  );
}

function PriorityBar({ tasks: tasksProp }: { tasks: Awaited<ReturnType<typeof getTasks>> }) {
  const counts = {
    high: tasksProp.filter(t => t.priority === 'high').length,
    medium: tasksProp.filter(t => t.priority === 'medium').length,
    low: tasksProp.filter(t => t.priority === 'low').length,
    none: tasksProp.filter(t => t.priority === 'none').length,
  };
  const total = tasksProp.length || 1;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span>Priority Distribution</span>
        <span className="text-gray-400">{tasksProp.length} total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        <div className="bg-red-500 h-full" style={{ width: `${(counts.high / total) * 100}%` }} />
        <div className="bg-yellow-500 h-full" style={{ width: `${(counts.medium / total) * 100}%` }} />
        <div className="bg-green-500 h-full" style={{ width: `${(counts.low / total) * 100}%` }} />
        <div className="bg-gray-500 h-full" style={{ width: `${(counts.none / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{counts.high} High</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" />{counts.medium} Med</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{counts.low} Low</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const allTasks = await getTasks({ view: 'all', completed: false });
  const completedTasks = await getTasks({ view: 'all', completed: true });
  const todayTasks = await getTasks({ view: 'today', completed: false });
  const upcomingTasks = await getTasks({ view: 'upcoming', completed: false });
  const labels = await getLabels();
  const lists = await getLists();

  const totalEstimate = allTasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
  const totalActual = allTasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

  const totalTasks = allTasks.length + completedTasks.length;
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks.length / totalTasks) * 100)
    : 0;

  const overdueTasks = allTasks.filter(t => t.deadline && t.deadline < Date.now());
  const highPriorityTasks = allTasks.filter(t => t.priority === 'high');
  const tasksWithLabels = allTasks.filter(t => t.labels && t.labels.length > 0);

  // Calculate productivity score (ratio of logged time to estimated time)
  const productivityScore = totalEstimate > 0
    ? Math.min(Math.round((totalActual / totalEstimate) * 100), 100)
    : allTasks.length === 0 ? 100 : 0;

  // Calculate average task age
  const avgTaskAge = allTasks.length > 0
    ? Math.round(allTasks.reduce((sum, t) => sum + (Date.now() - t.createdAt), 0) / allTasks.length / (1000 * 60 * 60 * 24))
    : 0;

  // Calculate completion trend
  const completionTrend = totalTasks > 0
    ? `${completedTasks.length}/${totalTasks} completed`
    : 'No tasks yet';

  // Calculate days with completed tasks trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).getTime();
    return {
      date: format(date, 'EEE'),
      count: completedTasks.filter(t => t.completedAt && t.completedAt >= startOfDay && t.completedAt <= endOfDay).length
    };
  }).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/kanban" className="text-sm text-blue-400 hover:underline">
          View Kanban Board →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Tasks"
          value={String(allTasks.length)}
          subtitle="tasks in progress"
          icon={<Clock className="w-4 h-4 text-gray-400" />}
        />
        <StatCard
          title="Completed"
          value={String(completedTasks.length)}
          subtitle={completionTrend}
          icon={<CheckCircle className="w-4 h-4 text-green-400" />}
        />
        <StatCard
          title="Today"
          value={String(todayTasks.length)}
          subtitle="scheduled today"
          icon={<Calendar className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle="of total tasks"
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Time Estimated"
          value={`${Math.round(totalEstimate / 60)}h`}
          subtitle={`${totalEstimate}m total estimates`}
          icon={<Clock className="w-4 h-4 text-gray-400" />}
        />
        <StatCard
          title="Time Logged"
          value={`${Math.round(totalActual / 60)}h`}
          subtitle={`${totalActual}m actual time`}
          icon={<Clock className="w-4 h-4 text-green-400" />}
        />
        <StatCard
          title="Productivity"
          value={`${productivityScore}%`}
          subtitle="time efficiency"
          icon={<Target className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Avg Task Age"
          value={`${avgTaskAge}d`}
          subtitle="days since created"
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Overdue"
          value={String(overdueTasks.length)}
          subtitle="tasks past deadline"
          trend={overdueTasks.length > 0 ? '⚠️ Needs attention' : '✓ On track'}
          icon={<AlertCircle className="w-4 h-4 text-red-400" />}
        />
        <StatCard
          title="High Priority"
          value={String(highPriorityTasks.length)}
          subtitle="urgent tasks"
          icon={<AlertCircle className="w-4 h-4 text-red-400" />}
        />
        <StatCard
          title="Quick Wins"
          value={String(highPriorityTasks.filter(t => t.completed).length)}
          subtitle="completed high priority"
          icon={<Award className="w-4 h-4 text-purple-400" />}
        />
        <StatCard
          title="On Track"
          value={String(allTasks.filter(t => !t.deadline || t.deadline >= Date.now()).length)}
          subtitle="not overdue"
          icon={<TrendingDownIcon className="w-4 h-4 text-green-400" />}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="font-semibold mb-3">Upcoming Tasks</h2>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming tasks</p>
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.slice(0, 5).map(task => (
                <li key={task.id} className="text-sm flex items-center gap-2">
                  <span className="flex-1">{task.name}</span>
                  {task.date && (
                    <span className="text-gray-400">
                      {format(new Date(task.date), 'MMM d')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="font-semibold mb-3">Lists</h2>
          <div className="space-y-1">
            {lists.map(list => {
              const count = allTasks.filter(t => t.listId === list.id).length;
              return (
                <Link key={list.id} href={`/?listId=${list.id}`} className="flex items-center justify-between text-sm hover:text-blue-400 transition-colors">
                  <span>{list.emoji} {list.name}</span>
                  <span className="text-gray-400">{count} tasks</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="font-semibold mb-3">Labels</h2>
          {labels.length === 0 ? (
            <p className="text-sm text-gray-500">No labels yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {labels.map(label => {
                const count = tasksWithLabels.filter(t => t.labels?.some(l => l.id === label.id)).length;
                return (
                  <span
                    key={label.id}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: label.color + '20', color: label.color }}
                    title={`${count} tasks`}
                  >
                    {label.emoji} {label.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="font-semibold mb-3">Priority Distribution</h2>
        <PriorityBar tasks={allTasks} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="font-semibold mb-3">Weekly Completion</h2>
          <BarChart
            data={last7Days.map(d => ({
              label: d.date,
              value: d.count,
              color: d.count > 0 ? '#10b981' : '#374151'
            }))}
          />
          <p className="text-xs text-gray-400 mt-2">Completed tasks in the last 7 days</p>
        </div>

        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h2 className="font-semibold mb-3">Completion Rate</h2>
          <div className="flex items-center justify-center">
            <ProgressRing value={completedTasks.length} maxValue={totalTasks} color="#10b981" />
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            {completionRate}% of tasks completed
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="font-semibold mb-3">Time Tracking</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-400">{Math.round(totalEstimate / 60)}h</p>
            <p className="text-xs text-gray-400">Estimated</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{Math.round(totalActual / 60)}h</p>
            <p className="text-xs text-gray-400">Logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalEstimate > 0 ? Math.round((totalActual / totalEstimate) * 100) : 0}%</p>
            <p className="text-xs text-gray-400">Efficiency</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{tasksWithLabels.length}</p>
            <p className="text-xs text-gray-400">Labeled</p>
          </div>
        </div>
      </div>

      <TimeSeriesAnalytics tasks={allTasks} />
    </div>
  );
}