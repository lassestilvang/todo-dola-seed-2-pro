export type Priority = 'high' | 'medium' | 'low' | 'none';

export type SortOption = 'date' | 'created' | 'priority' | 'name' | 'list';

export interface TaskFilter {
  listId?: string;
  view?: 'today' | 'next7' | 'upcoming' | 'all';
  completed?: boolean;
  priority?: Priority;
  labelId?: string;
  search?: string;
  dueBefore?: number;
  dueAfter?: number;
  hasReminders?: boolean;
  recurring?: boolean;
  limit?: number;
  offset?: number;
  dateFrom?: number;
  dateTo?: number;
  sort?: SortOption;
  sortDirection?: 'asc' | 'desc';
}

export interface TaskList {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isInbox: boolean;
  sortOrder: number;
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
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  labels?: Label[];
  subtasks?: Subtask[];
  recurringExceptions?: number[];
  customFields?: { fieldId: string; value: string }[];
}

export type ReminderOption = '5min' | '10min' | '30min' | '1hour' | '2hours' | 'today' | 'tomorrow' | null;

export interface TimeEntry {
  id: string;
  taskId: string;
  duration: number; // in minutes
  description: string | null;
  startedAt: number;
  endedAt: number | null;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: number;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  listId: string;
  priority: Priority;
  labels: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomView {
  id: string;
  name: string;
  icon: string | null;
  filterConfig: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FilterConfig {
  listId?: string;
  labelId?: string;
  priority?: Priority;
  search?: string;
  completed?: boolean;
  recurring?: boolean;
  dateFrom?: number;
  dateTo?: number;
}

export interface TaskNote {
  id: string;
  taskId: string;
  title: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TaskCustomFieldValue {
  id: string;
  taskId: string;
  fieldId: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}