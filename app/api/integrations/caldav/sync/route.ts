import { NextRequest, NextResponse } from 'next/server';
import { initDb, getDb } from '@/lib/db/index';
import { getTasks } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  await initDb();
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const { url, username, password } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    // For now, return tasks that can be synced
    // In production, this would make actual CalDAV API calls
    const tasks = await getTasks({ view: 'all', completed: false });

    const syncableTasks = tasks
      .filter(t => t.date)
      .map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
        deadline: t.deadline,
        completed: t.completed,
      }));

    return NextResponse.json({
      success: true,
      synced: syncableTasks.length,
      data: syncableTasks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}