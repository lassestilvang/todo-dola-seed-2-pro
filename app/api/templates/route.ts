import { initDb } from '@/lib/db';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/db/queries';
import { TaskTemplateSchema } from '@/lib/schemas';
import type { TaskTemplate, Priority } from '@/lib/types';

export async function GET() {
  try {
    await initDb();
    const templates = await getTemplates();
    return Response.json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return Response.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    const validated = TaskTemplateSchema.safeParse({
      ...body,
      priority: body.priority || 'none',
    });
    if (!validated.success) {
      return Response.json({ error: 'Invalid template data', details: validated.error.flatten() }, { status: 400 });
    }

    const template = await createTemplate(validated.data);
    return Response.json(template, { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);
    return Response.json({ error: 'Failed to create template' }, { status: 500 });
  }
}