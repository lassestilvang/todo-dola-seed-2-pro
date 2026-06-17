'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Save, Trash2, ChevronDown } from 'lucide-react';
import type { TaskFilter } from '@/lib/types';

interface SavedFilter {
  id: string;
  name: string;
  filter: TaskFilter;
}

interface SavedFiltersProps {
  currentFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
}

export default function SavedFilters({ currentFilter, onFilterChange }: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const saved = localStorage.getItem('saved-filters');
    return saved ? JSON.parse(saved) : [];
  });
  const [newFilterName, setNewFilterName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const saveCurrentFilter = () => {
    if (!newFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `filter_${Date.now()}`,
      name: newFilterName,
      filter: currentFilter,
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('saved-filters', JSON.stringify(updated));
    setNewFilterName('');
  };

  const loadFilter = (filter: SavedFilter) => {
    onFilterChange(filter.filter);
    setIsOpen(false);
  };

  const deleteFilter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('saved-filters', JSON.stringify(updated));
  };

  const matchesCurrentFilter = (filter: SavedFilter) => {
    return JSON.stringify(filter.filter) === JSON.stringify(currentFilter);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="touch-target"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bookmark className="w-4 h-4 mr-2" />
        Saved Filters
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-popover border rounded-md shadow-lg z-50 p-3">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Save Current Filter</div>
            <div className="flex gap-2">
              <Input
                placeholder="Filter name"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={saveCurrentFilter} disabled={!newFilterName.trim()}>
                <Save className="w-4 h-4" />
              </Button>
            </div>

            {savedFilters.length > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground mt-3">Saved Filters</div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {savedFilters.map(filter => (
                    <div
                      key={filter.id}
                      className={`flex items-center justify-between p-2 rounded hover:bg-gray-800/50 cursor-pointer ${
                        matchesCurrentFilter(filter) ? 'bg-gray-800' : ''
                      }`}
                      onClick={() => loadFilter(filter)}
                    >
                      <span className="text-sm">{filter.name}</span>
                      <button
                        onClick={(e) => deleteFilter(filter.id, e)}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}