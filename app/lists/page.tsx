'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Palette, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TaskList } from '@/lib/types';

export default function ListsPage() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    setLoading(true);
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        setLists(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(name: string, emoji: string, color: string) {
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emoji, color }),
      });

      if (res.ok) {
        const list = await res.json();
        setLists([...lists, list]);
        toast.success('List created');
        setShowCreateDialog(false);
      } else {
        toast.error('Failed to create list');
      }
    } catch {
      toast.error('Failed to create list');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      const res = await fetch(`/api/lists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLists(lists.filter(l => l.id !== id));
        toast.success('List deleted');
      } else {
        toast.error('Failed to delete list');
      }
    } catch {
      toast.error('Failed to delete list');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lists</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg bg-gray-900 animate-pulse h-16" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No lists yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a list to organize your tasks</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {lists.map(list => (
            <li key={list.id} className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{list.emoji}</span>
                <div>
                  <p className="font-medium">{list.name}</p>
                  {list.isInbox && (
                    <p className="text-xs text-gray-400">Inbox</p>
                  )}
                </div>
              </div>
              {!list.isInbox && (
                <button
                  onClick={() => handleDelete(list.id)}
                  className="p-2 rounded hover:bg-red-500/20"
                  title="Delete list"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <CreateListDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

interface CreateListDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, emoji: string, color: string) => void;
}

function CreateListDialog({ open, onClose, onSubmit }: CreateListDialogProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📋');
  const [color, setColor] = useState('#3b82f6');

  const defaultEmojis = ['📋', '✅', '🚀', '💡', '📅', '👥', '🎯', '📦', '🛠️', '❤️'];
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name, emoji, color);
    setName('');
    setEmoji('📋');
    setColor('#3b82f6');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create List</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {defaultEmojis.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-2 rounded border ${
                    emoji === e ? 'border-blue-500 bg-blue-500/20' : 'border-gray-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Color</label>
            <div className="flex gap-2">
              {defaultColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}