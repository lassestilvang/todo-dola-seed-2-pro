import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { getProgressStats } from '@/lib/services/gamification';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'current-user';

    const tasks = await getTasks({ limit: 1000 });
    const progress = getProgressStats(tasks);

    return NextResponse.json({
      data: {
        ...progress,
        badges: progress.badges,
      },
    });
  } catch (error) {
    console.error('Gamification error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}