import { initDb } from '@/lib/db';
import { CRDTStore } from '@/lib/utils/crdt';

// In-memory store for collaboration (use Redis in production)
const stores = new Map<string, CRDTStore>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return Response.json({ error: 'taskId required' }, { status: 400 });
  }

  // Get or create store for this task
  let store = stores.get(taskId);
  if (!store) {
    store = new CRDTStore(`client_${Date.now()}`);
    stores.set(taskId, store);
  }

  const operations = store.getOperations();
  return Response.json({ data: { operations } });
}

export async function POST(request: Request) {
  await initDb();
  const body = await request.json();
  const { taskId, operation } = body;

  if (!taskId || !operation) {
    return Response.json({ error: 'taskId and operation required' }, { status: 400 });
  }

  let store = stores.get(taskId);
  if (!store) {
    store = new CRDTStore(`client_${Date.now()}`);
    stores.set(taskId, store);
  }

  store.addOperation(operation);

  return Response.json({ data: { success: true, operation } });
}