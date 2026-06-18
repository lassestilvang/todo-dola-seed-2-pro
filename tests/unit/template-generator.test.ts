import { describe, it, expect } from 'vitest';
import {
  generateTemplateFromDescription,
  getPresetTemplates,
  getTemplateSuggestions,
} from '@/lib/services/template-generator';

describe('Template Generator', () => {
  describe('generateTemplateFromDescription', () => {
    it('generates a project template for project descriptions', () => {
      const template = generateTemplateFromDescription({
        description: 'Build a new web application',
      });

      expect(template.name).toBe('New Project');
      expect(template.priority).toBe('high');
      expect(template.labels).toContain('project');
    });

    it('generates a meeting template for meeting descriptions', () => {
      const template = generateTemplateFromDescription({
        description: 'Meeting with the team about the new project',
      });

      expect(template.name).toContain('Meeting');
      expect(template.labels).toContain('meeting');
    });

    it('generates a habit template for daily routines', () => {
      const template = generateTemplateFromDescription({
        description: 'Daily exercise routine',
      });

      expect(template.name).toBe('Daily Habit');
      expect(template.labels).toContain('habit');
    });

    it('generates a default template for unknown types', () => {
      const template = generateTemplateFromDescription({
        description: 'Some random task',
      });

      expect(template.name).toBe('Some random task');
      expect(template.listId).toBe('inbox');
    });
  });

  describe('getPresetTemplates', () => {
    it('returns an array of templates', () => {
      const templates = getPresetTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('each template has required fields', () => {
      const templates = getPresetTemplates();

      for (const template of templates) {
        expect(template.name).toBeDefined();
        expect(template.listId).toBeDefined();
        expect(['high', 'medium', 'low', 'none']).toContain(template.priority);
      }
    });
  });

  describe('getTemplateSuggestions', () => {
    it('returns templates based on task history', () => {
      const mockTasks = [
        {
          id: '1',
          listId: 'work',
          name: 'Project task',
          labels: [{ id: '1', name: 'project', emoji: '', color: '' }],
          completed: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const suggestions = getTemplateSuggestions(mockTasks as any);

      expect(suggestions).toBeInstanceOf(Array);
    });
  });
});