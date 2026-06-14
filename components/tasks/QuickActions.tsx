'use client';

import { useState } from 'react';
import { MoreVertical, Clock, Repeat, Copy, Trash2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Task } from '@/lib/types';

interface QuickActionsProps {
  task: Task;
  onAction: (action: string, task: Task) => void;
}

export default function QuickActions({ task, onAction }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [timeDescription, setTimeDescription] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [snoozeDays, setSnoozeDays] = useState('1');

  const handleLogTime = async () => {
    if (!timeMinutes || !parseInt(timeMinutes)) return;

    const duration = parseInt(timeMinutes);
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          duration,
          description: timeDescription,
        }),
      });

      if (res.ok) {
        toast.success(`Logged ${duration} minute${duration !== 1 ? 's' : ''}`);
        setShowTimeLog(false);
        setTimeDescription('');
        setTimeMinutes('');
      } else {
        toast.error('Failed to log time');
      }
    } catch {
      toast.error('Failed to log time');
    }
  };

  const handleSnooze = async () => {
    const days = parseInt(snoozeDays);
    if (!days || days < 1) return;

    const newDate = new Date(task.date || Date.now());
    newDate.setDate(newDate.getDate() + days);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate.getTime() }),
      });

      if (res.ok) {
        const updated = await res.json();
        onAction('snooze', updated);
        toast.success(`Snoozed for ${days} day${days !== 1 ? 's' : ''}`);
        setShowSnooze(false);
      } else {
        toast.error('Failed to snooze task');
      }
    } catch {
      toast.error('Failed to snooze task');
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setOpen(!open)}
        >
          <MoreVertical className="w-3 h-3" />
        </Button>

        {open && (
          <div
            className="absolute right-0 top-8 z-50 w-48 rounded-md border bg-gray-900 p-1 shadow-lg"
            onClick={() => setOpen(false)}
          >
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-700"
              onClick={() => { onAction('pomodoro', task); setOpen(false); }}
            >
              <Timer className="w-4 h-4" />
              Pomodoro
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-700"
              onClick={() => { setShowTimeLog(true); setOpen(false); }}
            >
              <Clock className="w-4 h-4" />
              Log Time
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-700"
              onClick={() => { onAction('duplicate', task); setOpen(false); }}
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-700"
              onClick={() => { setShowSnooze(true); setOpen(false); }}
            >
              <Repeat className="w-4 h-4" />
              Snooze
            </button>
            <div className="h-px -mx-1 my-1 bg-gray-700" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-red-400 hover:bg-red-700"
              onClick={() => { onAction('delete', task); setOpen(false); }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Time Log Dialog */}
      <Dialog open={showTimeLog} onOpenChange={setShowTimeLog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Duration (minutes)</label>
              <Input
                type="number"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value)}
                placeholder="60"
              />
            </div>
            <Textarea
              placeholder="What were you working on?"
              value={timeDescription}
              onChange={(e) => setTimeDescription(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTimeLog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogTime}>
                Log Time
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Snooze Dialog */}
      <Dialog open={showSnooze} onOpenChange={setShowSnooze}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snooze Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Snooze for how many days?</label>
              <Input
                type="number"
                value={snoozeDays}
                onChange={(e) => setSnoozeDays(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSnooze(false)}>
                Cancel
              </Button>
              <Button onClick={handleSnooze}>
                Snooze
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}