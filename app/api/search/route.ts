import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { searchTasks, searchTasksAdvanced, getSearchSuggestions, clearSearchCache } from '@/lib/utils/search';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import type { TaskFilter } from '@/lib/types';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50');
  const showCompleted = searchParams.get('completed');
  const listId = searchParams.get('listId') || undefined;
  const priority = searchParams.get('priority') as 'high' | 'medium' | 'low' | 'none' | null || undefined;
  const dueBefore = searchParams.get('dueBefore') ? parseInt(searchParams.get('dueBefore')!) : undefined;
  const dueAfter = searchParams.get('dueAfter') ? parseInt(searchParams.get('dueAfter')!) : undefined;

  const completedFilter = showCompleted === 'true' ? true : showCompleted === 'false' ? false : undefined;

  // Get all tasks (could be optimized with pagination in the future)
  const tasks = await getTasks({
    completed: completedFilter,
    listId,
    priority,
    dueBefore,
    dueAfter,
    limit: 1000, // Get more tasks for fuzzy search
  });

  // Apply fuzzy search
  const results = searchTasks(tasks, query);

  // Apply additional advanced filters
  const filtered = searchTasksAdvanced(tasks, query, {
    completed: completedFilter,
    priority,
    listId,
    dueBefore,
    dueAfter,
  });

  return Response.json({
    data: filtered.slice(0, limit),
    total: filtered.length,
    query,
    meta: {
      limit,
      hasMore: filtered.length > limit,
    },
  });
}));

// Endpoint for getting search suggestions
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  const { query, limit = 5 } = await request.json();

  if (!query || typeof query !== 'string') {
    return Response.json({ data: [] });
  }

  // Get tasks (could be cached or optimized)
  await initDb();
  const tasks = await getTasks({ limit: 1000 });
  const suggestions = getSearchSuggestions(tasks, query, limit);

  return Response.json({ data: suggestions });
}));