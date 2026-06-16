'use client';

import { HelpCircle, Search, Plus } from 'lucide-react';
import { ShortcutHint } from '@/components/ui/ShortcutHint';

interface HeaderWithShortcutsProps {
  title: string;
  onSearch?: () => void;
  onNewTask?: () => void;
}

export function HeaderWithShortcuts({ title, onSearch, onNewTask }: HeaderWithShortcutsProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        {onSearch && (
          <button
            onClick={onSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
            <ShortcutHint shortcut="⌘K" />
          </button>
        )}
        {onNewTask && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
            <ShortcutHint shortcut="⌘N" />
          </button>
        )}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', metaKey: true, shiftKey: true }))}
          className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
          title="Keyboard shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}