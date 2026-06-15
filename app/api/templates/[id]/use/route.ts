import { initDb } from '@/lib/db';
import { useTemplate, getTemplateById } from '@/lib/db/queries';
import { processTemplateVariables } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();

    // Get template to process variables
    const template = await getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Process template variables in name and description
    const variables = body.variables || {};
    const processedName = processTemplateVariables(template.name, variables);
    const processedDescription = template.description
      ? processTemplateVariables(template.description, variables)
      : null;

    const task = await useTemplate(id, {
      name: processedName,
      description: processedDescription,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Failed to use template:', error);
    return NextResponse.json({ error: 'Failed to use template' }, { status: 500 });
  }
};