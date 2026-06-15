import { initDb } from '@/lib/db';
import { getListById, updateList, deleteList } from '@/lib/db/queries';
import { TaskListSchema } from '@/lib/schemas';
import { handleApiError } from '@/lib/api/middleware';
import type { TaskList } from '@/lib/types';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const list = await getListById(id);
    if (!list) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    return Response.json({ data: list });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const list = await getListById(id);
    if (!list) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    if (list.isInbox) {
      return Response.json({ error: 'Cannot delete the inbox list' }, { status: 400 });
    }

    await deleteList(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    const validated = TaskListSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid list data', details: validated.error.flatten() }, { status: 400 });
    }

    const list = await updateList(id, validated.data);
    if (!list) {
      return Response.json({ error: 'List not found' }, { status: 404 });
    }

    return Response.json({ data: list });
  } catch (error) {
    return handleApiError(error);
  }
}