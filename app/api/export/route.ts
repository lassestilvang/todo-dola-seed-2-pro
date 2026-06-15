import { initDb, getDb, saveDb } from '@/lib/db';
import { getTasks, getLabels, getLists } from '@/lib/db/queries';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { randomUUID } from 'crypto';

type ExportData = Record<string, Record<string, unknown>[]>;

function generateMarkdown(tasks: any[], lists: any[], labels: any[]): string {
  const listMap = new Map(lists.map((l: any) => [l.id, l]));
  const labelMap = new Map(labels.map((l: any) => [l.id, l]));

  let md = '# Task Export\n\n';
  md += `Exported on: ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;

  // Group tasks by list
  const tasksByList = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const listId = task.list_id || 'inbox';
    if (!acc[listId]) acc[listId] = [];
    acc[listId].push(task);
    return acc;
  }, {});

  Object.entries(tasksByList).forEach(([listId, listTasks]) => {
    const list = listMap.get(listId) || { name: 'Inbox' };
    md += `## ${list.name}\n\n`;

    listTasks.forEach((task: any) => {
      const taskLabels = task.labels ? JSON.parse(task.labels).map((l: any) => labelMap.get(l.id)).filter(Boolean) : [];
      const isCompleted = task.completed === 1;
      const status = isCompleted ? '✅' : '⬜';

      md += `### ${status} ${task.name}\n\n`;
      if (task.description) {
        md += `${task.description}\n\n`;
      }
      if (taskLabels.length > 0) {
        md += `**Labels:** ${taskLabels.map((l: any) => l.name).join(', ')}\n\n`;
      }
      if (task.priority && task.priority !== 'none') {
        md += `**Priority:** ${task.priority}\n\n`;
      }
      if (task.date) {
        const dueDate = new Date(task.date).toLocaleDateString();
        md += `**Due:** ${dueDate}\n\n`;
      }
      md += '---\n\n';
    });
  });

  return md;
}

