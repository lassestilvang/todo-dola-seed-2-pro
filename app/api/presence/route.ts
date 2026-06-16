import { initDb, getDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) {
    return Response.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 });
  }

  const result = db.exec('SELECT id, email, name, created_at as createdAt FROM users WHERE id = ?');
  const columns = result[0]?.columns || [];
  const values = result[0]?.values[0] || [];

  if (!values.length) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const user: Record<string, unknown> = {};
  columns.forEach((col: string, i: number) => {
    user[col] = values[i];
  });

  return Response.json({ data: user });
}));