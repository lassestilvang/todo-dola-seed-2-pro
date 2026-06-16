import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { randomUUID } from 'crypto';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPassword?: string;
}

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const result = db.exec(
      'SELECT id, config FROM integrations WHERE type = ? AND enabled = 1'
    );

    if (!result || result.length === 0) {
      return Response.json({ data: null });
    }

    const row = result[0]?.values[0];
    if (!row) {
      return Response.json({ data: null });
    }

    const config = typeof row[1] === 'string' ? JSON.parse(row[1]) : row[1];

    return Response.json({
      data: {
        id: row[0],
        config,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

    const body = await request.json();
    const config: EmailConfig = body;

    const id = randomUUID();
    const now = Date.now();

    db.exec(
      'INSERT INTO integrations (id, type, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, 'email', JSON.stringify(config), 1, now, now]
    );
    saveDb();

    return Response.json({
      data: {
        id,
        type: 'email',
        config,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}