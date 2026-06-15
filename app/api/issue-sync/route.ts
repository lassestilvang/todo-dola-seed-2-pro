import { initDb } from '@/lib/db';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { taskId, provider, token, owner, repo, projectId } = body;

    if (!taskId || !provider || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Import the sync functions
    const { syncWithGitHub, syncWithGitLab } = await import('@/lib/utils/issue-sync');

    const taskRes = await fetch(`/api/tasks/${taskId}`);
    if (!taskRes.ok) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = await taskRes.json();

    let syncRecord;
    if (provider === 'github') {
      syncRecord = await syncWithGitHub(task, token, owner, repo);
    } else if (provider === 'gitlab') {
      syncRecord = await syncWithGitLab(task, token, projectId);
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    return Response.json({ data: syncRecord });
  } catch (error) {
    console.error('Issue sync failed:', error);
    return Response.json({ error: 'Failed to sync with issue tracker' }, { status: 500 });
  }
}