function generateCsv(tasks: any[], lists: any[], labels: any[]): string {
  const listMap = new Map(lists.map((l: any) => [l.id, l]));
  const labelMap = new Map(labels.map((l: any) => [l.id, l]));

  const headers = ['ID', 'Name', 'Description', 'List', 'Priority', 'Due Date', 'Completed', 'Labels'];
  const rows = tasks.map((task: any) => {
    const taskLabels = task.labels ? JSON.parse(task.labels).map((l: any) => labelMap.get(l.id)?.name).filter(Boolean) : [];
    return [
      task.id,
      `"${(task.name || '').replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      listMap.get(task.list_id)?.name || 'Inbox',
      task.priority || 'none',
      task.date ? new Date(task.date).toISOString().split('T')[0] : '',
      task.completed === 1 ? 'Yes' : 'No',
      taskLabels.join('; '),
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generateIcs(tasks: any[], lists: any[], labels: any[]): string {
  const now = new Date();
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  tasks.forEach((task: any) => {
    if (!task.date) return;

    const dueDate = new Date(task.date);
    const uid = `${task.id}@taskplanner.local`;
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `SUMMARY:${(task.name || '').replace(/\n/g, '\\n')}`,
      task.description ? `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}` : '',
      task.completed === 1 ? 'STATUS:COMPLETED' : 'STATUS:TODO',
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

// Conflict resolution strategies
type ConflictStrategy = 'skip' | 'rename' | 'overwrite';

function resolveNameConflict(name: string, existingNames: Set<string>): string {
  let newName = name;
  let counter = 1;
  while (existingNames.has(newName)) {
    newName = `${name} (${counter})`;
    counter++;
  }
  return newName;
}

async function importData(data: ExportData, strategy: ConflictStrategy = 'skip'): Promise<{ success: boolean; imported: number; skipped: number }> {
  await initDb();
  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  let imported = 0;
  let skipped = 0;

  // Get existing names for conflict resolution
  const existingLists = await getLists();
  const existingListNames = new Set(existingLists.map(l => l.name));

  // Import lists first
  const listIdMap = new Map<string, string>();
  for (const list of data.lists || []) {
    if (strategy === 'skip') {
      if (existingListNames.has(list.name as string)) {
        skipped++;
        continue;
      }
    }
    if (strategy === 'rename' && existingListNames.has(list.name as string)) {
      const newName = resolveNameConflict(list.name as string, existingListNames);
      const id = randomUUID();
      db.exec('INSERT INTO lists (id, name, emoji, color, is_inbox, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)',
        [id, newName, list.emoji, list.color, Date.now(), Date.now()] as (string | number | null)[]);
      listIdMap.set(list.id as string, id);
      imported++;
    }
  }

  // Import labels
  const labelIdMap = new Map<string, string>();
  const existingLabels = await getLabels();
  const existingLabelNames = new Set(existingLabels.map(l => l.name));

  for (const label of data.labels || []) {
    if (strategy === 'skip' && existingLabelNames.has(label.name as string)) {
      skipped++;
      continue;
    }
    const id = randomUUID();
    db.exec('INSERT INTO labels (id, name, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, label.name, label.emoji, label.color, Date.now(), Date.now()] as (string | number | null)[]);
    labelIdMap.set(label.id as string, id);
    imported++;
  }

  // Import tasks
  for (const task of data.tasks || []) {
    const id = randomUUID();
    const listId = listIdMap.get(task.list_id as string) || task.list_id;
    const now = Date.now();

    db.exec(
      'INSERT INTO tasks (id, list_id, name, description, date, deadline, reminder, estimate, actual_time, priority, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, listId, task.name, task.description, task.date, task.deadline, task.reminder, task.estimate, task.actual_time, task.priority, now, now, 0] as (string | number | null)[]
    );

    // Import task-labels
    if (task.labels) {
      const parsedLabels = JSON.parse(task.labels as string);
      for (const labelId of parsedLabels.map((l: any) => labelIdMap.get(l.id) || l.id)) {
        db.exec('INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)', [id, labelId]);
      }
    }

    imported++;
  }

  saveDb();
  return { success: true, imported, skipped };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    await initDb();

    if (format === 'markdown') {
      const tasks = await getTasks({});
      const lists = await getLists();
      const labels = await getLabels();
      const markdown = generateMarkdown(tasks as any, lists, labels);

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename=tasks.md',
        },
      });
    }

    if (format === 'pdf') {
      const tasks = await getTasks({});
      const lists = await getLists();
      const labels = await getLabels();

      return Response.json({
        success: true,
        data: { tasks, lists, labels },
        message: 'Use the ExportImport component to download PDF',
      });
    }

    if (format === 'csv') {
      const tasks = await getTasks({});
      const lists = await getLists();
      const labels = await getLabels();
      const csv = generateCsv(tasks as any, lists, labels);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=tasks.csv',
        },
      });
    }

    if (format === 'ics') {
      const tasks = await getTasks({});
      const lists = await getLists();
      const labels = await getLabels();
      const ics = generateIcs(tasks as any, lists, labels);

      return new Response(ics, {
        headers: {
          'Content-Type': 'text/calendar',
          'Content-Disposition': 'attachment; filename=tasks.ics',
        },
      });
    }

    // Default JSON export
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const tables = ['lists', 'labels', 'tasks', 'task_labels', 'subtasks', 'task_history'];
    const data: ExportData = {};

    for (const table of tables) {
      const result = db.exec(`SELECT * FROM ${table}`);
      if (result.length > 0) {
        const columns = result[0].columns as string[];
        data[table] = result[0].values.map((row: unknown[]) => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } else {
        data[table] = [];
      }
    }

    return Response.json({ data });
  } catch (error) {
    console.error('Failed to export:', error);
    return Response.json({ error: 'Failed to export' }, { status: 500 });
  }
}

// POST /api/export -> Import data with conflict resolution
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const body = await request.json();
  const { data, strategy } = body;

  if (!data) {
    throw new Error('No data provided for import');
  }

  const result = await importData(data, (strategy as ConflictStrategy) || 'skip');
  return Response.json({ data: result });
}));