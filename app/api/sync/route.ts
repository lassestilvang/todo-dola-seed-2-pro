import { initDb, getDb, saveDb } from '@/lib/db';

interface SyncData {
  lists: Array<{ id: string; name: string; emoji?: string; color?: string; isInbox?: boolean; sortOrder?: number; createdAt: number; updatedAt: number }>;
  labels: Array<{ id: string; name: string; emoji?: string; color?: string; createdAt: number; updatedAt: number }>;
  tasks: Array<{ id: string; listId: string; name: string; description?: string; date?: number; deadline?: number; reminder?: number; priority?: string; completed: boolean; completedAt?: number; createdAt: number; updatedAt: number }>;
  subtasks: Array<{ id: string; taskId: string; name: string; completed: boolean; sortOrder: number; createdAt: number; updatedAt: number }>;
  taskLabels: Array<{ taskId: string; labelId: string }>;
  taskHistory: Array<{ id: string; taskId: string; field: string; oldValue?: string; newValue?: string; changedAt: number }>;
  timeEntries: Array<{ id: string; taskId: string; duration: number; description?: string; startedAt: number; createdAt: number }>;
  taskDependencies: Array<{ id: string; taskId: string; dependsOnTaskId: string; createdAt: number }>;
}

// Sync device tracking table
async function createSyncTable(db: ReturnType<typeof getDb>) {
  if (!db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_devices (
      device_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      last_modified INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_sync_devices_modified ON sync_devices(last_modified)');
}

export async function POST(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    await createSyncTable(db);

    const { deviceId, lastModified, data, checksum } = await request.json();

    if (!deviceId || !data) {
      return Response.json({ error: 'deviceId and data are required' }, { status: 400 });
    }

    // Check if there's newer data from another device
    const existing = db.exec(
      'SELECT data, last_modified FROM sync_devices WHERE device_id = ?',
      [deviceId]
    )[0]?.values[0] as [string, number] | undefined;

    if (existing && existing[1] > lastModified) {
      return Response.json({
        conflict: true,
        serverData: JSON.parse(existing[0]),
        serverModified: existing[1],
      });
    }

    const now = Date.now();
    const dataStr = JSON.stringify(data);

    db.exec(
      'INSERT OR REPLACE INTO sync_devices (device_id, data, last_modified, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [deviceId, dataStr, now, now, now]
    );
    saveDb();

    return Response.json({ success: true, lastModified: now });
  } catch (error) {
    console.error('Sync failed:', error);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    await createSyncTable(db);

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const since = searchParams.get('since');

    if (!deviceId) {
      return Response.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const result = db.exec(
      'SELECT data, last_modified FROM sync_devices WHERE device_id = ?',
      [deviceId]
    )[0]?.values[0] as [string, number] | undefined;

    if (result && (!since || result[1] > parseInt(since, 10))) {
      return Response.json({
        data: JSON.parse(result[0]),
        lastModified: result[1],
      });
    }

    return Response.json({ data: null, lastModified: 0 });
  } catch (error) {
    console.error('Sync fetch failed:', error);
    return Response.json({ error: 'Sync fetch failed' }, { status: 500 });
  }
}