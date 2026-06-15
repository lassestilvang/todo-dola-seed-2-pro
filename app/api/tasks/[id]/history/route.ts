import { initDb } from '@/lib/db';
import { getTaskHistory } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    const history = await getTaskHistory(id);
    return Response.json({ data: history });
  } catch (error) {
    console.error('Failed to fetch task history:', error);
    return Response.json({ error: 'Failed to fetch task history' }, { status: 500 });
  }
}