'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, Edit, ExternalLink, Share2, Copy } from 'lucide-react';
import type { Task, Priority } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TaskDatePicker from './TaskDatePicker';
import QuickActions from './QuickActions';

interface TaskCardProps {
  task: Task;
  onTaskUpdated?: (_task: Task) => void;
  onTaskDeleted?: (_taskId: string, _task: Task) => void;
  onQuickAction?: (_action: string, _task: Task) => void;
}

export default function TaskCard({ task, onTaskUpdated, onTaskDeleted, onQuickAction }: TaskCardProps) {
  const [completed, setCompleted] = useState(task.completed);
  const [editing, setEditing] = useState(false);
  const priorityColors = {
    high: 'text-red-400 border-red-500/30',
    medium: 'text-yellow-400 border-yellow-500/30',
    low: 'text-green-400 border-green-500/30',
    none: 'text-gray-400 border-gray-700',
  };

  async function toggleCompletion() {
    const newCompleted = !completed;
    setCompleted(newCompleted);

    try {
      const res = await fetch(`/api/tasks/${task.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });

      if (res.ok) {
        const updated = await res.json();
        onTaskUpdated?.(updated);
      } else {
        setCompleted(task.completed);
      }
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      setCompleted(task.completed);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this task?')) return;

    onTaskDeleted?.(task.id, task);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        toast.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  }

  async function handleQuickAction(action: string, task: Task) {
    switch (action) {
      case 'log-time':
        // Open time log dialog - delegate to TimeTracker component
        toast.info('Use the TimeTracker component on the task detail page to log time');
        break;
      case 'duplicate':
        try {
          const res = await fetch(`/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${task.name} (copy)`,
              description: task.description,
              listId: task.listId,
              priority: task.priority,
              date: task.date,
              deadline: task.deadline,
              reminder: task.reminder,
              estimate: task.estimate,
              labels: task.labels?.map(l => l.id) || [],
            }),
          });
          if (res.ok) {
            const newTask = await res.json();
            onTaskUpdated?.(newTask);
            toast.success('Task duplicated');
          }
        } catch {
          toast.error('Failed to duplicate task');
        }
        break;
      case 'snooze':
        // Snooze for 1 day
        try {
          const newDate = task.date ? task.date + 24 * 60 * 60 * 1000 : Date.now() + 24 * 60 * 60 * 1000;
          const res = await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: newDate }),
          });
          if (res.ok) {
            const updated = await res.json();
            onTaskUpdated?.(updated);
            toast.success('Task snoozed for 1 day');
          } else {
            toast.error('Failed to snooze task');
          }
        } catch {
          toast.error('Failed to snooze task');
        }
        break;
      case 'delete':
        handleDelete();
        break;
    }
  }

  return (
    <>
      <div className={`p-4 rounded-lg bg-gray-900 border ${priorityColors[task.priority]} hover:bg-gray-850 transition-colors group`}>
        <div className="flex items-start gap-3">
          <button onClick={toggleCompletion} className="mt-0.5 flex-shrink-0" aria-label={completed ? 'Mark task as incomplete' : 'Mark task as complete'}>
            {completed
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <Circle className="w-5 h-5 text-gray-500" />
            }
          </button>

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''} truncate`}>
              {task.name}
            </h3>

            {task.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2 truncate">
                {task.description}
              </p>
            )}

            {task.attachmentPath && (
              <div className="mt-1">
                <a
                  href={`/api/attachments?filename=${task.attachmentPath}`}
                  className="text-xs text-blue-400 hover:underline truncate block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📎 {task.attachmentPath}
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
              {task.date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{format(new Date(task.date), 'MMM d, HH:mm')}</span>
                </span>
              )}

              {task.recurringType && (
                <span className="flex items-center gap-1 text-purple-400">
                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  <span className="truncate">{task.recurringType}</span>
                </span>
              )}

              {task.labels && task.labels.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {task.labels.slice(0, 2).map(label => (
                    <span
                      key={label.id}
                      className="px-1.5 py-0.5 rounded text-xs truncate max-w-[100px]"
                      style={{ backgroundColor: label.color + '20', color: label.color }}
                      title={label.name}
                    >
                      {label.emoji}
                    </span>
                  ))}
                  {task.labels.length > 2 && (
                    <span className="text-gray-500">+{task.labels.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label="Task actions">
            {task.priority !== 'none' && (
              <AlertCircle className={`w-4 h-4 ${priorityColors[task.priority].split(' ')[0]}`} aria-label={`Priority: ${task.priority}`} />
            )}
            <Link href={`/task/${task.id}`} className="p-1 rounded hover:bg-gray-500/20" title="View task" aria-label="View task details">
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </Link>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: task.id }),
                  });
                  if (res.ok) {
                    const { shareToken } = await res.json();
                    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Share link copied!');
                  } else {
                    toast.error('Failed to create share link');
                  }
                } catch {
                  toast.error('Failed to create share link');
                }
              }}
              className="p-1 rounded hover:bg-gray-500/20"
              title="Share task"
              aria-label="Share this task"
            >
              <Share2 className="w-4 h-4 text-gray-400" />
            </button>
            <QuickActions task={task} onAction={onQuickAction || handleQuickAction} />
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-blue-500/20"
              title="Edit task"
              aria-label="Edit task"
            >
              <Edit className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-500/20"
              title="Delete task"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditTaskDialog task={task} open={editing} onClose={() => setEditing(false)} onSave={onTaskUpdated} />
    </>
  );
}

