import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';

export interface Mention {
  id: string;
  taskId: string;
  mentionedUserId: string;
  context: string;
  contextType: 'comment' | 'note' | 'description';
  contextId: string | null;
  notified: boolean;
  createdAt: number;
}

export async function getMentionsForUser(userId: string, limit: number = 50): Promise<Mention[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, mentioned_user_id as mentionedUserId, context, context_type as contextType, context_id as contextId, notified, created_at as createdAt FROM mentions WHERE mentioned_user_id = ? AND notified = 0 ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  ) as unknown as Promise<Mention[]>;
}

export async function createMention(data: {
  taskId: string;
  mentionedUserId: string;
  context: string;
  contextType: 'comment' | 'note' | 'description';
  contextId?: string | null;
}): Promise<Mention> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO mentions (id, task_id, mentioned_user_id, context, context_type, context_id, notified, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
    [id, data.taskId, data.mentionedUserId, data.context, data.contextType, data.contextId || null, nowVal]
  );
  saveDb();

  return {
    id,
    taskId: data.taskId,
    mentionedUserId: data.mentionedUserId,
    context: data.context,
    contextType: data.contextType,
    contextId: data.contextId || null,
    notified: false,
    createdAt: nowVal,
  };
}

export async function markMentionAsRead(id: string): Promise<void> {
  await initDb();
  runQuery('UPDATE mentions SET notified = 1 WHERE id = ?', [id]);
  saveDb();
}

export async function markAllMentionsAsRead(userId: string): Promise<void> {
  await initDb();
  runQuery('UPDATE mentions WHERE mentioned_user_id = ? AND notified = 0', [userId]);
  saveDb();
}

// Extract mentions from text and create mention records
export async function processMentions(text: string, taskId: string, contextType: 'comment' | 'note' | 'description', contextId?: string | null): Promise<void> {
  const { createMention } = await import('./mentions');
  const mentionRegex = /@(\w+)/g;
  const users: Record<string, string> = {}; // username -> userId mapping would come from user service

  // For now, store mentions with username (real implementation would resolve to user IDs)
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    // In a real implementation, you'd look up the user by username
    // await createMention({ taskId, mentionedUserId: userId, context: text, contextType, contextId });
  }
}