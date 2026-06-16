import { NextRequest, NextResponse } from 'next/server';
import { initDb, saveDb } from '@/lib/db';
import { getGoalById, getGoalMilestones, getTasks, updateGoal } from '@/lib/db/queries';
import { getMilestoneSuggestions, updateGoalProgress, checkGoalMilestones, getGoalProgress } from '@/lib/services/goal-automation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initDb();

  const goal = await getGoalById(id);
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  const milestones = await getGoalMilestones(id);
  const suggestions = getMilestoneSuggestions(goal);
  const progress = getGoalProgress(goal);

  return NextResponse.json({
    data: {
      goal,
      progress,
      suggestions,
      milestones: checkGoalMilestones(goal, milestones),
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initDb();

  const goal = await getGoalById(id);
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  // Get completed tasks related to this goal
  const tasks = await getTasks({ view: 'all', completed: true, limit: 1000 });
  const body = await request.json();
  const { taskKeyword } = body;

  const { updatedGoal, progressDelta } = updateGoalProgress(goal, tasks, taskKeyword);

  // Update the goal
  const { updateGoal } = await import('@/lib/db/queries');
  await updateGoal(id, { currentValue: updatedGoal.currentValue });
  saveDb();

  return NextResponse.json({
    data: {
      goal: updatedGoal,
      progressDelta,
    },
  });
}