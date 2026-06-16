'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadShortcuts } from '@/components/layout/KeyboardShortcutSettings';

interface KeyboardShortcutsProps {
  onNewTask: () => void;
  onSearch: () => void;
  onQuickAdd?: (text: string) => void;
}

export default function KeyboardShortcuts({ onNewTask, onSearch }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [shortcuts] = useState(() => loadShortcuts());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Escape first (always close dialogs)
      if (e.key === 'Escape') {
        const openDialogs = document.querySelectorAll('[data-slot="dialog-content"]');
        openDialogs.forEach(dialog => {
          const closeBtn = dialog.querySelector('[data-slot="dialog-close"]') as HTMLButtonElement;
          if (closeBtn) closeBtn.click();
        });
        setShowHelp(false);
        return;
      }

      // Quick add with Q key
      if (e.key === 'q' && e.metaKey) {
        e.preventDefault();
        onNewTask();
        return;
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find(s => {
        if (!s.enabled) return false;

        const keyMatch = s.key && e.key.toLowerCase() === s.key.toLowerCase();
        const metaMatch = s.metaKey ? e.metaKey : true;
        const ctrlMatch = s.ctrlKey ? e.ctrlKey : true;
        const shiftMatch = s.shiftKey ? e.shiftKey : true;

        return keyMatch && metaMatch && ctrlMatch && shiftMatch;
      });

      if (!matchedShortcut) return;

      e.preventDefault();

      // Handle specific shortcuts
      switch (matchedShortcut.id) {
        case 'new-task':
        case 'new-task-shift':
          onNewTask();
          break;
        case 'search':
          onSearch();
          break;
        case 'show-help':
          setShowHelp(true);
          break;
        case 'go-today':
          window.location.href = '/today';
          break;
        case 'go-next7':
          window.location.href = '/next7days';
          break;
        case 'go-upcoming':
          window.location.href = '/upcoming';
          break;
        case 'go-all':
          window.location.href = '/all';
          break;
        case 'go-inbox':
          window.location.href = '/';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, onNewTask, onSearch]);

  const getShortcutDisplay = (id: string): string => {
    const shortcut = shortcuts.find(s => s.id === id);
    if (!shortcut) return '';

    const parts: string[] = [];
    if (shortcut.metaKey) parts.push('⌘');
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.key) parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  };

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors z-40"
        title="Keyboard shortcuts"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button onClick={() => setShowHelp(false)} className="p-1 rounded hover:bg-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase text-gray-500 mb-2">Tasks</h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-sm">Search tasks</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{getShortcutDisplay('search')}</kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm">New task</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{getShortcutDisplay('new-task')}</kbd>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs uppercase text-gray-500 mb-2">Navigation</h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-sm">Today view</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{getShortcutDisplay('go-today')}</kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm">All tasks</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{getShortcutDisplay('go-all')}</kbd>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs uppercase text-gray-500 mb-2">System</h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-sm">Show shortcuts</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{getShortcutDisplay('show-help')}</kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm">Close dialogs</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">Esc</kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-sm">Quick add task</span>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">Q</kbd>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}