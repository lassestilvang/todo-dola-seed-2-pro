import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const SlackConfigSchema = z.object({
  webhookUrl: z.string().url('Invalid webhook URL'),
  channel: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const result = db.exec('SELECT id, config, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations WHERE type = \'slack\'');
  if (!result || result.length === 0) {
    return Response.json({ data: [] });
  }

  const columns = result[0].columns;
  const values = result[0].values;
  const integrations = values.map((row: unknown[]) => {
    const entry: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      entry[col] = row[i];
    });
    const config = typeof entry.config === 'string' ? JSON.parse(entry.config as string) : entry.config;
    return { ...entry, ...config };
  });

  return Response.json({ data: integrations });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = SlackConfigSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid Slack configuration', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const now = Date.now();
  const id = crypto.randomUUID();

  db.exec(
    'INSERT INTO integrations (id, type, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, 'slack', JSON.stringify({ webhookUrl: validated.data.webhookUrl, channel: validated.data.channel }), validated.data.enabled ? 1 : 0, now, now]
  );
  saveDb();

  return Response.json({
    data: {
      id,
      webhookUrl: validated.data.webhookUrl,
      channel: validated.data.channel,
      enabled: validated.data.enabled,
      createdAt: now,
      updatedAt: now,
    }
  }, { status: 201 });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(400, 'Integration ID is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  db.exec('DELETE FROM integrations WHERE id = ?', [id]);
  saveDb();

  return Response.json({ success: true });
}));