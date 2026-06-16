import { initDb, exportDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';

export const GET = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';

  const exportData = await exportDb();

  if (format === 'json') {
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="todo-dola-export.json"',
      },
    });
  }

  if (format === 'csv') {
    const csvRows = Object.entries(exportData.data)
      .map(([table, rows]) => {
        if (!Array.isArray(rows) || rows.length === 0) return '';
        const headers = Object.keys(rows[0] as Record<string, unknown>);
        const csvRows = [headers.join(',')];
        for (const row of rows as Record<string, unknown>[]) {
          csvRows.push(headers.map(h => `"${String(row[h] || '')}"`).join(','));
        }
        return csvRows.join('\n');
      })
      .filter(s => s);

    return new Response(csvRows.join('\n\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todo-dola-export.csv"',
      },
    });
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="todo-dola-export.json"',
    },
  });
}));
