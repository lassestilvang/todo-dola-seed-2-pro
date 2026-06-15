import { initDb, exportDb, importDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const data = await exportDb();
    return Response.json({ data });
  } catch (error) {
    console.error('Export failed:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();

    if (!body.version || !body.data) {
      return Response.json({ error: 'Invalid export format' }, { status: 400 });
    }

    await importDb(body);
    return Response.json({ data: {success: true, message: 'Data imported successfully'} });
  } catch (error) {
    console.error('Import failed:', error);
    return Response.json({ error: 'Import failed' }, { status: 500 });
  }
}