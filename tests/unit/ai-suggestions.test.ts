import { expect, test, describe, beforeEach } from 'vitest';
import { getTaskSuggestions, generateTaskFromPrompt, generateSchedulingSuggestions, optimizeTaskOrder, parseNaturalLanguageTask } from '@/lib/utils/ai-suggestions';
import type { Task } from '@/lib/types';

describe('AI Suggestions', () => {
  describe('getTaskSuggestions', () => {
    test('suggests high priority for urgent keywords', () => {
      const suggestions = getTaskSuggestions('URGENT: Fix the server');
      const prioritySuggestion = suggestions.find(s => s.field === 'priority');
      expect(prioritySuggestion?.value).toBe('high');
    });

    test('suggests high priority for critical keywords', () => {
      const suggestions = getTaskSuggestions('CRITICAL bug in production');
      const prioritySuggestion = suggestions.find(s => s.field === 'priority');
      expect(prioritySuggestion?.value).toBe('high');
    });

    test('suggests low priority for maybe keywords', () => {
      const suggestions = getTaskSuggestions('Maybe do this later');
      const prioritySuggestion = suggestions.find(s => s.field === 'priority');
      expect(prioritySuggestion?.value).toBe('low');
    });

    test('suggests medium priority for normal keywords', () => {
      const suggestions = getTaskSuggestions('This is a normal task');
      const prioritySuggestion = suggestions.find(s => s.field === 'priority');
      expect(prioritySuggestion?.value).toBe('medium');
    });

    test('suggests date for tomorrow keyword', () => {
      const suggestions = getTaskSuggestions('Meeting tomorrow');
      const dateSuggestion = suggestions.find(s => s.field === 'date');
      expect(dateSuggestion).toBeDefined();
    });

    test('suggests date for next week keyword', () => {
      const suggestions = getTaskSuggestions('Review next week');
      const dateSuggestion = suggestions.find(s => s.field === 'date');
      expect(dateSuggestion).toBeDefined();
    });

    test('suggests date for morning keyword', () => {
      const suggestions = getTaskSuggestions('Morning standup');
      const dateSuggestion = suggestions.find(s => s.field === 'date');
      expect(dateSuggestion).toBeDefined();
    });

    test('suggests name cleanup for redundant prefixes', () => {
      const suggestions = getTaskSuggestions('Remember to buy milk');
      const nameSuggestion = suggestions.find(s => s.field === 'name');
      expect(nameSuggestion?.value).toBe('to buy milk');
    });

    test('suggests name cleanup for buy prefix', () => {
      const suggestions = getTaskSuggestions('Buy groceries');
      const nameSuggestion = suggestions.find(s => s.field === 'name');
      expect(nameSuggestion?.value).toBe('groceries');
    });

    test('suggests name cleanup for call prefix', () => {
      const suggestions = getTaskSuggestions('Call the client');
      const nameSuggestion = suggestions.find(s => s.field === 'name');
      expect(nameSuggestion?.value).toBe('the client');
    });

    test('suggests name cleanup for email prefix', () => {
      const suggestions = getTaskSuggestions('Email the team');
      const nameSuggestion = suggestions.find(s => s.field === 'name');
      expect(nameSuggestion?.value).toBe('the team');
    });

    test('returns empty suggestions for neutral text', () => {
      const suggestions = getTaskSuggestions('Write documentation');
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    test('sorts suggestions by confidence', () => {
      const suggestions = getTaskSuggestions('URGENT meeting tomorrow');
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(suggestions[suggestions.length - 1].confidence);
    });

    test('handles empty description', () => {
      const suggestions = getTaskSuggestions('Test task', null);
      expect(suggestions).toBeDefined();
    });

    test('handles undefined description', () => {
      const suggestions = getTaskSuggestions('Test task', undefined);
      expect(suggestions).toBeDefined();
    });

    test('suggests due date pattern', () => {
      const suggestions = getTaskSuggestions('Fix bug due 12/25/2024');
      const dateSuggestion = suggestions.find(s => s.field === 'date');
      expect(dateSuggestion).toBeDefined();
    });

    test('suggests name cleanup for remember prefix', () => {
      const suggestions = getTaskSuggestions('Remember to call mom');
      const nameSuggestion = suggestions.find(s => s.field === 'name');
      expect(nameSuggestion?.value).toBe('to call mom');
    });
  });

  describe('generateTaskFromPrompt', () => {
    test('creates task with cleaned name', () => {
      const task = generateTaskFromPrompt('Create a new project');
      expect(task.name).toBe('a new project');
    });

    test('sets priority based on suggestions', () => {
      const task = generateTaskFromPrompt('URGENT fix this now');
      expect(task.priority).toBe('high');
    });

    test('sets date based on suggestions', () => {
      const task = generateTaskFromPrompt('Meeting tomorrow');
      expect(task.date).toBeDefined();
    });

    test('removes redundant prefixes', () => {
      const task = generateTaskFromPrompt('Add new feature');
      expect(task.name).not.toMatch(/^Add /);
    });

    test('handles empty prompt', () => {
      const task = generateTaskFromPrompt('');
      expect(task).toBeDefined();
      expect(task.name).toBe('');
    });

    test('extracts name from "create" prefix', () => {
      const task = generateTaskFromPrompt('Create new feature');
      expect(task.name).toBe('new feature');
    });

    test('extracts name from "add" prefix', () => {
      const task = generateTaskFromPrompt('Add user login');
      expect(task.name).toBe('user login');
    });

    test('extracts name from "new" prefix', () => {
      const task = generateTaskFromPrompt('New project plan');
      expect(task.name).toBe('project plan');
    });

    test('extracts name from "remember" prefix', () => {
      const task = generateTaskFromPrompt('Remember to buy milk');
      expect(task.name).toBe('milk');
    });
  });

  describe('generateSchedulingSuggestions', () => {
    const createTask = (overrides: Partial<Task> = {}): Task => ({
      id: 'task-1',
      listId: 'inbox',
      name: 'Test task',
      description: null,
      date: Date.now() + 86400000,
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
      ...overrides,
    });

    test('suggests schedule for high priority tasks', () => {
      const tasks = [createTask({ priority: 'high', name: 'Important task' })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].taskId).toBe('task-1');
      expect(suggestions[0].confidence).toBe(0.8);
    });

    test('suggests schedule for medium priority tasks', () => {
      const tasks = [createTask({ priority: 'medium' })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].confidence).toBe(0.6);
    });

    test('does not suggest for completed tasks', () => {
      const tasks = [createTask({ completed: true })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(0);
    });

    test('does not suggest for tasks without date', () => {
      const tasks = [createTask({ date: null })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(0);
    });

    test('does not suggest for past dates', () => {
      const tasks = [createTask({ date: Date.now() - 86400000 })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(0);
    });

    test('suggests specific time for meetings', () => {
      const tasks = [createTask({ name: 'Team meeting', priority: 'medium' })];
      const suggestions = generateSchedulingSuggestions(tasks);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].reason).toContain('morning');
    });

    test('uses user history for completion rates', () => {
      const tasks = [createTask({ priority: 'high' })];
      const userHistory = [
        { taskId: 'task-1', completedAt: Date.now(), date: Date.now() },
      ];
      const suggestions = generateSchedulingSuggestions(tasks, userHistory);

      expect(suggestions.length).toBe(1);
    });

    test('handles empty tasks array', () => {
      const suggestions = generateSchedulingSuggestions([]);
      expect(suggestions).toEqual([]);
    });
  });

  describe('optimizeTaskOrder', () => {
    const createTask = (overrides: Partial<Task> = {}): Task => ({
      id: 'task-1',
      listId: 'inbox',
      name: 'Test task',
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
      ...overrides,
    });

    test('sorts by priority first', () => {
      const tasks = [
        createTask({ priority: 'low' }),
        createTask({ priority: 'high' }),
        createTask({ priority: 'medium' }),
      ];
      const optimized = optimizeTaskOrder(tasks);

      expect(optimized[0].priority).toBe('high');
      expect(optimized[1].priority).toBe('medium');
      expect(optimized[2].priority).toBe('low');
    });

    test('sorts by deadline when priorities are equal', () => {
      const now = Date.now();
      const tasks = [
        createTask({ priority: 'high', deadline: now + 86400000 }),
        createTask({ priority: 'high', deadline: now - 86400000 }),
      ];
      const optimized = optimizeTaskOrder(tasks);

      expect(optimized[0].deadline).toBe(now - 86400000);
      expect(optimized[1].deadline).toBe(now + 86400000);
    });

    test('handles tasks without deadlines', () => {
      const tasks = [
        createTask({ priority: 'high', deadline: null }),
        createTask({ priority: 'high', deadline: null }),
      ];
      const optimized = optimizeTaskOrder(tasks);

      expect(optimized).toHaveLength(2);
    });

    test('handles empty array', () => {
      const optimized = optimizeTaskOrder([]);
      expect(optimized).toEqual([]);
    });

    test('returns new array without mutating original', () => {
      const tasks = [createTask({ priority: 'low' }), createTask({ priority: 'high' })];
      const optimized = optimizeTaskOrder(tasks);

      expect(tasks[0].priority).toBe('low');
      expect(optimized[0].priority).toBe('high');
    });
  });

  describe('Edge cases', () => {
    test('handles very long prompt', () => {
      const longPrompt = 'A'.repeat(1000);
      const suggestions = getTaskSuggestions(longPrompt);
      expect(suggestions).toBeDefined();
    });

    test('handles special characters', () => {
      const suggestions = getTaskSuggestions('Fix bug #123 @user https://example.com');
      expect(suggestions).toBeDefined();
    });

    test('handles unicode characters', () => {
      const suggestions = getTaskSuggestions('任务名称 📅 ⏰');
      expect(suggestions).toBeDefined();
    });

    test('handles multiple spaces', () => {
      const suggestions = getTaskSuggestions('Task   with   multiple    spaces');
      expect(suggestions).toBeDefined();
    });

    test('handles newlines', () => {
      const suggestions = getTaskSuggestions('Task\nwith\nnewlines');
      expect(suggestions).toBeDefined();
    });

    test('handles tabs', () => {
      const suggestions = getTaskSuggestions('Task\twith\ttabs');
      expect(suggestions).toBeDefined();
    });

    test('handles invalid date pattern', () => {
      const task = generateTaskFromPrompt('Due on invalid-date');
      expect(task).toBeDefined();
    });

    test('handles single part date pattern', () => {
      const task = generateTaskFromPrompt('Due on 15');
      expect(task).toBeDefined();
    });

    test('handles date pattern with year only', () => {
      const task = generateTaskFromPrompt('Due on 2024');
      expect(task).toBeDefined();
    });

    test('handles date pattern with month and day', () => {
      const task = generateTaskFromPrompt('Due on 12 25');
      expect(task).toBeDefined();
    });

    test('handles malformed date pattern with text', () => {
      const task = generateTaskFromPrompt('Due on abc xyz');
      expect(task).toBeDefined();
    });

    test('handles date pattern with single number', () => {
      const task = generateTaskFromPrompt('Due on 5');
      expect(task).toBeDefined();
    });

    test('handles due date pattern dd/dd/dddd', () => {
      const task = generateTaskFromPrompt('Due on 12/25/2024');
      expect(task).toBeDefined();
    });

    test('handles due date pattern dd-dd-dddd', () => {
      const task = generateTaskFromPrompt('Due on 12-25-2024');
      expect(task).toBeDefined();
    });
  });

  describe('parseNaturalLanguageTask', () => {
    test('parses time expressions', () => {
      const result = parseNaturalLanguageTask('Meeting at 3pm tomorrow');
      expect(result.task.date).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('parses morning/afternoon/evening keywords', () => {
      const result = parseNaturalLanguageTask('Call mom in the morning');
      expect(result.task.date).toBeDefined();
    });

    test('extracts duration/estimate', () => {
      const result = parseNaturalLanguageTask('Write report for 30 minutes');
      expect(result.task.estimate).toBe(30);
    });

    test('extracts duration in hours', () => {
      const result = parseNaturalLanguageTask('Design session for 2 hours');
      expect(result.task.estimate).toBe(120);
    });

    test('extracts hashtags as labels', () => {
      const result = parseNaturalLanguageTask('Review PR #frontend #urgent');
      expect(result.task.labels).toContain('frontend');
      expect(result.task.labels).toContain('urgent');
    });

    test('identifies work context', () => {
      const result = parseNaturalLanguageTask('Work on the quarterly report');
      expect(result.task.listId).toBe('work');
    });

    test('identifies shopping context', () => {
      const result = parseNaturalLanguageTask('Need to buy groceries from store');
      expect(result.task.listId).toBe('shopping');
    });

    test('sets high priority for urgent keywords', () => {
      const result = parseNaturalLanguageTask('URGENT fix the server');
      expect(result.task.priority).toBe('high');
    });

    test('sets low priority for maybe keywords', () => {
      const result = parseNaturalLanguageTask('Maybe do this someday');
      expect(result.task.priority).toBe('low');
    });

    test('extracts description after colon', () => {
      const result = parseNaturalLanguageTask('Fix login: The authentication is broken');
      expect(result.task.description).toContain('authentication is broken');
    });

    test('handles "Call Mom tomorrow at 3pm"', () => {
      const result = parseNaturalLanguageTask('Call Mom tomorrow at 3pm');
      expect(result.task.name.toLowerCase()).toContain('mom');
      expect(result.task.date).toBeDefined();
    });

    test('handles "Buy groceries for 30 minutes tomorrow"', () => {
      const result = parseNaturalLanguageTask('Buy groceries for 30 minutes tomorrow');
      expect(result.task.estimate).toBe(30);
      expect(result.task.date).toBeDefined();
    });

    test('returns warnings array', () => {
      const result = parseNaturalLanguageTask('Test task');
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('handles empty input', () => {
      const result = parseNaturalLanguageTask('');
      expect(result.task.name).toBe('');
    });
  });
});