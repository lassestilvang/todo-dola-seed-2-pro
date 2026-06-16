import { initDb } from '@/lib/db';
import { getCustomViews, createCustomView } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateViewSchema = z.object({
  name: z.string().min(1, 'name is required'),
  icon: z.string().optional(),
  filterConfig: z.string().min(1, 'filterConfig is required'),
  isDefault: z.boolean().optional(),
});

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const views = await getCustomViews();
  return Response.json({ data: views });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = CreateViewSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid view data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const view = await createCustomView({
    name: validated.data.name,
    icon: validated.data.icon || '📋',
    filterConfig: validated.data.filterConfig,
    isDefault: validated.data.isDefault || false,
  });

  return Response.json({ data: view }, { status: 201 });
}));