function EditTaskDialog({ task: _task, open, onClose, onSave }: { task: Task; open: boolean; onClose: () => void; onSave?: (_task: Task) => void }) {
  const [name, setName] = useState(_task.name);
  const [description, setDescription] = useState(_task.description || '');
  const [priority, setPriority] = useState(_task.priority);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(_task.date ? new Date(_task.date) : undefined);
  const [recurringType, setRecurringType] = useState<string>(_task.recurringType || '');
  const [recurringInterval, setRecurringInterval] = useState<string>(() => {
    if (!_task.recurringConfig) return '1';
    try {
      const config = JSON.parse(_task.recurringConfig);
      return String(config.interval || 1);
    } catch {
      return '1';
    }
  });
  const [recurringEnd, setRecurringEnd] = useState<string>(() => {
    if (!_task.recurringConfig) return '';
    try {
      const config = JSON.parse(_task.recurringConfig);
      return config.endDate ? new Date(config.endDate).toISOString().split('T')[0] : '';
    } catch {
      return '';
    }
  });
  const [reminder, setReminder] = useState<string>(() => {
    if (!_task.reminder || !_task.date) return '';
    const diff = _task.date - _task.reminder;
    if (diff <= 5 * 60 * 1000) return '5min';
    if (diff <= 10 * 60 * 1000) return '10min';
    if (diff <= 30 * 60 * 1000) return '30min';
    if (diff <= 60 * 60 * 1000) return '1hour';
    if (diff <= 2 * 60 * 60 * 1000) return '2hours';
    return '';
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Build recurring config
    let recurringConfig: string | null = null;
    if (recurringType) {
      const config: { type: string; interval: number; endDate?: number } = {
        type: recurringType,
        interval: parseInt(recurringInterval) || 1,
      };
      if (recurringEnd) {
        config.endDate = new Date(recurringEnd).getTime();
      }
      recurringConfig = JSON.stringify(config);
    }

    try {
      const res = await fetch(`/api/tasks/${_task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          priority,
          date: selectedDate?.getTime() || null,
          reminder: reminder ? calculateReminderTime(selectedDate, reminder) : null,
          recurringType: recurringType || null,
          recurringConfig,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onSave?.(updated);
      } else {
        const error = await res.json();
        console.error('Failed to update task:', error);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  function calculateReminderTime(date: Date | undefined, option: string): number | null {
    if (!date) return null;
    const baseTime = date.getTime();
    switch (option) {
      case '5min': return baseTime - 5 * 60 * 1000;
      case '10min': return baseTime - 10 * 60 * 1000;
      case '30min': return baseTime - 30 * 60 * 1000;
      case '1hour': return baseTime - 60 * 60 * 1000;
      case '2hours': return baseTime - 2 * 60 * 60 * 1000;
      case 'today': {
        const today = new Date();
        today.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return today.getTime();
      }
      case 'tomorrow': {
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.getTime();
      }
      default: return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Task name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full p-2 rounded border bg-background"
          >
            <option value="none">No Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <TaskDatePicker _date={selectedDate} onChange={(d) => setSelectedDate(d)} />
          <select
            value={recurringType ?? ''}
            onChange={(e) => setRecurringType(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly' | '')}
            className="w-full p-2 rounded border bg-background"
          >
            <option value="">No Recurrence</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          {recurringType && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-400">Interval</label>
                  <input
                    type="number"
                    min="1"
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(e.target.value)}
                    className="w-full p-2 rounded border bg-background"
                    placeholder="1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-400">End date (optional)</label>
                  <input
                    type="date"
                    value={recurringEnd}
                    onChange={(e) => setRecurringEnd(e.target.value)}
                    className="w-full p-2 rounded border bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedDate && (
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full p-2 rounded border bg-background"
            >
              <option value="">No Reminder</option>
              <option value="5min">5 minutes before</option>
              <option value="10min">10 minutes before</option>
              <option value="30min">30 minutes before</option>
              <option value="1hour">1 hour before</option>
              <option value="2hours">2 hours before</option>
            </select>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}