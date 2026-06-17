import type { Task } from '@/lib/types';

interface NotionDatabase {
  id: string;
  title: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export async function syncTaskToNotion(task: Task, config: NotionConfig): Promise<string> {
  const response = await fetch(`https://api.notion.com/v1/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties: {
        'Name': {
          title: [{ text: { content: task.name } }],
        },
        'Description': task.description ? {
          rich_text: [{ text: { content: task.description } }],
        } : undefined,
        'Status': {
          select: { name: task.completed ? 'Complete' : 'In Progress' },
        },
        'Priority': task.priority !== 'none' ? {
          select: { name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) },
        } : undefined,
        'Due Date': task.deadline ? {
          date: { start: new Date(task.deadline).toISOString().split('T')[0] },
        } : undefined,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  const result = await response.json() as { id: string };
  return result.id;
}

export async function fetchNotionTasks(config: NotionConfig): Promise<Task[]> {
  const response = await fetch(`https://api.notion.com/v1/databases/${config.databaseId}/query`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  const result = await response.json() as { results: NotionPage[] };
  const tasks: Task[] = [];

  for (const page of result.results) {
    const props = page.properties;
    const task: Task = {
      id: page.id,
      listId: 'inbox',
      name: getNotionProperty(props, 'Name', 'title') || 'Untitled',
      description: getNotionProperty(props, 'Description', 'rich_text') ?? null,
      date: null,
      deadline: getNotionProperty(props, 'Due Date', 'date') ? new Date(getNotionProperty(props, 'Due Date', 'date')!).getTime() : null,
      reminder: null,
      estimate: null,
      actualTime: null,
      priority: (getNotionProperty(props, 'Priority', 'select') as 'high' | 'medium' | 'low' | 'none') || 'none',
      completed: getNotionProperty(props, 'Status', 'select') === 'Complete',
      completedAt: null,
      recurringType: null,
      recurringConfig: null,
      attachmentPath: null,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      workspaceId: null,
    };
    tasks.push(task);
  }

  return tasks;
}

function getNotionProperty(properties: Record<string, unknown>, name: string, type: string): string | undefined {
  const prop = properties[name];
  if (!prop) return undefined;

  const typedProp = prop as Record<string, unknown>;
  if (type === 'title' || type === 'rich_text') {
    const richText = typedProp[type] as Array<{ plain_text?: string }>;
    return richText?.[0]?.plain_text;
  }
  if (type === 'date') {
    return typedProp[type] as string;
  }
  if (type === 'select') {
    return (typedProp[type] as { name?: string })?.name;
  }
  return undefined;
}