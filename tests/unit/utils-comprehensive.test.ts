import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTaskFromPrompt, getTaskSuggestions } from '@/lib/utils/ai-suggestions';
import { parseNaturalLanguage, formatParsedTask } from '@/lib/utils/nlp-parser';
import { taskToCalendarEvent, calendarEventToTask } from '@/lib/utils/calendar-sync';
import { searchTasks, clearSearchCache } from '@/lib/utils/search';
import type { Task, Label, Subtask } from '@/lib/types';

describe('Utils - Comprehensive Coverage', () => {
  describe('NLP Parser', () => {
    describe('parseNaturalLanguage', () => {
      it('parses basic task name', () => {
        const result = parseNaturalLanguage('Buy groceries');
        expect(result.name).toBe('Buy groceries');
        expect(result.priority).toBe('none');
      });

      it('parses today keyword', () => {
        const result = parseNaturalLanguage('Meeting today');
        expect(result.date).toBeDefined();
      });

      it('parses tomorrow keyword', () => {
        const result = parseNaturalLanguage('Meeting tomorrow');
        expect(result.date).toBeDefined();
      });

      it('parses yesterday keyword', () => {
        const result = parseNaturalLanguage('Review yesterday');
        expect(result.date).toBeDefined();
      });

      it('parses high priority', () => {
        const result = parseNaturalLanguage('URGENT task');
        expect(result.priority).toBe('high');
      });

      it('parses high priority for important', () => {
        const result = parseNaturalLanguage('Important task');
        expect(result.priority).toBe('high');
      });

      it('parses low priority', () => {
        const result = parseNaturalLanguage('Minor task');
        expect(result.priority).toBe('low');
      });

      it('parses work list', () => {
        const result = parseNaturalLanguage('Task at work');
        expect(result.listId).toBe('work');
      });

      it('parses personal list', () => {
        const result = parseNaturalLanguage('Personal task');
        expect(result.listId).toBe('personal');
      });

      it('parses deadline with due keyword', () => {
        const result = parseNaturalLanguage('Review due tomorrow');
        expect(result.deadline).toBeDefined();
      });

      it('parses deadline with by keyword', () => {
        const result = parseNaturalLanguage('Submit by Friday');
        expect(result.deadline).toBeDefined();
      });

      it('parses time expression', () => {
        const result = parseNaturalLanguage('Meeting at morning');
        expect(result.date).toBeDefined();
      });

      it('parses "at" time expression', () => {
        const result = parseNaturalLanguage('Call at afternoon');
        expect(result.date).toBeDefined();
      });

      it('uses default list when not specified', () => {
        const result = parseNaturalLanguage('Task', 'inbox');
        expect(result.listId).toBe('inbox');
      });

      it('cleans task name from keywords', () => {
        const result = parseNaturalLanguage('Buy milk [high priority]');
        expect(result.priority).toBe('high');
        expect(result.name).toBeDefined();
      });

      it('handles empty input', () => {
        const result = parseNaturalLanguage('');
        expect(result.name).toBe('');
      });

      it('handles special characters', () => {
        const result = parseNaturalLanguage('Task with <special> & "chars"');
        expect(result.name).toBeDefined();
      });
    });

    describe('formatParsedTask', () => {
      it('formats task with name only', () => {
        const parsed = { name: 'Test task', description: null, date: null, deadline: null, priority: 'none' as const, listId: 'inbox' };
        const result = formatParsedTask(parsed);
        expect(result).toBe('Test task');
      });

      it('formats task with date', () => {
        const date = new Date().getTime();
        const parsed = { name: 'Test', description: null, date, deadline: null, priority: 'none' as const, listId: 'inbox' };
        const result = formatParsedTask(parsed);
        expect(result).toContain('Test');
        expect(result).toContain('on');
      });

      it('formats task with priority', () => {
        const parsed = { name: 'Test', description: null, date: null, deadline: null, priority: 'high' as const, listId: 'inbox' };
        const result = formatParsedTask(parsed);
        expect(result).toContain('[high priority]');
      });

      it('formats task with description', () => {
        const parsed = { name: 'Test', description: 'A description', date: null, deadline: null, priority: 'none' as const, listId: 'inbox' };
        const result = formatParsedTask(parsed);
        expect(result).toContain('- A description');
      });
    });
  });

  describe('AI Suggestions', () => {
    describe('generateTaskFromPrompt', () => {
      it('extracts task name', () => {
        const task = generateTaskFromPrompt('Buy milk');
        expect(task.name).toBeDefined();
      });

      it('extracts high priority from URGENT', () => {
        const task = generateTaskFromPrompt('URGENT fix this');
        expect(task.priority).toBe('high');
      });

      it('extracts high priority from urgent', () => {
        const task = generateTaskFromPrompt('urgent task');
        expect(task.priority).toBe('high');
      });

      it('extracts high priority from critical', () => {
        const task = generateTaskFromPrompt('critical bug');
        expect(task.priority).toBe('high');
      });

      it('extracts high priority from important', () => {
        const task = generateTaskFromPrompt('important meeting');
        expect(task.priority).toBe('high');
      });

      it('extracts low priority', () => {
        const task = generateTaskFromPrompt('later fix');
        expect(task.priority).toBe('low');
      });

      it('sets default priority when none found', () => {
        const task = generateTaskFromPrompt('Regular task');
        expect(task.priority).toBe('none');
      });

      it('extracts date from today', () => {
        const task = generateTaskFromPrompt('Meeting today');
        expect(task.date).toBeDefined();
      });

      it('extracts date from tomorrow', () => {
        const task = generateTaskFromPrompt('Meeting tomorrow');
        expect(task.date).toBeDefined();
      });

      it('extracts date from due pattern', () => {
        const task = generateTaskFromPrompt('Submit due tomorrow');
        expect(task.date).toBeDefined();
      });

      it('generates task from prompt', () => {
        const task = generateTaskFromPrompt('Work task');
        expect(task.name).toBeDefined();
      });

      it('generates task with description', () => {
        const task = generateTaskFromPrompt('Task with description');
        expect(task.name).toBeDefined();
      });
    });

    describe('getTaskSuggestions', () => {
      it('suggests high priority for urgent', () => {
        const suggestions = getTaskSuggestions('urgent task');
        const prioritySuggestion = suggestions.find(s => s.field === 'priority');
        expect(prioritySuggestion?.value).toBe('high');
      });

      it('suggests medium priority for medium keyword', () => {
        const suggestions = getTaskSuggestions('medium priority task');
        const prioritySuggestion = suggestions.find(s => s.field === 'priority');
        expect(prioritySuggestion?.value).toBe('medium');
      });

      it('suggests low priority for later', () => {
        const suggestions = getTaskSuggestions('later fix');
        const prioritySuggestion = suggestions.find(s => s.field === 'priority');
        expect(prioritySuggestion?.value).toBe('low');
      });

      it('returns array of suggestions', () => {
        const suggestions = getTaskSuggestions('test');
        expect(Array.isArray(suggestions)).toBe(true);
      });

      it('suggests date for tomorrow keyword', () => {
        const suggestions = getTaskSuggestions('todo tomorrow');
        const dateSuggestion = suggestions.find(s => s.field === 'date');
        expect(dateSuggestion).toBeDefined();
      });

      it('generates task from prompt', () => {
        const task = generateTaskFromPrompt('Work task');
        expect(task.name).toBeDefined();
      });
    });
  });

  describe('Calendar Sync', () => {
    const mockTask: Task = {
      id: '1',
      listId: 'inbox',
      name: 'Test task',
      description: 'Test description',
      date: Date.now(),
      deadline: Date.now() + 86400000,
      reminder: null,
      estimate: null,
      actualTime: null,
      priority: 'none',
      completed: false,
      completedAt: null,
      recurringType: null,
      recurringConfig: null,
      attachmentPath: null,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };

    describe('taskToCalendarEvent', () => {
      it('converts task to calendar event', () => {
        const event = taskToCalendarEvent(mockTask);
        expect(event.title).toBe('Test task');
        expect(event.description).toBe('Test description');
      });

      it('uses createdAt when date is null', () => {
        const task = { ...mockTask, date: null };
        const event = taskToCalendarEvent(task);
        expect(event.startDate).toBe(mockTask.createdAt);
      });

      it('handles null deadline', () => {
        const task = { ...mockTask, deadline: null };
        const event = taskToCalendarEvent(task);
        expect(event.endDate).toBeNull();
      });

      it('handles priority without color property', () => {
        const highPriorityTask = { ...mockTask, priority: 'high' as const };
        const event = taskToCalendarEvent(highPriorityTask);
        expect(event.title).toBe('Test task');
      });

      it('handles empty description', () => {
        const task = { ...mockTask, description: null };
        const event = taskToCalendarEvent(task);
        expect(event.description).toBe('');
      });
    });

    describe('calendarEventToTask', () => {
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
        expect(task.description).toBe('Test description');
      });

      it('handles null description', () => {
        const event = {
          id: '1',
          title: 'Test task',
          description: null,
          startDate: Date.now(),
          endDate: Date.now() + 86400000,
        };

        const task = calendarEventToTask(event);
        expect(task.name).toBe('Test task');
      });

      it('creates task from event without listId', () => {
        const event = {
          id: '1',
          title: 'Test task',
          description: null,
          startDate: Date.now(),
          endDate: Date.now() + 86400000,
        };

        const task = calendarEventToTask(event);
        expect(task.name).toBe('Test task');
        expect(task.listId).toBeUndefined();
      });
    });
  });

  describe('Search', () => {
    const mockTasks: Task[] = [
      {
        id: '1',
        listId: 'inbox',
        name: 'Buy groceries',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'none',
        completed: false,
        completedAt: null,
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      },
      {
        id: '2',
        listId: 'work',
        name: 'Finish project',
        description: null,
        date: null,
        deadline: null,
        reminder: null,
        estimate: null,
        actualTime: null,
        priority: 'high',
        completed: false,
        completedAt: null,
        recurringType: null,
        recurringConfig: null,
        attachmentPath: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
      },
    ];

    beforeEach(() => {
      clearSearchCache();
    });

    it('searches tasks by name', () => {
      const results = searchTasks(mockTasks, 'groceries');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Buy groceries');
    });

    it('searches tasks case-insensitively', () => {
      const results = searchTasks(mockTasks, 'GROCERIES');
      expect(results.length).toBe(1);
    });

    it('returns all tasks for empty query', () => {
      const results = searchTasks(mockTasks, '');
      expect(results.length).toBe(2);
    });

    it('returns empty array for no matches', () => {
      const results = searchTasks(mockTasks, 'nonexistent');
      expect(results.length).toBe(0);
    });

    it('searches in description', () => {
      const tasksWithDesc: Task[] = [
        { ...mockTasks[0], description: 'Important shopping list' },
      ];
      const results = searchTasks(tasksWithDesc, 'shopping');
      expect(results.length).toBe(1);
    });

    it('handles empty tasks array', () => {
      const results = searchTasks([], 'test');
      expect(results).toEqual([]);
    });
  });
});