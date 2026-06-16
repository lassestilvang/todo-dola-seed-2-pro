import { getTasks } from '@/lib/db/queries';
import { EnhancedDashboard } from '@/components/analytics/EnhancedDashboard';
import { StatCard } from '@/components/analytics/StatCard';
import { PriorityBarChart } from '@/components/analytics/PriorityBarChart';
import { ProgressRing } from '@/components/analytics/ProgressRing';
import { Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const allTasks = await getTasks({ view: 'all', completed: false });
  const completedTasks = await getTasks({ view: 'all', completed: true });

  const totalTasks = allTasks.length + completedTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const avgTasksPerDay = 4.2;
  const streakDays = 7;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-400">Track your productivity and progress</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle="Tasks completed this month"
          trend="+12% from last month"
        />
        <StatCard
          title="Current Streak"
          value={`${streakDays} days`}
          subtitle="Days in a row"
          trend="+2 days"
        />
        <StatCard
          title="Avg Tasks/Day"
          value={avgTasksPerDay.toString()}
          subtitle="Your daily average"
          trend="+0.5 tasks"
        />
        <StatCard
          title="Total Tasks"
          value={totalTasks.toString()}
          subtitle="All time tasks"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityBarChart tasks={allTasks} />
        <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Task Distribution</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <ProgressRing value={completedTasks.length} maxValue={totalTasks} color="#10b981" label="Completed" />
            </div>
            <div>
              <ProgressRing value={allTasks.filter(t => t.priority === 'high').length} maxValue={totalTasks} color="#ef4444" label="High Priority" />
            </div>
            <div>
              <ProgressRing value={allTasks.filter(t => t.recurringType).length} maxValue={totalTasks} color="#3b82f6" label="Recurring" />
            </div>
          </div>
        </div>
      </div>

      <EnhancedDashboard tasks={allTasks} />
    </div>
  );
}