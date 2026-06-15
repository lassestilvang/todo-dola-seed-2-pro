import { initDb } from '@/lib/db';
import { getGoalMilestones, createGoalMilestone, updateGoalMilestone, completeGoalMilestone } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit, validatePathParams } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('goalId');

  if (!goalId) {
    return NextResponse.json({ error: 'goalId is required' }, { status: 400 });
  }

  await initDb();
  const milestones = await getGoalMilestones(goalId);
  return NextResponse.json({ data: milestones });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const body = await request.json();

  const milestone = await createGoalMilestone({
    goalId: body.goalId,
    name: body.name,
    targetValue: body.targetValue,
    currentValue: body.currentValue || 0,
  });

  return NextResponse.json({ data: milestone }, { status: 201 });
}));