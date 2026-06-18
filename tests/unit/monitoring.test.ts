import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Monitoring Utilities', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('captureError', () => {
    it('logs error', async () => {
      const { captureError } = await import('@/lib/utils/monitoring');
      const error = new Error('Test error');

      captureError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('logs error with context', async () => {
      const { captureError } = await import('@/lib/utils/monitoring');
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      captureError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('logs event', async () => {
      const { trackEvent } = await import('@/lib/utils/monitoring');

      trackEvent({ name: 'test_event', properties: { value: 123 } });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles event without properties', async () => {
      const { trackEvent } = await import('@/lib/utils/monitoring');

      trackEvent({ name: 'simple_event' });

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('measureFeatureUsage', () => {
    it('tracks feature usage event', async () => {
      const { measureFeatureUsage } = await import('@/lib/utils/monitoring');

      measureFeatureUsage('task_create', 150);

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('initMonitoring', () => {
    it('initializes without error', async () => {
      const { initMonitoring } = await import('@/lib/utils/monitoring');

      expect(() => initMonitoring()).not.toThrow();
    });
  });
});