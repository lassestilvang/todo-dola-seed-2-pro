import { initDb } from '@/lib/db';
import { toggleTaskCompletion } from '@/lib/db/queries';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const { completed } = await request.json();

    const task = await toggleTaskCompletion(id, completed);

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error('Failed to toggle task completion:', error);
    return Response.json({ error: 'Failed to toggle task completion' }, { status: 500 });
  }
}