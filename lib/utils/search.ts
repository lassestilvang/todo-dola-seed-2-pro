import Fuse from 'fuse.js';
import type { Task } from '@/lib/types';

const fuseOptions = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'description', weight: 1 },
    { name: 'labels.name', weight: 1.5 },
  ],
  threshold: 0.3,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function searchTasks(tasks: Task[], query: string) {
  if (!query.trim()) return tasks;
  
  const fuse = new Fuse(tasks, fuseOptions);
  const results = fuse.search(query);
  
  return results.map(result => result.item);
}
