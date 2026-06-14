'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DefaultViewRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const settings = localStorage.getItem('taskSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        const defaultView = parsed.defaultView;
        if (defaultView && defaultView !== 'inbox' && window.location.pathname === '/') {
          const viewPaths: Record<string, string> = {
            'today': '/today',
            'next7days': '/next7days',
            'upcoming': '/upcoming',
            'calendar': '/calendar',
            'kanban': '/kanban',
            'dashboard': '/dashboard',
          };
          const path = viewPaths[defaultView];
          if (path) {
            router.push(path);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }, [router]);

  return <>{children}</>;
}