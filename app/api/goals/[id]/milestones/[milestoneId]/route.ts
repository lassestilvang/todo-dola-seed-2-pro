import { initDb } from '@/lib/db';
import { updateGoalMilestone, completeGoalMilestone, deleteGoalMilestone } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const PATCH = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await initDb();
  const body = await request.json();

  const milestone = await updateGoalMilestone(id, body);

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }

  return NextResponse.json({ data: milestone });
}));

export const PUT = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await initDb();
  const milestone = await completeGoalMilestone(id);

  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  }

  return NextResponse.json({ data: milestone });
}));