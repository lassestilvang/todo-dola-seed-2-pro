import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDb, resetDb, saveDb } from '@/lib/db';
import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskListCreateSchema,
  LabelCreateSchema,
  PrioritySchema,
} from '@/lib/schemas';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'db', 'planner.db');

async function cleanDb() {
  const db = await initDb();
  db.exec('DELETE FROM task_history');
  db.exec('DELETE FROM template_labels');
  db.exec('DELETE FROM task_templates');
  db.exec('DELETE FROM subtasks');
  db.exec('DELETE FROM task_labels');
  db.exec('DELETE FROM tasks');
  db.exec('DELETE FROM labels');
  db.exec('DELETE FROM lists WHERE id != \'inbox\'');
  db.exec('DELETE FROM task_dependencies');
  db.exec('DELETE FROM time_entries');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM task_notes');
  db.exec('DELETE FROM custom_views');
  saveDb();
}

describe('API Layer - Schema Validation', () => {
  beforeAll(async () => {
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
    await initDb();
  });

  afterAll(() => {
    resetDb();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  describe('TaskCreateSchema', () => {
    it('should validate required name field', () => {
      const result = TaskCreateSchema.safeParse({ listId: 'inbox' });
      expect(result.success).toBe(false);
    });

    it('should accept valid minimal task data', () => {
      const result = TaskCreateSchema.safeParse({ name: 'Test Task' });
      expect(result.success).toBe(true);
    });

    it('should accept valid task data with all fields', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Complete Task',
        description: 'Full description',
        priority: 'high',
        listId: 'inbox',
        completed: true,
        date: Date.now(),
        deadline: Date.now() + 86400000,
        estimate: 30,
        actualTime: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = TaskCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should accept null optional fields', () => {
      const result = TaskCreateSchema.safeParse({
        name: 'Task',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskUpdateSchema', () => {
    it('should accept partial updates', () => {
      const result = TaskUpdateSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('should accept multiple field updates', () => {
      const result = TaskUpdateSchema.safeParse({
        name: 'Updated',
        priority: 'high',
        completed: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept null values for optional fields', () => {
      const result = TaskUpdateSchema.safeParse({
        description: null,
        deadline: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskListCreateSchema', () => {
    it('should validate required name field', () => {
      const result = TaskListCreateSchema.safeParse({ emoji: '📋' });
      expect(result.success).toBe(false);
    });

    it('should accept valid list data', () => {
      const result = TaskListCreateSchema.safeParse({
        name: 'My List',
        emoji: '📋',
        color: '#ff0000',
        sortOrder: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = TaskListCreateSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('LabelCreateSchema', () => {
    it('should validate required name field', () => {
      const result = LabelCreateSchema.safeParse({ emoji: '🏷️' });
      expect(result.success).toBe(false);
    });

    it('should accept valid label data', () => {
      const result = LabelCreateSchema.safeParse({
        name: 'Work',
        emoji: '💼',
        color: '#3b82f6',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const result = LabelCreateSchema.safeParse({ name: 'Minimal' });
      expect(result.success).toBe(true);
    });
  });

  describe('PrioritySchema', () => {
    it('should accept valid priority values', () => {
      expect(PrioritySchema.safeParse('high').success).toBe(true);
      expect(PrioritySchema.safeParse('medium').success).toBe(true);
      expect(PrioritySchema.safeParse('low').success).toBe(true);
      expect(PrioritySchema.safeParse('none').success).toBe(true);
    });

    it('should reject invalid priority values', () => {
      expect(PrioritySchema.safeParse('urgent').success).toBe(false);
      expect(PrioritySchema.safeParse('critical').success).toBe(false);
    });
  });
});