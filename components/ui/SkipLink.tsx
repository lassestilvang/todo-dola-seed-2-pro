'use client';

import { cn } from '@/lib/utils';

export function SkipLink({ className }: { className?: string }) {
  return (
    <a
      href="#main-content"
      className={cn(
        'absolute -top-10 left-2 z-[100] bg-blue-600 text-white px-4 py-2 rounded',
        'focus:not-abstracted:top-2 focus:outline-none focus:ring-2 focus:ring-white',
        className
      )}
    >
      Skip to main content
    </a>
  );
}