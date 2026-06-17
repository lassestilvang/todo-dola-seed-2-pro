export { getRedis, isRedisAvailable, getCached, setCached, delCached, clearPattern } from './redis';
export const CACHE_KEYS = {
  tasks: (userId: string) => `tasks:${userId}`,
  task: (id: string) => `task:${id}`,
  lists: (userId: string) => `lists:${userId}`,
  labels: (userId: string) => `labels:${userId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  search: (query: string, userId: string) => `search:${userId}:${query}`,
};