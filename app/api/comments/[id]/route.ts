import { initDb, saveDb } from '@/lib/db';
import { getCommentById, updateComment, deleteComment } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const comment = await getCommentById(id);
    if (!comment) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }
    return Response.json({ data: comment });
  } catch (error) {
    console.error('Failed to fetch comment:', error);
    return Response.json({ error: 'Failed to fetch comment' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const { content } = await request.json();

    if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 });
    }

    const comment = await updateComment(id, content);
    if (!comment) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    saveDb();
    return Response.json({ data: comment });
  } catch (error) {
    console.error('Failed to update comment:', error);
    return Response.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const success = await deleteComment(id);
    if (!success) {
      return Response.json({ error: 'Comment not found' }, { status: 404 });
    }

    saveDb();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return Response.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}