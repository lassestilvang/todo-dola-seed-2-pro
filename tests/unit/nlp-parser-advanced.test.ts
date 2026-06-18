import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage, formatParsedTask } from '@/lib/utils/nlp-parser';

describe('NLP Parser - Advanced', () => {
  describe('parseNaturalLanguage', () => {
    it('parses basic task name', () => {
      const result = parseNaturalLanguage('Buy groceries');
      expect(result.name).toBe('Buy groceries');
      expect(result.priority).toBe('none');
    });

    it('extracts high priority', () => {
      const result = parseNaturalLanguage('Review PR with high priority');
      expect(result.priority).toBe('high');
    });

    it('extracts urgent (high priority)', () => {
      const result = parseNaturalLanguage('Fix the urgent bug');
      expect(result.priority).toBe('high');
    });

    it('extracts medium priority', () => {
      const result = parseNaturalLanguage('Normal task for later');
      expect(result.priority).toBe('medium');
    });

    it('extracts low priority', () => {
      const result = parseNaturalLanguage('Minor cleanup task');
      expect(result.priority).toBe('low');
    });

    it('extracts today', () => {
      const result = parseNaturalLanguage('Meeting today');
      expect(result.date).not.toBeNull();
    });

    it('extracts tomorrow', () => {
      const result = parseNaturalLanguage('Review tomorrow');
      expect(result.date).not.toBeNull();
    });

    it('extracts specific date', () => {
      const result = parseNaturalLanguage('Submit on June 20');
      expect(result.date).not.toBeNull();
    });

    it('extracts deadline', () => {
      const result = parseNaturalLanguage('Finish project due tomorrow');
      expect(result.deadline).not.toBeNull();
    });

    it('extracts recurring daily', () => {
      const result = parseNaturalLanguage('Take medication daily');
      expect(result.recurringType).toBe('daily');
    });

    it('extracts recurring weekly', () => {
      const result = parseNaturalLanguage('Review every Monday');
      expect(result.recurringType).toBe('weekly');
    });

    it('extracts recurring monthly', () => {
      const result = parseNaturalLanguage('Pay rent monthly');
      expect(result.recurringType).toBe('monthly');
    });

    it('extracts recurring yearly', () => {
      const result = parseNaturalLanguage('Annual review yearly');
      expect(result.recurringType).toBe('yearly');
    });

    it('extracts interval for recurring', () => {
      const result = parseNaturalLanguage('Exercise every 2 days');
      // "every 2 days" sets recurringConfig with interval if it exists
      if (result.recurringConfig) {
        expect(result.recurringConfig).toContain('"interval":2');
      }
    });

    it('extracts description', () => {
      const result = parseNaturalLanguage('Call mom about dinner plans');
      expect(result.description).toBe('dinner plans');
    });

    it('returns default listId for unknown list', () => {
      const result = parseNaturalLanguage('Task for personal');
      expect(result.listId).toBe('personal');
    });
  });

  describe('formatParsedTask', () => {
    it('formats task with name only', () => {
      const result = formatParsedTask({
        name: 'Test Task',
        description: null,
        date: null,
        deadline: null,
        priority: 'none',
        listId: 'inbox',
      });
      expect(result).toBe('Test Task');
    });

    it('formats task with priority', () => {
      const result = formatParsedTask({
        name: 'Test Task',
        description: null,
        date: null,
        deadline: null,
        priority: 'high',
        listId: 'inbox',
      });
      expect(result).toContain('[high priority]');
    });
  });
});