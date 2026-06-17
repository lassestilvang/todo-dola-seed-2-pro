import type { Task } from '@/lib/types';

export interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: number;
  maxOccurrences?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number;
  onDay?: number; // For nth weekday of month (e.g., -1 for last Friday)
}

export interface RecurrenceRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  example: string;
}

export const RECURRENCE_RULES: RecurrenceRule[] = [
  {
    id: 'daily',
    name: 'Daily',
    description: 'Repeats every day',
    pattern: 'every {interval} day(s)',
    example: 'every 1 day',
  },
  {
    id: 'weekly',
    name: 'Weekly',
    description: 'Repeats every week on specific days',
    pattern: 'every {interval} week(s) on {days}',
    example: 'every 1 week on Monday, Wednesday, Friday',
  },
  {
    id: 'monthly-date',
    name: 'Monthly by Date',
    description: 'Repeats on the same date each month',
    pattern: 'every {interval} month(s) on the {day}th',
    example: 'every 1 month on the 15th',
  },
  {
    id: 'monthly-weekday',
    name: 'Monthly by Weekday',
    description: 'Repeats on the nth occurrence of a weekday',
    pattern: 'every {interval} month(s) on the {nth} {weekday}',
    example: 'every 1 month on the last Friday',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    description: 'Repeats once a year on the same date',
    pattern: 'every {interval} year(s)',
    example: 'every 1 year',
  },
];

export function parseRecurringConfig(configString: string): RecurringConfig | null {
  const lower = configString.toLowerCase().trim();

  // Daily
  const dailyMatch = lower.match(/every\s+(\d+)\s+day/);
  if (dailyMatch) {
    return { type: 'daily', interval: parseInt(dailyMatch[1], 10) };
  }

  // Weekly
  const weeklyMatch = lower.match(/every\s+(\d+)\s+week.*on\s+(.+)/);
  if (weeklyMatch) {
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const days = weeklyMatch[2].split(/,\s*|\s+and\s+/i).map(d => daysMap[d.trim()]);
    return { type: 'weekly', interval: parseInt(weeklyMatch[1], 10), daysOfWeek: days };
  }

  const weeklySimple = lower.match(/every\s+(\d+)\s+week/);
  if (weeklySimple) {
    return { type: 'weekly', interval: parseInt(weeklySimple[1], 10) };
  }

  // Monthly by date
  const monthlyDateMatch = lower.match(/every\s+(\d+)\s+month.*on the (\d+)th/);
  if (monthlyDateMatch) {
    return {
      type: 'monthly',
      interval: parseInt(monthlyDateMatch[1], 10),
      dayOfMonth: parseInt(monthlyDateMatch[2], 10),
    };
  }

  // Monthly by weekday (nth day)
  const nthDays: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9,
    last: -1,
  };
  const weekdays: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  const monthlyWeekdayMatch = lower.match(/every\s+(\d+)\s+month.*on the\s+(?:the\s+)?(\w+)(?:\s+(\w+))?/);
  if (monthlyWeekdayMatch) {
    const nth = nthDays[monthlyWeekdayMatch[2]] || 1;
    const weekday = weekdays[monthlyWeekdayMatch[3]?.toLowerCase() || 'friday'];
    return {
      type: 'monthly',
      interval: parseInt(monthlyWeekdayMatch[1], 10),
      onDay: nth * 10 + weekday,
    };
  }

  // Yearly
  const yearlyMatch = lower.match(/every\s+(\d+)\s+year/);
  if (yearlyMatch) {
    return { type: 'yearly', interval: parseInt(yearlyMatch[1], 10) };
  }

  return null;
}

export function formatRecurringConfig(config: RecurringConfig): string {
  switch (config.type) {
    case 'daily':
      return `every ${config.interval} day${config.interval !== 1 ? 's' : ''}`;
    case 'weekly':
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        const dayNames = config.daysOfWeek.map(d => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]);
        return `every ${config.interval} week${config.interval !== 1 ? 's' : ''} on ${dayNames.join(', ')}`;
      }
      return `every ${config.interval} week${config.interval !== 1 ? 's' : ''}`;
    case 'monthly':
      if (config.dayOfMonth) {
        return `every ${config.interval} month${config.interval !== 1 ? 's' : ''} on the ${config.dayOfMonth}${getOrdinalSuffix(config.dayOfMonth)}`;
      }
      if (config.onDay) {
        const nth = Math.abs(config.onDay) % 10;
        const weekday = config.onDay % 7;
        const nthNames = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `every ${config.interval} month${config.interval !== 1 ? 's' : ''} on the ${nthNames[nth - 1] || 'last'} ${dayNames[weekday]}`;
      }
      return `every ${config.interval} month${config.interval !== 1 ? 's' : ''}`;
    case 'yearly':
      return `every ${config.interval} year${config.interval !== 1 ? 's' : ''}`;
    default:
      return '';
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function generateRecurringDates(
  startDate: number,
  config: RecurringConfig,
  exceptions: number[] = []
): number[] {
  const dates: number[] = [];
  const exceptionSet = new Set(exceptions);

  let currentDate = new Date(startDate);
  const endDate = config.endDate ? new Date(config.endDate) : null;
  let count = 0;
  const maxOccurrences = config.maxOccurrences || 100;

  while (count < maxOccurrences && (!endDate || currentDate <= endDate)) {
    const timestamp = currentDate.getTime();

    if (!exceptionSet.has(timestamp)) {
      dates.push(timestamp);
    }

    count++;

    // Calculate next occurrence
    switch (config.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + config.interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + config.interval * 7);
        if (config.daysOfWeek && config.daysOfWeek.length > 0) {
          // Find next matching day
          let found = false;
          while (!found && count < maxOccurrences) {
            currentDate.setDate(currentDate.getDate() + 1);
            if (config.daysOfWeek.includes(currentDate.getDay())) {
              found = true;
            }
          }
        }
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + config.interval);
        if (config.dayOfMonth) {
          currentDate.setDate(Math.min(config.dayOfMonth, 28));
        }
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + config.interval);
        break;
    }
  }

  return dates;
}