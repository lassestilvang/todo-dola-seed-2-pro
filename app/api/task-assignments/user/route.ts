import { initDb } from '@/lib/db';
import { getAssignmentsByUser } from '@/lib/db/task-assignments';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ApiError(400, 'userId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['userId'] });
  }

  const assignments = await getAssignmentsByUser(userId);
  return Response.json({ data: assignments });
}));