import { initDb } from '@/lib/db';
import { getTaskByShareToken, deleteShareTokenByToken } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await initDb();
    const { token } = await params;

    const task = await getTaskByShareToken(token);
    if (!task) {
      return Response.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    return Response.json(task);
  } catch (error) {
    console.error('Failed to get shared task:', error);
    return Response.json({ error: 'Failed to get shared task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await initDb();
    const { token } = await params;

    await deleteShareTokenByToken(token);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete share:', error);
    return Response.json({ error: 'Failed to delete share' }, { status: 500 });
  }
}