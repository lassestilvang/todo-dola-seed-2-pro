'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';

interface ReminderSystemProps {
  tasks: Task[];
}

interface ReminderState {
  taskId: string;
  reminded: boolean;
}

export default function ReminderSystem({ tasks }: ReminderSystemProps) {
  const [permission, setPermission] = useState<'default' | 'denied' | 'granted'>('default');
  const [enabled, setEnabled] = useState(false);
  const [reminderStates, setReminderStates] = useState<ReminderState[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check notification permission
    if (typeof window !== 'undefined') {
      setPermission(Notification.permission);
      const saved = localStorage.getItem('taskReminders') === 'true';
      setEnabled(saved);

      const savedStates = localStorage.getItem('taskReminderStates');
      if (savedStates) {
        setReminderStates(JSON.parse(savedStates));
      }

      // Request permission if not set
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((result) => {
          setPermission(result);
          if (result === 'granted') {
            localStorage.setItem('taskReminders', 'true');
            setEnabled(true);
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const now = Date.now();

    for (const task of tasks) {
      if (task.reminder && task.reminder <= now) {
        const alreadyReminded = reminderStates.some(
          (r) => r.taskId === task.id && r.reminded
        );

        if (!alreadyReminded) {
          showReminder(task);
          markAsReminded(task.id);
        }
      }
    }

    // Set up interval for recurring checks
    intervalRef.current = setInterval(() => {
      const checkTime = Date.now();
      for (const task of tasks) {
        if (task.reminder && task.reminder <= checkTime) {
          const alreadyReminded = reminderStates.some(
            (r) => r.taskId === task.id && r.reminded
          );
          if (!alreadyReminded) {
            showReminder(task);
            markAsReminded(task.id);
          }
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tasks, enabled, permission, reminderStates]);

  const showReminder = (task: Task) => {
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('Task Reminder', {
        body: task.description || task.name,
        icon: '/favicon.ico',
      });
    }

    // Toast notification
    toast.custom((t) => (
      <div className="flex items-center gap-3 rounded-lg bg-gray-900 border border-gray-700 p-4 shadow-lg">
        <CheckCircle2 className="w-5 h-5 text-blue-400" />
        <div className="flex-1">
          <p className="font-medium">Task Reminder</p>
          <p className="text-sm text-gray-400">{task.name}</p>
        </div>
      </div>
    ), { id: `reminder-${task.id}` });
  };

  const markAsReminded = (taskId: string) => {
    setReminderStates((prev) => {
      const newState = [...prev, { taskId, reminded: true }];
      localStorage.setItem('taskReminderStates', JSON.stringify(newState));
      return newState;
    });
  };

  // Removed unused clearReminders function

  const requestPermission = async () => {
    if (typeof window === 'undefined') return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      localStorage.setItem('taskReminders', 'true');
      setEnabled(true);
      toast.success('Notifications enabled!');
    }
  };

  const toggleEnabled = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    localStorage.setItem('taskReminders', String(newValue));
    if (!newValue) {
      toast.info('Reminders disabled');
    }
  };

  const hasUpcomingReminders = tasks.some(
    (t) => t.reminder && t.reminder > Date.now() && !t.completed
  );

  return (
    <div className="flex items-center gap-2">
      {hasUpcomingReminders && (
        <span className="text-xs text-gray-400 hidden sm:inline">
          {tasks.filter((t) => t.reminder && t.reminder > Date.now() && !t.completed).length} upcoming
        </span>
      )}
      <button
        onClick={permission === 'granted' ? toggleEnabled : requestPermission}
        className={`p-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
          enabled
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-gray-800 hover:bg-gray-700'
        }`}
        title={enabled ? 'Disable reminders' : 'Enable notifications'}
      >
        {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {enabled ? 'Reminders' : 'Enable reminders'}
        </span>
      </button>
    </div>
  );
}