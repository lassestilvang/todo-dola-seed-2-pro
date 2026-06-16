import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const NotionConfigSchema = z.object({
  databaseId: z.string().min(1, 'databaseId is required'),
  apiKey: z.string().min(1, 'apiKey is required'),
  enabled: z.boolean().default(true),
});

interface NotionIntegration {
  id: string;
  databaseId: string;
  apiKey: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const result = db.exec('SELECT id, database_id as databaseId, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations WHERE type = \'notion\'');
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
    return entry;
  });

  return Response.json({ data: integrations });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = NotionConfigSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid Notion configuration', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const now = Date.now();
  const id = crypto.randomUUID();

  db.exec(
    'INSERT INTO integrations (id, type, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, 'notion', JSON.stringify({ databaseId: validated.data.databaseId, apiKey: validated.data.apiKey }), validated.data.enabled ? 1 : 0, now, now]
  );
  saveDb();

  return Response.json({
    data: {
      id,
      databaseId: validated.data.databaseId,
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

// Sync tasks from Notion
export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();
  const { integrationId } = body;

  if (!integrationId) {
    throw new ApiError(400, 'integrationId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['integrationId'] });
  }

  // This would connect to Notion API and sync tasks
  // For now, return a placeholder response
  return Response.json({ data: { synced: 0, message: 'Notion integration not fully configured' } });
}));