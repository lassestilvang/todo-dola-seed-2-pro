import { initDb } from '@/lib/db';
import { getActivities, createActivity } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  await initDb();
  const activities = await getActivities(limit);
  return NextResponse.json({ data: activities });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const body = await request.json();

  const activity = await createActivity({
    type: body.type,
    taskId: body.taskId,
    userId: body.userId || null,
    userName: body.userName || null,
    details: body.details || null,
  });

  return NextResponse.json({ data: activity }, { status: 201 });
}));