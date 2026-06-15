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
  workspaceId?: string;
  archived?: boolean;
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
  assignedTo?: string | null;
  workspaceId?: string | null;
  labels?: Label[];
  subtasks?: Subtask[];
  recurringExceptions?: number[];
  customFields?: { fieldId: string; value: string }[];
  parentTaskId?: string | null;
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

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: number;
}

export interface Reminder {
  id: string;
  taskId: string;
  reminderTime: number;
  sentAt: number | null;
  channel: 'email' | 'in-app' | 'slack' | 'discord';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TaskLinkType = 'blocks' | 'related' | 'depends_on' | 'duplicate';

export interface TaskLink {
  id: string;
  taskId: string;
  linkedTaskId: string;
  type: TaskLinkType;
  createdAt: number;
}

export interface RecurringCompletion {
  id: string;
  parentTaskId: string;
  completedAt: number;
  createdAt: number;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: number;
}

// Goal Tracking
export type GoalUnit = '%' | 'tasks' | 'hours' | 'days' | 'points';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: GoalUnit;
  deadline: number | null;
  taskId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  name: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// Time Blocking
export interface TimeBlock {
  id: string;
  taskId: string | null;
  name: string;
  description: string | null;
  start: number;
  end: number;
  color: string | null;
  createdAt: number;
  updatedAt: number;
}

// Collaboration
export interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'comment_added' | 'task_assigned' | 'label_added';
  taskId: string;
  userId: string | null;
  userName: string | null;
  details: string | null;
  createdAt: number;
}