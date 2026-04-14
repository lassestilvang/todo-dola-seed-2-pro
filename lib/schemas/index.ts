import { z } from 'zod';

export const PrioritySchema = z.enum(['high', 'medium', 'low', 'none']);

export const TaskListSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  emoji: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  isInbox: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const LabelSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  emoji: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const SubtaskSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string().min(1),
  completed: z.boolean().default(false),
  completedAt: z.number().nullable(),
  sortOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
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
  createdAt: z.number(),
  updatedAt: z.number(),
  labels: z.array(LabelSchema).optional(),
  subtasks: z.array(SubtaskSchema).optional(),
});
