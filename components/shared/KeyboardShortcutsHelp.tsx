'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const shortcuts = [
  { key: 'Cmd/Ctrl + K', description: 'Search tasks', category: 'navigation' },
  { key: 'Cmd/Ctrl + N', description: 'Create new task', category: 'navigation' },
  { key: 'Cmd/Ctrl + Shift + ?', description: 'Show this help', category: 'navigation' },
  { key: 'Cmd/Ctrl + /', description: 'Focus search', category: 'navigation' },
  { key: 'T', description: 'Toggle task completion', category: 'task' },
  { key: 'E', description: 'Edit selected task', category: 'task' },
  { key: 'Delete', description: 'Delete selected task', category: 'task' },
  { key: 'Shift + Delete', description: 'Permanently delete', category: 'task' },
  { key: '↑ / ↓', description: 'Navigate tasks', category: 'task' },
  { key: 'Enter', description: 'Open selected task', category: 'task' },
  { key: 'Cmd/Ctrl + 1', description: 'Go to Today view', category: 'navigation' },
  { key: 'Cmd/Ctrl + 2', description: 'Go to Next 7 Days', category: 'navigation' },
  { key: 'Cmd/Ctrl + 3', description: 'Go to Calendar', category: 'navigation' },
  { key: 'Cmd/Ctrl + 4', description: 'Go to Kanban', category: 'navigation' },
  { key: 'Cmd/Ctrl + 5', description: 'Go to Dashboard', category: 'navigation' },
  { key: 'Cmd/Ctrl + 6', description: 'Go to All Tasks', category: 'navigation' },
  { key: 'R', description: 'Refresh tasks', category: 'task' },
  { key: 'Space', description: 'Toggle task completed', category: 'task' },
];

export default function KeyboardShortcutsHelp() {
  const navigationShortcuts = shortcuts.filter(s => s.category === 'navigation');
  const taskShortcuts = shortcuts.filter(s => s.category === 'task');

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          <div className="py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Navigation</h3>
            <div className="space-y-1">
              {navigationShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-gray-800 dark:bg-gray-200 rounded">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Task Operations</h3>
            <div className="space-y-1">
              {taskShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold bg-gray-800 dark:bg-gray-200 rounded">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}