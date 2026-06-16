import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { getAutoPrioritySuggestions } from '@/lib/services/intelligence-service';

export async function GET(request: NextRequest) {
  await initDb();

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  // Get all incomplete tasks
  const tasks = await getTasks({ view: 'all', completed: false, limit: 1000 });

  // Get priority suggestions
  const suggestions = getAutoPrioritySuggestions(tasks);

  // Apply top suggestions
  const appliedCount = 0;
  for (const suggestion of suggestions.slice(0, limit)) {
    // In a real implementation, this would update the task
    // For now, we just return the suggestions
  }

  return NextResponse.json({
    data: suggestions,
    applied: appliedCount,
  });
}

export async function POST(request: NextRequest) {
  await initDb();
  const body = await request.json();
  const { taskIds } = body;

  if (!taskIds || !Array.isArray(taskIds)) {
    return NextResponse.json(
      { error: 'taskIds array is required' },
      { status: 400 }
    );
  }

  const tasks = await getTasks({ view: 'all', completed: false, limit: 1000 });
  const suggestions = getAutoPrioritySuggestions(tasks);

  // Filter suggestions for specific tasks
  const filtered = suggestions.filter(s => taskIds.includes(s.taskId));

  return NextResponse.json({
    data: filtered,
  });
}