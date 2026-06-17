import type { Task, Priority } from '@/lib/types';

interface ParsedTask {
  name: string;
  description: string | null;
  date: number | null;
  deadline: number | null;
  priority: Priority;
  listId: string;
  recurringType?: string | null;
  recurringConfig?: string | null;
}

interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
  maxOccurrences?: number;
}

const priorityKeywords: Record<string, Priority> = {
  'high': 'high',
  'urgent': 'high',
  'critical': 'high',
  'important': 'high',
  'medium': 'medium',
  'normal': 'medium',
  'low': 'low',
  'minor': 'low',
  'none': 'none',
};

const listKeywords: Record<string, string> = {
  'work': 'work',
  'personal': 'personal',
  'shopping': 'shopping',
  'health': 'health',
};

const timeExpressions: Record<string, number> = {
  'morning': 8 * 60,
  'afternoon': 14 * 60,
  'evening': 18 * 60,
  'night': 21 * 60,
  'now': 0,
};

export function parseNaturalLanguage(input: string, defaultListId: string = 'inbox'): ParsedTask {
  let name = input;
  let description: string | null = null;
  let date: number | null = null;
  let deadline: number | null = null;
  let priority: Priority = 'none';
  let listId = defaultListId;
  let recurringType: string | null = null;
  let recurringConfig: string | null = null;

  const lowerInput = input.toLowerCase();

  // Extract priority
  for (const [keyword, prio] of Object.entries(priorityKeywords)) {
    if (lowerInput.includes(keyword)) {
      priority = prio;
      break;
    }
  }

  // Extract list context
  for (const [keyword, list] of Object.entries(listKeywords)) {
    if (lowerInput.includes(keyword)) {
      listId = list;
      break;
    }
  }

  // Extract time expressions
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Handle "today", "tomorrow", "yesterday"
  if (lowerInput.includes('today')) {
    date = now.getTime();
  } else if (lowerInput.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow.getTime();
  } else if (lowerInput.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    date = yesterday.getTime();
  }

  // Handle "today at X" or "tomorrow at X"
  const timeMatch = lowerInput.match(/at (\w+)/);
  if (timeMatch) {
    const timeStr = timeMatch[1];
    const minutes = timeExpressions[timeStr];
    if (minutes !== undefined && date) {
      const dateObj = new Date(date);
      dateObj.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      date = dateObj.getTime();
    }
  }

  // Handle specific dates like "June 15th" or "15/6"
  const dateMatch = input.match(/(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s+at\s+\w+)?/i);
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1]);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate.getTime();
    }
  }

  // Handle day of week (e.g., "every Monday")
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = lowerInput.match(/every\s+(\w+)|next\s+(\w+)|this\s+(\w+)/);
  if (dayMatch) {
    const dayStr = (dayMatch[1] || dayMatch[2] || dayMatch[3])?.toLowerCase();
    const dayIndex = dayNames.indexOf(dayStr);
    if (dayIndex !== -1) {
      const daysUntil = (dayIndex - now.getDay() + 7) % 7;
      const nextDay = new Date(now);
      nextDay.setDate(now.getDate() + (daysUntil === 0 ? 7 : daysUntil));
      date = nextDay.getTime();
    }
  }

  // Extract "by X" or "due X" for deadline
  const deadlineMatch = lowerInput.match(/(?:by|due|deadline)\s+(?:on\s+)?(\w+(?:\s+\d{1,2})?|tomorrow|today)/i);
  if (deadlineMatch) {
    const parsedDeadline = new Date(deadlineMatch[1]);
    if (!isNaN(parsedDeadline.getTime())) {
      deadline = parsedDeadline.getTime();
    } else if (deadlineMatch[1] === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      deadline = tomorrow.getTime();
    }
  }

  // Extract "for X" or "about X" as description
  const descMatch = lowerInput.match(/(?:for|about|regarding)\s+(.+?)(?:\s+(?:due|by|at)\s+|\s*$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // Handle recurring patterns
  const recurringMatch = lowerInput.match(/every\s+(\w+)|(daily|weekly|monthly|yearly)/);
  if (recurringMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const matchedDay = recurringMatch[1]?.toLowerCase();

    if (recurringMatch[2]) {
      // Direct type like "daily", "weekly"
      recurringType = recurringMatch[2];
      recurringConfig = JSON.stringify({ type: recurringType as 'daily' | 'weekly' | 'monthly' | 'yearly', interval: 1 });
    } else if (matchedDay && dayNames.includes(matchedDay)) {
      recurringType = 'weekly';
      recurringConfig = JSON.stringify({ type: 'weekly', interval: 1 });
    }
  }

  // Handle "every N days/weeks/months"
  const intervalMatch = lowerInput.match(/every\s+(\d+)\s+(day|week|month|year)s?/);
  if (intervalMatch && recurringType) {
    const config: RecurringConfig = JSON.parse(recurringConfig!);
    config.interval = parseInt(intervalMatch[1], 10);
    recurringConfig = JSON.stringify(config);
  }

  // Handle "until X" or "for N occurrences"
  const untilMatch = lowerInput.match(/until\s+(.+?)(?:\s|$)/i);
  if (untilMatch && recurringConfig) {
    const config: RecurringConfig = JSON.parse(recurringConfig);
    const untilDate = new Date(untilMatch[1]);
    if (!isNaN(untilDate.getTime())) {
      config.endDate = untilDate.getTime();
      recurringConfig = JSON.stringify(config);
    }
  }

  const timesMatch = lowerInput.match(/(\d+)\s+times|for\s+(\d+)\s+occurrences/i);
  if (timesMatch && recurringConfig) {
    const config: RecurringConfig = JSON.parse(recurringConfig);
    config.maxOccurrences = parseInt(timesMatch[1] || timesMatch[2], 10);
    recurringConfig = JSON.stringify(config);
  }

  // Clean up the name by removing extracted parts
  name = input
    .replace(/(?:today|tomorrow|yesterday|on\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?)/gi, '')
    .replace(/(?:at\s+\w+)/gi, '')
    .replace(/(?:by|due|deadline)\s+(?:on\s+)?\w+(?:\s+\d{1,2})?/gi, '')
    .replace(/(?:for|about|regarding)\s+.+$/i, '')
    .replace(/(?:every\s+\w+|daily|weekly|monthly|yearly|until\s+.+?|for\s+\d+)/gi, '')
    .replace(/\b(high|urgent|critical|important|medium|normal|low|minor|none)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) {
    name = input;
  }

  return {
    name,
    description: description || null,
    date,
    deadline,
    priority,
    listId,
    recurringType,
    recurringConfig,
  };
}

export function formatParsedTask(task: ParsedTask): string {
  const parts: string[] = [];

  parts.push(task.name);

  if (task.date) {
    const dateStr = new Date(task.date).toLocaleDateString();
    parts.push(`on ${dateStr}`);
  }

  if (task.priority !== 'none') {
    parts.push(`[${task.priority} priority]`);
  }

  if (task.description) {
    parts.push(`- ${task.description}`);
  }

  return parts.join(' ');
}