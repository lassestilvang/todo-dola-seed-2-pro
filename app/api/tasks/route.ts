import { initDb } from '@/lib/db';
import { getTasks, createTask, generateRecurringTasks } from '@/lib/db/queries';
import { TaskCreateSchema } from '@/lib/schemas';
import type { Task, Priority } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'all';
    const showCompleted = searchParams.get('completed');
    const listId = searchParams.get('listId') || undefined;
    const labelId = searchParams.get('labelId') || undefined;
    const priority = searchParams.get('priority') as Priority | null || undefined;
    const recurring = searchParams.get('recurring') === 'true' || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateFrom = searchParams.get('dateFrom') ? parseInt(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? parseInt(searchParams.get('dateTo')!) : undefined;

    const completedFilter = showCompleted === 'true' ? true : showCompleted === 'false' ? false : undefined;

    const tasks = await getTasks({
      view: view as 'today' | 'next7' | 'upcoming' | 'all',
      completed: completedFilter,
      listId,
      labelId,
      priority,
      recurring,
      limit,
      offset,
      dateFrom,
      dateTo,
    });

    return Response.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return Response.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const data = await request.json();

    const validated = TaskCreateSchema.safeParse(data);
    if (!validated.success) {
      return Response.json({ error: 'Invalid task data', details: validated.error.flatten() }, { status: 400 });
    }

    const task = await createTask(validated.data as Partial<Task>);

    // Generate recurring tasks if applicable
    if (validated.data.recurringType && validated.data.recurringConfig) {
      const newTasks = await generateRecurringTasks(task.id);
      return Response.json({ ...task, generatedTasks: newTasks }, { status: 201 });
    }

    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return Response.json({ error: 'Failed to create task' }, { status: 500 });
  }
}