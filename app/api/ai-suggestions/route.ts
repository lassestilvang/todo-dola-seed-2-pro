import {
  getTaskSuggestions,
  generateTaskFromPrompt,
  parseNaturalLanguageTask,
} from '@/lib/utils/ai-suggestions';

export async function POST(request: Request) {
  try {
    const { taskName, description, prompt } = await request.json();

    if (prompt) {
      const parsed = parseNaturalLanguageTask(prompt);
      return Response.json({
        data: {
          task: parsed.task,
          confidence: parsed.confidence,
          warnings: parsed.warnings,
        },
      });
    }

    if (!taskName) {
      return Response.json({ error: 'taskName is required' }, { status: 400 });
    }

    const suggestions = getTaskSuggestions(taskName, description);
    return Response.json({ data: { suggestions } });
  } catch (error) {
    console.error('Failed to get AI suggestions:', error);
    return Response.json({ error: 'Failed to get suggestions' }, { status: 500 });
  }
}