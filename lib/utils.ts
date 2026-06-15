import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Template Variable Processing
export interface TemplateVariables {
  username?: string;
  project?: string;
  listName?: string;
  date?: Date;
  dateTime?: Date;
}

export function processTemplateVariables(text: string, vars: TemplateVariables = {}): string {
  if (!text) return text;

  const now = vars.date || vars.dateTime || new Date();

  return text
    // Replace {username}
    .replace(/\{username\}/g, vars.username || 'User')
    // Replace {project}
    .replace(/\{project\}/g, vars.project || 'Project')
    // Replace {listName}
    .replace(/\{listName\}/g, vars.listName || 'Tasks')
    // Replace dynamic date variables
    .replace(/\{date\}/g, format(now, 'yyyy-MM-dd'))
    .replace(/\{date\+(\d+d)\}/g, (_, days: string) => {
      const d = parseInt(days);
      return format(addDays(now, d), 'yyyy-MM-dd');
    })
    .replace(/\{date\+(\d+w)\}/g, (_, weeks: string) => {
      const w = parseInt(weeks);
      return format(addWeeks(now, w), 'yyyy-MM-dd');
    })
    .replace(/\{date\+(\d+m)\}/g, (_, months: string) => {
      const m = parseInt(months);
      return format(addMonths(now, m), 'yyyy-MM-dd');
    })
    .replace(/\{date\+(\d+y)\}/g, (_, years: string) => {
      const y = parseInt(years);
      return format(addYears(now, y), 'yyyy-MM-dd');
    })
    // Replace time variables
    .replace(/\{time\}/g, format(now, 'HH:mm'))
    .replace(/\{time\+(\d+d)\}/g, (_, days: string) => {
      const d = addDays(now, parseInt(days));
      return format(d, 'HH:mm');
    });
}

// Parse template variables from template text
export function extractTemplateVariables(text: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = new Set<string>();
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }

  return Array.from(matches);
}

// Check if text contains template variables
export function hasTemplateVariables(text: string): boolean {
  return /\{[^}]+\}/.test(text);
}