import { NextRequest, NextResponse } from 'next/server';
import { initDb, getTasks } from '@/lib/db/queries';
import { getHabits } from '@/lib/db/habits';
import { getGoals } from '@/lib/db/goals';
import { calculateMetrics, generateInsights, getRecommendations } from '@/lib/services/intelligence-service';
import { runQuery } from '@/lib/db/core';

export async function GET(request: NextRequest) {
  try {
    await initDb();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Get tasks based on period
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const dateFrom = Date.now() - days * 24 * 60 * 60 * 1000;

    const tasks = await getTasks({ dateFrom });
    const habits = await getHabits();
    const goals = await getGoals();
    const timeEntries = runQuery(
      'SELECT started_at as startedAt, ended_at as endedAt FROM time_entries WHERE started_at >= ?',
      [dateFrom]
    ) as { startedAt: number; endedAt: number | null }[];

    const metrics = calculateMetrics(tasks, timeEntries);
    const insights = generateInsights(metrics, tasks, goals, habits);
    const recommendations = getRecommendations(metrics, tasks);

    return NextResponse.json({
      data: {
        metrics,
        insights,
        recommendations,
      },
    });
  } catch (error) {
    console.error('Intelligence error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}