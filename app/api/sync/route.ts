import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';
import { getLists } from '@/lib/db/queries';
import { getLabels } from '@/lib/db/queries';

interface SyncChange {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { lastSyncTime, deviceId } = body;

    const changes: SyncChange[] = [];

    const tasks = await getTasks({ dateFrom: lastSyncTime });
    for (const task of tasks) {
      changes.push({
        id: task.id,
        table: 'tasks',
        operation: 'update',
        timestamp: task.updatedAt,
        data: JSON.parse(JSON.stringify(task)),
      });
    }

    const lists = await getLists();
    for (const list of lists) {
      changes.push({
        id: list.id,
        table: 'lists',
        operation: 'update',
        timestamp: list.updatedAt,
        data: JSON.parse(JSON.stringify(list)),
      });
    }

    const labels = await getLabels();
    for (const label of labels) {
      changes.push({
        id: label.id,
        table: 'labels',
        operation: 'update',
        timestamp: label.updatedAt,
        data: JSON.parse(JSON.stringify(label)),
      });
    }

    changes.sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      data: {
        changes,
        lastSyncTime: Date.now(),
      },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const lastSyncTime = parseInt(searchParams.get('lastSync') || '0');

    const tasks = await getTasks();
    const lists = await getLists();
    const labels = await getLabels();

    return NextResponse.json({
      data: {
        tasks: tasks.map(t => JSON.parse(JSON.stringify(t))),
        lists: lists.map(l => JSON.parse(JSON.stringify(l))),
        labels: labels.map(l => JSON.parse(JSON.stringify(l))),
        lastSyncTime: Date.now(),
      },
    });
  } catch (error) {
    console.error('Sync fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync data' },
      { status: 500 }
    );
  }
}
