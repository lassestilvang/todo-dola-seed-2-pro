import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/middleware';

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const allTasks = await getTasks({ view: 'all' });
  const recentTasks = allTasks.filter(t => t.createdAt >= weekAgo);
  const recentCompleted = recentTasks.filter(t => t.completed);

  const totalEstimate = allTasks.reduce((sum, t) => sum + (t.estimate || 0), 0);
  const totalActual = allTasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);

  const completionRate = allTasks.length > 0
    ? Math.round((allTasks.filter(t => t.completed).length / allTasks.length) * 100)
    : 0;

  const timeEfficiency = totalEstimate > 0
    ? Math.min(Math.round((totalActual / totalEstimate) * 100), 100)
    : 100;

  const avgTaskAge = allTasks.length > 0
    ? Math.round(allTasks.reduce((sum, t) => sum + (now - t.createdAt), 0) / allTasks.length / (1000 * 60 * 60 * 24))
    : 0;

  return Response.json({
    data: {
      completionRate,
      timeEfficiency,
      avgTaskAge,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.completed).length,
      recentTasks: recentTasks.length,
      recentCompleted: recentCompleted.length,
      totalEstimateHours: Math.round(totalEstimate / 60),
      totalActualHours: Math.round(totalActual / 60),
    },
  });
}));