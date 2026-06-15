import { initDb } from '@/lib/db';
import { getSubtasks, createSubtask } from '@/lib/db/queries';
import { SubtaskCreateSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const subtasks = await getSubtasks(taskId);
    return Response.json({ data: subtasks });
  } catch (error) {
    console.error('Failed to fetch subtasks:', error);
    return Response.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const validated = SubtaskCreateSchema.safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid subtask data', details: validated.error.flatten() }, { status: 400 });
    }

    const { taskId, name } = validated.data;
    const subtask = await createSubtask(taskId, name);

    return Response.json({ data: subtask }, { status: 201 });
  } catch (error) {
    console.error('Failed to create subtask:', error);
    return Response.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}