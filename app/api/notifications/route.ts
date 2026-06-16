import { NextRequest, NextResponse } from 'next/server';
import { initDb, saveDb } from '@/lib/db';
import { getNotifications, createNotification, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const taskId = searchParams.get('taskId');

  const notifications = await getNotifications(userId || undefined, taskId || undefined);
  return NextResponse.json({ data: notifications });
}

export async function POST(request: NextRequest) {
  await initDb();
  const body = await request.json();

  const notification = await createNotification(body);
  saveDb();

  return NextResponse.json({ data: notification }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!id) {
    return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
  }

  if (userId) {
    await markAllNotificationsRead(userId);
  } else {
    await markNotificationRead(id);
  }
  saveDb();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
  }

  await deleteNotification(id);
  saveDb();

  return NextResponse.json({ success: true });
}
