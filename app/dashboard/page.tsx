import { getTasks, getLabels, getLists, getGoals, getHabits, getAllHabitCompletions, getTimeBlocks, getReminders } from '@/lib/db/queries';
import Link from 'next/link';
import TimeSeriesAnalytics from '@/components/analytics/TimeSeriesAnalytics';
import { EnhancedDashboard } from '@/components/analytics/EnhancedDashboard';
import { StatCard } from '@/components/analytics/StatCard';
import { PriorityBarChart } from '@/components/analytics/PriorityBarChart';
import { ProgressRing } from '@/components/analytics/ProgressRing';

export default async function DashboardPage() {
  const allTasks = await getTasks({ view: 'all', completed: false });
  const completedTasks = await getTasks({ view: 'all', completed: true });
  const labels = await getLabels();
  const lists = await getLists();
  const goals = await getGoals();
  const habits = await getHabits();
  const habitCompletions = await getAllHabitCompletions();
  const timeBlocks = await getTimeBlocks(Date.now() - 90 * 24 * 60 * 60 * 1000, Date.now());
  const reminders = await getReminders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/kanban" className="text-sm text-blue-400 hover:underline">
          View Kanban Board →
        </Link>
      </div>

      <EnhancedDashboard
        tasks={allTasks}
        goals={goals}
        habits={habits}
        habitCompletions={habitCompletions}
        timeBlocks={timeBlocks}
        reminders={reminders}
      />
    </div>
  );
}