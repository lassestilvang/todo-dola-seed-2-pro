import { cn } from '@/lib/utils';

interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}

export function ShortcutHint({ shortcut, className }: ShortcutHintProps) {
  return (
    <kbd className={cn(
      'pointer-events-none inline-flex items-center justify-center',
      'rounded-sm border border-gray-500/50 bg-gray-800/50 px-1.5 py-0.5',
      'text-xs font-medium text-gray-400',
      'group-hover:text-gray-300 transition-colors',
      className
    )}>
      {shortcut}
    </kbd>
  );
}