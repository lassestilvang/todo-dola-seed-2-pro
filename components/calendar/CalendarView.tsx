'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, addWeeks, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, GripVertical } from 'lucide-react';
import type { Task, TimeBlock } from '@/lib/types';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarViewProps {
  tasks: Task[];
  timeBlocks: TimeBlock[];
  onTaskMove?: (taskId: string, newDate: number) => void;
}

function getDayClasses(isToday: boolean, isCurrentMonth: boolean): string {
  const base = 'min-h-24 p-2 rounded-lg border transition-colors';
  const todayClass = isToday ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-950';
  const monthClass = !isCurrentMonth ? 'opacity-50' : '';
  return `${base} ${todayClass} ${monthClass}`;
}

function getDayNumberClasses(isToday: boolean): string {
  return `text-sm font-medium mb-1 ${isToday ? 'text-blue-400' : ''}`;
}

function getTaskClasses(priority: string): string {
  const base = 'text-xs p-1 rounded truncate';
  switch (priority) {
    case 'high': return `${base} bg-red-500/20 text-red-300`;
    case 'medium': return `${base} bg-yellow-500/20 text-yellow-300`;
    case 'low': return `${base} bg-green-500/20 text-green-300`;
    default: return `${base} bg-gray-700/20 text-gray-400`;
  }
}

export function CalendarView({ tasks, timeBlocks, onTaskMove }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const navigation = {
    prev: () => setCurrentDate(
      viewMode === 'month' ? addMonths(currentDate, -1) :
      viewMode === 'week' ? addWeeks(currentDate, -1) :
      addDays(currentDate, -1)
    ),
    next: () => setCurrentDate(
      viewMode === 'month' ? addMonths(currentDate, 1) :
      viewMode === 'week' ? addWeeks(currentDate, 1) :
      addDays(currentDate, 1)
    ),
  };

  const renderMonthView = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const startWeek = startOfWeek(startDate);
    const endWeek = endOfWeek(endDate);

    const weeks = [];
    let currentWeek = startWeek;

    while (currentWeek <= endWeek) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(currentWeek, i));
      }
      weeks.push(days);
      currentWeek = addDays(currentWeek, 7);
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map(day => {
              const tasksForDay = tasks.filter(t => t.date && isSameDay(t.date, day));
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={getDayClasses(isToday, isCurrentMonth)}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={getDayNumberClasses(isToday)}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {tasksForDay.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className={getTaskClasses(task.priority)}
                        title={task.name}
                      >
                        {task.name}
                      </div>
                    ))}
                    {tasksForDay.length > 3 && (
                      <div className="text-xs text-gray-500">+{tasksForDay.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {days.map(day => {
            const tasksForDay = tasks.filter(t => t.date && isSameDay(t.date, day));
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="space-y-2">
                <div className={getDayNumberClasses(isToday)}>
                  {format(day, 'EEE d')}
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {tasksForDay.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const tasksForDay = tasks.filter(t => t.date && isSameDay(t.date, currentDate));

    const getTaskForHour = (hour: number) => {
      return tasksForDay.filter(t => {
        if (!t.date) return false;
        return new Date(t.date).getHours() === hour;
      });
    };

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        <div className="space-y-2">
          {hours.map(hour => {
            const hourTasks = getTaskForHour(hour);
            return (
              <div key={hour} className="flex items-start gap-4">
                <div className="w-16 text-sm text-gray-400 pt-2">{hour}:00</div>
                <div className="flex-1 min-h-12 p-2 rounded-lg bg-gray-950 border border-gray-800">
                  {hourTasks.map(task => (
                    <TaskItem key={task.id} task={task} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' && 'Week of ' + format(startOfWeek(currentDate), 'MMM d') + ' - ' + format(endOfWeek(currentDate), 'd')}
            {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'day' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
            >
              Day
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={navigation.prev}
            className="p-2 rounded-lg hover:bg-gray-800"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm text-blue-400 hover:bg-blue-500/10 rounded"
          >
            Today
          </button>
          <button
            onClick={navigation.next}
            className="p-2 rounded-lg hover:bg-gray-800"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
}

function TaskItem({ task, compact }: { task: Task; compact?: boolean }) {
  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer ${
        compact ? 'flex-col items-start' : ''
      }`}
      onClick={() => window.location.href = '/task/' + task.id}
    >
      <GripVertical className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${compact ? 'text-sm' : ''}`}>
          {task.name}
        </div>
        {!compact && task.description && (
          <div className="text-xs text-gray-400 truncate">{task.description}</div>
        )}
      </div>
      {task.priority !== 'none' && (
        <div className={getTaskClasses(task.priority)} />
      )}
    </div>
  );
}