import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { randomUUID } from 'crypto';

interface IntegrationConfig {
  url?: string;
  events?: string[];
  secret?: string;
  [key: string]: unknown;
}

// GET /api/integrations - List all integrations
export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const result = db.exec(
    'SELECT id, type, config, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations'
  );

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
    if (typeof entry.config === 'string') {
      entry.config = JSON.parse(entry.config as string);
    }
    return entry;
  });

  return Response.json({ data: integrations });
}));

// POST /api/integrations - Create a new integration
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const body = await request.json();
  const { type, config } = body;

  if (!type || !config) {
    throw new ApiError(400, 'type and config are required', ErrorCodes.MISSING_FIELDS);
  }

  const validTypes = ['notion', 'slack', 'caldav', 'webhook', 'email'];
  if (!validTypes.includes(type)) {
    throw new ApiError(400, `type must be one of: ${validTypes.join(', ')}`, ErrorCodes.INVALID_INPUT);
  }

  const id = randomUUID();
  const now = Date.now();

  db.exec(
    'INSERT INTO integrations (id, type, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, type, JSON.stringify(config), 1, now, now]
  );
  saveDb();

  return Response.json({
    data: {
      id,
      type,
      config,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  }, { status: 201 });
}));

// PATCH /api/integrations - Update integrations (bulk or individual)
export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const body = await request.json();
  const { id, enabled, config } = body;

  if (!id) {
    throw new ApiError(400, 'id is required', ErrorCodes.MISSING_FIELDS);
  }

  const existing = db.exec('SELECT id FROM integrations WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    throw new ApiError(404, 'Integration not found', ErrorCodes.NOT_FOUND);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(enabled ? 1 : 0);
  }
  if (config !== undefined) {
    updates.push('config = ?');
    values.push(JSON.stringify(config));
  }

  if (updates.length === 0) {
    return Response.json({ data: { id } });
  }

  values.push(id);
  db.exec(
    `UPDATE integrations SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
    [...values, Date.now(), id]
  );
  saveDb();

  const result = db.exec(
    'SELECT id, type, config, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations WHERE id = ?',
    [id]
  );

  const row = result[0]?.values[0];
  const columns = result[0]?.columns || [];

  const integration: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    integration[col] = row?.[i];
  });
  if (typeof integration.config === 'string') {
    integration.config = JSON.parse(integration.config as string);
  }

  return Response.json({ data: integration });
}));

// DELETE /api/integrations - Delete an integration
export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw new ApiError(400, 'id is required', ErrorCodes.MISSING_FIELDS);
  }

  const result = db.exec('SELECT id FROM integrations WHERE id = ?', [id]);
  if (!result || result.length === 0) {
    throw new ApiError(404, 'Integration not found', ErrorCodes.NOT_FOUND);
  }

  db.exec('DELETE FROM integrations WHERE id = ?', [id]);
  saveDb();

  return Response.json({ success: true });
}));