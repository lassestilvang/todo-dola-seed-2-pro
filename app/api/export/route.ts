import { initDb, getDb } from '@/lib/db';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    await initDb();
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

    if (format === 'markdown') {
      const tasks = data.tasks || [];
      const lists = data.lists || [];
      const labels = data.labels || [];
      const markdown = generateMarkdown(tasks, lists, labels);

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename=tasks.md',
        },
      });
    }

    if (format === 'pdf') {
      // Generate a proper PDF file using the browser API
      // This endpoint returns JSON with the data needed for client-side PDF generation
      const tasks = data.tasks || [];
      const lists = data.lists || [];
      const labels = data.labels || [];

      return Response.json({
        success: true,
        data: { tasks, lists, labels },
        message: 'Use the ExportImport component to download PDF',
      });
    }

    if (format === 'csv') {
      const tasks = data.tasks || [];
      const lists = data.lists || [];
      const labels = data.labels || [];
      const csv = generateCsv(tasks, lists, labels);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=tasks.csv',
        },
      });
    }

    if (format === 'ics') {
      const tasks = data.tasks || [];
      const lists = data.lists || [];
      const labels = data.labels || [];
      const ics = generateIcs(tasks, lists, labels);

      return new Response(ics, {
        headers: {
          'Content-Type': 'text/calendar',
          'Content-Disposition': 'attachment; filename=tasks.ics',
        },
      });
    }

    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to export:', error);
    return Response.json({ error: 'Failed to export' }, { status: 500 });
  }
}