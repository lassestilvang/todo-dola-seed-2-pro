import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  enabled: boolean;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const result = db.exec('SELECT config FROM integrations WHERE type = \'slack\' AND enabled = 1');
  if (result.length === 0) {
    return NextResponse.json({ data: null });
  }

  const config = JSON.parse(String(result[0].values[0][0]));
  return NextResponse.json({ data: config });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { webhookUrl, channel } = body;

  if (!webhookUrl) {
    return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    const config: SlackConfig = { webhookUrl, channel: channel || '#tasks', enabled: true };
    db.exec(
      'INSERT OR REPLACE INTO integrations (type, config, enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
      ['slack', JSON.stringify(config), Date.now(), Date.now()]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save Slack config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  db.exec('DELETE FROM integrations WHERE type = \'slack\'');
  return NextResponse.json({ success: true });
}