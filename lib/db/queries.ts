import db from './index';
import { randomUUID } from 'crypto';
import type { Task, TaskList, Label, Subtask, TaskHistoryEntry, Priority } from '../types';

// Lists
export function getLists(): TaskList[] {
  return db.prepare('SELECT id, name, emoji, color, is_inbox as isInbox, created_at as createdAt, updated_at as updatedAt FROM lists ORDER BY is_inbox DESC, name').all() as TaskList[];
}

export function createList(data: Partial<TaskList>): TaskList {
  const id = randomUUID();
  const now = Date.now();
  const list = { id, createdAt: now, updatedAt: now, ...data };
  
  db.prepare(`
    INSERT INTO lists (id, name, emoji, color, is_inbox, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.emoji, data.color, data.isInbox ? 1 : 0, now, now);
  
  return list as TaskList;
}

// Labels
export function getLabels(): Label[] {
  return db.prepare('SELECT id, name, emoji, color, created_at as createdAt, updated_at as updatedAt FROM labels ORDER BY name').all() as Label[];
}

// Tasks
export function getTasks(filter: { listId?: string, view?: 'today' | 'next7' | 'upcoming' | 'all', completed?: boolean } = {}): Task[] {
  let query = `
    SELECT t.*,
      json_group_array(DISTINCT json_object('id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color)) as labels,
      json_group_array(DISTINCT json_object('id', s.id, 'name', s.name, 'completed', s.completed)) as subtasks
    FROM tasks t
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    LEFT JOIN subtasks s ON t.id = s.task_id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (filter.listId) {
    query += ' AND t.list_id = ?';
    params.push(filter.listId);
  }
  
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (filter.view === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query += ' AND t.date >= ? AND t.date < ?';
    params.push(today.getTime(), tomorrow.getTime());
  } else if (filter.view === 'next7') {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    query += ' AND t.date >= ? AND t.date < ?';
    params.push(today.getTime(), weekEnd.getTime());
  } else if (filter.view === 'upcoming') {
    query += ' AND t.date >= ?';
    params.push(today.getTime());
  }
  
  if (filter.completed !== undefined) {
    query += ' AND t.completed = ?';
    params.push(filter.completed ? 1 : 0);
  }
  
  query += ' GROUP BY t.id ORDER BY t.date IS NULL, t.date, t.created_at DESC';
  
  return db.prepare(query).all(...params).map((row: any) => ({
    ...row,
    completed: Boolean(row.completed),
    labels: JSON.parse(row.labels).filter((l: any) => l.id),
    subtasks: JSON.parse(row.subtasks).filter((s: any) => s.id).map((s: any) => ({ ...s, completed: Boolean(s.completed) })),
  })) as Task[];
}

export function createTask(data: Partial<Task>): Task {
  const id = randomUUID();
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.listId || 'inbox',
    data.name,
    data.description,
    data.date,
    data.deadline,
    data.reminder,
    data.estimate,
    data.actualTime,
    data.priority || 'none',
    now,
    now
  );
  
  return { id, createdAt: now, updatedAt: now, ...data } as Task;
}

export function logTaskChange(taskId: string, field: string, oldValue: any, newValue: any) {
  db.prepare(`
    INSERT INTO task_history (id, task_id, field, old_value, new_value, changed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), taskId, field, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, Date.now());
}
