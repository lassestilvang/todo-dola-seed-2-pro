import { initDb, saveDb } from '@/lib/db';
import { getMentionsForUser, createMention, markMentionAsRead, markAllMentionsAsRead } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateMentionSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  mentionedUserId: z.string().min(1, 'mentionedUserId is required'),
  context: z.string().min(1, 'context is required'),
  contextType: z.enum(['comment', 'note', 'description']),
  contextId: z.string().optional().nullable(),
});

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ApiError(400, 'userId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['userId'] });
  }

  const limit = parseInt(searchParams.get('limit') || '50');
  const mentions = await getMentionsForUser(userId, limit);
  return Response.json({ data: mentions });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = CreateMentionSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid mention data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const mention = await createMention(validated.data);
  return Response.json({ data: mention }, { status: 201 });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ApiError(400, 'userId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['userId'] });
  }

  await markAllMentionsAsRead(userId);
  return Response.json({ success: true });
}));