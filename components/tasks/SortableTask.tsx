'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckSquare, Square } from 'lucide-react';
import TaskCard from './TaskCard';
import type { Task } from '@/lib/types';

interface SortableTaskProps {
  task: Task;
  onTaskUpdated: (_task: Task) => void;
  onTaskDeleted: (_taskId: string, _task: Task) => void;
  focused?: boolean;
  selected?: boolean;
  onSelect?: (_taskId: string, _selected: boolean) => void;
  onPreview?: (_taskId: string) => void;
  onQuickAction?: (_action: string, _task: Task) => void;
}

export default function SortableTask({ task, onTaskUpdated, onTaskDeleted, focused, selected, onSelect, onPreview, onQuickAction }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(task.id, !selected);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onPreview?.(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${focused ? 'ring-2 ring-blue-500' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity ${
          isDragging ? 'opacity-100' : ''
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-gray-700 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className={isDragging ? 'opacity-50' : ''} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          {onSelect && (
            <button
              onClick={handleSelect}
              className="flex-shrink-0 mt-1 p-0.5 rounded hover:bg-gray-700/50"
              title={selected ? 'Deselect' : 'Select task'}
              aria-label={selected ? 'Deselect task' : 'Select task'}
            >
              {selected ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          <div className="flex-1">
            <TaskCard
              task={task}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
              onQuickAction={onQuickAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}