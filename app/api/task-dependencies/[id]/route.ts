import { initDb, getDb, saveDb } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { id } = await params;

    // Get the dependency details before deleting
    const result = db.exec('SELECT task_id, depends_on_task_id FROM task_dependencies WHERE id = ?', [id]);
    const dependency = result[0]?.values[0];

    if (!dependency) {
      return Response.json({ error: 'Dependency not found' }, { status: 404 });
    }

    db.exec('DELETE FROM task_dependencies WHERE id = ?', [id]);
    saveDb();

    return Response.json({ success: true, deleted: { taskId: dependency[0], dependsOnTaskId: dependency[1] } });
  } catch (error) {
    console.error('Failed to delete dependency:', error);
    return Response.json({ error: 'Failed to delete dependency' }, { status: 500 });
  }
}