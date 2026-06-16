import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes, validateUuid } from '@/lib/api/middleware';
import { z } from 'zod';

const UpdateTimeEntrySchema = z.object({
  duration: z.number().optional(),
  description: z.string().optional(),
  endedAt: z.number().optional(),
});

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;
  const body = await request.json();

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid time entry ID', ErrorCodes.INVALID_UUID);
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  // Get existing entry
  const result = db.exec('SELECT * FROM time_entries WHERE id = ?', [id]);
  if (!result || result.length === 0) {
    throw new ApiError(404, 'Time entry not found', ErrorCodes.NOT_FOUND);
  }

  const row = result[0].values[0] as (string | number | null)[];
  const columns = result[0].columns;
  const oldEntry: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    oldEntry[col] = row[i];
  });

  const validated = UpdateTimeEntrySchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid update data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (validated.data.duration !== undefined) {
    updates.push('duration = ?');
    values.push(validated.data.duration);

    // Update task's actual_time
    db.exec(
      'UPDATE tasks SET actual_time = COALESCE(actual_time, 0) + ? WHERE id = ?',
      [validated.data.duration - (oldEntry.duration as number ?? 0), oldEntry.task_id as string]
    );
  }
  if (validated.data.description !== undefined) {
    updates.push('description = ?');
    values.push(validated.data.description);
  }
  if (validated.data.endedAt !== undefined) {
    updates.push('ended_at = ?');
    values.push(validated.data.endedAt);
  }

  if (updates.length > 0) {
    values.push(id);
    db.exec(`UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  saveDb();

  const updatedResult = db.exec('SELECT * FROM time_entries WHERE id = ?', [id]);
  const updatedRow = updatedResult[0].values[0] as (string | number | null)[];
  const updatedColumns = updatedResult[0].columns;
  const updatedEntry: Record<string, unknown> = {};
  updatedColumns.forEach((col: string, i: number) => {
    updatedEntry[col] = updatedRow[i];
  });

  return Response.json({
    data: {
      id: updatedEntry.id,
      taskId: updatedEntry.task_id,
      duration: updatedEntry.duration,
      description: updatedEntry.description,
      startedAt: updatedEntry.started_at,
      endedAt: updatedEntry.ended_at,
      createdAt: updatedEntry.created_at,
    }
  });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid time entry ID', ErrorCodes.INVALID_UUID);
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  // Get existing entry to update task's actual_time
  const result = db.exec('SELECT * FROM time_entries WHERE id = ?', [id]);
  if (!result || result.length === 0) {
    throw new ApiError(404, 'Time entry not found', ErrorCodes.NOT_FOUND);
  }

  const row = result[0].values[0] as (string | number | null)[];
  const columns = result[0].columns;
  const entry: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    entry[col] = row[i];
  });

  // Subtract duration from task's actual_time
  db.exec(
    'UPDATE tasks SET actual_time = GREATEST(COALESCE(actual_time, 0) - ?, 0) WHERE id = ?',
    [entry.duration as number, entry.task_id as string]
  );

  db.exec('DELETE FROM time_entries WHERE id = ?', [id]);
  saveDb();

  return Response.json({ success: true });
}));