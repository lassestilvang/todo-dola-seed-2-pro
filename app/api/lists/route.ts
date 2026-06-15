import { initDb, saveDb } from '@/lib/db';
import { getLists, createList, reorderLists } from '@/lib/db/queries';
import { TaskListCreateSchema } from '@/lib/schemas';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, validateRequiredFields, ErrorCodes } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const lists = await getLists();
  return Response.json({ data: lists });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = TaskListCreateSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid list data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const list = await createList(validated.data);
  return Response.json({ data: list }, { status: 201 });
}));

export const PUT = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  if (!Array.isArray(body.lists) || body.lists.length === 0) {
    throw new ApiError(400, 'lists array is required');
  }

  for (const { id, sortOrder } of body.lists) {
    if (!id || sortOrder === undefined) {
      throw new ApiError(400, 'Each item must have id and sortOrder');
    }
  }

  await reorderLists(body.lists);
  return Response.json({ success: true });
}));