'use client';

import { useEffect } from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
}

const shortcuts: KeyboardShortcut[] = [
  { key: '⌘K', label: 'Search', description: 'Quick search tasks' },
  { key: '⌘N', label: 'New', description: 'Create a new task' },
  { key: '⌘⇧?', label: 'Help', description: 'Show this help dialog' },
  { key: '⌘S', label: 'Save', description: 'Save current changes' },
  { key: '⌘Z', label: 'Undo', description: 'Undo last change' },
  { key: '⌘⇧Z', label: 'Redo', description: 'Redo last change' },
  { key: '/', label: 'Focus', description: 'Focus search input' },
  { key: 'Esc', label: 'Close', description: 'Close dialogs/modals' },
  { key: 'n', label: 'Today', description: 'Go to today view' },
  { key: 'a', label: 'All', description: 'Go to all tasks view' },
  { key: 'k', label: 'Kanban', description: 'Go to Kanban board' },
  { key: 'c', label: 'Calendar', description: 'Go to calendar view' },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between py-2 px-1">
              <div>
                <p className="text-sm font-medium">{shortcut.description}</p>
                <p className="text-xs text-gray-400">{shortcut.label}</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                <Command className="w-3 h-3 text-gray-400" />
                <span className="text-sm font-mono">{shortcut.key}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-400">
          Press <span className="mx-1 bg-gray-800 px-1 py-0.5 rounded">Esc</span> or click outside to close
        </div>
      </div>
    </div>
  );
}