import { initDb, saveDb } from '@/lib/db';
import { getCustomViewById, createCustomView, updateCustomView, deleteCustomView, setDefaultCustomView } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateViewSchema = z.object({
  name: z.string().min(1, 'name is required'),
  icon: z.string().optional().nullable(),
  filterConfig: z.string().min(1, 'filterConfig is required'),
  isDefault: z.boolean().optional().default(false),
});

async function getIdFromContext(context: Record<string, unknown> | undefined): Promise<string> {
  const params = await (context?.params as Promise<{ id: string }> | undefined);
  if (!params?.id) {
    throw new ApiError(400, 'Missing id parameter', ErrorCodes.MISSING_FIELDS);
  }
  return params.id;
}

export const GET = withErrorHandling(withRateLimit()(async (request: Request, context?: Record<string, unknown>) => {
  await initDb();
  const id = await getIdFromContext(context);

  const view = await getCustomViewById(id);
  if (!view) {
    throw new ApiError(404, 'Custom view not found', ErrorCodes.NOT_FOUND);
  }

  return Response.json({ data: view });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request, context?: Record<string, unknown>) => {
  await initDb();
  const id = await getIdFromContext(context);
  const body = await request.json();

  const view = await updateCustomView(id, body);
  if (!view) {
    throw new ApiError(404, 'Custom view not found', ErrorCodes.NOT_FOUND);
  }

  return Response.json({ data: view });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request, context?: Record<string, unknown>) => {
  await initDb();
  const id = await getIdFromContext(context);

  await deleteCustomView(id);
  return Response.json({ success: true });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request, context?: Record<string, unknown>) => {
  await initDb();
  const id = await getIdFromContext(context);
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'set-default') {
    await setDefaultCustomView(id);
    return Response.json({ success: true });
  }

  throw new ApiError(400, 'Invalid action', ErrorCodes.INVALID_INPUT);
}));