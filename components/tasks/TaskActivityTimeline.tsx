'use client';

import { useEffect, useState } from 'react';
import { getTaskHistory } from '@/lib/db/queries';
import type { TaskHistoryEntry } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { History, Edit, CheckSquare, Tag, Calendar, ListTodo, Clock, MessageSquare } from 'lucide-react';

interface TaskActivityTimelineProps {
  taskId: string;
}

const fieldIcons: Record<string, typeof History> = {
  name: Edit,
  completed: CheckSquare,
  labels: Tag,
  date: Calendar,
  deadline: Calendar,
  priority: ListTodo,
  listId: ListTodo,
  description: Edit,
  estimate: Clock,
  actualTime: Clock,
  reminder: Clock,
};

const fieldLabels: Record<string, string> = {
  name: 'Task renamed',
  completed: 'Status changed',
  labels: 'Labels updated',
  date: 'Date changed',
  deadline: 'Deadline updated',
  priority: 'Priority changed',
  listId: 'Moved to list',
  description: 'Description updated',
  estimate: 'Estimate updated',
  actualTime: 'Time tracked',
  reminder: 'Reminder set',
};

export default function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [taskId]);

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading activity...</div>;
  }

  if (history.length === 0) {
    return <div className="text-sm text-muted-foreground">No activity yet</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <History className="w-4 h-4" />
        Activity Timeline
      </h3>
      <div className="space-y-3">
        {history.map((entry) => {
          const Icon = fieldIcons[entry.field] || Edit;
          const fieldLabel = fieldLabels[entry.field] || entry.field;

          return (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium">{fieldLabel}</span>
                  <span className="text-muted-foreground"> changed</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {entry.oldValue && (
                    <div className="truncate">← {entry.oldValue}</div>
                  )}
                  <div className="truncate">→ {entry.newValue}</div>
                </div>
                <div className="text-xs text-muted-foreground/60 mt-1">
                  {formatDistanceToNow(entry.changedAt, { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}