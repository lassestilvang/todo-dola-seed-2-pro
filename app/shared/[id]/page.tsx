import { getTaskByShareToken } from '@/lib/db/queries';
import { format } from 'date-fns';
import { notFound } from 'next/navigation';

interface SharedTaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedTaskPage({ params }: SharedTaskPageProps) {
  const { id } = await params;
  const task = await getTaskByShareToken(id);

  if (!task) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
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
          <p className="text-gray-300 mb-4">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {task.date && (
            <div>
              <span className="text-gray-400">Due:</span>
              <p>{format(new Date(task.date), 'MMM d, yyyy HH:mm')}</p>
            </div>
          )}
          {task.estimate && (
            <div>
              <span className="text-gray-400">Estimate:</span>
              <p>{task.estimate} min</p>
            </div>
          )}
        </div>

        {task.labels && task.labels.length > 0 && (
          <div className="mt-4">
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

        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Subtasks</h2>
            <ul className="space-y-1">
              {task.subtasks.map(subtask => (
                <li key={subtask.id} className="flex items-center gap-2 text-sm">
                  <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                    {subtask.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Shared via Task Planner
        </div>
      </div>
    </div>
  );
}