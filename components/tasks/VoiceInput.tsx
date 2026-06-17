'use client';

import { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

// Extend Window interface for Speech Recognition API
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionAPI;
    SpeechRecognition: new () => SpeechRecognitionAPI;
  }
}

interface SpeechRecognitionAPI {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognitionAPI, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionAPI, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognitionAPI, ev: Event) => any) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export function VoiceInput({ onTranscription, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    setIsListening(true);
    setIsProcessing(true);

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsProcessing(false);
      onTranscription(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
    };

    recognition.start();
  }, [onTranscription]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SpeechRecognitionAPI) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled || isProcessing}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isListening ? (
        <MicOff className="w-4 h-4 text-red-400" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}