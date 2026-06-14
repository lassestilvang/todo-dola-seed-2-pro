'use client';

import { Filter, X, Tag, ListFilter, CalendarRange, Clock, Save, FolderPlus, Zap, CheckSquare, AlertCircle } from 'lucide-react';
import { Priority } from '@/lib/types';
import { useState, useEffect } from 'react';

interface CustomView {
  id: string;
  name: string;
  icon: string | null;
  filterConfig: string;
  isDefault: boolean;
}

type SortOption = 'date' | 'created' | 'priority' | 'name' | 'list';

interface TaskFilterProps {
  lists: { id: string; name: string }[];
  labels: { id: string; name: string; color: string; emoji?: string }[];
  filters: {
    listId: string | null;
    labelId: string | null;
    priority: Priority | null;
    search: string;
    completed: boolean | null;
    recurring: boolean | null;
    dateFrom: number | null;
    dateTo: number | null;
    sort: SortOption;
    sortDirection: 'asc' | 'desc';
  };
  onFilterChange: (filters: TaskFilterProps['filters']) => void;
  onClearFilters: () => void;
}

// Quick filter presets
const QUICK_FILTERS = [
  { name: 'Today', icon: CalendarRange, config: { completed: false } },
  { name: 'Overdue', icon: AlertCircle, config: { completed: false } },
  { name: 'This Week', icon: CalendarRange, config: { completed: false } },
  { name: 'High Priority', icon: Zap, config: { priority: 'high', completed: false } },
  { name: 'Waiting', icon: CheckSquare, config: { completed: false } },
];

export default function TaskFilter({ lists, labels, filters, onFilterChange, onClearFilters }: TaskFilterProps) {
  const hasActiveFilters = filters.listId || filters.labelId || filters.priority || filters.search || filters.completed || filters.recurring || filters.dateFrom || filters.dateTo;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    fetchCustomViews();
  }, []);

  async function fetchCustomViews() {
    try {
      const res = await fetch('/api/custom-views');
      if (res.ok) {
        setCustomViews(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch custom views:', error);
    }
  }

  const filterConfig = JSON.stringify(filters);

  async function saveCurrentView() {
    if (!viewName.trim()) {
      alert('Please enter a name for this view');
      return;
    }

    try {
      const res = await fetch('/api/custom-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: viewName,
          icon: '📋',
          filterConfig,
        }),
      });

      if (res.ok) {
        setViewName('');
        fetchCustomViews();
      }
    } catch (error) {
      console.error('Failed to save view:', error);
    }
  }

  async function loadView(view: CustomView) {
    try {
      const config = JSON.parse(view.filterConfig);
      onFilterChange(config);
    } catch (error) {
      console.error('Failed to load view:', error);
    }
  }

  async function deleteView(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this view?')) return;

    try {
      await fetch(`/api/custom-views/${id}`, { method: 'DELETE' });
      fetchCustomViews();
    } catch (error) {
      console.error('Failed to delete view:', error);
    }
  }

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {customViews.length > 0 && (
            <div className="relative">
              <FolderPlus className="w-4 h-4 text-gray-400 mr-1" />
              <select
                onChange={(e) => {
                  const viewId = e.target.value;
                  if (viewId) {
                    const view = customViews.find(v => v.id === viewId);
                    if (view) loadView(view);
                  }
                }}
                className="text-xs pr-2 pl-1 bg-transparent border border-gray-700 rounded"
                defaultValue=""
              >
                <option value="" disabled>Saved Views</option>
                {customViews.map(view => (
                  <option key={view.id} value={view.id}>{view.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-gray-400 hover:text-gray-200"
          >
            {showAdvanced ? 'Hide' : 'Advanced'}
          </button>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(filter => {
          const Icon = filter.icon;
          const isActive = Object.entries(filter.config).every(
            ([key, value]) => filters[key as keyof typeof filters] === value
          );
          return (
            <button
              key={filter.name}
              onClick={() => onFilterChange({ ...filters, ...filter.config as Partial<typeof filters> })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors touch-target ${
                isActive
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              {filter.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <ListFilter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.listId || ''}
            onChange={(e) => onFilterChange({ ...filters, listId: e.target.value || null })}
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background touch-target"
          >
            <option value="">All Lists</option>
            {lists.map(list => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.labelId || ''}
            onChange={(e) => onFilterChange({ ...filters, labelId: e.target.value || null })}
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background touch-target"
          >
            <option value="">All Labels</option>
            {labels.map(label => (
              <option key={label.id} value={label.id}>{label.emoji} {label.name}</option>
            ))}
          </select>
        </div>

        <select
          value={filters.priority || ''}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value as Priority | null })}
          className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.completed !== null ? String(filters.completed) : ''}
          onChange={(e) => onFilterChange({ ...filters, completed: e.target.value === '' ? null : e.target.value === 'true' })}
          className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target"
        >
          <option value="">All Tasks</option>
          <option value="false">Active Only</option>
          <option value="true">Completed Only</option>
        </select>

        <label className="flex items-center gap-2 text-sm touch-target">
          <input
            type="checkbox"
            checked={filters.recurring ?? false}
            onChange={(e) => onFilterChange({ ...filters, recurring: e.target.checked ? true : null })}
            className="rounded w-4 h-4"
          />
          Recurring
        </label>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.dateFrom ? new Date(filters.dateFrom).toISOString().split('T')[0] : ''}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).getTime() : null })}
              className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target"
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.dateTo ? new Date(filters.dateTo).toISOString().split('T')[0] : ''}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value).getTime() : null })}
              className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target"
            />
          </div>
        </div>
      )}

      {/* Save current view */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <input
            type="text"
            placeholder="Save this view as..."
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-700 rounded flex-1"
          />
          <button
            onClick={saveCurrentView}
            disabled={!viewName.trim()}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}