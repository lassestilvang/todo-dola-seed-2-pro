import { initDb, saveDb } from '@/lib/db';
import { getComments, createComment, updateComment, deleteComment, createActivity, createNotificationWithTimestamp } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit, validateParams } from '@/lib/api/handler';
import { ApiError, validateRequiredFields, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  content: z.string().min(1, 'content is required'),
  author: z.string().optional().nullable(),
});

const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'content is required'),
});

// Extract mentions from text
function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    throw new ApiError(400, 'Task ID is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['taskId'] });
  }

  const comments = await getComments(taskId);
  return Response.json({ data: comments });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = CreateCommentSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid comment data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const comment = await createComment(validated.data.taskId, validated.data.content, validated.data.author || undefined);

  // Extract mentions and create notifications
  const mentions = extractMentions(validated.data.content);
  for (const mention of mentions) {
    await createNotificationWithTimestamp({
      type: 'mention',
      taskId: validated.data.taskId,
      userId: mention,
      message: `${validated.data.author || 'Someone'} mentioned you in a comment`,
      read: false,
    });
  }

  await createActivity({
    type: 'comment_added',
    taskId: validated.data.taskId,
    userId: validated.data.author || null,
    userName: validated.data.author || null,
    details: validated.data.content.substring(0, 100),
  });

  saveDb();
  return Response.json({ data: comment, mentions }, { status: 201 });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const id = body.id;
  if (!id) {
    throw new ApiError(400, 'Comment ID is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  const validated = UpdateCommentSchema.safeParse({ content: body.content });
  if (!validated.success) {
    throw new ApiError(400, 'Invalid comment data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const comment = await updateComment(id, validated.data.content);
  if (!comment) {
    throw new ApiError(404, 'Comment not found', ErrorCodes.NOT_FOUND);
  }

  saveDb();
  return Response.json({ data: comment });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(400, 'Comment ID is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  await deleteComment(id);
  return Response.json({ success: true });
}));