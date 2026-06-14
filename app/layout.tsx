import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';
import Sidebar from '@/components/layout/sidebar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import DefaultViewRedirect from '@/components/DefaultViewRedirect';
import ServiceWorkerRegister from './service-worker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Daily Task Planner",
  description: "Modern professional daily task planner",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} min-h-full antialiased`}>
        <Providers>
          <DefaultViewRedirect>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-safe">
                <ErrorBoundary>
                  <div className="max-w-5xl mx-auto">
                    {children}
                  </div>
                </ErrorBoundary>
              </main>
            </div>
          </DefaultViewRedirect>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}