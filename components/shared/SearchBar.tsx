'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { Task } from '@/lib/types';
import { searchTasks } from '@/lib/utils/search';

interface SearchBarProps {
  tasks: Task[];
  onResults: (tasks: Task[]) => void;
}

export default function SearchBar({ tasks, onResults }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      const results = searchTasks(tasks, query);
      onResults(results);
    }, 150);

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, tasks, onResults]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder="Search tasks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-md text-sm focus:outline-none focus:border-gray-600"
      />
    </div>
  );
}
