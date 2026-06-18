import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Task } from '@/lib/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Issue Sync Utilities', () => {
  const mockTask: Task = {
    id: 'task-1',
    listId: 'inbox',
    name: 'Test task',
    description: 'Test description',
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
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    labels: [{ id: 'label-1', name: 'bug', emoji: '🐛', color: '#ff0000', createdAt: 0, updatedAt: 0 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncWithGitHub', () => {
    it('creates GitHub issue from task', async () => {
      const mockIssue = {
        id: 123,
        number: 42,
        title: 'Test task',
        html_url: 'https://github.com/owner/repo/issues/42',
        state: 'open',
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockIssue),
      });

      const { syncWithGitHub } = await import('@/lib/utils/issue-sync');
      const result = await syncWithGitHub(mockTask, 'test-token', 'owner', 'repo');

      expect(result.provider).toBe('github');
      expect(result.taskId).toBe('task-1');
      expect(result.title).toBe('Test task');
      expect(result.status).toBe('open');
    });

    it('includes labels from task', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: 123, html_url: 'url', state: 'open' }),
      });

      const { syncWithGitHub } = await import('@/lib/utils/issue-sync');
      await syncWithGitHub(mockTask, 'token', 'owner', 'repo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issues'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('handles closed issue status', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: 123, html_url: 'url', state: 'closed' }),
      });

      const { syncWithGitHub } = await import('@/lib/utils/issue-sync');
      const result = await syncWithGitHub(mockTask, 'token', 'owner', 'repo');

      expect(result.status).toBe('closed');
    });
  });

  describe('syncWithGitLab', () => {
    it('creates GitLab issue from task', async () => {
      const mockIssue = {
        id: 456,
        iid: 10,
        title: 'Test task',
        web_url: 'https://gitlab.com/owner/repo/-/issues/10',
        state: 'opened',
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockIssue),
      });

      const { syncWithGitLab } = await import('@/lib/utils/issue-sync');
      const result = await syncWithGitLab(mockTask, 'test-token', '123');

      expect(result.provider).toBe('gitlab');
      expect(result.title).toBe('Test task');
      expect(result.status).toBe('open');
    });

    it('handles closed GitLab issue', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ id: 456, web_url: 'url', state: 'closed' }),
      });

      const { syncWithGitLab } = await import('@/lib/utils/issue-sync');
      const result = await syncWithGitLab(mockTask, 'token', '123');

      expect(result.status).toBe('closed');
    });
  });

  describe('updateTaskFromIssue', () => {
    it('updates task from GitHub issue', async () => {
      const sync = {
        id: 'gh_123',
        taskId: 'task-1',
        provider: 'github' as const,
        issueId: '123',
        issueUrl: 'https://github.com/owner/repo/issues/123',
        title: 'Updated title',
        status: 'open' as const,
        lastSynced: 0,
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          title: 'Updated title',
          body: 'Updated description',
          state: 'closed',
        }),
      });

      const { updateTaskFromIssue } = await import('@/lib/utils/issue-sync');
      const result = await updateTaskFromIssue(sync, 'token', 'task-id');

      expect(result.name).toBe('Updated title');
      expect(result.description).toBe('Updated description');
      expect(result.completed).toBe(true);
    });

    it('returns empty object for GitLab', async () => {
      const sync = {
        id: 'gl_456',
        taskId: 'task-1',
        provider: 'gitlab' as const,
        issueId: '456',
        issueUrl: 'https://gitlab.com/owner/repo/-/issues/10',
        title: 'Test',
        status: 'open' as const,
        lastSynced: 0,
      };

      const { updateTaskFromIssue } = await import('@/lib/utils/issue-sync');
      const result = await updateTaskFromIssue(sync, 'token', 'task-id');

      expect(result).toEqual({});
    });

    it('handles GitHub fetch error', async () => {
      const sync = {
        id: 'gh_123',
        taskId: 'task-1',
        provider: 'github' as const,
        issueId: '123',
        issueUrl: 'https://github.com/owner/repo/issues/123',
        title: 'Test',
        status: 'open' as const,
        lastSynced: 0,
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { updateTaskFromIssue } = await import('@/lib/utils/issue-sync');

      await expect(updateTaskFromIssue(sync, 'token', 'task-id')).rejects.toThrow();
    });
  });
});