import { initDb } from '@/lib/db';
import { getCustomViewById, updateCustomView, deleteCustomView, setDefaultCustomView } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes, validateUuid } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid ID', ErrorCodes.INVALID_UUID);
  }

  const view = await getCustomViewById(id);
  if (!view) {
    throw new ApiError(404, 'Custom view not found', ErrorCodes.NOT_FOUND);
  }
  return Response.json({ data: view });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid ID', ErrorCodes.INVALID_UUID);
  }

  const body = await request.json();
  const view = await updateCustomView(id, body);
  if (!view) {
    throw new ApiError(404, 'Custom view not found', ErrorCodes.NOT_FOUND);
  }
  return Response.json({ data: view });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid ID', ErrorCodes.INVALID_UUID);
  }

  await deleteCustomView(id);
  return Response.json({ success: true });
}));

export const PUT = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid ID', ErrorCodes.INVALID_UUID);
  }

  await setDefaultCustomView(id);
  return Response.json({ success: true });
}));