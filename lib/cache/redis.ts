// Redis caching layer for production
// Install ioredis with: pnpm add ioredis
let redis: any = null;
let redisCheckDone = false;

function checkRedis() {
  if (redisCheckDone) return;
  redisCheckDone = true;

  if (!process.env.REDIS_URL) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require('ioredis');
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
  } catch {
    console.warn('ioredis not installed, falling back to in-memory rate limiting');
  }
}

export function getRedis(): any {
  checkRedis();
  return redis;
}

export function isRedisAvailable(): boolean {
  return redis !== null && process.env.REDIS_URL !== undefined;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function delCached(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

export async function clearPattern(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Cache clear pattern error:', error);
  }
}

// Cache keys for common operations
export const CACHE_KEYS = {
  tasks: (userId: string) => `tasks:${userId}`,
  task: (id: string) => `task:${id}`,
  lists: (userId: string) => `lists:${userId}`,
  labels: (userId: string) => `labels:${userId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  search: (query: string, userId: string) => `search:${userId}:${query}`,
};