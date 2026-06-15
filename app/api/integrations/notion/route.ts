import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';
import { syncTaskToNotion, fetchNotionTasks } from '@/lib/utils/notion-sync';
import type { Task } from '@/lib/types';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const result = db.exec('SELECT config FROM integrations WHERE type = \'notion\' AND enabled = 1');
  if (result.length === 0) {
    return NextResponse.json({ data: null });
  }

  const config = JSON.parse(String(result[0].values[0][0]));
  return NextResponse.json({ data: config });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { apiKey, databaseId, action, task } = body;

  if (!apiKey || !databaseId) {
    return NextResponse.json({ error: 'apiKey and databaseId are required' }, { status: 400 });
  }

  const config: NotionConfig = { apiKey, databaseId, enabled: true };

  try {
    if (action === 'sync' && task) {
      const pageId = await syncTaskToNotion(task as Task, config);
      return NextResponse.json({ success: true, pageId });
    }

    const db = getDb();
    if (db) {
      db.exec(
        'INSERT OR REPLACE INTO integrations (type, config, enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
        ['notion', JSON.stringify(config), Date.now(), Date.now()]
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save Notion config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  db.exec('DELETE FROM integrations WHERE type = \'notion\'');
  return NextResponse.json({ success: true });
}