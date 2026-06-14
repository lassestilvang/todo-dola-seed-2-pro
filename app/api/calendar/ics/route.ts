import { initDb, getDb } from '@/lib/db';

function generateICS(tasks: Array<{ id: string; name: string; description: string | null; date: number | null; deadline: number | null; completed: number }>): string {
  const now = new Date();
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Todo Dola Seed 2 Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Todo Dola Tasks',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const task of tasks) {
    if (!task.date) continue;

    const startDate = new Date(task.date);
    const uid = `${task.id}@todo-dola-seed-2-pro`;
    const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Calculate end time (1 hour default, or use deadline if available)
    let dtend: string;
    if (task.deadline) {
      const endDate = new Date(task.deadline);
      dtend = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } else {
      const endDate = new Date(task.date + 60 * 60 * 1000);
      dtend = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${task.name.replace(/\n/g, '\\n')}`,
      task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}` : '',
      task.completed ? 'STATUS:COMPLETED' : 'STATUS:NEEDS-ACTION',
      'END:VEVENT'
    );
  }

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'ics';

    await initDb();
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const result = db.exec(`
      SELECT id, name, description, date, deadline, completed
      FROM tasks
      WHERE deleted_at IS NULL AND date IS NOT NULL
      ORDER BY date ASC
    `);

    if (!result || result.length === 0) {
      return new Response(generateICS([]), {
        headers: {
          'Content-Type': 'text/calendar',
          'Content-Disposition': 'attachment; filename=empty-tasks.ics',
        },
      });
    }

    const tasks = result[0].values.map((row: unknown[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      description: row[2] as string,
      date: row[3] as number,
      deadline: row[4] as number,
      completed: row[5] as number,
    }));

    const ics = generateICS(tasks);

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename=tasks.ics',
      },
    });
  } catch (error) {
    console.error('Failed to generate ICS:', error);
    return Response.json({ error: 'Failed to generate ICS' }, { status: 500 });
  }
}