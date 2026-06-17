import type { Task } from '@/lib/types';
import { parseNaturalLanguageTask } from '@/lib/utils/ai-suggestions';

export interface EmailImportConfig {
  emailPatterns: {
    subject: RegExp;
    body: RegExp;
  }[];
  labelNames: string[];
  defaultListId: string;
}

export interface ParsedEmail {
  subject: string;
  body: string;
  from: string;
  to: string;
  date: number;
}

const DEFAULT_PATTERNS = [
  {
    subject: /task:?\s*(.+)/i,
    body: /due:?\s*(.+)/i,
  },
  {
    subject: /remind me to:?\s*(.+)/i,
    body: /deadline:?\s*(.+)/i,
  },
];

export function parseEmailToTask(email: ParsedEmail, config: EmailImportConfig): Partial<Task> | null {
  // Try to match patterns
  for (const pattern of config.emailPatterns) {
    const nameMatch = email.subject.match(pattern.subject);
    if (nameMatch) {
      const taskName = nameMatch[1].trim();
      const parsed = parseNaturalLanguageTask(`${taskName} due ${email.body}`);

      return {
        name: parsed.task.name || taskName,
        description: email.body,
        date: parsed.task.date,
        priority: parsed.task.priority,
        labels: config.labelNames.map(name => ({
          id: name,
          name,
          emoji: '',
          color: '#6b7280',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
        listId: config.defaultListId,
      };
    }
  }

  // Default parsing
  const parsed = parseNaturalLanguageTask(email.subject);

  return {
    name: parsed.task.name || email.subject.substring(0, 50),
    description: email.body,
    date: parsed.task.date,
    priority: parsed.task.priority,
    listId: config.defaultListId,
  };
}

export function parseEmailBatch(emails: ParsedEmail[], config: EmailImportConfig): Partial<Task>[] {
  const tasks: Partial<Task>[] = [];

  for (const email of emails) {
    const task = parseEmailToTask(email, config);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

// Example usage for IMAP integration
export async function fetchEmailsFromIMAP(
  host: string,
  port: number,
  user: string,
  password: string,
  folder: string = 'INBOX'
): Promise<ParsedEmail[]> {
  // This would require a proper IMAP library like 'imap' or 'mailparser'
  // For now, return a placeholder
  console.warn('IMAP integration requires the imap package: pnpm add imap');
  return [];
}