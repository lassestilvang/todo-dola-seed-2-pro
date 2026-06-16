'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string; type: string }[]>([]);
  const router = useRouter();

  const searchTasks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchTasks(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchTasks]);

  // Keyboard shortcut for Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/task/${id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      router.push(`/task/${results[0].id}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </form>

      {isOpen && results.length > 0 && (
        <div className="absolute top-12 left-0 right-0 bg-gray-900 border border-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {results.map(result => (
            <button
              key={result.id}
              onClick={() => handleSelect(result.id)}
              className="w-full px-3 py-2 text-left hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="font-medium text-sm">{result.name}</div>
              <div className="text-xs text-gray-400">{result.type}</div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query && (
        <div className="absolute top-12 left-0 right-0 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400">
          No results found
        </div>
      )}
    </div>
  );
}