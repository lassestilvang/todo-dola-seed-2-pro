import Fuse from 'fuse.js';
import { format } from 'date-fns';
import type { Task } from '@/lib/types';

const fuseOptions = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'description', weight: 1 },
    { name: 'labels.name', weight: 1.5 },
    { name: 'subtasks.name', weight: 1 },
  ],
  threshold: 0.3,
  includeMatches: true,
  minMatchCharLength: 2,
};

// Cache for Fuse instances to avoid recreating on every render
const fuseCache: Map<string, Fuse<Task>> = new Map();

export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;

  // Create a cache key based on tasks length and query
  const cacheKey = `${tasks.length}-${query}`.slice(0, 100);

  let fuse = fuseCache.get(cacheKey);
  if (!fuse) {
    fuse = new Fuse(tasks, fuseOptions);
    fuseCache.set(cacheKey, fuse);
  }

  const results = fuse.search(query);
  return results.map(result => result.item);
}

// Clear cache when tasks are significantly updated
export function clearSearchCache() {
  fuseCache.clear();
}

// Get priority color class
export function getPriorityColor(priority: 'high' | 'medium' | 'low' | 'none'): string {
  switch (priority) {
    case 'high': return 'text-red-400 border-red-500/30';
    case 'medium': return 'text-yellow-400 border-yellow-500/30';
    case 'low': return 'text-green-400 border-green-500/30';
    default: return 'text-gray-400 border-gray-700';
  }
}

// Format date for display
export function formatDate(date: number | null): string {
  if (!date) return 'No date';
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

// Check if task is overdue
export function isOverdue(task: Task): boolean {
  return task.deadline !== null && task.deadline < Date.now() && !task.completed;
}

// Get priority label
export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high': return 'High Priority';
    case 'medium': return 'Medium Priority';
    case 'low': return 'Low Priority';
    default: return 'No Priority';
  }
}
