import { initDb } from '@/lib/db';
import { updateLabel, getLabelById, deleteLabel } from '@/lib/db/queries';
import { LabelSchema } from '@/lib/schemas';
import { handleApiError } from '@/lib/api/middleware';
import type { Label } from '@/lib/types';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const label = await getLabelById(id);
    if (!label) {
      return Response.json({ error: 'Label not found' }, { status: 404 });
    }

    return Response.json({ data: label });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    await deleteLabel(id);
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    const validated = LabelSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid label data', details: validated.error.flatten() }, { status: 400 });
    }

    const label = await updateLabel(id, validated.data);
    if (!label) {
      return Response.json({ error: 'Label not found' }, { status: 404 });
    }

    return Response.json({ data: label });
  } catch (error) {
    return handleApiError(error);
  }
}