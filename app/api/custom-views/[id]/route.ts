import { initDb } from '@/lib/db';
import { getCustomViewById, updateCustomView, deleteCustomView, setDefaultCustomView } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const view = await getCustomViewById(id);
    if (!view) {
      return Response.json({ error: 'Custom view not found' }, { status: 404 });
    }
    return Response.json({ data: view });
  } catch (error) {
    console.error('Failed to fetch custom view:', error);
    return Response.json({ error: 'Failed to fetch custom view' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    const view = await updateCustomView(id, body);
    if (!view) {
      return Response.json({ error: 'Custom view not found' }, { status: 404 });
    }
    return Response.json({ data: view });
  } catch (error) {
    console.error('Failed to update custom view:', error);
    return Response.json({ error: 'Failed to update custom view' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    await deleteCustomView(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete custom view:', error);
    return Response.json({ error: 'Failed to delete custom view' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    await setDefaultCustomView(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to set default view:', error);
    return Response.json({ error: 'Failed to set default view' }, { status: 500 });
  }
}