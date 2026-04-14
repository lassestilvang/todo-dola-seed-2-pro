import { getTasks, createTask } from '@/lib/db/queries';
import { format, startOfDay, addDays } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'all';
  const showCompleted = searchParams.get('completed') === 'true';

  const tasks = getTasks({
    view: view as 'today' | 'next7' | 'upcoming' | 'all',
    completed: showCompleted ? undefined : false
  });

  return Response.json(tasks);
}

export async function POST(request: Request) {
  const data = await request.json();
  const task = createTask(data);
  return Response.json(task, { status: 201 });
}