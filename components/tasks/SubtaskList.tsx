'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Subtask } from '@/lib/types';

interface SubtaskListProps {
  taskId: string;
  initialSubtasks: Subtask[];
  onSubtasksChange?: (subtasks: Subtask[]) => void;
}

export default function SubtaskList({ taskId, initialSubtasks, onSubtasksChange }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newSubtask, setNewSubtask] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;

    const tempId = 'temp-' + Date.now();
    const newSub: Subtask = {
      id: tempId,
      taskId,
      name: newSubtask,
      completed: false,
      completedAt: null,
      sortOrder: subtasks.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtask('');

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubtask }),
      });

      if (res.ok) {
        const saved = await res.json();
        setSubtasks(prev => prev.map(s => s.id === tempId ? { ...s, id: saved.id } : s));
        onSubtasksChange?.([...subtasks.filter(s => s.id !== tempId), { ...newSub, id: saved.id }]);
      } else {
        setSubtasks(subtasks.filter(s => s.id !== tempId));
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
      setSubtasks(subtasks.filter(s => s.id !== tempId));
    }
  }

  async function toggleSubtask(id: string, completed: boolean) {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed, completedAt: completed ? Date.now() : null } : s));

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) throw new Error('Failed to toggle');
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      const subtask = subtasks.find(s => s.id === id);
      if (subtask) setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !completed } : s));
    }
  }

  async function handleDelete(id: string) {
    const subtask = subtasks.find(s => s.id === id);
    setSubtasks(subtasks.filter(s => s.id !== id));

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');
      onSubtasksChange?.(subtasks.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      if (subtask) setSubtasks([...subtasks.filter(s => s.id !== id), subtask]);
    }
  }

  async function handleDragEnd(index: number) {
    if (draggingId) {
      setDraggingId(null);
      return;
    }

    // Reorder subtasks
    const newSubtasks = [...subtasks];
    const [moved] = newSubtasks.splice(index, 1);
    newSubtasks.push(moved);

    setSubtasks(newSubtasks);

    // Update sort orders
    try {
      await Promise.all(
        newSubtasks.map((s, i) =>
          fetch(`/api/tasks/${taskId}/subtasks/${s.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: i }),
          })
        )
      );
    } catch (error) {
      console.error('Failed to reorder subtasks:', error);
    }
  }

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Subtasks ({completedCount}/{subtasks.length})</h3>
      </div>

      <form onSubmit={handleAddSubtask} className="flex gap-2">
        <Input
          placeholder="Add subtask..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </form>

      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask, index) => (
            <li
              key={subtask.id}
              className={`flex items-center gap-2 text-sm group ${
                subtask.completed ? 'text-gray-500' : ''
              }`}
            >
              <button
                className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggingId(subtask.id);
                }}
              >
                <GripVertical className="w-3 h-3" />
              </button>
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={(e) => toggleSubtask(subtask.id, e.target.checked)}
                className="rounded"
              />
              <span className={subtask.completed ? 'line-through' : ''}>{subtask.name}</span>
              <button
                onClick={() => handleDelete(subtask.id)}
                className="ml-auto text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete subtask"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}