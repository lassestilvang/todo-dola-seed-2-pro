import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getTasks, getTimeEntries } from '@/lib/db/queries';
import { calculateTimeAllocation, calculateProductivityCorrelation, getFocusTimeVsTaskCompletion } from '@/lib/services/time-analytics';

export async function GET(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'allocation';
  const days = parseInt(searchParams.get('days') || '30');

  const tasks = await getTasks({ view: 'all', completed: true, limit: 1000 });
  const timeEntries = await getTimeEntries();

  if (type === 'correlation') {
    const correlation = calculateProductivityCorrelation(tasks, timeEntries, days);
    return NextResponse.json({ data: correlation });
  }

  if (type === 'focus') {
    const focusData = getFocusTimeVsTaskCompletion(timeEntries, tasks);
    return NextResponse.json({ data: focusData });
  }

  // Default: time allocation
  const allocation = calculateTimeAllocation(tasks, timeEntries);
  return NextResponse.json({ data: allocation });
}
