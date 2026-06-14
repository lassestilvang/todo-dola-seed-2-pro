'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, CalendarDays, CalendarRange, ListTodo, Plus, Menu, BarChart3, Calendar, LayoutGrid, Cloud, CloudOff, Trash2, Bell } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import ListManager from '@/components/lists/ListManager';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [showListManager, setShowListManager] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleOnline = () => setSyncStatus('online');
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setSyncStatus(navigator.onLine ? 'online' : 'offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { href: '/today', label: 'Today', icon: CalendarDays },
    { href: '/next7days', label: 'Next 7 Days', icon: CalendarRange },
    { href: '/upcoming', label: 'Upcoming', icon: CalendarRange },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/kanban', label: 'Kanban', icon: LayoutGrid },
    { href: '/all', label: 'All Tasks', icon: ListTodo },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/', label: 'Inbox', icon: Inbox },
    { href: '/trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 dark:bg-gray-200 lg:hidden touch-target"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed lg:static lg:translate-x-0 z-40 w-64 h-full bg-card border-r border-border p-4 transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-xl">Task Planner</h2>
          <div className="flex items-center gap-2">
            {syncStatus === 'online' && <Cloud className="w-4 h-4 text-green-400" aria-label="Online" />}
            {syncStatus === 'offline' && <CloudOff className="w-4 h-4 text-gray-400" aria-label="Offline" />}
            {syncStatus === 'syncing' && (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" aria-label="Syncing" />
            )}
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>

        <nav className="space-y-1 mb-8">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors touch-target ${
                  isActive
                    ? 'bg-gray-800 dark:bg-gray-200 text-blue-500'
                    : 'text-muted-foreground hover:bg-gray-800/50 dark:hover:bg-gray-200/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-muted-foreground font-medium">Lists</span>
            <a
              href="/lists"
              className="p-1 rounded hover:bg-gray-800 dark:hover:bg-gray-200 touch-target"
              title="Manage lists"
            >
              <Plus className="w-4 h-4" />
            </a>
          </div>

          <ListManager />
        </div>
      </aside>

      {showListManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Manage Lists</h3>
            <ListManager />
            <button
              onClick={() => setShowListManager(false)}
              className="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 touch-target"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
