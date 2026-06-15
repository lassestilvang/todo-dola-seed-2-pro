import { initDb } from '@/lib/db';
import { getCustomViews, createCustomView } from '@/lib/db/queries';

export async function GET() {
  try {
    await initDb();
    const views = await getCustomViews();
    return Response.json({ data: views });
  } catch (error) {
    console.error('Failed to fetch custom views:', error);
    return Response.json({ error: 'Failed to fetch custom views' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    if (!body.name || !body.filterConfig) {
      return Response.json({ error: 'name and filterConfig are required' }, { status: 400 });
    }

    const view = await createCustomView({
      name: body.name,
      icon: body.icon || '📋',
      filterConfig: body.filterConfig,
      isDefault: body.isDefault || false,
    });

    return Response.json({ data: view }, { status: 201 });
  } catch (error) {
    console.error('Failed to create custom view:', error);
    return Response.json({ error: 'Failed to create custom view' }, { status: 500 });
  }
}