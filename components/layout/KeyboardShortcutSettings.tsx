'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, X, Keyboard } from 'lucide-react';

export interface KeyboardShortcut {
  id: string;
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  enabled: boolean;
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'search', key: 'k', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'new-task', key: 'n', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'new-task-shift', key: 'n', metaKey: true, ctrlKey: true, shiftKey: true, enabled: true },
  { id: 'toggle-complete', key: 'Enter', shiftKey: true, enabled: true },
  { id: 'show-help', key: '?', metaKey: true, ctrlKey: true, shiftKey: true, enabled: true },
  { id: 'close-modals', key: 'Escape', enabled: true },
  { id: 'go-today', key: '1', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'go-next7', key: '2', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'go-upcoming', key: '3', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'go-all', key: '4', metaKey: true, ctrlKey: true, enabled: true },
  { id: 'go-inbox', key: '/', metaKey: true, ctrlKey: true, enabled: true },
];

const STORAGE_KEY = 'keyboard-shortcuts';

export function loadShortcuts(): KeyboardShortcut[] {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_SHORTCUTS;
}

export function saveShortcuts(shortcuts: KeyboardShortcut[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  } catch {
    // Ignore errors
  }
}

export function resetShortcuts(): KeyboardShortcut[] {
  saveShortcuts(DEFAULT_SHORTCUTS);
  return DEFAULT_SHORTCUTS;
}

function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.key) parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
}

export default function KeyboardShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isListening, setIsListening] = useState<string | null>(null);

  useEffect(() => {
    setShortcuts(loadShortcuts());
  }, []);

  const handleSave = () => {
    saveShortcuts(shortcuts);
  };

  const handleReset = () => {
    setShortcuts(resetShortcuts());
  };

  const updateShortcut = (id: string, updates: Partial<KeyboardShortcut>) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    setIsListening(null);

    updateShortcut(id, {
      key: e.key,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          Keyboard Shortcuts
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Customize keyboard shortcuts. Click on a shortcut below to change it.
      </p>

      <div className="space-y-4">
        {shortcuts.map(shortcut => (
          <div key={shortcut.id} className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">
                {shortcut.id.replace(/-/g, ' ')}
              </Label>
              <p className="text-xs text-gray-500">Press the key combination</p>
            </div>

            <div className="flex items-center gap-2">
              {isListening === shortcut.id ? (
                <div
                  className="px-3 py-2 bg-gray-800 rounded border-2 border-dashed border-gray-600"
                  onKeyDown={e => handleKeyDown(shortcut.id, e)}
                  tabIndex={0}
                >
                  <span className="text-gray-400">Listening...</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsListening(shortcut.id)}
                  className="px-3 py-2 bg-gray-800 rounded border border-gray-600 hover:bg-gray-700 font-mono text-sm"
                >
                  {formatShortcut(shortcut)}
                  {shortcut.enabled ? null : ' (disabled)'}
                </button>
              )}
            </div>

            <Switch
              checked={shortcut.enabled}
              onCheckedChange={checked => updateShortcut(shortcut.id, { enabled: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}