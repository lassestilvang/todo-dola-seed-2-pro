'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, Tag, List, Bold, Italic, Underline, Play, Pause, SkipForward, RotateCw } from 'lucide-react';
import Link from 'next/link';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds

export default function FocusModePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${params.id}`);
        if (res.ok) {
          setTask(await res.json());
        }
      } catch (error) {
        console.error('Failed to fetch task:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [params.id]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setCompleted(true);
      toast.success('Pomodoro completed! Take a break.');
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    setIsRunning(true);
    setCompleted(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(POMODORO_DURATION);
    setCompleted(false);
  };

  const handleSkip = () => {
    setIsRunning(false);
    setTimeLeft(POMODORO_DURATION);
    setCompleted(false);
    toast.info('Pomodoro skipped');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      if (res.ok) {
        toast.success('Task marked as complete');
        router.push('/');
      }
    } catch {
      toast.error('Failed to complete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Task not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <Link href={`/task/${task.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Task
          </Button>
        </Link>
        <div className="text-sm text-gray-400">
          Focus Mode • Pomodoro
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{task.name}</h1>
            {task.description && (
              <p className="text-xl text-gray-300 mb-6">{task.description}</p>
            )}
          </div>

          {/* Task Meta */}
          <div className="space-y-4 mb-8">
            {task.date && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>Due: {new Date(task.date).toLocaleDateString()}</span>
              </div>
            )}
            {task.priority !== 'none' && (
              <div className="flex items-center gap-3">
                <Bold className="w-5 h-5 text-gray-400" />
                <span>Priority: {task.priority}</span>
              </div>
            )}
            {task.listId && (
              <div className="flex items-center gap-3">
                <List className="w-5 h-5 text-gray-400" />
                <span>In list</span>
              </div>
            )}
          </div>

          {/* Focus Timer */}
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <p className="text-gray-400 mb-2">Time remaining</p>
            <div className="text-6xl font-mono font-bold mb-4">{formatTime(timeLeft)}</div>
            <div className="flex justify-center gap-2">
              {isRunning ? (
                <Button size="lg" onClick={handlePause}>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button size="lg" onClick={handleStart}>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={handleSkip}>
                <SkipForward className="w-5 h-5 mr-2" />
                Skip
              </Button>
              <Button variant="outline" size="lg" onClick={handleReset}>
                <RotateCw className="w-5 h-5 mr-2" />
                Reset
              </Button>
            </div>
            {completed && (
              <Button className="mt-4 w-full" onClick={handleComplete}>
                Mark Task Complete
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}