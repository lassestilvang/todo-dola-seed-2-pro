import type { Task, TaskList, Label, Subtask, TaskDependency, TimeEntry, TaskTemplate, Comment } from '@/lib/types';

export interface SyncData {
  lists: TaskList[];
  labels: Label[];
  tasks: Task[];
  subtasks: Subtask[];
  taskLabels: { task_id: string; label_id: string }[];
  taskDependencies: TaskDependency[];
  timeEntries: TimeEntry[];
  taskTemplates: TaskTemplate[];
  comments: Comment[];
  lastModified: number;
}

export function generateDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export async function pushSync(data: SyncData): Promise<boolean> {
  try {
    const deviceId = generateDeviceId();
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, data, lastModified: data.lastModified }),
    });

    if (res.ok) {
      const result = await res.json();
      return !result.conflict;
    }
    return false;
  } catch (error) {
    console.error('Push sync failed:', error);
    return false;
  }
}

export async function pullSync(since?: number): Promise<SyncData | null> {
  try {
    const deviceId = generateDeviceId();
    const res = await fetch(`/api/sync?deviceId=${deviceId}${since ? `&since=${since}` : ''}`);

    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        return result.data;
      }
    }
    return null;
  } catch (error) {
    console.error('Pull sync failed:', error);
    return null;
  }
}