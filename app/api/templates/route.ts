import { initDb } from '@/lib/db';
import { getTemplates, createTemplate } from '@/lib/db/queries';
import { TaskTemplateSchema } from '@/lib/schemas';
import { withErrorHandling } from '@/lib/api/handler';
import { handleApiError } from '@/lib/api/middleware';

export const GET = withErrorHandling(async () => {
  await initDb();
  const templates = await getTemplates();
  return Response.json({ data: templates });
});

export const POST = withErrorHandling(async (request: Request) => {
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
  return Response.json({ data: template }, { status: 201 });
});