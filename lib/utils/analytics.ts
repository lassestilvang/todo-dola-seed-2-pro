type MetricType = 'pageview' | 'routeChange' | 'apiCall' | 'componentRender' | 'error';

interface MetricData {
  type: MetricType;
  name: string;
  duration?: number;
  error?: string;
  timestamp: number;
}

const metrics: MetricData[] = [];
const MAX_METRICS = 100;

export function recordMetric(data: MetricData) {
  metrics.push(data);
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
}

export function measureDuration<T>(name: string, fn: () => T): T {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = fn();
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  recordMetric({
    type: 'apiCall',
    name,
    duration: end - start,
    timestamp: Date.now(),
  });
  return result;
}

export async function measureAsyncDuration<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = await fn();
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  recordMetric({
    type: 'apiCall',
    name,
    duration: end - start,
    timestamp: Date.now(),
  });
  return result;
}

export function getMetrics(): MetricData[] {
  return [...metrics];
}

export function clearMetrics() {
  metrics.length = 0;
}

export function logError(error: Error, context?: Record<string, unknown>) {
  recordMetric({
    type: 'error',
    name: error.message,
    error: JSON.stringify({ ...context, stack: error.stack }),
    timestamp: Date.now(),
  });
}