import { initDb, getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCodes, ApiError, handleApiError } from '@/lib/api/middleware';
import { randomUUID } from 'crypto';

interface Reminder {
  id: string;
  taskId: string;
  reminderTime: number;
  sentAt: number | null;
  channel: 'email' | 'in-app' | 'slack' | 'discord';
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    let sql = 'SELECT * FROM reminders';
    let params: (string | number)[] = [];

    if (taskId) {
      sql += ' WHERE task_id = ?';
      params = [taskId];
    }

    sql += ' ORDER BY reminder_time DESC';

    const result = db.exec(sql, params);
    const reminders = result[0]?.values.map((row: unknown[]) => {
      const columns = result[0].columns;
      const obj: Record<string, unknown> = {};
      columns.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    }) || [];

    return NextResponse.json({ data: reminders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const body = await request.json();
    const { taskId, reminderTime, channel = 'email', enabled = true } = body;

    if (!taskId || !reminderTime) {
      throw new ApiError(400, 'Missing required fields: taskId, reminderTime', ErrorCodes.MISSING_FIELDS);
    }

    const id = randomUUID();
    const now = Date.now();

    db.exec(
      'INSERT INTO reminders (id, task_id, reminder_time, sent_at, channel, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, taskId, reminderTime, null, channel, enabled ? 1 : 0, now, now]
    );

    return NextResponse.json({ data: { id, taskId, reminderTime, channel, enabled } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ApiError(400, 'Missing id parameter', ErrorCodes.MISSING_FIELDS);
    }

    db.exec('DELETE FROM reminders WHERE id = ?', [id]);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ApiError(400, 'Missing id parameter', ErrorCodes.MISSING_FIELDS);
    }

    const body = await request.json();
    const { enabled, reminderTime, channel } = body;

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }
    if (reminderTime !== undefined) {
      updates.push('reminder_time = ?');
      params.push(reminderTime);
    }
    if (channel !== undefined) {
      updates.push('channel = ?');
      params.push(channel);
    }

    if (updates.length === 0) {
      throw new ApiError(400, 'No fields to update', ErrorCodes.VALIDATION_ERROR);
    }

    params.push(id);
    const now = Date.now();

    db.exec(
      `UPDATE reminders SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
      [...params, now, id]
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}