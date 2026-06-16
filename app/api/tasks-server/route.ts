import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const tasks = await getTasks({ limit, offset });

  return Response.json({ data: tasks, total: tasks.length, meta: { limit, offset } });
}));