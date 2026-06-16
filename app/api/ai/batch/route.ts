import { initDb } from '@/lib/db';
import { createTask, toggleTaskCompletion, deleteTask } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { generateTaskFromPrompt } from '@/lib/utils/ai-suggestions';

interface BatchOperation {
  action: 'create' | 'update' | 'delete' | 'complete';
  tasks: string[];
  data?: Record<string, unknown>;
}

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();

  const body = await request.json();
  const { operations } = body;

  if (!operations || !Array.isArray(operations)) {
    return Response.json({ error: 'operations array is required' }, { status: 400 });
  }

  const results: Array<{ action: string; success: boolean; count?: number; error?: string }> = [];

  for (const op of operations) {
    try {
      switch (op.action) {
        case 'create': {
          const tasks = op.prompt.split('\n').filter((p: string) => p.trim());
          let createdCount = 0;

          for (const prompt of tasks) {
            const taskData = generateTaskFromPrompt(prompt);
            await createTask({
              name: taskData.name as string,
              description: taskData.description as string | null,
              listId: taskData.listId,
              priority: taskData.priority,
              date: taskData.date as number | null,
              deadline: null,
              reminder: null,
              estimate: taskData.estimate as number | null,
              actualTime: null,
              completed: false,
              completedAt: null,
              recurringType: null,
              recurringConfig: null,
              attachmentPath: null,
              sortOrder: 0,
            });
            createdCount++;
          }
          results.push({ action: 'create', success: true, count: createdCount });
          break;
        }

        case 'complete': {
          for (const taskId of op.tasks) {
            await toggleTaskCompletion(taskId, true);
          }
          results.push({ action: 'complete', success: true, count: op.tasks.length });
          break;
        }

        case 'delete': {
          for (const taskId of op.tasks) {
            await deleteTask(taskId);
          }
          results.push({ action: 'delete', success: true, count: op.tasks.length });
          break;
        }

        default:
          results.push({ action: op.action, success: false, error: 'Unknown action' });
      }
    } catch (error) {
      results.push({ action: op.action, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return Response.json({ data: results });
}));