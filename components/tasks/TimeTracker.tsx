'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Clock, Play, Square, History } from 'lucide-react';
import { format } from 'date-fns';

interface TimeEntry {
  id: string;
  duration: number;
  description: string | null;
  startedAt: number;
}

interface TimeTrackerProps {
  taskId: string;
  initialTime?: number;
}

export default function TimeTracker({ taskId, initialTime }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTime) {
      setElapsed(initialTime);
    }
    fetchEntries();
  }, [taskId]);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/time-entries?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    }
  };

  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current!);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsed;
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleSave = async () => {
    if (elapsed === 0) return;

    const durationMinutes = Math.round(elapsed / 60000);

    try {
      const res = await fetch(`/api/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          duration: durationMinutes,
          description,
        }),
      });

      if (res.ok) {
        const entry = await res.json();
        setEntries([entry, ...entries]);
        toast.success(`Logged ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`);
        setElapsed(0);
        setDescription('');
      } else {
        toast.error('Failed to save time entry');
      }
    } catch {
      toast.error('Failed to save time entry');
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalLogged = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Tracking
        </h3>
        <div className="text-right text-sm">
          <div className="text-gray-400">Total</div>
          <div className="font-medium">{Math.round(totalLogged)}m</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-mono bg-gray-800 px-3 py-1 rounded">
            {formatTime(elapsed)}
          </div>
          <div className="flex gap-2">
            {!isRunning ? (
              <Button size="sm" onClick={handleStart}>
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleStop}>
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        <Input
          placeholder="What are you working on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isRunning}
        />

        <Button size="sm" onClick={handleSave} disabled={elapsed === 0 || isRunning}>
          Save Entry
        </Button>

        {entries.length > 0 && (
          <div className="pt-3 border-t border-gray-800">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              Time History ({entries.length})
            </button>
            {showHistory && (
              <ul className="space-y-1 mt-2 text-sm">
                {entries.slice(0, 10).map(entry => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      {entry.description && (
                        <span className="text-gray-300">{entry.description}</span>
                      )}
                      <span className="text-gray-500 text-xs">
                        {format(entry.startedAt, 'HH:mm')}
                      </span>
                    </div>
                    <span className="text-gray-400">{entry.duration}m</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}