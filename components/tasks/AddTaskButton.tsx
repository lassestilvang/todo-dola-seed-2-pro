'use client';

import { useState, useEffect } from 'react';
import { Plus, Repeat, Calendar, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Task, Priority } from '@/lib/types';

interface RecurringConfig {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | '';
  interval: number;
  endDate: string;
  maxOccurrences: number | '';
}

function RecurringConfigSelector({
  config,
  onChange,
}: {
  config: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
}) {
  return (
    <div className="space-y-3 border-t border-gray-700 pt-3 mt-3">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium">Recurring Task</span>
      </div>

      <select
        value={config.type}
        onChange={(e) => onChange({ ...config, type: e.target.value as never })}
        className="w-full p-2 text-sm rounded border bg-background"
      >
        <option value="">No recurrence</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      {config.type && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Interval</label>
            <input
              type="number"
              min="1"
              value={config.interval}
              onChange={(e) => onChange({ ...config, interval: parseInt(e.target.value) || 1 })}
              className="w-full p-2 text-sm rounded border bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Max occurrences</label>
            <input
              type="number"
              min="1"
              value={config.maxOccurrences}
              onChange={(e) => onChange({ ...config, maxOccurrences: parseInt(e.target.value) || '' as never })}
              placeholder="Unlimited"
              className="w-full p-2 text-sm rounded border bg-background"
            />
          </div>
        </div>
      )}

      {config.type && (
        <div>
          <label className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            End date (optional)
          </label>
          <input
            type="date"
            value={config.endDate}
            onChange={(e) => onChange({ ...config, endDate: e.target.value })}
            className="w-full p-2 text-sm rounded border bg-background"
          />
        </div>
      )}
    </div>
  );
}

interface AddTaskButtonProps {
  listId?: string;
  onTaskCreated?: (_task: Task) => void;
}

export default function AddTaskButton({ listId = 'inbox', onTaskCreated }: AddTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [date, setDate] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string; emoji: string; color: string }[]>([]);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({
    type: '',
    interval: 1,
    endDate: '',
    maxOccurrences: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ field: string; value: unknown; reason: string; confidence: number }[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLabels();
    }
  }, [open]);

  async function fetchLabels() {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        setAvailableLabels(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }

  // Get AI suggestions when name changes
  useEffect(() => {
    if (name.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch('/api/ai-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskName: name, description }),
          });
          if (res.ok) {
            const data = await res.json();
            setAiSuggestions(data.suggestions);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [name, description]);

  const applySuggestion = (suggestion: { field: string; value: unknown }) => {
    switch (suggestion.field) {
      case 'priority':
        setPriority(suggestion.value as Priority);
        break;
      case 'date':
        setDate(suggestion.value as number);
        break;
    }
    setShowSuggestions(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Build recurring config
    let recurringConfigStr: string | null = null;
    if (recurringConfig.type) {
      const config: { type: string; interval: number; endDate?: number; maxOccurrences?: number } = {
        type: recurringConfig.type,
        interval: recurringConfig.interval,
      };
      if (recurringConfig.endDate) {
        config.endDate = new Date(recurringConfig.endDate).getTime();
      }
      if (recurringConfig.maxOccurrences) {
        config.maxOccurrences = recurringConfig.maxOccurrences;
      }
      recurringConfigStr = JSON.stringify(config);
    }

    setSaving(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          listId,
          priority,
          date,
          labels,
          recurringType: recurringConfig.type || null,
          recurringConfig: recurringConfigStr,
        }),
      });

      if (res.ok) {
        const task = await res.json();
        setName('');
        setDescription('');
        setPriority('none');
        setDate(null);
        setLabels([]);
        setRecurringConfig({ type: '', interval: 1, endDate: '', maxOccurrences: '' });
        setOpen(false);
        onTaskCreated?.(task);
        toast.success('Task created');
      } else {
        toast.error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg">
        <Plus className="w-6 h-6" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Task name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full p-2 rounded border bg-background"
          >
            <option value="none">No Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Labels</label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {availableLabels.map(label => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    setLabels(prev =>
                      prev.includes(label.id)
                        ? prev.filter(id => id !== label.id)
                        : [...prev, label.id]
                    );
                  }}
                  className={`px-2 py-1 text-xs rounded border ${
                    labels.includes(label.id)
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  {label.emoji} {label.name}
                </button>
              ))}
            </div>
          </div>

          <RecurringConfigSelector
          config={recurringConfig}
          onChange={setRecurringConfig}
        />

        {aiSuggestions && showSuggestions && (
            <div className="mb-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <Sparkles className="w-4 h-4" />
                <span>AI Suggestions</span>
              </div>
              <div className="space-y-1 text-sm">
                {aiSuggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left p-2 bg-gray-800 rounded hover:bg-gray-700 text-xs"
                    title={`Confidence: ${Math.round(s.confidence * 100)}%`}
                  >
                    <span className="font-medium capitalize">{s.field}:</span>{' '}
                    {s.field === 'date'
                      ? new Date(s.value as number).toLocaleDateString()
                      : String(s.value)}
                    <span className="block text-gray-400 mt-1">{s.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Creating...' : 'Create Task'}
        </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}