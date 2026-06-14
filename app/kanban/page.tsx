'use client';

import { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ExternalLink, GripVertical } from 'lucide-react';
import AddTaskButton from '@/components/tasks/AddTaskButton';
import { toast } from 'sonner';
import type { Task, TaskList } from '@/lib/types';

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tasksRes, listsRes] = await Promise.all([
          fetch('/api/tasks?view=all&completed=false'),
          fetch('/api/lists'),
        ]);
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (listsRes.ok) setLists(await listsRes.json());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const columns = useMemo(() => {
    return lists.map(list => ({
      id: list.id,
      name: list.name,
      emoji: list.emoji,
      color: list.color,
      sortOrder: list.sortOrder ?? 0,
      tasks: tasks.filter(t => t.listId === list.id),
    }));
  }, [lists, tasks]);

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [columns]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're moving a task to a different column
    if (activeId.startsWith('task-') && !overId.startsWith('task-')) {
      const taskId = activeId.replace('task-', '');
      const newListId = overId;

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listId: newListId }),
        });

        if (res.ok) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, listId: newListId } : t));
          toast.success('Task moved');
        }
      } catch {
        toast.error('Failed to move task');
      }
    }

    // Check if we're reordering columns
    if (!activeId.startsWith('task-') && !overId.startsWith('task-')) {
      const oldIndex = sortedColumns.findIndex(col => col.id === activeId);
      const newIndex = sortedColumns.findIndex(col => col.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newColumns = arrayMove(sortedColumns, oldIndex, newIndex);

        // Update local state optimistically
        const updateList = (col: { id: string; sortOrder: number }) => {
          fetch(`/api/lists/${col.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: col.sortOrder }),
          }).catch(console.error);
        };

        newColumns.forEach((col, index) => {
          updateList({ id: col.id, sortOrder: index });
        });

        setLists(prev => {
          const newLists = [...prev];
          const [moved] = newLists.splice(oldIndex, 1);
          newLists.splice(newIndex, 0, moved);
          return newLists;
        });
      }
    }
  };

  const handleTaskMoved = (taskId: string, newListId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, listId: newListId } : t));
  };

  const handleAddTask = (listId: string) => {
    // This will be handled by the AddTaskButton component
    const event = new CustomEvent('open-add-task', { detail: { listId } });
    window.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-72 w-72 bg-gray-900 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-700 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2].map(j => (
                  <div key={j} className="h-20 bg-gray-800 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <AddTaskButton />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sortedColumns.map(column => (
              <SortableColumn
                key={column.id}
                column={column}
                onTaskMoved={handleTaskMoved}
                onAddTask={handleAddTask}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableColumn({ column, onTaskMoved, onAddTask }: {
  column: { id: string; name: string; emoji: string; color: string; sortOrder: number; tasks: Task[] };
  onTaskMoved: (taskId: string, newListId: string) => void;
  onAddTask: (listId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-80 w-80 bg-gray-900 rounded-lg p-4 flex flex-col max-h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing"
            title="Drag to reorder column"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-lg">{column.emoji}</span>
          <h3 className="font-semibold">{column.name}</h3>
          <span className="text-xs text-gray-400">({column.tasks.length})</span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 rounded hover:bg-gray-700/50"
          title="Add task"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {column.tasks.length === 0 ? (
          <div className="text-xs text-gray-500 italic">No tasks yet</div>
        ) : (
          <SortableTaskList
            tasks={column.tasks}
            columnId={column.id}
            onTaskMoved={onTaskMoved}
          />
        )}
      </div>
    </div>
  );
}

function SortableTaskList({ tasks, columnId, onTaskMoved }: {
  tasks: Task[];
  columnId: string;
  onTaskMoved: (taskId: string, newListId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <SortableTaskCard
          key={task.id}
          task={task}
          columnId={columnId}
          onTaskMoved={onTaskMoved}
        />
      ))}
    </div>
  );
}

function SortableTaskCard({ task, columnId, onTaskMoved }: {
  task: Task;
  columnId: string;
  onTaskMoved: (taskId: string, newListId: string) => void;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 rounded-md p-3 group hover:bg-gray-700/50 transition-colors cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        e.preventDefault();
        window.location.href = `/task/${task.id}`;
      }}
    >
      <div className="flex items-start justify-between">
        <h4 className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
          {task.name}
        </h4>
        <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {task.description && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
      )}
    </div>
  );
}