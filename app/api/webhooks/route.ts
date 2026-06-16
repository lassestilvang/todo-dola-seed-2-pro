import { initDb, getDb, saveDb } from '@/lib/db';
import { randomUUID } from 'crypto';

interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
}

// Trigger webhook for an event
export async function triggerWebhook(event: string, data: unknown) {
  await initDb();
  const db = getDb();
  if (!db) return;

  const result = db.exec(
    "SELECT config FROM integrations WHERE type = 'webhook' AND enabled = 1"
  );

  if (result.length === 0) return;

  const rows = result[0].values as unknown[][];
  for (const row of rows) {
    try {
      const config: WebhookConfig = JSON.parse(row[0] as string);
      if (config.events.includes(event)) {
        await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': config.secret,
          },
          body: JSON.stringify({ event, data, timestamp: Date.now() }),
        });
      }
    } catch (error) {
      console.error('Webhook failed:', error);
    }
  }
}

export async function GET() {
  await initDb();
  const db = getDb();
  if (!db) {
    return Response.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const result = db.exec(
    "SELECT id, config, enabled, created_at as createdAt, updated_at as updatedAt FROM integrations WHERE type = 'webhook'"
  );

  if (result.length === 0) {
    return Response.json({ data: { webhooks: [] } });
  }

  const columns = result[0].columns;
  const rows = result[0].values as unknown[][];
  const webhooks = rows.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    // Parse config JSON
    if (typeof obj.config === 'string') {
      obj.config = JSON.parse(obj.config as string);
    }
    return obj;
  });

  return Response.json({ data: { webhooks } });
}

export async function POST(request: Request) {
  await initDb();
  const db = getDb();
  if (!db) {
    return Response.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const body = await request.json();
  const { url, events } = body;

  if (!url || !events) {
    return Response.json({ error: 'url and events required' }, { status: 400 });
  }

  const id = randomUUID();
  const secret = Math.random().toString(36).substr(2, 24);
  const now = Date.now();
  const config = JSON.stringify({ url, events, secret });

  db.exec(
    'INSERT INTO integrations (id, type, config, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, 'webhook', config, 1, now, now]
  );
  saveDb();

  return Response.json({ data: { id, url, events, secret, enabled: true, createdAt: now } }, { status: 201 });
}

// API endpoint for Zapier/Make integration
export async function PATCH(request: Request) {
  const body = await request.json();
  const { action, taskId, status } = body;

  if (!action) {
    return Response.json({ error: 'action required' }, { status: 400 });
  }

  if (action === 'complete' && taskId) {
    await triggerWebhook('task.completed', { taskId });
  }

  if (action === 'create' && body.task) {
    await triggerWebhook('task.created', body.task);
  }

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  await initDb();
  const db = getDb();
  if (!db) {
    return Response.json({ error: 'Database not initialized' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'webhook id required' }, { status: 400 });
  }

  db.exec('DELETE FROM integrations WHERE id = ?', [id]);
  saveDb();

  return Response.json({ success: true });
}