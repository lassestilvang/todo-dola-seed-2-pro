import { initDb } from '@/lib/db';
import { getCustomViews } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { z } from 'zod';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  const views = await getCustomViews();

  if (format === 'json') {
    return Response.json({
      name: 'TaskFilterExport',
      exportedAt: Date.now(),
      filters: views.map(v => ({
        id: v.id,
        name: v.name,
        icon: v.icon,
        filterConfig: JSON.parse(v.filterConfig),
      })),
    });
  }

  if (format === 'csv') {
    const headers = ['id', 'name', 'icon', 'filterConfig'];
    const rows = views.map(v => [
      v.id,
      `"${v.name}"`,
      `"${v.icon || ''}"`,
      `"${v.filterConfig.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv' },
    });
  }

  return Response.json({ data: views });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  // Import filters from uploaded file
  const importSchema = z.object({
    filters: z.array(z.object({
      name: z.string(),
      icon: z.string().optional().nullable(),
      filterConfig: z.union([z.string(), z.object({})]),
    })),
  });

  const validated = importSchema.safeParse(body);
  if (!validated.success) {
    return Response.json({ error: 'Invalid import format' }, { status: 400 });
  }

  const { getCustomViewById, createCustomView } = await import('@/lib/db/queries');
  const imported = [];

  for (const filter of validated.data.filters) {
    const existing = await getCustomViewById(filter.name);
    if (!existing) {
      const view = await createCustomView({
        name: filter.name,
        icon: filter.icon || '📋',
        filterConfig: typeof filter.filterConfig === 'string' ? filter.filterConfig : JSON.stringify(filter.filterConfig),
      });
      imported.push(view);
    }
  }

  return Response.json({ data: imported, imported: imported.length });
}));