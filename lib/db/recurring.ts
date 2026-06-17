import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { RecurringCompletion } from '../types';

interface RecurringException {
  id: string;
  parentTaskId: string;
  exceptionDate: number;
  createdAt: number;
}

export async function getRecurringExceptions(parentTaskId: string): Promise<number[]> {
  await initDb();
  const rows = runQuery(
    'SELECT exception_date FROM recurring_exceptions WHERE parent_taskId = ?',
    [parentTaskId]
  ) as { exception_date: number }[];
  return rows.map(r => r.exception_date);
}

export async function addRecurringException(parentTaskId: string, exceptionDate: number): Promise<RecurringException> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO recurring_exceptions (id, parent_taskId, exception_date, created_at) VALUES (?, ?, ?, ?)',
    [id, parentTaskId, exceptionDate, nowVal]
  );
  saveDb();

  return { id, parentTaskId, exceptionDate, createdAt: nowVal };
}

export async function removeRecurringException(parentTaskId: string, exceptionDate: number): Promise<boolean> {
  await initDb();
  runQuery(
    'DELETE FROM recurring_exceptions WHERE parent_taskId = ? AND exception_date = ?',
    [parentTaskId, exceptionDate]
  );
  saveDb();
  return true;
}

export async function generateRecurringTasks(taskId: string): Promise<any[]> {
  const { getTaskById, createTask } = await import('./tasks');
  await initDb();
  const task = await getTaskById(taskId);
  if (!task || !task.recurringType || !task.recurringConfig) return [];

  const config = JSON.parse(task.recurringConfig);
  const newTasks: any[] = [];

  const exceptions = await getRecurringExceptions(taskId);
  const exceptionSet = new Set(exceptions);

  let currentDate = task.date ? new Date(task.date) : new Date();
  const endDate = config.endDate ? new Date(config.endDate) : null;
  let occurrences = 0;
  const maxOccurrences = config.maxOccurrences || 100;

  while (occurrences < maxOccurrences && (!endDate || currentDate <= endDate)) {
    const newDate = new Date(currentDate);

    if (config.type === 'daily') {
      newDate.setDate(newDate.getDate() + config.interval);
    } else if (config.type === 'weekly') {
      if (config.daysOfWeek && config.daysOfWeek.length > 0) {
        let nextDay = new Date(currentDate);
        let found = false;
        while (!found && occurrences < maxOccurrences) {
          nextDay.setDate(nextDay.getDate() + 1);
          if (config.daysOfWeek!.includes(nextDay.getDay())) {
            found = true;
            newDate.setTime(nextDay.getTime());
          }
        }
        if (!found) break;
      } else {
        newDate.setDate(newDate.getDate() + config.interval * 7);
      }
    } else if (config.type === 'monthly') {
      if (config.dayOfMonth) {
        newDate.setDate(config.dayOfMonth);
      } else if (config.onDay) {
        const targetWeek = Math.abs(config.onDay) % 10;
        const targetDay = Math.abs(config.onDay) % 7;
        const isNegative = config.onDay < 0;

        newDate.setDate(1);
        while (newDate.getDay() !== targetDay) {
          newDate.setDate(newDate.getDate() + 1);
        }
        if (targetWeek > 1) {
          newDate.setDate(newDate.getDate() + (targetWeek - 1) * 7);
        }
        if (isNegative) {
          newDate.setMonth(newDate.getMonth() + 1);
          newDate.setDate(0);
          while (newDate.getDay() !== targetDay) {
            newDate.setDate(newDate.getDate() - 1);
          }
        }
      } else {
        newDate.setMonth(newDate.getMonth() + config.interval);
      }
    } else if (config.type === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + config.interval);
    }

    if (endDate && newDate > endDate) break;

    const newTimestamp = newDate.getTime();
    if (!exceptionSet.has(newTimestamp)) {
      const newTask = await createTask({
        name: task.name,
        description: task.description,
        listId: task.listId,
        priority: task.priority,
        date: newTimestamp,
        completed: false,
        recurringType: null,
        recurringConfig: null,
        parentTaskId: task.id,
      });

      newTasks.push(newTask);
    }

    currentDate = newDate;
    occurrences++;
  }

  return newTasks;
}

export async function getRecurringCompletions(parentTaskId: string): Promise<RecurringCompletion[]> {
  await initDb();
  return runQuery(
    'SELECT id, parent_task_id as parentTaskId, completed_at as completedAt, created_at as createdAt FROM recurring_completions WHERE parent_task_id = ? ORDER BY completed_at DESC',
    [parentTaskId]
  ) as unknown as Promise<RecurringCompletion[]>;
}

export async function addRecurringCompletion(parentTaskId: string, completedAt: number): Promise<RecurringCompletion> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO recurring_completions (id, parent_task_id, completed_at, created_at) VALUES (?, ?, ?, ?)',
    [id, parentTaskId, completedAt, nowVal]
  );
  saveDb();

  return { id, parentTaskId, completedAt, createdAt: nowVal };
}

export async function getRecurringCompletionCount(parentTaskId: string, date: number): Promise<number> {
  await initDb();
  const result = runQuery(
    'SELECT COUNT(*) as count FROM recurring_completions WHERE parent_task_id = ? AND completed_at = ?',
    [parentTaskId, date]
  );
  return (result[0]?.count as number) || 0;
}