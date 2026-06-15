import { initDb } from '@/lib/db';
import { getGoals, createGoal, updateGoal, deleteGoal, getGoalMilestones, createGoalMilestone, updateGoalMilestone, completeGoalMilestone } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const goals = await getGoals();
  return NextResponse.json({ data: goals });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const body = await request.json();

  const goal = await createGoal({
    name: body.name,
    description: body.description || null,
    targetValue: body.targetValue,
    unit: body.unit,
    deadline: body.deadline || null,
    taskId: body.taskId || null,
  });

  return NextResponse.json({ data: goal }, { status: 201 });
}));