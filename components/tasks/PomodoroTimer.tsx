'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';

interface PomodoroTimerProps {
  task: Task;
  onTimeLogged?: (_taskId: string, _duration: number) => void;
}

const DEFAULT_FOCUS_TIME = 25 * 60; // 25 minutes in seconds
const DEFAULT_BREAK_TIME = 5 * 60; // 5 minutes in seconds

export default function PomodoroTimer({ task, onTimeLogged }: PomodoroTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [focusTime, setFocusTime] = useState(DEFAULT_FOCUS_TIME);
  const [breakTime, setBreakTime] = useState(DEFAULT_BREAK_TIME);
  const [elapsed, setElapsed] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const newElapsed = prev + 1;
          if (newElapsed >= (mode === 'focus' ? focusTime : breakTime)) {
            handleTimerComplete();
            return 0;
          }
          return newElapsed;
        });
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
  }, [isRunning, mode, focusTime, breakTime]);

  const handleTimerComplete = () => {
    if (mode === 'focus') {
      setCompletedPomodoros(prev => prev + 1);
      setMode('break');
      setElapsed(0);
    } else {
      setMode('focus');
      setElapsed(0);
    }
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleSkip = () => {
    if (mode === 'focus') {
      // Log the time spent
      const duration = elapsed;
      if (duration > 0 && onTimeLogged) {
        onTimeLogged(task.id, duration);
      }
    }
    setMode('focus');
    setElapsed(0);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setCompletedPomodoros(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus'
    ? (elapsed / focusTime) * 100
    : (elapsed / breakTime) * 100;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-blue-400" />
        <span className="font-medium">Pomodoro Timer</span>
      </div>

      <div className="space-y-3">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold mb-1">
            {formatTime(elapsed)}
          </div>
          <div className="text-sm text-gray-400">
            {mode === 'focus' ? 'Focus Time' : 'Break Time'}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${mode === 'focus' ? 'bg-blue-500' : 'bg-green-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Pomodoros completed: {completedPomodoros}</span>
          <span className="text-gray-400">Task: {task.name}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handlePlayPause}
            className="px-4"
          >
            {isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkip}
            title="Skip"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}