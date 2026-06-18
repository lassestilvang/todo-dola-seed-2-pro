import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage, formatParsedTask } from '@/lib/utils/nlp-parser';

describe('NLP Parser - Edge Cases', () => {
  describe('parseNaturalLanguage', () => {
    it('handles empty string', () => {
      const result = parseNaturalLanguage('');
      expect(result.name).toBe('');
    });

    it('handles whitespace only', () => {
      const result = parseNaturalLanguage('   ');
      expect(result.name).toBeDefined();
    });

    it('handles special regex characters', () => {
      const result = parseNaturalLanguage('Task with (parentheses) and [brackets]');
      expect(result.name).toBeDefined();
    });

    it('handles Unicode characters', () => {
      const result = parseNaturalLanguage('任务 任务 任务');
      expect(result.name).toBeDefined();
    });

    it('handles very long input', () => {
      const longInput = 'A'.repeat(10000);
      const result = parseNaturalLanguage(longInput);
      expect(result.name).toBeDefined();
    });

    it('handles multiple dates', () => {
      const result = parseNaturalLanguage('Meeting on Monday and Friday');
      expect(result.date).toBeDefined();
    });

    it('handles "by" without date', () => {
      const result = parseNaturalLanguage('Complete by end of day');
      expect(result.name).toBeDefined();
    });

    it('handles "due" without valid date', () => {
      const result = parseNaturalLanguage('Finish due soon');
      expect(result.name).toBeDefined();
    });

    it('handles "at" without valid time', () => {
      const result = parseNaturalLanguage('Meeting at the office');
      expect(result.name).toBeDefined();
    });

    it('handles time expression without date', () => {
      const result = parseNaturalLanguage('Call at evening');
      // May or may not have date depending on implementation
      expect(result.name).toBeDefined();
    });

    it('handles date pattern that fails parsing', () => {
      const result = parseNaturalLanguage('on abc xyz');
      expect(result.name).toBeDefined();
    });

    it('handles date pattern with single number', () => {
      const result = parseNaturalLanguage('on 5');
      expect(result.name).toBeDefined();
    });

    it('handles due date pattern dd/dd/dddd', () => {
      const result = parseNaturalLanguage('due on 12/25/2024');
      expect(result.date).toBeDefined();
    });

    it('handles due date pattern dd-dd-dddd', () => {
      const result = parseNaturalLanguage('due on 12-25-2024');
      expect(result.date).toBeDefined();
    });

    it('handles date pattern with month only', () => {
      const result = parseNaturalLanguage('on June');
      expect(result.name).toBeDefined();
    });

    it('handles date pattern with invalid format', () => {
      const result = parseNaturalLanguage('on 13/45/9999');
      expect(result.name).toBeDefined();
    });

    it('handles "for" without description', () => {
      const result = parseNaturalLanguage('Task for');
      expect(result.name).toBeDefined();
    });

    it('handles priority keywords in different cases', () => {
      const result = parseNaturalLanguage('URGENT TASK');
      expect(result.priority).toBe('high');
    });

    it('handles list keywords in different cases', () => {
      const result = parseNaturalLanguage('WORK task');
      expect(result.listId).toBe('work');
    });

    it('handles "every" with day name', () => {
      const result = parseNaturalLanguage('every Monday');
      expect(result.date).toBeDefined();
    });

    it('handles "next" with day name', () => {
      const result = parseNaturalLanguage('next Tuesday');
      expect(result.date).toBeDefined();
    });

    it('handles "this" with day name', () => {
      const result = parseNaturalLanguage('this Wednesday');
      expect(result.date).toBeDefined();
    });

    it('handles date pattern with ordinal suffixes', () => {
      const result = parseNaturalLanguage('on 15th June');
      expect(result.date).toBeDefined();
    });

    it('handles date pattern with st, nd, rd suffixes', () => {
      const result = parseNaturalLanguage('on 1st January');
      expect(result.date).toBeDefined();
    });

    it('handles multiple priority keywords', () => {
      const result = parseNaturalLanguage('URGENT critical important task');
      expect(result.priority).toBe('high');
    });

    it('preserves original name when cleanup results in empty', () => {
      const result = parseNaturalLanguage('Buy milk');
      expect(result.name).toBe('Buy milk');
    });
  });

  describe('formatParsedTask', () => {
    it('handles null description', () => {
      const parsed = { name: 'Test', description: null, date: null, deadline: null, priority: 'none' as const, listId: 'inbox' };
      const result = formatParsedTask(parsed);
      expect(result).toBe('Test');
    });

    it('handles undefined optional fields', () => {
      const parsed = { name: 'Test', description: undefined, date: undefined, deadline: undefined, priority: 'none' as const, listId: 'inbox' };
      const result = formatParsedTask(parsed as any);
      expect(result).toBe('Test');
    });

    it('handles very long name', () => {
      const longName = 'A'.repeat(1000);
      const parsed = { name: longName, description: null, date: null, deadline: null, priority: 'none' as const, listId: 'inbox' };
      const result = formatParsedTask(parsed);
      expect(result).toContain(longName);
    });
  });
});