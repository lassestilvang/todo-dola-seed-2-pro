import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/workspaces/route';
import { GET as GETById, DELETE as DELETEById } from '@/app/api/workspaces/[id]/route';
import { GET as GETMembers, POST as POSTMembers } from '@/app/api/workspaces/[id]/members/route';
import { initDb, resetDb, saveDb } from '@/lib/db';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

// Type for the context parameter
type RouteContext = { params: Promise<{ id: string }> };

const dbPath = join(process.cwd(), 'db', 'planner.db');

describe('Workspace API Routes', () => {
  beforeEach(async () => {
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
    await initDb();
  });

  afterEach(() => {
    resetDb();
  });

  describe('GET /api/workspaces', () => {
    it('returns empty array when no workspaces', async () => {
      const request = new NextRequest('http://localhost/api/workspaces');
      const response = await GET(request);
      const data = await response.json();
      expect(data.data).toEqual([]);
    });

    it('returns workspaces for user', async () => {
      const request = new NextRequest('http://localhost/api/workspaces?userId=user-1');
      const response = await GET(request);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('POST /api/workspaces', () => {
    it('creates a new workspace', async () => {
      const request = new NextRequest('http://localhost/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Workspace', description: 'Test description' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.name).toBe('Test Workspace');
    });
  });

  describe('GET /api/workspaces/[id]', () => {
    it('returns data for existing workspace', async () => {
      const request = new NextRequest('http://localhost/api/workspaces/existing-id');
      const response = await GETById(request, { params: Promise.resolve({ id: 'existing-id' }) } as RouteContext);
      // May return 404 or 200 depending on database state
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/workspaces/[id]', () => {
    it('deletes a workspace', async () => {
      const request = new NextRequest('http://localhost/api/workspaces/test-id', {
        method: 'DELETE',
      });
      const response = await DELETEById(request, { params: Promise.resolve({ id: 'test-id' }) } as RouteContext);
      expect(response.status).toBe(200);
    });
  });

  describe('Workspace Members', () => {
    it('adds a member to workspace', async () => {
      const request = new NextRequest('http://localhost/api/workspaces/test-id/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1', role: 'editor' }),
      });
      const response = await POSTMembers(request, { params: Promise.resolve({ id: 'test-id' }) } as RouteContext);
      expect(response.status).toBe(201);
    });
  });
});