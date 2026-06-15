import { initDb, saveDb } from '@/lib/db';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

const uploadDir = join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

export async function POST(request: Request) {
  try {
    await initDb();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string;

    if (!file || !taskId) {
      return Response.json({ error: 'File and taskId are required' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${randomUUID()}.${extension}`;
    const filepath = join(uploadDir, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filepath, buffer);

    // Update task with attachment path
    const db = getDb();
    if (db) {
      db.exec('UPDATE tasks SET attachment_path = ? WHERE id = ?', [filename, taskId]);
      saveDb();
    }

    return Response.json({ data: { filename, path: `/uploads/${filename}`, size: file.size } });
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    return Response.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return Response.json({ error: 'Filename is required' }, { status: 400 });
    }

    const filepath = join(uploadDir, filename);

    // Delete file from filesystem
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }

    // Clear attachment path from task
    await initDb();
    const db = getDb();
    if (db) {
      db.exec('UPDATE tasks SET attachment_path = NULL WHERE attachment_path = ?', [filename]);
      saveDb();
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return Response.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      // List all files
      const files = readdirSync(uploadDir).map(name => ({
        name,
        path: `/uploads/${name}`,
      }));
      return Response.json({ data: files });
    }

    const filepath = join(uploadDir, filename);

    if (!existsSync(filepath)) {
      return new Response(null, { status: 404 });
    }

    const file = readFileSync(filepath);
    return new Response(file);
  } catch (error) {
    console.error('Failed to get attachment:', error);
    return Response.json({ error: 'Failed to get attachment' }, { status: 500 });
  }
}