import { initDb } from '@/lib/db';
import { updateTemplate, deleteTemplate, getTemplateById, useTemplate } from '@/lib/db/queries';
import { TaskTemplateSchema } from '@/lib/schemas';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const template = await getTemplateById(id);
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    return Response.json(template);
  } catch (error) {
    console.error('Failed to fetch template:', error);
    return Response.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    const validated = TaskTemplateSchema.partial().safeParse(body);
    if (!validated.success) {
      return Response.json({ error: 'Invalid template data', details: validated.error.flatten() }, { status: 400 });
    }

    const template = await updateTemplate(id, validated.data);
    if (!template) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    return Response.json(template);
  } catch (error) {
    console.error('Failed to update template:', error);
    return Response.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    await deleteTemplate(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return Response.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const task = await useTemplate(id);
    return Response.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to use template:', error);
    return Response.json({ error: 'Failed to use template' }, { status: 500 });
  }
}