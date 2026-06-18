import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage } from '@/lib/utils/nlp-parser';
import { generateTaskFromPrompt } from '@/lib/utils/ai-suggestions';
import { taskToCalendarEvent, calendarEventToTask } from '@/lib/utils/calendar-sync';
import type { Task } from '@/lib/types';

describe('Utils Coverage', () => {
  describe('NLP Parser', () => {
    it('parses dates', () => {
      const result = parseNaturalLanguage('Meeting tomorrow');
      expect(result.date).toBeDefined();
    });

    it('parses deadlines', () => {
      const result = parseNaturalLanguage('Buy milk due tomorrow');
      expect(result.deadline).toBeDefined();
    });

    it('cleans task names', () => {
      const result = parseNaturalLanguage('Buy milk [high priority]');
      expect(result.priority).toBe('high');
    });
  });

  describe('AI Suggestions', () => {
    it('generates task from prompt', () => {
      const task = generateTaskFromPrompt('Buy milk tomorrow');
      expect(task.name).toBeDefined();
    });
  });

  describe('Calendar Sync', () => {
    it('converts task to calendar event', () => {
      const task = {
        id: '1',
        name: 'Test task',
        description: 'Test description',
        date: Date.now(),
        deadline: Date.now() + 86400000,
        createdAt: Date.now(),
      } as Task;

      const event = taskToCalendarEvent(task);
      expect(event.title).toBe('Test task');
    });

    it('converts calendar event to task', () => {
      const event = {
        id: '1',
        title: 'Test task',
        description: 'Test description',
        startDate: Date.now(),
        endDate: Date.now() + 86400000,
      };

      const task = calendarEventToTask(event);
      expect(task.name).toBe('Test task');
    });
  });
});