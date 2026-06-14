'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, X, ArrowUp, ArrowDown, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsProps {
  onNewTask: () => void;
  onSearch: () => void;
}

const shortcuts = [
  { category: 'Tasks', items: [
    { key: 'Cmd/Ctrl+K', description: 'Search tasks' },
    { key: 'Cmd/Ctrl+N', description: 'New task' },
    { key: '↑ ↓', description: 'Navigate tasks' },
    { key: 'Shift+Enter', description: 'Toggle task complete' },
    { key: 'Cmd/Ctrl+Shift+C', description: 'Clear completed tasks' },
    { key: 'Cmd/Ctrl+Shift+N', description: 'New task in current list' },
  ]},
  { category: 'Navigation', items: [
    { key: 'Cmd/Ctrl+1-4', description: 'Switch views (Today, 7 days, Upcoming, All)' },
    { key: 'Cmd/Ctrl+/', description: 'Go to inbox' },
    { key: 'G + T', description: 'Go to today view' },
    { key: 'G + K', description: 'Go to kanban board' },
    { key: 'G + D', description: 'Go to dashboard' },
  ]},
  { category: 'Lists', items: [
    { key: 'Cmd/Ctrl+Shift+L', description: 'Focus list filter' },
    { key: 'G + L', description: 'Go to lists manager' },
  ]},
  { category: 'System', items: [
    { key: 'Cmd/Ctrl+Shift+?', description: 'Show shortcuts' },
    { key: 'Escape', description: 'Close dialogs/modals' },
    { key: 'Cmd/Ctrl+S', description: 'Save (when editing)' },
  ]},
];

export default function KeyboardShortcuts({ onNewTask, onSearch }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + n: New task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onNewTask();
      }

      // Cmd/Ctrl + k: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch();
      }

      // Cmd/Ctrl + Shift + ?: Show shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowHelp(true);
      }

      // Escape: Close dialogs
      if (e.key === 'Escape') {
        const openDialogs = document.querySelectorAll('[data-slot="dialog-content"]');
        openDialogs.forEach(dialog => {
          const closeBtn = dialog.querySelector('[data-slot="dialog-close"]') as HTMLButtonElement;
          if (closeBtn) closeBtn.click();
        });
        setShowHelp(false);
      }

      // Navigation shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          window.location.href = '/today';
        } else if (e.key === '2') {
          e.preventDefault();
          window.location.href = '/next7days';
        } else if (e.key === '3') {
          e.preventDefault();
          window.location.href = '/upcoming';
        } else if (e.key === '4') {
          e.preventDefault();
          window.location.href = '/all';
        }
      }

      // Go to inbox
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        window.location.href = '/';
      }

      // Go to lists manager
      if ((e.metaKey || e.ctrlKey) && e.key === 'l' && !e.shiftKey) {
        e.preventDefault();
        window.location.href = '/lists';
      }

      // New task in current list (Cmd+Shift+N)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        // Dispatch event that AddTaskButton can listen to
        const listId = window.location.pathname.startsWith('/lists') ? undefined :
                       window.location.pathname === '/today' ? 'inbox' : undefined;
        const event = new CustomEvent('open-add-task', { detail: { listId } });
        window.dispatchEvent(event);
      }

      // Go to specific views
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.metaKey) {
        if (e.key === 't') {
          e.preventDefault();
          window.location.href = '/today';
        } else if (e.key === 'k') {
          e.preventDefault();
          window.location.href = '/kanban';
        } else if (e.key === 'd') {
          e.preventDefault();
          window.location.href = '/dashboard';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewTask, onSearch]);

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors z-40"
        title="Keyboard shortcuts (Cmd+Shift+?)"
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
              {shortcuts.map(category => (
                <div key={category.category}>
                  <h4 className="text-xs uppercase text-gray-500 mb-2">{category.category}</h4>
                  <ul className="space-y-2">
                    {category.items.map(item => (
                      <li key={item.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{item.description}</span>
                        <kbd className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">{item.key}</kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Cmd+Shift+?</kbd> or <kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl+Shift+?</kbd> to hide this help
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}