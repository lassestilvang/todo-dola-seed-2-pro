import { initDb } from '@/lib/db';
import { getRecurringExceptions, addRecurringException, removeRecurringException } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const parentTaskId = searchParams.get('taskId');

    if (!parentTaskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const exceptions = await getRecurringExceptions(parentTaskId);
    return Response.json({ data: exceptions });
  } catch (error) {
    console.error('Failed to fetch recurring exceptions:', error);
    return Response.json({ error: 'Failed to fetch recurring exceptions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, exceptionDate } = await request.json();

    if (!taskId || !exceptionDate) {
      return Response.json({ error: 'taskId and exceptionDate are required' }, { status: 400 });
    }

    const exception = await addRecurringException(taskId, exceptionDate);
    return Response.json({ data: exception }, { status: 201 });
  } catch (error) {
    console.error('Failed to add recurring exception:', error);
    return Response.json({ error: 'Failed to add recurring exception' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const parentTaskId = searchParams.get('taskId');
    const exceptionDate = searchParams.get('date');

    if (!parentTaskId || !exceptionDate) {
      return Response.json({ error: 'taskId and date are required' }, { status: 400 });
    }

    await removeRecurringException(parentTaskId, parseInt(exceptionDate));
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to remove recurring exception:', error);
    return Response.json({ error: 'Failed to remove recurring exception' }, { status: 500 });
  }
}