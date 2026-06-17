import { NextRequest, NextResponse } from 'next/server';
import { BaseService } from './base-service';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { initDb } from '@/lib/db';
import { getTasksPaginated, getTaskById, createTask, updateTask, deleteTask, toggleTaskCompletion, archiveTask, restoreTask, permanentlyDeleteTask, generateRecurringTasks } from '@/lib/db/queries';
import { TaskCreateSchema, TaskUpdateSchema } from '@/lib/schemas';
import type { Task, Priority } from '@/lib/types';

export class TaskService extends BaseService {
  protected resourceName = 'tasks';

  async getAll(request: NextRequest): Promise<Response> {
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

    return NextResponse.json({
      data: tasks,
      total,
      meta: { limit, offset }
    });
  }

  async create(request: NextRequest): Promise<Response> {
    await initDb();
    const data = await request.json();

    const validated = TaskCreateSchema.safeParse(data);
    if (!validated.success) {
      throw new ApiError(400, 'Invalid task data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
    }

    const task = await createTask(validated.data as Partial<Task>);

    let generatedTasks: Task[] = [];
    if (validated.data.recurringType && validated.data.recurringConfig) {
      generatedTasks = await generateRecurringTasks(task.id);
    }

    return NextResponse.json({ data: { ...task, generatedTasks } }, { status: 201 });
  }

  async getById(request: NextRequest, id: string): Promise<Response> {
    await initDb();
    const task = await getTaskById(id);

    if (!task) {
      throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json({ data: task });
  }

  async update(request: NextRequest, id: string): Promise<Response> {
    await initDb();
    const body = await request.json();

    if (body.restore) {
      const success = await restoreTask(id);
      if (!success) {
        throw new ApiError(404, 'Task not found or not deleted', ErrorCodes.NOT_FOUND);
      }
      return NextResponse.json({ success: true });
    }

    const validated = TaskUpdateSchema.safeParse(body);
    if (!validated.success) {
      throw new ApiError(400, 'Invalid task data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
    }

    const task = await updateTask(id, validated.data as never);

    if (!task) {
      throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json({ data: task });
  }

  async delete(request: NextRequest, id: string): Promise<Response> {
    await initDb();
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      const success = await permanentlyDeleteTask(id);
      if (!success) {
        throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
      }
      return NextResponse.json({ success: true });
    }

    const success = await deleteTask(id);
    if (!success) {
      throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json({ success: true });
  }

  async toggleCompletion(request: NextRequest, id: string): Promise<Response> {
    await initDb();
    const body = await request.json();
    const completed = body.completed ?? true;

    const task = await toggleTaskCompletion(id, completed);
    if (!task) {
      throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json({ data: task });
  }

  async archive(request: NextRequest, id: string): Promise<Response> {
    await initDb();
    const success = await archiveTask(id);
    if (!success) {
      throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }
    return NextResponse.json({ success: true });
  }
}

export const taskService = new TaskService();