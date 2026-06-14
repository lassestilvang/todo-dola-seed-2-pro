import type { Task, TaskList, Label, Subtask, TaskTemplate, CustomView, TaskDependency, Comment, TaskNote } from '@/lib/types';
import { randomUUID } from 'crypto';

let idCounter = 0;

function generateId(): string {
  return `test-${++idCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createMockTask(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: generateId(),
    listId: 'inbox',
    name: 'Test Task',
    description: null,
    date: null,
    deadline: null,
    reminder: null,
    estimate: null,
    actualTime: null,
    priority: 'none',
    completed: false,
    completedAt: null,
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    labels: [],
    subtasks: [],
    ...overrides,
  };
}

export function createMockList(overrides: Partial<TaskList> = {}): TaskList {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Test List',
    emoji: '📋',
    color: '#3b82f6',
    isInbox: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockLabel(overrides: Partial<Label> = {}): Label {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Test Label',
    emoji: '🏷️',
    color: '#3b82f6',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockSubtask(overrides: Partial<Subtask> = {}): Subtask {
  const now = Date.now();
  return {
    id: generateId(),
    taskId: generateId(),
    name: 'Test Subtask',
    completed: false,
    completedAt: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockTaskWithRelations(overrides: Partial<Task> & { labels?: Label[]; subtasks?: Subtask[] } = {}): Task {
  const { labels, subtasks, ...taskOverrides } = overrides;
  const now = Date.now();
  const task = createMockTask(taskOverrides);

  if (labels) {
    task.labels = labels.map(l => ({
      id: l.id,
      name: l.name,
      emoji: l.emoji || '🏷️',
      color: l.color || '#3b82f6',
      createdAt: l.createdAt || now,
      updatedAt: l.updatedAt || now,
    }));
  }

  if (subtasks) {
    task.subtasks = subtasks.map(s => ({ ...s, taskId: task.id }));
  }

  return task;
}

export function createMockTemplate(overrides: Partial<TaskTemplate> = {}): TaskTemplate {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Test Template',
    description: null,
    listId: 'inbox',
    priority: 'none',
    labels: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockCustomView(overrides: Partial<CustomView> = {}): CustomView {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Test View',
    icon: '📋',
    filterConfig: '{}',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockDependency(overrides: Partial<TaskDependency> = {}): TaskDependency {
  const now = Date.now();
  return {
    id: generateId(),
    taskId: generateId(),
    dependsOnTaskId: generateId(),
    createdAt: now,
    ...overrides,
  };
}

export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  const now = Date.now();
  return {
    id: generateId(),
    taskId: generateId(),
    author: 'Test User',
    content: 'Test comment',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockTaskNote(overrides: Partial<TaskNote> = {}): TaskNote {
  const now = Date.now();
  return {
    id: generateId(),
    taskId: generateId(),
    title: 'Test Note',
    content: 'Note content',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function resetIdCounter() {
  idCounter = 0;
}

export function createUniqueTask(overrides: Partial<Task> = {}): Task {
  return createMockTask({
    name: `Task-${randomUUID().slice(0, 8)}`,
    ...overrides,
  });
}

export function createTaskWithAllFields(overrides: Partial<Task> = {}): Task {
  const now = Date.now();
  return {
    id: generateId(),
    listId: 'inbox',
    name: 'Complete Task',
    description: 'Full description with all fields populated',
    date: now,
    deadline: now + 86400000,
    reminder: now + 3600000,
    estimate: 30,
    actualTime: 15,
    priority: 'high',
    completed: false,
    completedAt: null,
    recurringType: null,
    recurringConfig: null,
    attachmentPath: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    labels: [],
    subtasks: [],
    ...overrides,
  };
}