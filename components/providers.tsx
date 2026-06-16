'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/api/client';
import { PresenceProvider } from './PresenceProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <PresenceProvider>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
          <Toaster />
        </PresenceProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}