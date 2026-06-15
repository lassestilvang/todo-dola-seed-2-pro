import { initDb } from '@/lib/db';
import { getGoalById, updateGoal, deleteGoal } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit, validatePathParams } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !validatePathParams({ id }, ['id'])) {
    return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
  }

  await initDb();
  const goal = await getGoalById(id);

  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  return NextResponse.json({ data: goal });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !validatePathParams({ id }, ['id'])) {
    return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
  }

  await initDb();
  const body = await request.json();

  const goal = await updateGoal(id, body);

  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  return NextResponse.json({ data: goal });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !validatePathParams({ id }, ['id'])) {
    return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
  }

  await initDb();
  const deleted = await deleteGoal(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}));