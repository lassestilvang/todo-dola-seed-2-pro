import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { runQuery } from '@/lib/db/core';

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query) {
      return NextResponse.json({ data: [] });
    }

    let sql = `
      SELECT id, task_id as taskId, title, content, created_at as createdAt, updated_at as updatedAt
      FROM task_notes
      WHERE (title LIKE ? OR content LIKE ?)
    `;
    const params: unknown[] = [`%${query}%`, `%${query}%`];

    if (taskId) {
      sql += ' AND task_id = ?';
      params.push(taskId);
    }

    sql += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(limit);

    const notes = runQuery(sql, params) as Array<{
      id: string;
      taskId: string;
      title: string | null;
      content: string;
      createdAt: number;
      updatedAt: number;
    }>;

    return NextResponse.json({
      data: notes.map(note => ({
        id: note.id,
        taskId: note.taskId,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Note search error:', error);
    return NextResponse.json(
      { error: 'Failed to search notes' },
      { status: 500 }
    );
  }
}