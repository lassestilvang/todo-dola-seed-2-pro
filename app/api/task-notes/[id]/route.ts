import { initDb, saveDb } from '@/lib/db';
import { getTaskNoteById, updateTaskNote, deleteTaskNote } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const note = await getTaskNoteById(id);

    if (!note) {
      return Response.json({ error: 'Note not found' }, { status: 404 });
    }

    return Response.json(note);
  } catch (error) {
    console.error('Failed to fetch task note:', error);
    return Response.json({ error: 'Failed to fetch task note' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const { title, content } = await request.json();

    const note = await updateTaskNote(id, { title, content });

    if (!note) {
      return Response.json({ error: 'Note not found' }, { status: 404 });
    }

    saveDb();
    return Response.json(note);
  } catch (error) {
    console.error('Failed to update task note:', error);
    return Response.json({ error: 'Failed to update task note' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const success = await deleteTaskNote(id);

    if (!success) {
      return Response.json({ error: 'Note not found' }, { status: 404 });
    }

    saveDb();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task note:', error);
    return Response.json({ error: 'Failed to delete task note' }, { status: 500 });
  }
}