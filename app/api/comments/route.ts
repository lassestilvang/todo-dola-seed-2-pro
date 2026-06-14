import { initDb, saveDb } from '@/lib/db';
import { getComments, createComment, updateComment, deleteComment } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const comments = await getComments(taskId);
    return Response.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return Response.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { taskId, content, author } = await request.json();

    if (!taskId || !content) {
      return Response.json({ error: 'Task ID and content are required' }, { status: 400 });
    }

    const comment = await createComment(taskId, content, author);
    saveDb();
    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return Response.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}