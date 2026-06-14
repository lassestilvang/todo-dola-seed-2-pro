import type { Task, Priority } from '@/lib/types';

interface Suggestion {
  field: 'date' | 'priority' | 'name' | 'description';
  value: unknown;
  confidence: number;
  reason: string;
}

const PRIORITY_KEYWORDS: Record<string, Priority> = {
  urgent: 'high',
  important: 'high',
  critical: 'high',
  asap: 'high',
  now: 'high',
  later: 'low',
  someday: 'low',
  maybe: 'low',
  quick: 'low',
  small: 'low',
  medium: 'medium',
  normal: 'medium',
};

const TIME_KEYWORDS: Record<string, number> = {
  morning: 8 * 60 * 60 * 1000,
  afternoon: 14 * 60 * 60 * 1000,
  evening: 19 * 60 * 60 * 1000,
  tomorrow: 24 * 60 * 60 * 1000,
  'next week': 7 * 24 * 60 * 60 * 1000,
  'in 2 days': 2 * 24 * 60 * 60 * 1000,
  'in a week': 7 * 24 * 60 * 60 * 1000,
};

export function getTaskSuggestions(taskName: string, description?: string | null): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const text = `${taskName} ${description || ''}`.toLowerCase();

  // Priority suggestion
  for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
    if (text.includes(keyword)) {
      suggestions.push({
        field: 'priority',
        value: priority,
        confidence: 0.8,
        reason: `Contains "${keyword}" keyword`,
      });
      break;
    }
  }

  // Date suggestion
  const now = Date.now();
  for (const [keyword, offset] of Object.entries(TIME_KEYWORDS)) {
    if (text.includes(keyword)) {
      suggestions.push({
        field: 'date',
        value: now + offset,
        confidence: 0.7,
        reason: `Mentioned "${keyword}"`,
      });
      break;
    }
  }

  // Due date patterns
  const dueMatch = text.match(/due\s*(?:on|by)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s*(?:st|nd|rd|th)\s*(?:of)?\s*\w+)/i);
  if (dueMatch) {
    suggestions.push({
      field: 'date',
      value: parseDatePattern(dueMatch[1]),
      confidence: 0.9,
      reason: 'Contains explicit due date',
    });
  }

  // Name cleanup suggestions
  if (text.match(/^\s*(remember|buy|call|email)\s+/i)) {
    suggestions.push({
      field: 'name',
      value: taskName.replace(/^(remember|buy|call|email)\s+/i, ''),
      confidence: 0.6,
      reason: 'Remove redundant prefix',
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function parseDatePattern(pattern: string): number {
  const now = new Date();
  const cleanPattern = pattern.toLowerCase().replace(/[/-]/g, ' ');

  // Try to parse as MM DD YYYY or similar
  const parts = cleanPattern.split(/\s+/);
  if (parts.length >= 2) {
    const [month, day, year] = parts.map(p => parseInt(p, 10));
    if (!isNaN(month) && !isNaN(day)) {
      const fullYear = year || now.getFullYear();
      return new Date(fullYear, month - 1, day).getTime();
    }
  }

  return Date.now() + 24 * 60 * 60 * 1000; // Default to tomorrow
}

export function generateTaskFromPrompt(prompt: string): Partial<Task> {
  const lowerPrompt = prompt.toLowerCase();
  const suggestions = getTaskSuggestions(prompt);

  const task: Partial<Task> = {
    name: prompt.replace(/^(create|add|new|remember)\s+/i, ''),
    priority: 'none',
    date: null,
  };

  for (const suggestion of suggestions) {
    if (suggestion.field === 'priority') {
      task.priority = suggestion.value as Priority;
    } else if (suggestion.field === 'date') {
      task.date = suggestion.value as number;
    } else if (suggestion.field === 'name') {
      task.name = suggestion.value as string;
    }
  }

  return task;
}