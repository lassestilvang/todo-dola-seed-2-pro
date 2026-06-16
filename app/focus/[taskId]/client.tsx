'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/api/client';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface FocusModeClientProps {
  task: Task;
}

export default function FocusModeClient({ task }: FocusModeClientProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActiveBreak, setIsActiveBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  const WORK_DURATION = 25 * 60;
  const BREAK_DURATION = 5 * 60;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      if (isActiveBreak) {
        setIsActiveBreak(false);
        setTimeLeft(WORK_DURATION);
        setIsRunning(false);
      } else {
        setIsActiveBreak(true);
        setTimeLeft(BREAK_DURATION);
        setIsRunning(false);
        setSessions(s => s + 1);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isActiveBreak]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsActiveBreak(false);
    setTimeLeft(isActiveBreak ? BREAK_DURATION : WORK_DURATION);
    setSessions(0);
  };

  const handleSkip = () => {
    setIsRunning(false);
    setIsActiveBreak(!isActiveBreak);
    setTimeLeft(isActiveBreak ? WORK_DURATION : BREAK_DURATION);
  };

  const handleExit = async () => {
    // Log time spent
    const duration = isActiveBreak ? BREAK_DURATION : WORK_DURATION - timeLeft;
    await fetcher('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: task.id,
        duration: Math.floor(duration / 60), // in minutes
        description: isActiveBreak ? 'Break time' : 'Focus session',
      }),
    });
    router.push('/');
  };

  const progress = isActiveBreak
    ? ((BREAK_DURATION - timeLeft) / BREAK_DURATION) * 100
    : ((WORK_DURATION - timeLeft) / WORK_DURATION) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 to-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={handleExit}
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-center">{task.name}</CardTitle>
          <p className="text-sm text-gray-400 text-center mt-1 line-clamp-2">
            {task.description || 'No description'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">
              {isActiveBreak ? 'Break Time' : 'Focus Time'}
            </p>
            <div className="text-6xl font-bold mb-2">{formatTime(timeLeft)}</div>
            <Progress value={progress} className="w-full h-2" />
            <p className="text-xs text-gray-500 mt-2">
              {sessions} pomodoros completed
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} size="lg" className="gap-2">
                <Play className="w-5 h-5" />
                Start
              </Button>
            ) : (
              <Button onClick={handlePause} size="lg" variant="outline" className="gap-2">
                <Pause className="w-5 h-5" />
                Pause
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Esc</kbd> to exit
          </div>
        </CardContent>
      </Card>
    </div>
  );
}