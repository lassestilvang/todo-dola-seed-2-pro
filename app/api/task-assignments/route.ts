import { initDb } from '@/lib/db';
import {
  getTaskAssignments,
  createTaskAssignment,
  updateTaskAssignment,
  deleteTaskAssignment,
} from '@/lib/db/task-assignments';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, validateRequiredFields, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const CreateAssignmentSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  userId: z.string().min(1, 'userId is required'),
  assignedBy: z.string().optional(),
  dueDate: z.number().optional(),
});

const UpdateAssignmentSchema = z.object({
  dueDate: z.number().optional(),
});

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    throw new ApiError(400, 'taskId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['taskId'] });
  }

  const assignments = await getTaskAssignments(taskId);
  return Response.json({ data: assignments });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = CreateAssignmentSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid assignment data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const { taskId, userId, assignedBy, dueDate } = validated.data;

  const assignment = await createTaskAssignment(taskId, userId, assignedBy, dueDate);
  return Response.json({ data: assignment }, { status: 201 });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  if (!id) {
    throw new ApiError(400, 'id is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  const validated = UpdateAssignmentSchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid update data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const assignment = await updateTaskAssignment(id, validated.data);
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found', ErrorCodes.NOT_FOUND);
  }

  return Response.json({ data: assignment });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ApiError(400, 'id is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['id'] });
  }

  await deleteTaskAssignment(id);
  return Response.json({ success: true });
}));