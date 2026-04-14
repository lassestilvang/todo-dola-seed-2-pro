import db from '@/lib/db';
import { getTasks, createTask } from '@/lib/db/queries';

export async function GET() {
  const lists = db.prepare('SELECT id, name, emoji, color, is_inbox as isInbox FROM lists ORDER BY is_inbox DESC, name').all();
  return Response.json(lists);
}

export async function POST(request: Request) {
  const data = await request.json();
  const list = createTask(data);
  return Response.json(list, { status: 201 });
}