import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from '@/lib/utils/nlp-parser';
import { generateSchedulingSuggestions } from '@/lib/utils/ai-suggestions';

describe('New Features', () => {
  describe('NLP Parser', () => {
    it('parses natural language task', () => {
      const result = parseNaturalLanguage('Buy milk tomorrow at 5pm');
      expect(result.name).toContain('Buy milk');
    });

    it('extracts priority from text', () => {
      const result = parseNaturalLanguage('Urgent: Fix the bug [high priority]');
      expect(result.priority).toBe('high');
    });

    it('handles simple tasks', () => {
      const result = parseNaturalLanguage('Create documentation');
      expect(result.name).toBe('Create documentation');
    });
  });

  describe('AI Scheduling', () => {
    it('generates scheduling suggestions', () => {
      const tasks = [
        { id: '1', name: 'Test task', listId: 'inbox', description: null, date: Date.now(), deadline: null, reminder: null, estimate: null, actualTime: null, priority: 'high', completed: false, completedAt: null, recurringType: null, recurringConfig: null, attachmentPath: null, sortOrder: 0, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null }
      ];
      const suggestions = generateSchedulingSuggestions(tasks as any);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});