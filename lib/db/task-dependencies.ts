import { getDb, initDb, saveDb, runQuery, runGet, generateId, now } from './core';
import type { TaskDependency } from '../types';

export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
  await initDb();
  return runQuery(
    'SELECT id, task_id as taskId, depends_on_task_id as dependsOnTaskId, created_at as createdAt FROM task_dependencies WHERE task_id = ?',
    [taskId]
  ) as unknown as Promise<TaskDependency[]>;
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency> {
  await initDb();
  const id = generateId();
  const nowVal = now();

  runQuery(
    'INSERT INTO task_dependencies (id, task_id, depends_on_task_id, created_at) VALUES (?, ?, ?, ?)',
    [id, taskId, dependsOnTaskId, nowVal]
  );
  saveDb();

  return { id, taskId, dependsOnTaskId, createdAt: nowVal };
}

export async function removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  await initDb();
  runQuery('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?', [taskId, dependsOnTaskId]);
  saveDb();
  return true;
}

export async function wouldCreateCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  await initDb();

  const dependentTasks = new Set<string>();
  let toCheck = [dependsOnTaskId];

  while (toCheck.length > 0) {
    const currentTask = toCheck.pop()!;
    const dependents = runQuery(
      'SELECT task_id FROM task_dependencies WHERE depends_on_task_id = ?',
      [currentTask]
    ) as { task_id: string }[];

    for (const dep of dependents) {
      if (dep.task_id === taskId) {
        return true;
      }
      if (!dependentTasks.has(dep.task_id)) {
        dependentTasks.add(dep.task_id);
        toCheck.push(dep.task_id);
      }
    }
  }

  return false;
}