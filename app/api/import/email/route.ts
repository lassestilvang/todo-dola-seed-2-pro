import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { createTask } from '@/lib/db/queries';
import { parseEmailBatch, type ParsedEmail, type EmailImportConfig } from '@/lib/services/email-parser';

const DEFAULT_CONFIG: EmailImportConfig = {
  emailPatterns: [
    {
      subject: /task:?\s*(.+)/i,
      body: /due:?\s*(.+)/i,
    },
    {
      subject: /remind me to:?\s*(.+)/i,
      body: /deadline:?\s*(.+)/i,
    },
  ],
  labelNames: ['email-import'],
  defaultListId: 'inbox',
};

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { emails, config = DEFAULT_CONFIG } = body;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Emails array is required' },
        { status: 400 }
      );
    }

    const tasks = parseEmailBatch(emails as ParsedEmail[], config);
    const createdTasks = [];

    for (const task of tasks) {
      const created = await createTask(task);
      createdTasks.push(created);
    }

    return NextResponse.json({
      data: {
        imported: createdTasks.length,
        tasks: createdTasks,
      },
    });
  } catch (error) {
    console.error('Email import error:', error);
    return NextResponse.json(
      { error: 'Failed to import emails' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    data: {
      message: 'Email import endpoint',
      usage: 'POST with { emails: ParsedEmail[], config?: EmailImportConfig }',
    },
  });
}