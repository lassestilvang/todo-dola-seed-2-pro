import { initDb } from '@/lib/db';
import { getSharedTask, createShareToken } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const shareInfo = await getSharedTask(taskId);
    if (!shareInfo) {
      return Response.json({ data: null });
    }

    return Response.json({ data: shareInfo });
  } catch (error) {
    console.error('Failed to get share info:', error);
    return Response.json({ error: 'Failed to get share info' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, sharedBy } = await request.json();

    if (!taskId) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const shareToken = await createShareToken(taskId, sharedBy);
    return Response.json({ data: { shareToken } }, { status: 201 });
  } catch (error) {
    console.error('Failed to create share token:', error);
    return Response.json({ error: 'Failed to create share token' }, { status: 500 });
  }
}