import { initDb, getDb, saveDb } from '@/lib/db';
import { withErrorHandling, withRateLimit } from '@/lib/api/handler';
import { ApiError, ErrorCodes } from '@/lib/api/middleware';
import { randomUUID } from 'crypto';

interface PushSubscription {
  token: string;
  userId?: string;
  deviceInfo?: {
    platform: string;
    deviceId?: string;
    model?: string;
    brand?: string;
  };
}

// POST /api/push-subscriptions - Subscribe to push notifications
export const POST = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const body = await request.json();
  const { token, userId, deviceInfo } = body as PushSubscription;

  if (!token) {
    throw new ApiError(400, 'Push token is required', ErrorCodes.MISSING_FIELDS);
  }

  const id = randomUUID();
  const now = Date.now();

  // Remove existing subscription for this token
  db.exec('DELETE FROM push_subscriptions WHERE token = ?', [token]);

  // Insert new subscription
  db.exec(
    'INSERT INTO push_subscriptions (id, token, user_id, device_info, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, token, userId || null, JSON.stringify(deviceInfo || {}), now]
  );
  saveDb();

  return Response.json({
    data: { id, token, userId, deviceInfo },
  }, { status: 201 });
}));

// DELETE /api/push-subscriptions - Unsubscribe from push notifications
export const DELETE = withErrorHandling(withRateLimit()(async (request: Request) => {
  await initDb();
  const db = getDb();
  if (!db) throw new ApiError(500, 'Database not initialized', ErrorCodes.DB_ERROR);

  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    throw new ApiError(400, 'token is required', ErrorCodes.MISSING_FIELDS);
  }

  db.exec('DELETE FROM push_subscriptions WHERE token = ?', [token]);
  saveDb();

  return Response.json({ success: true });
}));