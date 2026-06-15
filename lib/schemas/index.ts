import { z } from 'zod';

export const PrioritySchema = z.enum(['high', 'medium', 'low', 'none']);

export const TaskListSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  emoji: z.string().optional(),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}$/).optional(),
  isInbox: z.boolean().default(false),
  sortOrder: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const TaskListCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emoji: z.string().optional(),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}$/).optional(),
  sortOrder: z.number().optional(),
  isInbox: z.boolean().default(false),
});

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  emoji: z.string().default('🏷️'),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}$/),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const LabelCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emoji: z.string().optional(),
  color: z.string().regex(/^#[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}$/).optional(),
});

export const SubtaskSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  name: z.string().min(1),
  completed: z.boolean().default(false),
  completedAt: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const SubtaskCreateSchema = z.object({
  taskId: z.string(),
  name: z.string().min(1, 'Subtask name is required'),
});

export const TaskSchema = z.object({
  id: z.string(),
  listId: z.string(),
  name: z.string().min(1),
  description: z.string().nullable(),
  date: z.number().nullable(),
  deadline: z.number().nullable(),
  reminder: z.number().nullable(),
  estimate: z.number().nullable(),
  actualTime: z.number().nullable(),
  priority: PrioritySchema.default('none'),
  completed: z.boolean().default(false),
  completedAt: z.number().nullable(),
  recurringType: z.string().nullable(),
  recurringConfig: z.string().nullable(),
  attachmentPath: z.string().nullable(),
  sortOrder: z.number().optional().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  labels: z.array(LabelSchema).optional(),
  subtasks: z.array(SubtaskSchema).optional(),
});

export const TaskCreateSchema = z.object({
  listId: z.string().optional().default('inbox'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().nullable().optional(),
  date: z.number().nullable().optional(),
  deadline: z.number().nullable().optional(),
  reminder: z.number().nullable().optional(),
  estimate: z.number().nullable().optional(),
  actualTime: z.number().nullable().optional(),
  priority: PrioritySchema.optional(),
  completed: z.boolean().default(false).optional(),
  labels: z.array(z.string()).optional(),
  recurringType: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().nullable(),
  recurringConfig: z.string().optional().nullable(),
});

export const TaskUpdateSchema = z.object({
  listId: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  date: z.number().nullable().optional(),
  deadline: z.number().nullable().optional(),
  reminder: z.number().nullable().optional(),
  estimate: z.number().nullable().optional(),
  actualTime: z.number().nullable().optional(),
  priority: PrioritySchema.optional(),
  completed: z.boolean().optional(),
  completedAt: z.number().nullable().optional(),
  recurringType: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
  recurringConfig: z.string().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

export const RecurringConfigSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().min(1).default(1),
  endDate: z.number().nullable().optional(),
  maxOccurrences: z.number().min(1).nullable().optional(),
});

export const TaskTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().nullable().optional(),
  listId: z.string().optional().default('inbox'),
  priority: PrioritySchema.optional().default('none'),
  labels: z.array(z.string()).optional(),
});

export const TemplateUseSchema = z.object({
  variables: z.record(z.string(), z.string()).optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  listId: z.string().optional(),
  priority: PrioritySchema.optional(),
});

export const TaskLinkTypeSchema = z.enum(['blocks', 'related', 'depends_on', 'duplicate']);

export const TaskLinkSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  linkedTaskId: z.string(),
  type: TaskLinkTypeSchema,
  createdAt: z.number(),
});

export const TaskLinkCreateSchema = z.object({
  taskId: z.string().min(1, 'taskId is required'),
  linkedTaskId: z.string().min(1, 'linkedTaskId is required'),
  type: TaskLinkTypeSchema.default('related'),
});