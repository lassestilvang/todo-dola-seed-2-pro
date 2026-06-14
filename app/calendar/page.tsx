'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { Task } from '@/lib/types';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    async function loadTasks() {
      const res = await fetch('/api/tasks?view=all&completed=false');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    }
    loadTasks();
  }, []);

  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.date) {
      const dateStr = new Date(task.date).toDateString();
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  const selectedDateStr = selectedDate?.toDateString();
  const selectedTasks = selectedDateStr ? tasksByDate[selectedDateStr] || [] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-lg border bg-gray-900"
          />
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h2>

          {selectedTasks.length === 0 ? (
            <p className="text-gray-500">No tasks scheduled for this date</p>
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map(task => (
                <li key={task.id} className="p-3 rounded-lg bg-gray-900 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-400' :
                      task.priority === 'medium' ? 'bg-yellow-400' :
                      task.priority === 'low' ? 'bg-green-400' :
                      'bg-gray-400'
                    }`} />
                    <span className="flex-1">{task.name}</span>
                    {task.labels && task.labels.length > 0 && (
                      <div className="flex gap-1">
                        {task.labels.map(label => (
                          <span
                            key={label.id}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: label.color + '20', color: label.color }}
                          >
                            {label.emoji}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}