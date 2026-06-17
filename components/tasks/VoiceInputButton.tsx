'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '@/lib/utils/voice-input';
import { generateTaskFromPrompt } from '@/lib/utils/ai-suggestions';

interface VoiceInputButtonProps {
  onTaskCreated?: (task: any) => void;
  className?: string;
}

export function VoiceInputButton({ onTaskCreated, className }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voiceInput = useVoiceInput();

  const handleVoiceInput = async () => {
    if (!voiceInput.isSupported()) {
      setError('Voice input is not supported in this browser');
      return;
    }

    setError(null);
    setIsListening(true);

    try {
      await voiceInput.startListening(async (result) => {
        const task = generateTaskFromPrompt(result.transcript);
        onTaskCreated?.(task);
        setIsListening(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice input failed');
      setIsListening(false);
    }
  };

  if (!voiceInput.isSupported()) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleVoiceInput}
        disabled={isListening}
        className={`p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors ${className}`}
        title={isListening ? 'Listening...' : 'Create task with voice'}
      >
        {isListening ? (
          <MicOff className="w-4 h-4 text-red-500 animate-pulse" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </>
  );
}