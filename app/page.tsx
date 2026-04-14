'use client';

import { useState } from 'react';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4">
        <div className="font-semibold text-xl mb-6">Task Planner</div>
        
        <nav className="space-y-1">
          <div className="px-3 py-2 rounded-md bg-gray-800 text-blue-400">
            📥 Inbox
          </div>
          <div className="px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white">
            ☀️ Today
          </div>
          <div className="px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white">
            📅 Next 7 Days
          </div>
          <div className="px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white">
            ⏭️ Upcoming
          </div>
          <div className="px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white">
            📋 All Tasks
          </div>
        </nav>
        
        <div className="mt-8 pt-4 border-t border-gray-800">
          <div className="text-xs uppercase text-gray-500 font-medium mb-2 px-3">Lists</div>
          <div className="space-y-1">
            <div className="px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white">
              + New List
            </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">Today</h1>
          
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <p className="text-gray-400">No tasks scheduled for today</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
