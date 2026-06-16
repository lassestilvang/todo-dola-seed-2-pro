import { archiveTask } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { validateUuid } from '@/lib/api/middleware';

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  // Extract id from URL path for Next.js App Router
  const pathParts = new URL(request.url).pathname.split('/');
  const id = pathParts[pathParts.length - 2] || '';

  // Validate UUID
  if (!validateUuid(id)) {
    return Response.json({ error: 'Invalid task ID' }, { status: 400 });
  }

  const success = await archiveTask(id);

  if (!success) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  return Response.json({ data: { success: true } });
}));