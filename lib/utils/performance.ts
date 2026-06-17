// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];

export function measurePerformance<T>(name: string, fn: () => T | Promise<T>): number {
  const start = performance.now();

  const result = fn();
  const duration = performance.now() - start;

  metrics.push({ name, duration, timestamp: Date.now() });

  if (result instanceof Promise) {
    return duration; // For async, still return the initial duration
  }

  return duration;
}

export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  metrics.push({ name, duration: end - start, timestamp: Date.now() });

  return result;
}

export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

export function clearMetrics() {
  metrics.length = 0;
}

// Query optimization helper
export function optimizeQuery(baseQuery: string, filters: Record<string, unknown>): { query: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  }

  const query = conditions.length > 0
    ? `${baseQuery} WHERE ${conditions.join(' AND ')}`
    : baseQuery;

  return { query, params };
}

// Cache helper for frequent queries
const cache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string, ttlMs: number = 60000): T | undefined {
  const cached = cache.get(key);
  if (!cached) return undefined;

  if (Date.now() > cached.expires) {
    cache.delete(key);
    return undefined;
  }

  return cached.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number = 60000) {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  });
}

export function clearCache() {
  cache.clear();
}