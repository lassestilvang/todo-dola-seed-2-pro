import type { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Label({ children, className, htmlFor }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none ${className || ''}`}>
      {children}
    </label>
  );
}