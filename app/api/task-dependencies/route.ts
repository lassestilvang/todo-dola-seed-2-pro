import { initDb, getDb, saveDb } from '@/lib/db';
import { addTaskDependency, removeTaskDependency, getTaskDependencies, wouldCreateCircularDependency } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, validateRequiredFields, ErrorCodes } from '@/lib/api/middleware';
import { z } from 'zod';

const AddDependencySchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  dependsOnTaskId: z.string().min(1, 'dependsOnTaskId is required'),
});

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    throw new ApiError(400, 'taskId is required', ErrorCodes.MISSING_FIELDS, { missingFields: ['taskId'] });
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const result = db.exec(
    `SELECT td.id, td.task_id as taskId, td.depends_on_task_id as dependsOnTaskId, t.name as taskName
     FROM task_dependencies td
     JOIN tasks t ON td.depends_on_task_id = t.id
     WHERE td.task_id = ?
     ORDER BY t.name`,
    [taskId]
  );

  const dependencies = result[0]?.values.map((row: unknown[]) => ({
    id: row[0],
    taskId: row[1],
    dependsOnTaskId: row[2],
    taskName: row[3],
  })) || [];

  return Response.json({ data: dependencies });
}));

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();

  const validated = AddDependencySchema.safeParse(body);
  if (!validated.success) {
    throw new ApiError(400, 'Invalid dependency data', ErrorCodes.VALIDATION_ERROR, validated.error.flatten());
  }

  const { taskId, dependsOnTaskId } = validated.data;

  if (taskId === dependsOnTaskId) {
    throw new ApiError(400, 'Cannot create a dependency on itself', ErrorCodes.CONFLICT);
  }

  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const existing = db.exec(
    'SELECT id FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?',
    [taskId, dependsOnTaskId]
  );
  if (existing[0]?.values.length > 0) {
    throw new ApiError(400, 'Dependency already exists', ErrorCodes.DUPLICATE);
  }

  const wouldBeCircular = await wouldCreateCircularDependency(taskId, dependsOnTaskId);
  if (wouldBeCircular) {
    throw new ApiError(400, 'Adding this dependency would create a circular dependency', ErrorCodes.CONFLICT);
  }

  const dependency = await addTaskDependency(taskId, dependsOnTaskId);
  saveDb();
  return Response.json({ data: dependency }, { status: 201 });
}));

export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const dependsOnTaskId = searchParams.get('dependsOnTaskId');

  if (!taskId || !dependsOnTaskId) {
    throw new ApiError(400, 'taskId and dependsOnTaskId are required', ErrorCodes.MISSING_FIELDS, {
      missingFields: [!taskId ? 'taskId' : null, !dependsOnTaskId ? 'dependsOnTaskId' : null].filter(Boolean)
    });
  }

  await removeTaskDependency(taskId, dependsOnTaskId);
  return Response.json({ success: true });
}));