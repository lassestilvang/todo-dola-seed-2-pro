export type Priority = 'high' | 'medium' | 'low' | 'none';

export interface TaskList {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isInbox: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Label {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  completed: boolean;
  completedAt: number | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  listId: string;
  name: string;
  description: string | null;
  date: number | null;
  deadline: number | null;
  reminder: number | null;
  estimate: number | null;
  actualTime: number | null;
  priority: Priority;
  completed: boolean;
  completedAt: number | null;
  recurringType: string | null;
  recurringConfig: string | null;
  attachmentPath: string | null;
  createdAt: number;
  updatedAt: number;
  labels?: Label[];
  subtasks?: Subtask[];
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: number;
}
