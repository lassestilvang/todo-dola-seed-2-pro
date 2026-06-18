import { describe, it, expect } from 'vitest';
import { processTemplateVariables, extractTemplateVariables, hasTemplateVariables } from '@/lib/utils';

describe('Template Variables', () => {
  describe('processTemplateVariables', () => {
    it('should replace username variable', () => {
      const result = processTemplateVariables('Hello {username}!', { username: 'John' });
      expect(result).toBe('Hello John!');
    });

    it('should replace project variable', () => {
      const result = processTemplateVariables('Task for {project}', { project: 'Website Redesign' });
      expect(result).toBe('Task for Website Redesign');
    });

    it('should replace listName variable', () => {
      const result = processTemplateVariables('Task in {listName}', { listName: 'Work' });
      expect(result).toBe('Task in Work');
    });

    it('should replace date variable with current date', () => {
      const result = processTemplateVariables('Due: {date}');
      const today = new Date().toISOString().split('T')[0];
      expect(result).toBe(`Due: ${today}`);
    });

    it('should replace date offset variables', () => {
      const result = processTemplateVariables('Due: {date+3d}');
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(result).toBe(`Due: ${futureDate}`);
    });

    it('should replace week offset', () => {
      const result = processTemplateVariables('Due: {date+1w}');
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(result).toBe(`Due: ${futureDate}`);
    });

    it('should replace time variable', () => {
      const result = processTemplateVariables('Time: {time}');
      expect(result).toMatch(/Time: \d{2}:\d{2}/);
    });

    it('should handle multiple variables', () => {
      const result = processTemplateVariables('{username} - {project} - {date+2d}', {
        username: 'Alice',
        project: 'Marketing',
      });
      expect(result).toContain('Alice');
      expect(result).toContain('Marketing');
    });

    it('should return original text if no variables', () => {
      const result = processTemplateVariables('No variables here');
      expect(result).toBe('No variables here');
    });
  });

  describe('extractTemplateVariables', () => {
    it('should extract single variable', () => {
      const result = extractTemplateVariables('Hello {username}');
      expect(result).toEqual(['username']);
    });

    it('should extract multiple variables', () => {
      const result = extractTemplateVariables('{username} - {project}');
      expect(result).toEqual(['username', 'project']);
    });

    it('should return empty array for no variables', () => {
      const result = extractTemplateVariables('No variables');
      expect(result).toEqual([]);
    });
  });

  describe('hasTemplateVariables', () => {
    it('should return true for text with variables', () => {
      expect(hasTemplateVariables('Hello {username}')).toBe(true);
    });

    it('should return false for text without variables', () => {
      expect(hasTemplateVariables('Hello World')).toBe(false);
    });
  });
});