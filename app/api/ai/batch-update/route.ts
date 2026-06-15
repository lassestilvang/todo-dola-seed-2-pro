import { NextRequest, NextResponse } from 'next/server';
import { updateTask } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 });
    }

    const results = [];
    for (const update of updates) {
      const { taskId, ...data } = update;
      const task = await updateTask(taskId, data);
      if (task) {
        results.push(task);
      }
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to batch update tasks' },
      { status: 500 }
    );
  }
}