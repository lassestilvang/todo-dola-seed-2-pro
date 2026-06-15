import { getTaskById, getTaskHistory, getTaskDependencies, getComments, getTaskNotes } from '@/lib/db/queries';
import { format, formatDistanceToNow } from 'date-fns';
import { notFound } from 'next/navigation';
import { Paperclip, History, Clock, User, CheckCircle2, ListTodo, Tag, Calendar, AlertCircle, FileText, Link2, Share2, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SubtaskList from '@/components/tasks/SubtaskList';
import TimeTracker from '@/components/tasks/TimeTracker';
import PomodoroTimer from '@/components/tasks/PomodoroTimer';
import TaskNotes from '@/components/tasks/TaskNotes';
import TaskDependencies from '@/components/tasks/TaskDependencies';
import AttachmentUpload from '@/components/tasks/AttachmentUpload';
import CommentSection from '@/components/tasks/CommentSection';
import ShareManager from '@/components/tasks/ShareManager';
import TaskTemplates from '@/components/tasks/TaskTemplates';
import TaskReminders from '@/components/tasks/TaskReminders';
import type { Task } from '@/lib/types';

interface TaskHistoryEntry {
  id: string;
  taskId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: number;
}

function HistoryTimeline({ history }: { history: TaskHistoryEntry[] }) {
  if (!history || history.length === 0) return null;

  const getFieldIcon = (field: string) => {
    const icons: Record<string, React.ReactNode> = {
      name: <FileText className="w-4 h-4" />,
      description: <FileText className="w-4 h-4" />,
      completed: <CheckCircle2 className="w-4 h-4" />,
      priority: <AlertCircle className="w-4 h-4" />,
      date: <Calendar className="w-4 h-4" />,
      deadline: <Calendar className="w-4 h-4" />,
      list_id: <ListTodo className="w-4 h-4" />,
      reminder: <Clock className="w-4 h-4" />,
      labels: <Tag className="w-4 h-4" />,
    };
    return icons[field] || <History className="w-4 h-4" />;
  };

  const formatFieldValue = (field: string, value: string | null) => {
    if (value === null) return 'Cleared';
    if (value === 'true') return 'Completed';
    if (value === 'false') return 'Not completed';
    if (field === 'priority') {
      const labels: Record<string, string> = {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        none: 'None',
      };
      return labels[value] || value;
    }
    if (field === 'completedAt' && value) {
      return format(new Date(parseInt(value)), 'MMM d, yyyy HH:mm');
    }
    if (field === 'date' || field === 'deadline' || field === 'reminder') {
      if (value) return format(new Date(parseInt(value)), 'MMM d, yyyy HH:mm');
      return 'No date';
    }
    return value;
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        Task History
      </h2>
      <div className="space-y-3">
        {history.map((entry, index) => (
          <div key={entry.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
              {getFieldIcon(entry.field)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium capitalize">{entry.field.replace(/_/g, ' ')}</span>
                <span className="text-gray-400 mx-2">→</span>
                <span>{formatFieldValue(entry.field, entry.newValue)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  const history = await getTaskHistory(id);
  const dependencies = await getTaskDependencies(id);
  const comments = await getComments(id);
  const notes = await getTaskNotes(id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{task.name}</h1>
        <span className={`px-2 py-1 rounded text-xs ${
          task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          task.priority === 'low' ? 'bg-green-500/20 text-green-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Description</h2>
          <p className="text-gray-300">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {task.date && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-1">Due Date</h2>
            <p>{format(new Date(task.date), 'MMM d, yyyy HH:mm')}</p>
          </div>
        )}
        {task.estimate && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-1">Estimate (min)</h2>
            <p>{task.estimate}</p>
          </div>
        )}
        {task.actualTime !== null && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-1">Time Spent</h2>
            <p>{task.actualTime} min</p>
          </div>
        )}
        {task.recurringType && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-1">Recurring</h2>
            <p className="capitalize">{task.recurringType}</p>
          </div>
        )}
        {task.attachmentPath && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-1">Attachment</h2>
            <a
              href={`/api/attachments?filename=${task.attachmentPath}`}
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 {task.attachmentPath}
            </a>
          </div>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Labels</h2>
          <div className="flex gap-2">
            {task.labels.map(label => (
              <span
                key={label.id}
                className="px-2 py-1 rounded text-xs"
                style={{ backgroundColor: label.color + '20', color: label.color }}
              >
                {label.emoji} {label.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {(!task.labels || task.labels.length === 0) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Labels</h2>
          <p className="text-sm text-gray-500">No labels assigned</p>
        </div>
      )}

      <SubtaskList taskId={task.id} initialSubtasks={task.subtasks || []} />

      <TimeTracker taskId={task.id} initialTime={task.actualTime || 0} />

      <TaskReminders task={task} />

      <TaskNotes taskId={task.id} initialNotes={notes} />

      <PomodoroTimer task={task} onTimeLogged={(taskId, duration) => {
        // The TimeTracker component handles the actual logging
      }} />

      <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Attachments
        </h2>
        <AttachmentUpload
          taskId={task.id}
          currentAttachment={task.attachmentPath}
          onAttachmentChange={(filename) => {
            // Refresh page to show updated attachment
            window.location.reload();
          }}
        />
      </div>

      <TaskDependencies
        taskId={task.id}
        dependencies={dependencies.map(d => ({
          id: d.id,
          taskId: d.taskId,
          dependsOnTaskId: d.dependsOnTaskId,
        }))}
        onDependencyChange={() => {}}
      />

      <TaskTemplates onTaskCreated={(newTask) => {
        // Optionally refresh or navigate to the new task
        window.location.href = `/task/${newTask.id}`;
      }} />

      <HistoryTimeline history={history as unknown as TaskHistoryEntry[]} />

      <CommentSection taskId={task.id} initialComments={comments} />

      <ShareManager taskId={task.id} />
    </div>
  );
}