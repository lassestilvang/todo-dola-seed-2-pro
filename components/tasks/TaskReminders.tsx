'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Bell, Mail, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';

interface Reminder {
  id: string;
  taskId: string;
  reminderTime: number;
  sentAt: number | null;
  channel: 'email' | 'in-app' | 'slack' | 'discord';
  enabled: boolean;
}

interface TaskRemindersProps {
  task: Task;
}

export default function TaskReminders({ task }: TaskRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderChannel, setNewReminderChannel] = useState<'email' | 'in-app' | 'slack' | 'discord'>('email');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [task.id]);

  async function loadReminders() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?taskId=${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    if (!newReminderTime) return;

    setSaving(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          reminderTime: new Date(newReminderTime).getTime(),
          channel: newReminderChannel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReminders([...(reminders || []), data.data]);
        setNewReminderTime('');
        toast.success('Reminder created');
      }
    } catch (error) {
      toast.error('Failed to create reminder');
    } finally {
      setSaving(false);
    }
  }

  async function deleteReminder(id: string) {
    try {
      const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReminders(reminders.filter(r => r.id !== id));
        toast.success('Reminder deleted');
      }
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  }

  async function toggleReminder(id: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/reminders?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setReminders(reminders.map(r => r.id === id ? { ...r, enabled } : r));
      }
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  }

  const channelIcons = {
    email: Mail,
    'in-app': Bell,
    slack: ExternalLink,
    discord: ExternalLink,
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Task Reminders</h3>

      <div className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="reminder-time" className="text-xs">When</Label>
            <Input
              id="reminder-time"
              type="datetime-local"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="reminder-channel" className="text-xs">Channel</Label>
            <Select value={newReminderChannel} onValueChange={(v) => setNewReminderChannel(v as 'email' | 'in-app' | 'slack' | 'discord')}>
              <SelectTrigger id="reminder-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in-app">In-app</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createReminder} disabled={saving || !newReminderTime} size="sm">
            Add
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading reminders...</div>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-gray-500">No reminders set</p>
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => {
              const Icon = channelIcons[reminder.channel] || Bell;
              const reminderDate = new Date(reminder.reminderTime);
              const isPast = reminder.reminderTime < Date.now();

              return (
                <div key={reminder.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-900">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {reminderDate.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {reminder.channel} • {isPast ? 'Past due' : 'Scheduled'}
                    </p>
                  </div>
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={(checked) => toggleReminder(reminder.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteReminder(reminder.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}