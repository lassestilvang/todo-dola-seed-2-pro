import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Task } from '@/lib/types';

// Mock fetch
global.fetch = vi.fn();

const mockTask: Task = {
  id: 'test-id',
  listId: 'inbox',
  name: 'Test Task',
  description: 'Test description',
  date: null,
  deadline: Date.now() + 86400000,
  reminder: null,
  estimate: 60,
  actualTime: 30,
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
};

describe('Notion Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs task to notion', async () => {
    const mockResponse = { id: 'page-123' };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { syncTaskToNotion } = await import('@/lib/utils/notion-sync');
    const result = await syncTaskToNotion(mockTask, { apiKey: 'test-key', databaseId: 'db-123' });

    expect(result).toBe('page-123');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/pages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
        }),
      })
    );
  });
});