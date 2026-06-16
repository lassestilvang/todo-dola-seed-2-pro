'use client';

import { useState, useEffect } from 'react';
import type { Task, TimeBlock } from '@/lib/types';
import { CalendarView } from '@/components/calendar/CalendarView';

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    async function loadData() {
      const now = Date.now();
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const monthFromNow = now + 30 * 24 * 60 * 60 * 1000;

      const [tasksRes, blocksRes] = await Promise.all([
        fetch('/api/tasks?view=all&completed=false'),
        fetch(`/api/time-blocks?start=${monthAgo}&end=${monthFromNow}`),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (blocksRes.ok) {
        const result = await blocksRes.json();
        setTimeBlocks(result.data);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <CalendarView tasks={tasks} timeBlocks={timeBlocks} />
    </div>
  );
}