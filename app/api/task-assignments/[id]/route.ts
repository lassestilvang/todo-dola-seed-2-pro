import { NextRequest, NextResponse } from 'next/server';
import { initDb, saveDb } from '@/lib/db';
import { updateTaskAssignment, deleteTaskAssignment } from '@/lib/db/task-assignments';

export async function PATCH(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const assignment = await updateTaskAssignment(id, body);
  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  saveDb();
  return NextResponse.json({ data: assignment });
}

export async function DELETE(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await deleteTaskAssignment(id);
  saveDb();
  return NextResponse.json({ success: true });
}