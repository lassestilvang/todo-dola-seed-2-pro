'use client';

import { useState, useEffect } from 'react';
import { Plus, X, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TaskTemplate } from '@/lib/types';

interface TaskTemplatesProps {
  onTaskCreated?: (_task: { id: string; name: string }) => void;
}

export default function TaskTemplates({ onTaskCreated }: TaskTemplatesProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string; emoji: string; color: string }[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchLabels();
  }, []);

  async function fetchLabels() {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        setAvailableLabels(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        // Fetch labels for each template
        const templatesWithLabels = await Promise.all(
          data.map(async (t: TaskTemplate & { labels: string[] }) => {
            const labelRes = await fetch(`/api/templates/${t.id}`);
            if (labelRes.ok) {
              const fullTemplate = await labelRes.json();
              return fullTemplate;
            }
            return { ...t, labels: [] };
          })
        );
        setTemplates(templatesWithLabels);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplate(name: string, description: string, listId: string, labels: string[]) {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, listId, labels }),
      });

      if (res.ok) {
        const template = await res.json();
        setTemplates([...templates, template]);
        toast.success('Template created');
        setShowCreateDialog(false);
      } else {
        toast.error('Failed to create template');
      }
    } catch {
      toast.error('Failed to create template');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        toast.success('Template deleted');
      } else {
        toast.error('Failed to delete template');
      }
    } catch {
      toast.error('Failed to delete template');
    }
  }

  async function handleUseTemplate(template: TaskTemplate) {
    try {
      const res = await fetch(`/api/templates/${template.id}`, { method: 'POST' });
      if (res.ok) {
        const task = await res.json();
        onTaskCreated?.(task);
        toast.success('Task created from template');
        setShowUseDialog(false);
      } else {
        toast.error('Failed to create task');
      }
    } catch {
      toast.error('Failed to create task');
    }
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Task Templates
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-500">No templates yet. Create one to get started!</p>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div key={template.id} className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowUseDialog(true);
                }}
                className="flex-1 text-left p-2 rounded bg-gray-800 hover:bg-gray-700 text-sm"
              >
                <div className="font-medium">{template.name}</div>
                {template.labels && template.labels.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {template.labels.slice(0, 3).map((labelId: string) => {
                      const label = availableLabels.find(l => l.id === labelId);
                      return label ? (
                        <span
                          key={labelId}
                          className="text-xs px-1 rounded"
                          style={{ backgroundColor: label.color + '20', color: label.color }}
                        >
                          {label.emoji}
                        </span>
                      ) : null;
                    })}
                    {template.labels.length > 3 && (
                      <span className="text-xs text-gray-500">+{template.labels.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="p-1.5 rounded hover:bg-red-500/20"
                title="Delete template"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Use Template Dialog */}
      <UseTemplateDialog
        open={showUseDialog}
        onClose={() => setShowUseDialog(false)}
        template={selectedTemplate}
        onUse={handleUseTemplate}
      />
    </div>
  );
}

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string, listId: string, labels: string[]) => void;
}

function CreateTemplateDialog({ open, onClose, onSubmit }: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState('inbox');
  const [labels, setLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string; emoji: string; color: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchLabels();
    }
  }, [open]);

  async function fetchLabels() {
    try {
      const res = await fetch('/api/labels');
      if (res.ok) {
        setAvailableLabels(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name, description, listId, labels);
    setName('');
    setDescription('');
    setLabels([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full p-2 rounded border bg-background"
          >
            <option value="inbox">Inbox</option>
          </select>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Labels</label>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {availableLabels.map(label => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => {
                    setLabels(prev =>
                      prev.includes(label.id)
                        ? prev.filter(id => id !== label.id)
                        : [...prev, label.id]
                    );
                  }}
                  className={`px-2 py-1 text-xs rounded border ${
                    labels.includes(label.id)
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  {label.emoji} {label.name}
                </button>
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

interface UseTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template: TaskTemplate | null;
  onUse: (template: TaskTemplate) => void;
}

function UseTemplateDialog({ open, onClose, template, onUse }: UseTemplateDialogProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use Template: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-400">{template.description || 'No description'}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onUse(template)}>
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}