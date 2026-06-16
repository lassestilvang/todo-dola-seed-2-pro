'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('SW registered:', registration.scope);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New content is available, please refresh');
                  } else {
                    console.log('Content is cached for offline use');
                  }
                }
              });
            }
          });
        }).catch((error) => {
          console.log('SW registration failed:', error);
        });
      });
    }
  }, []);

  return null;
}