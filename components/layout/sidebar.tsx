'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, CalendarDays, CalendarRange, ListTodo, Plus, Menu } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const navItems = [
    { href: '/today', label: 'Today', icon: CalendarDays },
    { href: '/next7days', label: 'Next 7 Days', icon: CalendarRange },
    { href: '/upcoming', label: 'Upcoming', icon: CalendarRange },
    { href: '/all', label: 'All Tasks', icon: ListTodo },
    { href: '/', label: 'Inbox', icon: Inbox },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 dark:bg-gray-200 lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} fixed lg:static lg:translate-x-0 z-40 w-64 h-full bg-card border-r border-border p-4 transition-transform`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-xl">Task Planner</h2>
          <ThemeToggle />
        </div>

        <nav className="space-y-1 mb-8">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-gray-800 dark:bg-gray-200 text-blue-500' 
                    : 'text-muted-foreground hover:bg-gray-800/50 dark:hover:bg-gray-200/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase text-muted-foreground font-medium">Lists</span>
            <button className="p-1 rounded hover:bg-gray-800 dark:hover:bg-gray-200">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-gray-800/50 dark:hover:bg-gray-200/50">
              <Plus className="w-4 h-4" />
              New List
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
