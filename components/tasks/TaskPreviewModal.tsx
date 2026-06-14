'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { X, ExternalLink, CheckCircle2, Circle, Clock, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Task, Priority } from '@/lib/types';

interface TaskPreviewModalProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdated?: (_task: Task) => void;
}

export default function TaskPreviewModal({ taskId, open, onClose, onTaskUpdated }: TaskPreviewModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    }
  }, [open, taskId]);

  async function fetchTask() {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        setTask(await res.json());
        setEditedTask({});
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedTask),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        onTaskUpdated?.(updated);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  const priorityColors: Record<Priority, string> = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
    none: 'text-gray-400',
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-8 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2" />
            </div>
          ) : task ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={task.name}
                      onBlur={e => setEditedTask({ ...editedTask, name: e.target.value })}
                      className="w-full text-2xl font-semibold bg-transparent outline-none"
                      autoFocus
                    />
                  ) : (
                    <h2 className={`text-2xl font-semibold ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.name}
                    </h2>
                  )}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {editMode ? (
                  <textarea
                    defaultValue={task.description || ''}
                    onBlur={e => setEditedTask({ ...editedTask, description: e.target.value })}
                    placeholder="Description"
                    className="w-full text-gray-300 bg-transparent outline-none resize-none"
                    rows={3}
                  />
                ) : (
                  task.description && (
                    <p className="text-gray-300">{task.description}</p>
                  )
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-2">Details</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${priorityColors[task.priority]}`} />
                        {editMode ? (
                          <select
                            defaultValue={task.priority}
                            onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as Priority })}
                            className="bg-gray-800 rounded px-2 py-1"
                          >
                            <option value="none">No Priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        ) : (
                          <span className={priorityColors[task.priority]}>{task.priority}</span>
                        )}
                      </div>

                      {task.date && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(task.date), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                      )}

                      {task.estimate && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{task.estimate} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500 mb-2">Labels</p>
                    <div className="flex flex-wrap gap-1">
                      {task.labels && task.labels.length > 0 ? (
                        task.labels.map(label => (
                          <span
                            key={label.id}
                            className="px-2 py-1 text-xs rounded"
                            style={{ backgroundColor: label.color + '20', color: label.color }}
                          >
                            {label.emoji} {label.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs">No labels</span>
                      )}
                    </div>
                  </div>
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-2">Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</p>
                    <div className="space-y-1">
                      {task.subtasks.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-2 text-sm">
                          {subtask.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                            {subtask.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {task.recurringType && (
                  <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <span>🔁</span>
                    <span>Repeats {task.recurringType}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      Edit
                    </Button>
                  )}
                </div>
                <Link href={`/task/${task.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Task not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}