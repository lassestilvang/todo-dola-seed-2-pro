import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { getTaskSuggestions, generateSchedulingSuggestions } from '@/lib/utils/ai-suggestions';
import type { Task } from '@/lib/types';

export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();

  const body = await request.json();
  const { taskName, description, userId } = body;

  if (!taskName) {
    return Response.json({ error: 'taskName is required' }, { status: 400 });
  }

  // Get user's task history for smarter suggestions
  const allTasks = await getTasks({ view: 'all', completed: false });
  const userTasks = userId ? allTasks.filter(t => t.assignedTo === userId) : allTasks;

  // Get suggestions based on task name and description
  const suggestions = getTaskSuggestions(taskName, description);

  // Get scheduling suggestions based on user history
  const schedulingSuggestions = generateSchedulingSuggestions(userTasks);

  return Response.json({
    data: {
      suggestions,
      schedulingSuggestions,
    },
  });
}));