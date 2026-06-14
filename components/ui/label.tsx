import type { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return (
    <label className={`text-sm font-medium leading-none ${className || ''}`}>
      {children}
    </label>
  );
}