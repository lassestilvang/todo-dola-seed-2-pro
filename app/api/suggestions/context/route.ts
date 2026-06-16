import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { getContextSuggestions, getSuggestions, getTimeContext } from '@/lib/services/context-aware';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get all active tasks
    const tasks = await getTasks({ limit: 1000 });

    // Get context-aware suggestions
    const suggestions = await getContextSuggestions(tasks);

    return NextResponse.json({
      data: {
        suggestions,
        generatedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('Context suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}