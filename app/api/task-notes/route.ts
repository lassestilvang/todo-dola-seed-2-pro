import { initDb, saveDb } from '@/lib/db';
import { createTaskNote, getTaskNotes } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const notes = await getTaskNotes(taskId);
    return Response.json({ data: notes });
  } catch (error) {
    console.error('Failed to fetch task notes:', error);
    return Response.json({ error: 'Failed to fetch task notes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, title, content } = await request.json();

    if (!taskId || !content) {
      return Response.json({ error: 'taskId and content are required' }, { status: 400 });
    }

    const note = await createTaskNote(taskId, content, title);
    saveDb();
    return Response.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task note:', error);
    return Response.json({ error: 'Failed to create task note' }, { status: 500 });
  }
}