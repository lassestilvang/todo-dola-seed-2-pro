'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseNaturalLanguageTask } from '@/lib/utils/ai-suggestions';
import { WandSparkles, X, Clock, Tag, AlertCircle, Mic, MicOff } from 'lucide-react';
import type { Task, Label } from '@/lib/types';

interface NaturalLanguageInputProps {
  onSubmit: (task: Partial<Task>) => void;
  defaultListId?: string;
}

export default function NaturalLanguageInput({ onSubmit, defaultListId = 'inbox' }: NaturalLanguageInputProps) {
  const [input, setInput] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    task: Partial<Task>;
    confidence: number;
    warnings: string[];
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;

    setIsParsing(true);
    try {
      const result = parseNaturalLanguageTask(input);
      const task: Partial<Task> = {
        name: result.task.name || input,
        description: result.task.description,
        date: result.task.date,
        priority: result.task.priority,
        estimate: result.task.estimate,
        labels: result.task.labels.map(label => ({
          id: label,
          name: label,
          emoji: '',
          color: '#6b7280',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })) as Label[],
        listId: result.task.listId || defaultListId,
      };
      setParsedResult({ ...result, task });
      setIsEditing(true);
    } catch (error) {
      console.error('Failed to parse:', error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(false);
  };

  const handleConfirm = () => {
    if (parsedResult) {
      onSubmit(parsedResult.task);
      setInput('');
      setParsedResult(null);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setInput('');
    setParsedResult(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!parsedResult) {
        handleParse();
      } else {
        handleConfirm();
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleVoiceInput = async () => {
    if (!('speechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser');
      return;
    }

    setIsListening(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a task naturally... e.g., 'Buy milk tomorrow at 5pm #shopping'"
          className="pr-20"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVoiceInput}
          disabled={isListening}
          className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 p-1"
          title="Voice input"
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleParse}
          disabled={!input.trim() || isEditing || isParsing || isListening}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-1"
          title="Parse task"
        >
          {isParsing ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <WandSparkles className="w-4 h-4" />
          )}
        </Button>
      </div>

      {parsedResult && isEditing && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Parsed task</span>
            <div className="flex items-center gap-2">
              {parsedResult.confidence < 0.8 && (
                <span className="text-xs text-yellow-500" title="Lower confidence in parsing">
                  Confidence: {Math.round(parsedResult.confidence * 100)}%
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleEdit} className="h-6 px-2">
                Edit
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">{parsedResult.task.name}</span>
            </div>

            {parsedResult.task.description && (
              <div className="text-sm text-muted-foreground">{parsedResult.task.description}</div>
            )}

            <div className="flex flex-wrap gap-3 text-xs">
              {parsedResult.task.date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Due: {new Date(parsedResult.task.date).toLocaleDateString()}
                </span>
              )}
              {parsedResult.task.estimate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Est: {parsedResult.task.estimate}m
                </span>
              )}
              {parsedResult.task.priority && parsedResult.task.priority !== 'none' && (
                <span className={`flex items-center gap-1 priority-${parsedResult.task.priority}`}>
                  <AlertCircle className="w-3 h-3" />
                  {parsedResult.task.priority}
                </span>
              )}
              {parsedResult.task.labels && parsedResult.task.labels.length > 0 && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {parsedResult.task.labels.map(l => l.name).join(', ')}
                </span>
              )}
            </div>

            {parsedResult.warnings.length > 0 && (
              <div className="text-xs text-yellow-500">
                Note: {parsedResult.warnings.join(', ')}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm}>
              Add Task
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}