import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

export interface TemplateVariableContext {
  username?: string;
  project?: string;
  listName?: string;
  date?: string;
  taskName?: string;
  [key: string]: string | undefined;
}

// Parse template variables from a string
export function parseTemplateVariables(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }

  return variables;
}

// Evaluate a template variable expression
export function evaluateVariable(expression: string, context: TemplateVariableContext = {}): string {
  const trimmed = expression.trim();

  // Simple variable lookup
  if (trimmed in context) {
    return context[trimmed] ?? '';
  }

  // Date expressions: date+3d, date-2d, date+1w, etc.
  const dateMatch = trimmed.match(/^date([+-])(\d+)([dwmy])$/);
  if (dateMatch) {
    const [, operator, amount, unit] = dateMatch;
    const days = operator === '+' ? parseInt(amount) : operator === '-' ? -parseInt(amount) : 0;

    let date: Date;
    if (trimmed === 'date') {
      date = new Date();
    } else {
      date = addDays(new Date(), days);
    }

    return format(date, 'yyyy-MM-dd');
  }

  // Date with format: date+3d:MMM d
  const dateFormatMatch = trimmed.match(/^date([+-])?(\d+)?([dwmy])?:?(.+)$/);
  if (dateFormatMatch) {
    const [, operator = '', amount = '0', unit = 'd', dateFormat = 'MMM d'] = dateFormatMatch;
    const days = operator === '+' ? parseInt(amount) : operator === '-' ? -parseInt(amount) : 0;
    const date = addDays(new Date(), days);
    return format(date, dateFormat as string);
  }

  // Username
  if (trimmed === 'username') {
    return context.username || 'User';
  }

  // Project
  if (trimmed === 'project') {
    return context.project || 'Task';
  }

  // List name
  if (trimmed === 'listName') {
    return context.listName || 'Inbox';
  }

  // Task name
  if (trimmed === 'taskName') {
    return context.taskName || '';
  }

  // Time expressions
  const timeMatch = trimmed.match(/^now:([Hh]h?[m]?)$/);
  if (timeMatch) {
    const formatStr = timeMatch[1];
    return format(new Date(), formatStr.toUpperCase());
  }

  return '';
}

// Replace template variables in a string
export function replaceTemplateVariables(
  template: string,
  context: TemplateVariableContext = {}
): string {
  return template.replace(/\{([^}]+)\}/g, (match, expression) => {
    return evaluateVariable(expression, context);
  });
}

// Get all variables used in a template
export function getTemplateVariables(template: string): TemplateVariableContext {
  const variables = parseTemplateVariables(template);
  const result: TemplateVariableContext = {};

  for (const variable of variables) {
    result[variable] = evaluateVariable(variable);
  }

  return result;
}