import { expect, test, describe, beforeEach } from 'vitest';
import { getTaskSuggestions, generateTaskFromPrompt } from '@/lib/utils/ai-suggestions';
import { resetIdCounter } from '../factories';

describe('AI Suggestions', () => {
  beforeEach(() => {
    resetIdCounter();
  });

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
      expect(task.name).toBe('to buy milk');
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
});