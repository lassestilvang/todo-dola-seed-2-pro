'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { TaskNote } from '@/lib/types';

interface TaskNotesProps {
  taskId: string;
  initialNotes?: TaskNote[];
}

export default function TaskNotes({ taskId, initialNotes = [] }: TaskNotesProps) {
  const [notes, setNotes] = useState<TaskNote[]>(initialNotes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleAddNote = async () => {
    if (!newContent.trim()) return;

    try {
      const res = await fetch('/api/task-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, title: newTitle || null, content: newContent }),
      });

      if (res.ok) {
        const note = await res.json();
        setNotes([note, ...notes]);
        setNewTitle('');
        setNewContent('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateNote = async (id: string, content: string, title: string | null) => {
    try {
      const res = await fetch(`/api/task-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });

      if (res.ok) {
        const updated = await res.json();
        setNotes(notes.map(n => n.id === id ? updated : n));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const res = await fetch(`/api/task-notes/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotes(notes.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notes</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Note
        </Button>
      </div>

      {isAdding && (
        <div className="border border-gray-800 rounded-lg p-3 space-y-2">
          <Input
            placeholder="Title (optional)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Note content..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNote}>
              Add
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500">No notes yet. Click "Add Note" to create one.</p>
      )}

      <div className="space-y-2">
        {notes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            onSave={handleUpdateNote}
            onDelete={handleDeleteNote}
          />
        ))}
      </div>
    </div>
  );
}

interface NoteItemProps {
  note: TaskNote;
  onSave: (_id: string, _content: string, _title: string | null) => void;
  onDelete: (_id: string) => void;
}

function NoteItem({ note, onSave, onDelete }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title || '');
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = () => {
    onSave(note.id, editContent, editTitle || null);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="border border-gray-800 rounded-lg p-3 space-y-2">
        <Input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          placeholder="Title"
          className="text-sm"
        />
        <Textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {note.title && (
            <p className="font-medium text-sm mb-1">{note.title}</p>
          )}
          <p className="text-sm text-gray-300">{note.content}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 hover:bg-red-500/20 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}