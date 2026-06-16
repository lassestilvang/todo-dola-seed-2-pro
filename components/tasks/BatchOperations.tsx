'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Trash2, CheckSquare, Plus } from 'lucide-react';

interface BatchOperation {
  action: 'create' | 'complete' | 'delete';
  prompt: string;
}

export function BatchOperations() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/ai/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: [{ action: 'create', prompt }],
        }),
      });

      if (response.ok) {
        toast.success('Tasks created successfully');
        setPrompt('');
        setOpen(false);
      } else {
        throw new Error('Failed to create tasks');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tasks');
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    'Buy groceries for the week',
    'Schedule team meeting for tomorrow at 2pm',
    'Review project proposal and update status',
    'Call mom to check on her health',
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Batch Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch Task Creation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Enter tasks separated by new lines. Use natural language for smarter parsing.
          </p>

          <Textarea
            placeholder="e.g., Call Mom tomorrow at 3pm&#10;Buy groceries for the week&#10;Review project proposal"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={6}
          />

          <div className="flex gap-2 flex-wrap">
            {examplePrompts.map(ex => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="text-xs px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
              >
                {ex}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
              {loading ? 'Creating...' : 'Create Tasks'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}