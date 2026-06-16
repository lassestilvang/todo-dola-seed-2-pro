import { initDb, getDb, saveDb } from '@/lib/db';
import { generateId, now } from '@/lib/db/core';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateTimeEntrySchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  duration: z.number().min(1, 'duration is required'),
  description: z.string().optional(),
});

const StartTimerSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
});

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
  const offset = parseInt(searchParams.get('offset') || '0');

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  let query = `
    SELECT id, task_id as taskId, duration, description, started_at as startedAt, ended_at as endedAt, created_at as createdAt
    FROM time_entries
    WHERE 1=1
  `;
  const params: (string | number | null)[] = [];

  if (taskId) {
    query += ' AND task_id = ?';
    params.push(taskId);
  }

  query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = db.exec(query, params);
  if (!result || result.length === 0) {
    return Response.json({ data: [], total: 0 });
  }

  const columns = result[0].columns;
  const rows = result[0].values;

  const entries = rows.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM time_entries';
  const countParams: (string | number | null)[] = [];
  if (taskId) {
    countQuery += ' WHERE task_id = ?';
    countParams.push(taskId);
  }
  const countResult = db.exec(countQuery, countParams);
  const total = (countResult[0]?.values[0]?.[0] as number) ?? 0;

  return Response.json({ data: entries, total });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = CreateTimeEntrySchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid time entry data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const { taskId, duration, description } = validated.data;

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const nowVal = now();
  const id = generateId();

  db.exec(
    'INSERT INTO time_entries (id, task_id, duration, description, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, taskId, duration, description ?? null, nowVal, nowVal]
  );

  // Update actual_time on task
  db.exec(
    'UPDATE tasks SET actual_time = COALESCE(actual_time, 0) + ? WHERE id = ?',
    [duration, taskId]
  );

  saveDb();

  return Response.json({ data: { id, taskId, duration, description, startedAt: nowVal, endedAt: null, createdAt: nowVal } }, { status: 201 });
}));

// Start a timer (creates a time entry that's still running)
export const PUT = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = StartTimerSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid timer data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const { taskId } = validated.data;

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const nowVal = now();
  const id = generateId();

  db.exec(
    'INSERT INTO time_entries (id, task_id, duration, description, started_at, created_at) VALUES (?, ?, 0, ?, ?, ?)',
    [id, taskId, 'Timer started', nowVal, nowVal]
  );

  saveDb();

  return Response.json({ data: { id, taskId, duration: 0, description: 'Timer started', startedAt: nowVal, endedAt: null, createdAt: nowVal } }, { status: 201 });
}));