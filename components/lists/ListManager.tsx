'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';
import { toast } from 'sonner';

interface List {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isInbox: boolean;
  sortOrder: number;
}

function SortableList({ list, onDelete }: { list: List; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-1 rounded bg-gray-900">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>
      <span>{list.emoji}</span>
      <span className="flex-1">{list.name}</span>
      {!list.isInbox && (
        <button onClick={() => onDelete(list.id)}>
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}
    </div>
  );
}

export default function ListManager() {
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [newListEmoji, setNewListEmoji] = useState('📋');
  const [newListColor, setNewListColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    setLoading(true);
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;

    const tempId = 'temp-' + Date.now();
    const tempList = { id: tempId, name: newListName, emoji: newListEmoji, color: newListColor, isInbox: false, sortOrder: lists.length };
    setLists(prev => [...prev, tempList]);
    setNewListName('');

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          emoji: newListEmoji,
          color: newListColor,
          isInbox: false,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setLists(prev => prev.map(l => l.id === tempId ? saved : l));
      } else {
        setLists(prev => prev.filter(l => l.id !== tempId));
      }
    } catch (error) {
      console.error('Failed to create list:', error);
      setLists(prev => prev.filter(l => l.id !== tempId));
    }
  }

  async function handleDelete(id: string) {
    const listToDelete = lists.find(l => l.id === id);
    if (!confirm('Delete this list?')) return;

    setLists(prev => prev.filter(l => l.id !== id));

    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (listToDelete) {
          setLists(prev => [...prev.filter(l => l.id !== id), listToDelete]);
        }
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
      if (listToDelete) {
        setLists(prev => [...prev.filter(l => l.id !== id), listToDelete]);
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newLists = arrayMove(lists, oldIndex, newIndex);
      setLists(newLists);

      // Persist to server
      try {
        const res = await fetch('/api/lists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lists: newLists.map((l, i) => ({ id: l.id, sortOrder: i })),
          }),
        });

        if (!res.ok) {
          // Revert on failure
          setLists(lists);
          toast.error('Failed to save order');
        }
      } catch {
        setLists(lists);
        toast.error('Failed to save order');
      }
    }
  }

  if (loading) return <div className="text-gray-500">Loading lists...</div>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Lists</h3>

      <form onSubmit={handleCreateList} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="New list name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <Input
            placeholder="Emoji"
            value={newListEmoji}
            onChange={(e) => setNewListEmoji(e.target.value)}
            className="w-20"
          />
          <ColorPicker value={newListColor} onChange={setNewListColor} />
          <Button type="submit" size="icon" disabled={!newListName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          {lists.length === 0 ? (
            <p className="text-sm text-gray-500">No lists yet. Create one above!</p>
          ) : (
            lists.map((list) => (
              <SortableList key={list.id} list={list} onDelete={handleDelete} />
            ))
          )}
        </div>
      </DndContext>
    </div>
  );
}