import { initDb } from '@/lib/db';
import { toggleTaskCompletion, createActivity } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes, validateUuid } from '@/lib/api/middleware';

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request, context) => {
  await initDb();
  const params = await (context as { params: Promise<{ id: string }> }).params;
  const { id } = params;
  const body = await request.json();
  const { completed } = body;

  if (!id || !validateUuid(id)) {
    throw new ApiError(400, 'Invalid task ID', ErrorCodes.INVALID_UUID);
  }

  // Check for incomplete dependencies if marking as complete
  if (completed) {
    const { getTaskDependencies } = await import('@/lib/db/task-dependencies');
    const dependencies = await getTaskDependencies(id);

    for (const dep of dependencies) {
      const { getTaskById } = await import('@/lib/db/queries');
      const dependentTask = await getTaskById(dep.dependsOnTaskId);
      if (dependentTask && !dependentTask.completed) {
        throw new ApiError(
          400,
          `Cannot complete task: dependency "${dependentTask.name}" is not completed`,
          ErrorCodes.CONFLICT,
          { dependencyId: dep.dependsOnTaskId, dependencyName: dependentTask.name }
        );
      }
    }
  }

  const task = await toggleTaskCompletion(id, completed);

  if (!task) {
    throw new ApiError(404, 'Task not found', ErrorCodes.NOT_FOUND);
  }

  // Log activity
  await createActivity({
    type: completed ? 'task_completed' : 'task_updated',
    taskId: id,
    details: `Task marked as ${completed ? 'completed' : 'incomplete'}`,
  });

  return Response.json({ data: task });
}));