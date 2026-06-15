import { getTaskHistory, getTaskById } from '@/lib/db/queries';
import type { TaskHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';

interface TaskHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskHistoryPage({ params }: TaskHistoryPageProps) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  const history = await getTaskHistory(id);

  function formatEntryValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return String(value);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task History</h1>
          <p className="text-gray-400">{task.name}</p>
        </div>
        <Link
          href={`/task/${task.id}`}
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to task
        </Link>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No history yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Changes to this task will be recorded here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Showing {history.length} change{history.length !== 1 ? 's' : ''}
          </div>
          <ul className="space-y-3">
            {history.map((entry: TaskHistoryEntry) => (
              <li key={entry.id} className="p-4 rounded-lg bg-gray-900 border border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {String(entry.field)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(entry.changedAt), 'MMM d, HH:mm')}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      {entry.oldValue !== null && entry.oldValue !== undefined && (
                        <div>
                          <span className="text-gray-400">Previous: </span>
                          <pre className="text-gray-500 text-xs overflow-x-auto inline-block max-w-xs">
                            {formatEntryValue(entry.oldValue)}
                          </pre>
                        </div>
                      )}
                      {entry.newValue !== null && entry.newValue !== undefined && (
                        <div>
                          <span className="text-gray-400">New: </span>
                          <pre className="text-xs overflow-x-auto inline-block max-w-xs">
                            {formatEntryValue(entry.newValue)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}