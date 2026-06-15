import { initDb } from '@/lib/db';
import { getTasksPaginated, createTask, generateRecurringTasks } from '@/lib/db/queries';
import { TaskCreateSchema } from '@/lib/schemas';
import type { Task, Priority, TaskFilter } from '@/lib/types';
import { withErrorHandling, withRateLimit, validateParams, validatePathParams } from '@/lib/api/handler';
import { ApiError, validateRequiredFields, ErrorCodes } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'all';
  const showCompleted = searchParams.get('completed');
  const listId = searchParams.get('listId') || undefined;
  const labelId = searchParams.get('labelId') || undefined;
  const priority = searchParams.get('priority') as Priority | null || undefined;
  const recurring = searchParams.get('recurring') === 'true' || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
  const offset = parseInt(searchParams.get('offset') || '0');
  const dateFrom = searchParams.get('dateFrom') ? parseInt(searchParams.get('dateFrom')!) : undefined;
  const dateTo = searchParams.get('dateTo') ? parseInt(searchParams.get('dateTo')!) : undefined;
  const sortBy = searchParams.get('sortBy') as 'date' | 'created' | 'priority' | 'name' | 'list' | null;
  const sortDirection = searchParams.get('sortDirection') as 'asc' | 'desc' | null;

  const completedFilter = showCompleted === 'true' ? true : showCompleted === 'false' ? false : undefined;

  const { tasks, total } = await getTasksPaginated({
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
    sort: sortBy || 'date',
    sortDirection: sortDirection || 'desc',
  });

  return Response.json({ data: tasks, total, meta: { limit, offset } });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const data = await request.json();

  const validated = TaskCreateSchema.safeParse(data);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid task data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const task = await createTask(validated.data as Partial<Task>);

  // Generate recurring tasks if applicable
  let generatedTasks: Task[] = [];
  if (validated.data.recurringType && validated.data.recurringConfig) {
    generatedTasks = await generateRecurringTasks(task.id);
  }

  return Response.json({ data: { ...task, generatedTasks } }, { status: 201 });
}));