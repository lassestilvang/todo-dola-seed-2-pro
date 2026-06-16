import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';

const defaultPreferences = {
  theme: 'dark',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  startOfWeek: 0,
  defaultPriority: 'medium',
  reminders: {
    email: true,
    push: true,
    slack: false,
  },
  sync: {
    autoSync: true,
    syncInterval: 5,
  },
};

interface Preferences {
  theme: string;
  dateFormat: string;
  timeFormat: string;
  startOfWeek: number;
  defaultPriority: string;
  reminders: { email: boolean; push: boolean; slack: boolean };
  sync: { autoSync: boolean; syncInterval: number };
}

export const GET = withErrorHandling(withRateLimit()(async () => {
  await initDb();
  const db = getDb();
  if (!db) return Response.json({ data: defaultPreferences });

  const result = db.exec('SELECT preferences FROM users WHERE preferences IS NOT NULL LIMIT 1');
  if (!result || result.length === 0) {
    return Response.json({ data: defaultPreferences });
  }

  const prefs = result[0]?.values[0]?.[0];
  if (typeof prefs === 'string') {
    return Response.json({ data: JSON.parse(prefs) });
  }
  return Response.json({ data: defaultPreferences });
}));

export const PATCH = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) return Response.json({ error: 'Database not initialized' }, { status: 500 });

  const body = await request.json();
  const preferences: Preferences = { ...defaultPreferences, ...body };

  const result = db.exec('SELECT id FROM users LIMIT 1');
  const userId = result[0]?.values[0]?.[0];

  if (userId) {
    db.exec('UPDATE users SET preferences = ? WHERE id = ?', [JSON.stringify(preferences), userId]);
  } else {
    db.exec(
      'INSERT INTO users (id, email, name, preferences, created_at) VALUES (?, ?, ?, ?, ?)',
      ['pref-user', 'preferences@local', 'Preferences', JSON.stringify(preferences), Date.now()]
    );
  }

  saveDb();
  return Response.json({ data: preferences });
}));
