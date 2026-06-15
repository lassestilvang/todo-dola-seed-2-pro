import { initDb } from '@/lib/db';
import { toggleTaskCompletion, createActivity } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export const PATCH = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await initDb();
    const { id } = await params;
    const { completed } = await request.json();

    const task = await toggleTaskCompletion(id, completed);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Log activity
    await createActivity({
      type: completed ? 'task_completed' : 'task_updated',
      taskId: id,
      details: `Task marked as ${completed ? 'completed' : 'incomplete'}`,
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Failed to toggle task completion:', error);
    return NextResponse.json({ error: 'Failed to toggle task completion' }, { status: 500 });
  }
}