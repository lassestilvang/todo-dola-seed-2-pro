import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  generateInsights,
  getRecommendations,
} from '@/lib/services/intelligence-service';
import type { Task, Goal, Habit } from '@/lib/types';

describe('Intelligence Service', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      listId: 'inbox',
      name: 'Task 1',
      description: null,
      date: null,
      deadline: null,
      reminder: null,
      estimate: null,
      actualTime: null,
      priority: 'high',
      completed: true,
      completedAt: Date.now() - 86400000,
      recurringType: null,
      recurringConfig: null,
      attachmentPath: null,
      sortOrder: 0,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 86400000,
      deletedAt: null,
      labels: [{ id: '1', name: 'work', emoji: '', color: '', createdAt: 0, updatedAt: 0 }],
      subtasks: [],
      customFields: [],
      recurringExceptions: [],
    },
    {
      id: '2',
      listId: 'inbox',
      name: 'Task 2',
      description: null,
      date: null,
      deadline: null,
      reminder: null,
      estimate: null,
      actualTime: null,
      priority: 'medium',
      completed: false,
      completedAt: null,
      recurringType: null,
      recurringConfig: null,
      attachmentPath: null,
      sortOrder: 1,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      deletedAt: null,
      labels: [],
      subtasks: [],
      customFields: [],
      recurringExceptions: [],
    },
  ];

  describe('calculateMetrics', () => {
    it('calculates completion rate correctly', () => {
      const metrics = calculateMetrics(mockTasks);

      expect(metrics.completionRate).toBe(0.5);
    });

    it('returns productivity score', () => {
      const metrics = calculateMetrics(mockTasks);

      expect(metrics.productivityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.productivityScore).toBeLessThanOrEqual(100);
    });

    it('identifies top labels', () => {
      const metrics = calculateMetrics(mockTasks);

      expect(metrics.topLabels[0]).toEqual({ label: 'work', count: 1 });
    });
  });

  describe('generateInsights', () => {
    it('generates low completion warning for poor completion rate', () => {
      const lowCompletionTasks = mockTasks.map(t => ({ ...t, completed: false }));
      const metrics = calculateMetrics(lowCompletionTasks);
      const insights = generateInsights(metrics, lowCompletionTasks, [], []);

      expect(insights.some(i => i.type === 'warning')).toBe(true);
    });

    it('generates achievement for high completion rate', () => {
      const highCompletionTasks = mockTasks.map(t => ({
        ...t,
        completed: true,
        completedAt: Date.now(),
      }));
      const metrics = calculateMetrics(highCompletionTasks);
      const insights = generateInsights(metrics, highCompletionTasks, [], []);

      expect(insights.some(i => i.type === 'achievement')).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('returns recommendations for low productivity', () => {
      const metrics = {
        completionRate: 0.3,
        averageTaskTime: 30,
        streak: 0,
        productivityScore: 30,
        topLabels: [],
        peakHours: [],
      };

      const recommendations = getRecommendations(metrics, mockTasks);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.toLowerCase().includes('break down'))).toBe(true);
    });

    it('returns empty recommendations for high productivity', () => {
      const metrics = {
        completionRate: 0.9,
        averageTaskTime: 45,
        streak: 10,
        productivityScore: 90,
        topLabels: [],
        peakHours: [],
      };

      const recommendations = getRecommendations(metrics, mockTasks);

      expect(recommendations.length).toBeLessThan(3);
    });
  });
});