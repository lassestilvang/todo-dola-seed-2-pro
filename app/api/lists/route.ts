import { initDb } from '@/lib/db';
import { getLists, createList } from '@/lib/db/queries';
import { TaskListCreateSchema } from '@/lib/schemas';

export async function GET() {
  try {
    await initDb();
    const lists = await getLists();
    return Response.json(lists);
  } catch (error) {
    console.error('Failed to fetch lists:', error);
    return Response.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const validated = TaskListCreateSchema.safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid list data', details: validated.error.flatten() }, { status: 400 });
    }

    const list = await createList(validated.data);
    return Response.json(list, { status: 201 });
  } catch (error) {
    console.error('Failed to create list:', error);
    return Response.json({ error: 'Failed to create list' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    if (!Array.isArray(body.lists) || body.lists.length === 0) {
      return Response.json({ error: 'lists array is required' }, { status: 400 });
    }

    for (const { id, sortOrder } of body.lists) {
      if (!id || sortOrder === undefined) {
        return Response.json({ error: 'Each item must have id and sortOrder' }, { status: 400 });
      }
    }

    // Update sort orders
    const db = await initDb();
    for (const { id, sortOrder } of body.lists) {
      db.exec('UPDATE lists SET sort_order = ? WHERE id = ?', [sortOrder, id]);
    }

    const { saveDb } = await import('@/lib/db');
    saveDb();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder lists:', error);
    return Response.json({ error: 'Failed to reorder lists' }, { status: 500 });
  }
}