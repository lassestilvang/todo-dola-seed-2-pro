import { expect, test, describe, beforeEach, vi } from 'vitest';
import { generateDeviceId, pushSync, pullSync } from '@/lib/utils/sync';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

describe('Sync Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('generateDeviceId', () => {
    test('generates device id on first call', () => {
      const id1 = generateDeviceId();
      expect(id1).toMatch(/^device_/);
    });

    test('returns same device id on subsequent calls', () => {
      const id1 = generateDeviceId();
      const id2 = generateDeviceId();
      expect(id1).toBe(id2);
    });

    test('stores device id in localStorage', () => {
      generateDeviceId();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('deviceId', expect.stringContaining('device_'));
    });
  });

  describe('pushSync', () => {
    test('returns false on fetch error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      const result = await pushSync({ lists: [], labels: [], tasks: [], subtasks: [], taskLabels: [], taskDependencies: [], timeEntries: [], taskTemplates: [], comments: [], lastModified: 0 });
      expect(result).toBe(false);
    });

    test('returns false on non-ok response', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });
      const result = await pushSync({ lists: [], labels: [], tasks: [], subtasks: [], taskLabels: [], taskDependencies: [], timeEntries: [], taskTemplates: [], comments: [], lastModified: 0 });
      expect(result).toBe(false);
    });

    test('returns true when sync successful without conflict', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conflict: false }),
      });
      const result = await pushSync({ lists: [], labels: [], tasks: [], subtasks: [], taskLabels: [], taskDependencies: [], timeEntries: [], taskTemplates: [], comments: [], lastModified: 0 });
      expect(result).toBe(true);
    });

    test('returns false when conflict detected', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conflict: true }),
      });
      const result = await pushSync({ lists: [], labels: [], tasks: [], subtasks: [], taskLabels: [], taskDependencies: [], timeEntries: [], taskTemplates: [], comments: [], lastModified: 0 });
      expect(result).toBe(false);
    });
  });

  describe('pullSync', () => {
    test('returns null on fetch error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      const result = await pullSync();
      expect(result).toBeNull();
    });

    test('returns null on non-ok response', async () => {
      (global.fetch as any).mockResolvedValue({ ok: false });
      const result = await pullSync();
      expect(result).toBeNull();
    });

    test('returns null when no data in response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const result = await pullSync();
      expect(result).toBeNull();
    });

    test('returns sync data on successful response', async () => {
      const syncData = { lists: [], labels: [], tasks: [], subtasks: [], taskLabels: [], taskDependencies: [], timeEntries: [], taskTemplates: [], comments: [], lastModified: Date.now() };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: syncData }),
      });
      const result = await pullSync();
      expect(result).toEqual(syncData);
    });

    test('includes since parameter when provided', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { lists: [] } }),
      });
      await pullSync(12345);
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('since=12345');
    });

    test('handles undefined since parameter', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { lists: [] } }),
      });
      await pullSync();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).not.toContain('since=');
    });
  });
});