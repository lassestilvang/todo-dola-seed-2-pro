import { initDb } from '@/lib/db';
import { getTasks, generateRecurringTasks, getRecurringCompletions, addRecurringCompletion } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async () => {
  try {
    await initDb();

    // Get all tasks with recurring settings
    const recurringTasks = await getTasks({ recurring: true, completed: false });

    let generatedCount = 0;

    for (const task of recurringTasks) {
      if (task.recurringType && task.recurringConfig && task.date) {
        const existingCompletions = await getRecurringCompletions(task.id);
        const completionSet = new Set(existingCompletions.map(c => c.completedAt));

        // Generate the next occurrence using the proper algorithm
        const newTasks = await generateRecurringTasks(task.id);

        for (const newTask of newTasks) {
          // Only track completions for newly generated tasks
          if (newTask.date && !completionSet.has(newTask.date)) {
            await addRecurringCompletion(task.id, newTask.date);
            generatedCount++;
          }
        }
      }
    }

    return NextResponse.json({ data: { generated: generatedCount } });
  } catch (error) {
    console.error('Failed to generate recurring tasks:', error);
    return NextResponse.json({ error: 'Failed to generate recurring tasks' }, { status: 500 });
  }
};

export const GET = async (request: NextRequest) => {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const completions = await getRecurringCompletions(taskId);
    return NextResponse.json({ data: completions });
  } catch (error) {
    console.error('Failed to fetch recurring completions:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring completions' }, { status: 500 });
  }
};