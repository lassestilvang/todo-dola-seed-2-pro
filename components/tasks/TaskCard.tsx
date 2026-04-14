'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const priorityColors = {
    high: 'text-red-400 border-red-500/30',
    medium: 'text-yellow-400 border-yellow-500/30',
    low: 'text-green-400 border-green-500/30',
    none: 'text-gray-400 border-gray-700',
  };

  return (
    <div className={`p-4 rounded-lg bg-gray-900 border ${priorityColors[task.priority]} hover:bg-gray-850 transition-colors`}>
      <div className="flex items-start gap-3">
        <button className="mt-0.5">
          {task.completed 
            ? <CheckCircle2 className="w-5 h-5 text-green-500" /> 
            : <Circle className="w-5 h-5 text-gray-500" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
            {task.name}
          </h3>

          {task.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {task.date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(task.date, 'MMM d, HH:mm')}
              </span>
            )}

            {task.labels && task.labels.length > 0 && (
              <div className="flex gap-1">
                {task.labels.map(label => (
                  <span 
                    key={label.id}
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: label.color + '20', color: label.color }}
                  >
                    {label.emoji} {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {task.priority !== 'none' && (
          <AlertCircle className={`w-4 h-4 ${priorityColors[task.priority].split(' ')[0]}`} />
        )}
      </div>
    </div>
  );
}