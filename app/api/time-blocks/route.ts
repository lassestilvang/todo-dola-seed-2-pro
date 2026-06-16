import { initDb } from '@/lib/db';
import { getTimeBlocks } from '@/lib/db/time-blocks';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();

  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  if (!start || !end) {
    return Response.json({ error: 'start and end query parameters are required' }, { status: 400 });
  }

  const blocks = await getTimeBlocks(parseInt(start, 10), parseInt(end, 10));
  return Response.json({ data: blocks });
}));