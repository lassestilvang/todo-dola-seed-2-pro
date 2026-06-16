import { initDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const GoogleCalendarSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
  enabled: z.boolean().default(true),
});

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  return Response.json({ data: [] });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = GoogleCalendarSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid Google Calendar configuration', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const integration = {
    id: crypto.randomUUID(),
    type: 'google-calendar',
    refreshToken: validated.data.refreshToken,
    enabled: validated.data.enabled,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return Response.json({ data: integration }, { status: 201 });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(400, 'Integration ID is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  return Response.json({ success: true });
}));
