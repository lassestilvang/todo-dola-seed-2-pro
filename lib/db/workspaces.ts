import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '../types';

export async function getWorkspaces(): Promise<Workspace[]> {
  await initDb();
  return runQuery(
    'SELECT id, name, description, created_by as createdBy, created_at as createdAt, updated_at as updatedAt FROM workspaces ORDER BY created_at DESC'
  ) as unknown as Promise<Workspace[]>;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  await initDb();
  const row = runGet(
    'SELECT id, name, description, created_by as createdBy, created_at as createdAt, updated_at as updatedAt FROM workspaces WHERE id = ?',
    [id]
  );
  if (!row || !row.id) return null;
  return row as unknown as Workspace;
}

export async function createWorkspace(data: { name: string; description?: string | null; createdBy?: string }): Promise<Workspace> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO workspaces (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.name, data.description || null, data.createdBy || null, nowVal, nowVal]
  );
  saveDb();

  return { id, name: data.name, description: data.description || null, createdBy: data.createdBy || null, createdAt: nowVal, updatedAt: nowVal };
}

export async function updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace | null> {
  await initDb();
  const workspace = await getWorkspaceById(id);
  if (!workspace) return null;

  const nowVal = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  updates.push('updated_at = ?'); values.push(nowVal);
  values.push(id);

  runQuery(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`, values);
  saveDb();

  return { ...workspace, ...data, updatedAt: nowVal };
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM workspace_members WHERE workspace_id = ?', [id]);
  runQuery('DELETE FROM tasks WHERE workspace_id = ?', [id]);
  runQuery('DELETE FROM workspaces WHERE id = ?', [id]);
  saveDb();
  return true;
}

// Workspace Members
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  await initDb();
  return runQuery(
    'SELECT id, workspace_id as workspaceId, user_id as userId, role, joined_at as joinedAt FROM workspace_members WHERE workspace_id = ? ORDER BY role DESC, joined_at ASC',
    [workspaceId]
  ) as unknown as Promise<WorkspaceMember[]>;
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole = 'editor'): Promise<WorkspaceMember> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
    [id, workspaceId, userId, role, nowVal]
  );
  saveDb();

  return { id, workspaceId, userId, role, joinedAt: nowVal };
}

export async function updateWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<boolean> {
  await initDb();
  runQuery(
    'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
    [role, workspaceId, userId]
  );
  saveDb();
  return true;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [workspaceId, userId]);
  saveDb();
  return true;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  await initDb();
  return runQuery(
    `SELECT w.id, w.name, w.description, w.created_by as createdBy, w.created_at as createdAt, w.updated_at as updatedAt
     FROM workspaces w
     JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = ?
     ORDER BY w.created_at DESC`,
    [userId]
  ) as unknown as Promise<Workspace[]>;
}

export async function getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  await initDb();
  const row = runGet(
    'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
    [workspaceId, userId]
  );
  return (row?.role as WorkspaceRole) || null;
}