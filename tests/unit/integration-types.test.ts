import { describe, it, expect } from 'vitest';
import type { Integration, Webhook, TaskLinkType } from '@/lib/types';

describe('Integration Types', () => {
  describe('Integration interface', () => {
    it('should accept valid integration data', () => {
      const integration: Integration = {
        id: 'test-id',
        type: 'notion',
        config: { databaseId: 'abc123', accessToken: 'token' },
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(integration.id).toBe('test-id');
      expect(integration.type).toBe('notion');
      expect(integration.enabled).toBe(true);
    });

    it('should support all integration types', () => {
      const types: Integration['type'][] = ['notion', 'slack', 'caldav', 'webhook'];

      types.forEach(type => {
        const integration: Integration = {
          id: `id-${type}`,
          type,
          config: {},
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        expect(integration.type).toBe(type);
      });
    });
  });

  describe('Webhook interface', () => {
    it('should accept valid webhook data', () => {
      const webhook: Webhook = {
        id: 'webhook-id',
        url: 'https://example.com/webhook',
        events: ['task.created', 'task.completed'],
        secret: 'secret123',
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(webhook.url).toBe('https://example.com/webhook');
      expect(webhook.events).toHaveLength(2);
      expect(webhook.enabled).toBe(true);
    });
  });

  describe('TaskLinkType', () => {
    it('should support all link types', () => {
      const linkTypes: TaskLinkType[] = ['blocks', 'related', 'depends_on', 'duplicate'];

      linkTypes.forEach(type => {
        expect(type).toMatch(/^(blocks|related|depends_on|duplicate)$/);
      });
    });
  });
});