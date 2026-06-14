import { initDb } from '@/lib/db';
import { useTemplate } from '@/lib/db/queries';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const task = await useTemplate(id);
    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to use template:', error);
    if (error instanceof Error && error.message === 'Template not found') {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to use template' }, { status: 500 });
  }
}