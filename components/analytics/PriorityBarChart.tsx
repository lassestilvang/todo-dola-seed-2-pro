import type { Task } from '@/lib/types';

interface PriorityBarChartProps {
  tasks: Task[];
  className?: string;
}

export function PriorityBarChart({ tasks, className }: PriorityBarChartProps) {
  const counts = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
    none: tasks.filter(t => t.priority === 'none').length,
  };
  const total = tasks.length || 1;

  return (
    <div className={className}>
      <div className="flex justify-between text-xs mb-1">
        <span>Priority Distribution</span>
        <span className="text-gray-400">{tasks.length} total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        <div className="bg-red-500 h-full" style={{ width: `${(counts.high / total) * 100}%` }} />
        <div className="bg-yellow-500 h-full" style={{ width: `${(counts.medium / total) * 100}%` }} />
        <div className="bg-green-500 h-full" style={{ width: `${(counts.low / total) * 100}%` }} />
        <div className="bg-gray-500 h-full" style={{ width: `${(counts.none / total) * 100}%` }} />
      </div>
      <div className="flex gap-3 text-xs text-gray-400 mt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />{counts.high} High</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" />{counts.medium} Med</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{counts.low} Low</span>
      </div>
    </div>
  );
}