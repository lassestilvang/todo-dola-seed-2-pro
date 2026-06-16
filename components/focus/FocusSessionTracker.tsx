'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, StopCircle, RefreshCw } from 'lucide-react';

interface FocusSession {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  completed: boolean;
}

interface FocusSessionTrackerProps {
  taskId: string;
  onSessionComplete?: (session: FocusSession) => void;
}

const DEFAULT_FOCUS_TIME = 25 * 60 * 1000; // 25 minutes

export default function FocusSessionTracker({ taskId, onSessionComplete }: FocusSessionTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(DEFAULT_FOCUS_TIME);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => prev - 1000);
      }, 1000);
    } else if (isRunning && remainingTime <= 0) {
      handleStop();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingTime]);

  const handleStart = () => {
    setIsRunning(true);
    const now = Date.now();
    const newSession: FocusSession = {
      id: `session_${now}`,
      taskId,
      startTime: now,
      endTime: null,
      duration: 0,
      completed: false,
    };
    setSessions(prev => [newSession, ...prev.slice(0, 4)]);
  };

  const handlePause = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleStop = () => {
    const now = Date.now();
    setIsRunning(false);
    setRemainingTime(DEFAULT_FOCUS_TIME);

    setSessions(prev => prev.map(session => {
      if (session.startTime === sessions[0]?.startTime) {
        const completedSession: FocusSession = {
          ...session,
          endTime: now,
          duration: now - session.startTime,
          completed: true,
        };
        onSessionComplete?.(completedSession);
        return completedSession;
      }
      return session;
    }));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingTime(DEFAULT_FOCUS_TIME);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalFocusTime = sessions
    .filter(s => s.completed)
    .reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Focus Timer</h3>

        <div className="text-center mb-4">
          <div className="text-4xl font-mono font-bold mb-2">
            {formatTime(Math.floor(remainingTime / 1000))}
          </div>
          <div className="text-sm text-muted-foreground">
            {isRunning ? 'Focus mode active' : 'Ready to focus'}
          </div>
        </div>

        <Progress
          value={((DEFAULT_FOCUS_TIME - remainingTime) / DEFAULT_FOCUS_TIME) * 100}
          className="h-2 mb-4"
        />

        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} size="sm">
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} size="sm" variant="outline">
              <Pause className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleStop} size="sm" variant="destructive" disabled={!isRunning}>
            <StopCircle className="w-4 h-4" />
          </Button>
          <Button onClick={handleReset} size="sm" variant="ghost">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Recent Sessions</h4>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions yet</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between text-sm">
                <span>{session.completed ? 'Completed' : 'In progress'}</span>
                <span className="text-gray-400">
                  {session.completed ? formatTime(Math.floor(session.duration / 60000)) : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 text-center">
        <div className="text-2xl font-bold">{Math.round(totalFocusTime / 60000)}m</div>
        <div className="text-sm text-muted-foreground">Total focus time today</div>
      </div>
    </div>
  );
}