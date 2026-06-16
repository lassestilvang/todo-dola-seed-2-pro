import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getLabels } from '@/lib/db/queries';
import { getSmartDefaults, generateSubtasksFromPattern } from '@/lib/services/smart-defaults';

export async function POST(request: NextRequest) {
  await initDb();
  const body = await request.json();
  const { taskName } = body;

  if (!taskName || typeof taskName !== 'string') {
    return NextResponse.json(
      { error: 'taskName is required' },
      { status: 400 }
    );
  }

  // Get available labels
  const labels = await getLabels();

  // Get smart suggestions
  const suggestions = getSmartDefaults(taskName, labels);
  const subtasks = generateSubtasksFromPattern(taskName);

  return NextResponse.json({
    data: {
      suggestions,
      subtasks,
    },
  });
}