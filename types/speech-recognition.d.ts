// Web Speech API types for TypeScript
// Extend Window interface with Speech Recognition APIs
declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognition;
    SpeechRecognition: SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition {
  continuous: boolean;
  grammars: SpeechGrammarList;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstar: ((this: SpeechRecognition, ev: Event) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onlanguagechanged: ((this: SpeechRecognition, ev: CustomEvent) => any) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechGrammarList {
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  grammar: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}