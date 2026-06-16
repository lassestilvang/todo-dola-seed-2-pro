import { initDb, getDb, saveDb } from '@/lib/db';
import { getNoteAttachments, createNoteAttachment, deleteNoteAttachment } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return Response.json({ error: 'noteId is required' }, { status: 400 });
    }

    const attachments = await getNoteAttachments(noteId);
    return Response.json({ data: attachments });
  } catch (error) {
    console.error('Failed to fetch note attachments:', error);
    return Response.json({ error: 'Failed to fetch note attachments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const { noteId, filename, mimetype, size } = body;

    if (!noteId || !filename || !mimetype || !size) {
      return Response.json({ error: 'noteId, filename, mimetype, and size are required' }, { status: 400 });
    }

    const attachment = await createNoteAttachment(noteId, filename, mimetype, size);
    return Response.json({ data: attachment }, { status: 201 });
  } catch (error) {
    console.error('Failed to create note attachment:', error);
    return Response.json({ error: 'Failed to create note attachment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteNoteAttachment(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note attachment:', error);
    return Response.json({ error: 'Failed to delete note attachment' }, { status: 500 });
  }
}