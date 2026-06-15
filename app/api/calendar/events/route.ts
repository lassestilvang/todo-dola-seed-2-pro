import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withErrorHandling(withRateLimit()(async (request: NextRequest) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const filter: any = { completed: false };
  if (from) filter.dateFrom = parseInt(from, 10);
  if (to) filter.dateTo = parseInt(to, 10);

  const tasks = await getTasks(filter);

  const events = tasks
    .filter(task => task.date !== null)
    .map(task => ({
      id: task.id,
      title: task.name,
      description: task.description || undefined,
      start: task.date!,
      end: task.deadline || task.date! + 60 * 60 * 1000,
      taskId: task.id,
    }));

  return NextResponse.json({ data: events });
}));