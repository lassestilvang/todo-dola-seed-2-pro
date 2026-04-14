import { expect, test, describe } from 'bun:test';
import { searchTasks } from '@/lib/utils/search';
import type { Task } from '@/lib/types';

describe('Fuzzy Search', () => {
  const testTasks: Task[] = [
    {
      id: '1',
      listId: 'inbox',
      name: 'Buy groceries',
      description: 'Milk, eggs, bread',
      priority: 'none',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      listId: 'inbox',
      name: 'Finish report',
      description: 'Quarterly sales report',
      priority: 'high',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '3',
      listId: 'inbox',
      name: 'Call client meeting',
      description: 'Schedule with Sarah',
      priority: 'medium',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  test('returns all tasks on empty query', () => {
    expect(searchTasks(testTasks, '')).toHaveLength(3);
  });

  test('matches partial words', () => {
    expect(searchTasks(testTasks, 'gro')).toHaveLength(1);
    expect(searchTasks(testTasks, 'gro')[0].name).toBe('Buy groceries');
  });

  test('fuzzy matches with typos', () => {
    expect(searchTasks(testTasks, 'grocereis')).toHaveLength(1);
  });

  test('prioritizes name matches over description', () => {
    const results = searchTasks(testTasks, 'report');
    expect(results[0].name).toBe('Finish report');
  });
});
