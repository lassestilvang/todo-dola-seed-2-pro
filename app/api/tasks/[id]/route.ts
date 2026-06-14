import { initDb } from '@/lib/db';
import { getTaskById, updateTask, deleteTask, createTask } from '@/lib/db/queries';
import { TaskUpdateSchema, TaskCreateSchema } from '@/lib/schemas';
import type { Task } from '@/lib/types';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return Response.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    // Handle restore action
    if (body.restore) {
      const { restoreTask } = await import('@/lib/db/queries');
      const success = await restoreTask(id);
      if (!success) {
        return Response.json({ error: 'Task not found or not deleted' }, { status: 404 });
      }
      return Response.json({ success: true });
    }

    const validated = TaskUpdateSchema.safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid task data', details: validated.error.flatten() }, { status: 400 });
    }

    const task = await updateTask(id, validated.data as never);

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return Response.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const data = await request.json();

    // This endpoint is for restoring a deleted task with its original data
    const validated = TaskCreateSchema.safeParse(data);
    if (!validated.success) {
      return Response.json({ error: 'Invalid task data', details: validated.error.flatten() }, { status: 400 });
    }

    const task = await createTask(validated.data as never);
    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to restore task:', error);
    return Response.json({ error: 'Failed to restore task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      const { permanentlyDeleteTask } = await import('@/lib/db/queries');
      const success = await permanentlyDeleteTask(id);
      if (!success) {
        return Response.json({ error: 'Task not found' }, { status: 404 });
      }
      return Response.json({ success: true });
    }

    const success = await deleteTask(id);
    if (!success) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return Response.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}