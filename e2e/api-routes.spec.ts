import { test, expect } from '@playwright/test';

test.describe('API Routes - E2E Tests', () => {
  test.describe('Tasks API', () => {
    test('GET /api/tasks returns empty array', async ({ request }) => {
      const response = await request.get('/api/tasks');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/tasks creates task', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: { name: 'New Task from E2E' },
      });
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('New Task from E2E');
    });

    test('POST /api/tasks returns 400 for missing name', async ({ request }) => {
      const response = await request.post('/api/tasks', {
        data: { listId: 'inbox' },
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Lists API', () => {
    test('GET /api/lists returns lists', async ({ request }) => {
      const response = await request.get('/api/lists');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      const inbox = data.find((l: any) => l.isInbox);
      expect(inbox).toBeDefined();
      expect(inbox.name).toBe('Inbox');
    });

    test('POST /api/lists creates list', async ({ request }) => {
      const response = await request.post('/api/lists', {
        data: { name: 'New List' },
      });
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('New List');
    });
  });

  test.describe('Labels API', () => {
    test('GET /api/labels returns array', async ({ request }) => {
      const response = await request.get('/api/labels');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/labels creates label', async ({ request }) => {
      const response = await request.post('/api/labels', {
        data: { name: 'Test Label' },
      });
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('Test Label');
    });
  });

  test.describe('Templates API', () => {
    test('GET /api/templates returns array', async ({ request }) => {
      const response = await request.get('/api/templates');
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe('Search API', () => {
    test('GET /api/search returns results', async ({ request }) => {
      const response = await request.get('/api/search?query=test');
      expect(response.status()).toBe(200);
    });
  });
});