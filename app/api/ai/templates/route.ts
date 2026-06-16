import { NextRequest, NextResponse } from 'next/server';
import { generateTemplateFromDescription, getPresetTemplates, getTemplateSuggestions } from '@/lib/services/template-generator';
import { initDb } from '@/lib/db';
import { getTasks } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, taskType } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const template = generateTemplateFromDescription({ description, taskType });

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'suggestions') {
      // Get AI-powered suggestions based on user's task history
      await initDb();
      const tasks = await getTasks({ limit: 100 });
      const suggestions = getTemplateSuggestions(tasks);
      return NextResponse.json({ data: suggestions });
    }

    // Return preset templates
    const templates = getPresetTemplates();
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}