import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Daily Task Planner",
  description: "Modern professional daily task planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
