'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import SortableTask from './SortableTask';
import AddTaskButton from './AddTaskButton';
import ExportImport from './ExportImport';
import ReminderSystem from './ReminderSystem';
import PomodoroTimer from './PomodoroTimer';
import EmptyState from '@/components/ui/EmptyState';
import KeyboardShortcuts from '@/components/shared/KeyboardShortcuts';
import TaskFilter from './TaskFilter';
import OnboardingTour from '@/components/shared/OnboardingTour';
import TaskPreviewModal from './TaskPreviewModal';
import { Button } from '@/components/ui/button';
import type { Task, Priority } from '@/lib/types';
import { searchTasks, clearSearchCache } from '@/lib/utils/search';

interface TaskListViewProps {
  view: 'today' | 'next7' | 'upcoming' | 'all';
  title: string;
}

interface UndoState {
  action: 'delete';
  taskId: string;
  task: Task;
}

type SortOption = 'date' | 'created' | 'priority' | 'name' | 'list';

type FilterState = {
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

export default function TaskListView({ view, title }: TaskListViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showCompleted, setShowCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showCompleted') === 'true';
    }
    return false;
  });
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taskFilters');
      return saved ? JSON.parse(saved) : { listId: null, labelId: null, priority: null, search: '', completed: null, recurring: null, dateFrom: null, dateTo: null, sort: 'date', sortDirection: 'desc' };
    }
    return { listId: null, labelId: null, priority: null, search: '', completed: null, recurring: null, dateFrom: null, dateTo: null, sort: 'date', sortDirection: 'desc' };
  });

  // Clear date filters when view changes
  useEffect(() => {
    if (view !== 'all') {
      setFilters(prev => ({ ...prev, dateFrom: null, dateTo: null }));
    }
  }, [view]);

  const [loading, setLoading] = useState(true);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focusedTaskIndex, setFocusedTaskIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const TASKS_PER_PAGE = 50;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const filteredTasks = useMemo(() => {
    let result = searchTasks(tasks, filters.search);

    if (filters.listId) {
      result = result.filter(t => t.listId === filters.listId);
    }
    if (filters.labelId) {
      result = result.filter(t => t.labels?.some(l => l.id === filters.labelId));
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.completed !== null) {
      result = result.filter(t => t.completed === filters.completed);
    }
    if (filters.recurring) {
      result = result.filter(t => t.recurringType !== null);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;

      switch (filters.sort) {
        case 'date':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return direction * (a.date - b.date);
        case 'created':
          return direction * (a.createdAt - b.createdAt);
        case 'priority': {
          const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
          return direction * (priorityOrder[a.priority] - priorityOrder[b.priority]);
        }
        case 'name':
          return direction * a.name.localeCompare(b.name);
        case 'list': {
          const listA = lists.find(l => l.id === a.listId)?.name || '';
          const listB = lists.find(l => l.id === b.listId)?.name || '';
          return direction * listA.localeCompare(listB);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, filters, lists]);

  // Persist UI preferences
  useEffect(() => {
    localStorage.setItem('showCompleted', String(showCompleted));
  }, [showCompleted]);

  useEffect(() => {
    localStorage.setItem('taskFilters', JSON.stringify(filters));
  }, [filters]);

  // Fetch lists and labels for filter dropdowns
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [listsRes, labelsRes] = await Promise.all([
          fetch('/api/lists'),
          fetch('/api/labels'),
        ]);
        if (listsRes.ok) setLists(await listsRes.json());
        if (labelsRes.ok) setLabels(await labelsRes.json());
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    }
    fetchMetadata();
  }, []);

  // Check for recurring tasks that need generation
  useEffect(() => {
    let checkRecurring: NodeJS.Timeout;

    const checkAndGenerate = async () => {
      try {
        const res = await fetch('/api/recurring/generate', { method: 'POST' });
        if (res.ok) {
          const result = await res.json();
          if (result.generated > 0) {
            // Reload tasks to show new ones
            const tasksRes = await fetch('/api/tasks?view=all&completed=false');
            if (tasksRes.ok) {
              setTasks(await tasksRes.json());
            }
          }
        }
      } catch (error) {
        console.error('Failed to check recurring tasks:', error);
      }
    };

    checkAndGenerate();

    // Check every hour
    checkRecurring = setInterval(checkAndGenerate, 60 * 60 * 1000);

    return () => {
      if (checkRecurring) clearInterval(checkRecurring);
    };
  }, []);

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    clearSearchCache();
  };

  const handleTaskDeleted = (taskId: string, task: Task) => {
    setUndoState({ action: 'delete', taskId, task });
    setTasks(prev => prev.filter(t => t.id !== taskId));
    clearSearchCache();

    // Auto-clear undo after 10 seconds
    setTimeout(() => setUndoState(null), 10000);
  };

  const handleTaskCreated = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    clearSearchCache();
  };

  const handleUndo = async () => {
    if (!undoState) return;

    try {
      const res = await fetch(`/api/tasks/${undoState.taskId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(undoState.task),
      });

      if (res.ok) {
        const restored = await res.json();
        setTasks(prev => {
          const updated = [...prev, restored];
          // Sort by date, then by created date descending
          return updated.sort((a, b) => {
            if (a.date && b.date) return b.date - a.date;
            if (a.date) return 1;
            if (b.date) return -1;
            return b.createdAt - a.createdAt;
          });
        });
        toast.success('Task restored');
      } else {
        toast.error('Failed to restore task');
      }
    } catch {
      toast.error('Failed to restore task');
    } finally {
      setUndoState(null);
    }
  };

  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;

    if (!confirm(`Delete ${completedTasks.length} completed task(s)?`)) return;

    try {
      const res = await fetch(`/api/tasks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids: completedTasks.map(t => t.id),
        }),
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => !t.completed));
        toast.success(`Deleted ${completedTasks.length} completed task(s)`);
      } else {
        toast.error('Failed to delete completed tasks');
      }
    } catch {
      toast.error('Failed to delete completed tasks');
    }
  };

  const handleBulkAction = async (action: 'complete' | 'incomplete' | 'delete') => {
    const selectedIds = Array.from(selectedTasks);
    if (selectedIds.length === 0) return;

    try {
      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedIds,
        }),
      });

      if (res.ok) {
        if (action === 'delete') {
          setTasks(prev => prev.filter(t => !selectedIds.includes(t.id)));
        } else {
          setTasks(prev => prev.map(t => {
            if (selectedIds.includes(t.id)) {
              return {
                ...t,
                completed: action === 'complete',
                completedAt: action === 'complete' ? Date.now() : null,
              };
            }
            return t;
          }));
        }
        setSelectedTasks(new Set());
        toast.success(`Bulk ${action} successful`);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to process bulk action');
      }
    } catch {
      toast.error('Failed to process bulk action');
    }
  };

  const handleClearFilters = () => {
    setFilters({ listId: null, labelId: null, priority: null, search: '', completed: null, recurring: null, dateFrom: null, dateTo: null, sort: 'date', sortDirection: 'desc' });
  };

  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);

  const handleQuickAction = (action: string, task: Task) => {
    if (action === 'pomodoro') {
      setPomodoroTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(tasks, oldIndex, newIndex);
        setTasks(newTasks);

        // Update sort order in database
        try {
          const res = await fetch('/api/tasks/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reorder',
              tasks: newTasks.map((t, i) => ({ id: t.id, sortOrder: i })),
            }),
          });
          if (!res.ok) {
            // Revert on failure
            setTasks(tasks);
            toast.error('Failed to update sort order');
          }
        } catch (error) {
          console.error('Failed to update sort order:', error);
          setTasks(tasks);
          toast.error('Failed to update sort order');
        }
      }
    }
  };

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          view,
          completed: showCompleted.toString(),
          ...(filters.listId && { listId: filters.listId }),
          ...(filters.labelId && { labelId: filters.labelId }),
          ...(filters.priority && { priority: filters.priority }),
          ...(filters.completed !== null && { completed: String(filters.completed) }),
          ...(filters.recurring && { recurring: 'true' }),
          ...(filters.dateFrom && { dateFrom: String(filters.dateFrom) }),
          ...(filters.dateTo && { dateTo: String(filters.dateTo) }),
        });

        const res = await fetch(`/api/tasks?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [view, showCompleted, filters]);

  // Keyboard shortcut for focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Keyboard navigation
      if (filteredTasks.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedTaskIndex(prev => Math.min(prev + 1, filteredTasks.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedTaskIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && e.shiftKey) {
          // Toggle task completion
          const task = filteredTasks[focusedTaskIndex];
          if (task) {
            fetch(`/api/tasks/${task.id}/toggle`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ completed: !task.completed }),
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredTasks, focusedTaskIndex]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <KeyboardShortcuts
        onNewTask={() => setAddTaskOpen(true)}
        onSearch={() => searchInputRef.current?.focus()}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold" id="page-title">{title}</h1>
          <div className="flex gap-2 text-sm text-gray-400" aria-live="polite">
            <span>{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
            {showCompleted && tasks.filter(t => t.completed).length > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>{tasks.filter(t => t.completed).length} completed</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search tasks (⌘K)"
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          className="px-3 py-1.5 text-sm rounded-md border bg-background w-full sm:flex-1"
          aria-label="Search tasks"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filters.sort}
            onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value as SortOption }))}
            className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target"
            aria-label="Sort by"
          >
            <option value="date">Date</option>
            <option value="created">Created</option>
            <option value="priority">Priority</option>
            <option value="name">Name</option>
            <option value="list">List</option>
          </select>
          <button
            onClick={() => setFilters(f => ({ ...f, sortDirection: f.sortDirection === 'asc' ? 'desc' : 'asc' }))}
            className="px-3 py-1.5 text-sm rounded-md border bg-background touch-target hover:bg-gray-800 transition-colors"
            aria-label={`Sort direction: ${filters.sortDirection}`}
            title={`Sort direction: ${filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {filters.sortDirection === 'asc' ? '↑' : '↓'}
          </button>
          {showCompleted && tasks.filter(t => t.completed).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCompleted}
              className="text-red-400 hover:text-red-300"
            >
              Clear completed
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-400" htmlFor="show-completed">
            <input
              id="show-completed"
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded w-4 h-4"
              aria-label="Toggle showing completed tasks"
            />
            <span className="hidden sm:inline">Show completed</span>
          </label>
        </div>
      </div>

      <TaskFilter
        lists={lists}
        labels={labels}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Bulk Actions Bar */}
      {selectedTasks.size > 0 && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{selectedTasks.size} selected</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('complete')}
            >
              Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('incomplete')}
            >
              Incomplete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('delete')}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </Button>
          </div>
          <button
            onClick={() => setSelectedTasks(new Set())}
            className="text-xs text-gray-400 hover:text-gray-200 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-gray-900 animate-pulse h-20" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={filters.search || filters.listId || filters.labelId || filters.priority
            ? 'Try adjusting your filters.'
            : 'Create a new task to get started.'}
          actionLabel={!filters.search && !filters.listId && !filters.labelId && !filters.priority ? 'Create Task' : undefined}
          onAction={() => setAddTaskOpen(true)}
          icon={!filters.search && !filters.listId && !filters.labelId && !filters.priority ? 'task' : undefined}
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredTasks.slice(0, visibleCount).map((task, index) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  onTaskDeleted={handleTaskDeleted}
                  focused={index === focusedTaskIndex}
                  selected={selectedTasks.has(task.id)}
                  onSelect={(taskId, selected) => {
                    setSelectedTasks(prev => {
                      const newSet = new Set(prev);
                      if (selected) {
                        newSet.add(taskId);
                      } else {
                        newSet.delete(taskId);
                      }
                      return newSet;
                    });
                  }}
                  onPreview={(taskId) => setPreviewTaskId(taskId)}
                  onQuickAction={handleQuickAction}
                />
              ))}
            </div>
          </DndContext>

          {visibleCount < filteredTasks.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount(prev => Math.min(prev + TASKS_PER_PAGE, filteredTasks.length))}
              className="mt-4 w-full"
            >
              Load more ({filteredTasks.length - visibleCount} remaining)
            </Button>
          )}

          {undoState && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-sm">Task deleted</span>
              <Button size="sm" onClick={handleUndo}>
                Undo
              </Button>
            </div>
          )}
        </>
      )}

      <TaskPreviewModal
        taskId={previewTaskId}
        open={previewTaskId !== null}
        onClose={() => setPreviewTaskId(null)}
        onTaskUpdated={task => {
          setTasks(prev => prev.map(t => t.id === task.id ? task : t));
          setPreviewTaskId(null);
        }}
      />

      {/* Pomodoro Timer Modal */}
      {pomodoroTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <PomodoroTimer
              task={pomodoroTask}
              onTimeLogged={(taskId, duration) => {
                // Log time entry
                fetch('/api/time-entries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ taskId, duration, description: 'Pomodoro session' }),
                });
                setPomodoroTask(null);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPomodoroTask(null)}
              className="mt-4 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <ReminderSystem tasks={tasks.filter(t => t.reminder !== null)} />
      </div>

      <AddTaskButton
        listId={view === 'all' ? undefined : view === 'today' ? 'inbox' : undefined}
        onTaskCreated={handleTaskCreated}
      />
      <ExportImport onImportComplete={() => window.location.reload()} />
      <OnboardingTour />
    </div>
  );
}