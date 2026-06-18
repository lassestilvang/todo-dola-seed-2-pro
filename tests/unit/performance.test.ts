import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('measureAsyncPerformance', () => {
    it('measures async function execution time', async () => {
      const { measureAsyncPerformance, clearMetrics } = await import('@/lib/utils/performance');
      clearMetrics();

      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      };

      const result = await measureAsyncPerformance('test-function', fn);

      expect(result).toBe('result');
    });

    it('returns result from async function', async () => {
      const { measureAsyncPerformance, clearMetrics } = await import('@/lib/utils/performance');
      clearMetrics();

      const fn = async () => 42;

      const result = await measureAsyncPerformance('test', fn);

      expect(result).toBe(42);
    });
  });

  describe('measurePerformance', () => {
    it('measures synchronous function', async () => {
      const { measurePerformance, clearMetrics } = await import('@/lib/utils/performance');
      clearMetrics();

      const fn = () => 'sync result';

      const duration = measurePerformance('sync-fn', fn);

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('returns collected metrics', async () => {
      const { measureAsyncPerformance, getMetrics, clearMetrics } = await import('@/lib/utils/performance');
      clearMetrics();

      await measureAsyncPerformance('test', async () => 'result');

      const metrics = getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('clearMetrics', () => {
    it('clears all metrics', async () => {
      const { measureAsyncPerformance, getMetrics, clearMetrics } = await import('@/lib/utils/performance');

      await measureAsyncPerformance('test', async () => 'result');
      clearMetrics();

      const metrics = getMetrics();
      expect(metrics).toEqual([]);
    });
  });

  describe('optimizeQuery', () => {
    it('builds query with filters', async () => {
      const { optimizeQuery } = await import('@/lib/utils/performance');

      const baseQuery = 'SELECT * FROM tasks';
      const filters = { listId: 'inbox', completed: false };

      const result = optimizeQuery(baseQuery, filters);

      expect(result.query).toContain('WHERE');
      expect(result.params).toContain('inbox');
      expect(result.params).toContain(false);
    });

    it('returns base query when no filters', async () => {
      const { optimizeQuery } = await import('@/lib/utils/performance');

      const baseQuery = 'SELECT * FROM tasks';
      const filters = {};

      const result = optimizeQuery(baseQuery, filters);

      expect(result.query).toBe(baseQuery);
      expect(result.params).toEqual([]);
    });

    it('handles null and undefined values', async () => {
      const { optimizeQuery } = await import('@/lib/utils/performance');

      const baseQuery = 'SELECT * FROM tasks';
      const filters = { listId: 'inbox', optional: null, missing: undefined };

      const result = optimizeQuery(baseQuery, filters);

      expect(result.params).toEqual(['inbox']);
    });
  });

  describe('getCached', () => {
    it('returns cached data', async () => {
      const { getCached, setCached, clearCache } = await import('@/lib/utils/performance');
      clearCache();

      setCached('test-key', 'test-value');
      const result = getCached<string>('test-key');

      expect(result).toBe('test-value');
    });

    it('returns undefined for missing key', async () => {
      const { getCached, clearCache } = await import('@/lib/utils/performance');
      clearCache();

      const result = getCached('missing-key');

      expect(result).toBeUndefined();
    });
  });

  describe('setCached', () => {
    it('stores data with default TTL', async () => {
      const { getCached, setCached, clearCache } = await import('@/lib/utils/performance');
      clearCache();

      setCached('key', 'value');
      const result = getCached('key');

      expect(result).toBe('value');
    });
  });

  describe('clearCache', () => {
    it('clears all cached data', async () => {
      const { getCached, setCached, clearCache } = await import('@/lib/utils/performance');

      setCached('key1', 'value1');
      setCached('key2', 'value2');
      clearCache();

      expect(getCached('key1')).toBeUndefined();
      expect(getCached('key2')).toBeUndefined();
    });
  });
});