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

// LRU cache for Fuse instances to avoid recreating on every render
const CACHE_MAX_SIZE = 50;
const fuseCache: Map<string, Fuse<Task>> = new Map();

export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;

  // Create a cache key based on tasks length and query
  const cacheKey = `${tasks.length}-${query}`.slice(0, 100);

  let fuse = fuseCache.get(cacheKey);
  if (!fuse) {
    // Evict oldest entry if cache is full
    if (fuseCache.size >= CACHE_MAX_SIZE) {
      const firstKey = fuseCache.keys().next().value;
      if (firstKey) {
        fuseCache.delete(firstKey);
      }
    }
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

// Advanced search with filters
export function searchTasksAdvanced(
  tasks: Task[],
  query: string,
  filters: {
    completed?: boolean;
    priority?: 'high' | 'medium' | 'low' | 'none';
    labelId?: string;
    listId?: string;
    dueBefore?: number;
    dueAfter?: number;
  } = {}
): Task[] {
  let results = searchTasks(tasks, query);

  // Apply additional filters
  if (filters.completed !== undefined) {
    results = results.filter(t => t.completed === filters.completed);
  }

  if (filters.priority) {
    results = results.filter(t => t.priority === filters.priority);
  }

  if (filters.labelId) {
    results = results.filter(t => t.labels?.some(l => l.id === filters.labelId));
  }

  if (filters.listId) {
    results = results.filter(t => t.listId === filters.listId);
  }

  if (filters.dueBefore !== undefined) {
    const dueBefore = filters.dueBefore;
    results = results.filter(t => t.deadline !== null && t.deadline <= dueBefore);
  }

  if (filters.dueAfter !== undefined) {
    const dueAfter = filters.dueAfter;
    results = results.filter(t => t.deadline !== null && t.deadline >= dueAfter);
  }

  return results;
}

// Get search suggestions based on typed query
export function getSearchSuggestions(tasks: Task[], query: string, limit: number = 5): string[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];

  // Add task names that match
  for (const task of tasks) {
    if (task.name.toLowerCase().includes(lowerQuery) && !task.completed) {
      suggestions.push(task.name);
      if (suggestions.length >= limit) break;
    }
  }

  return suggestions;
}

// Highlight matches in text
export function highlightMatches(text: string, matches: { start: number; end: number }[]): string {
  if (matches.length === 0) return text;

  // Sort matches by start position
  const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

  let result = '';
  let lastIndex = 0;

  for (const match of sortedMatches) {
    result += text.slice(lastIndex, match.start);
    result += `<mark>${text.slice(match.start, match.end)}</mark>`;
    lastIndex = match.end;
  }

  result += text.slice(lastIndex);
  return result;
}
