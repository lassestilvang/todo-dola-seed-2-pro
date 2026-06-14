'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';

interface Label {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export default function LabelManager() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelEmoji, setNewLabelEmoji] = useState('🏷️');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabels();
  }, []);

  async function fetchLabels() {
    setLoading(true);
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    const tempId = 'temp-' + Date.now();
    const tempLabel = { id: tempId, name: newLabelName, emoji: newLabelEmoji, color: newLabelColor };
    setLabels(prev => [...prev, tempLabel]);
    setNewLabelName('');

    try {
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName,
          emoji: newLabelEmoji,
          color: newLabelColor,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setLabels(prev => prev.map(l => l.id === tempId ? saved : l));
      } else {
        setLabels(prev => prev.filter(l => l.id !== tempId));
      }
    } catch (error) {
      console.error('Failed to create label:', error);
      setLabels(prev => prev.filter(l => l.id !== tempId));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this label?')) return;

    const labelToRemove = labels.find(l => l.id === id);
    setLabels(prev => prev.filter(l => l.id !== id));

    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (labelToRemove) {
          setLabels(prev => [...prev.filter(l => l.id !== id), labelToRemove]);
        }
      }
    } catch (error) {
      console.error('Failed to delete label:', error);
      if (labelToRemove) {
        setLabels(prev => [...prev.filter(l => l.id !== id), labelToRemove]);
      }
    }
  }

  if (loading) return <div className="text-gray-500">Loading labels...</div>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Labels</h3>

      <form onSubmit={handleCreateLabel} className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="New label name"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
          />
          <Input
            placeholder="Emoji"
            value={newLabelEmoji}
            onChange={(e) => setNewLabelEmoji(e.target.value)}
            className="w-20"
          />
          <ColorPicker value={newLabelColor} onChange={setNewLabelColor} />
          <Button type="submit" size="icon" disabled={!newLabelName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <div className="space-y-1">
        {labels.length === 0 ? (
          <p className="text-sm text-gray-500">No labels yet. Create one above!</p>
        ) : (
          labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2 px-2 py-1 rounded bg-gray-900">
              <span>{label.emoji}</span>
              <span className="flex-1">{label.name}</span>
              <button onClick={() => handleDelete(label.id)}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}