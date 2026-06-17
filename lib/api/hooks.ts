'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetcher } from './client';
import type { Task, TaskFilter, TaskLink, TaskLinkType, Goal, Habit, TimeBlock, Reminder } from '@/lib/types';

// Task queries
export function useTasks(filter: TaskFilter = {}) {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => fetcher(`/api/tasks`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetcher(`/api/tasks/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Task mutations
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Partial<Task>) =>
      fetcher('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      fetcher(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetcher(`/api/tasks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['task', id] });
    },
  });
}

export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      fetcher(`/api/tasks/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Task Links
export function useTaskLinks(taskId: string) {
  return useQuery({
    queryKey: ['task-links', taskId],
    queryFn: () => fetcher(`/api/task-links?taskId=${taskId}`),
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTaskLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (link: { taskId: string; linkedTaskId: string; type: string }) =>
      fetcher('/api/task-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-links', variables.taskId] });
    },
  });
}

export function useDeleteTaskLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetcher(`/api/task-links?id=${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-links'] });
    },
  });
}

// Goals hooks
export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => fetcher('/api/goals'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ['goal', id],
    queryFn: () => fetcher(`/api/goals/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Habits hooks
export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: () => fetcher('/api/habits'),
    staleTime: 5 * 60 * 1000,
  });
}

// Time Blocks hooks
export function useTimeBlocks(start: number, end: number) {
  return useQuery({
    queryKey: ['time-blocks', start, end],
    queryFn: () => fetcher(`/api/time-blocks?start=${start}&end=${end}`),
    staleTime: 5 * 60 * 1000,
  });
}

// Reminders hooks
export function useReminders(taskId?: string) {
  const params = taskId ? `?taskId=${taskId}` : '';
  return useQuery({
    queryKey: ['reminders', taskId],
    queryFn: () => fetcher(`/api/reminders${params}`),
    staleTime: 5 * 60 * 1000,
  });
}