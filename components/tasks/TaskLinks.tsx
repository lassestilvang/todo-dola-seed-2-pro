'use client';

import { useState } from 'react';
import { useTaskLinks, useCreateTaskLink, useDeleteTaskLink } from '@/lib/api/hooks';
import { TaskLinkType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

interface TaskLinksProps {
  taskId: string;
}

interface TaskLink {
  id: string;
  linkedTaskId: string;
  type: TaskLinkType;
}

const LINK_TYPE_LABELS: Record<TaskLinkType, string> = {
  blocks: 'Blocks',
  related: 'Related',
  depends_on: 'Depends On',
  duplicate: 'Duplicate',
};

export default function TaskLinks({ taskId }: TaskLinksProps) {
  const { data: links = [], isLoading } = useTaskLinks(taskId);
  const createLink = useCreateTaskLink();
  const deleteLink = useDeleteTaskLink();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [linkType, setLinkType] = useState<TaskLinkType>('related');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!linkedTaskId || linkedTaskId === taskId) return;
    setIsCreating(true);
    try {
      await createLink.mutateAsync({ taskId, linkedTaskId, type: linkType });
      setLinkedTaskId('');
      setIsDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteLink.mutateAsync(id);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading links...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Task Links</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Linked Task ID</Label>
                <Input
                  value={linkedTaskId}
                  onChange={(e) => setLinkedTaskId(e.target.value)}
                  placeholder="Enter task UUID"
                />
              </div>
              <div>
                <Label>Link Type</Label>
                <Select
                  value={linkType}
                  onValueChange={(v) => v && setLinkType(v as TaskLinkType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={isCreating || !linkedTaskId}>
                Create Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-gray-500">No links yet</p>
      ) : (
        <ul className="space-y-1">
          {(links as TaskLink[]).map((link) => (
            <li key={link.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{link.linkedTaskId}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{LINK_TYPE_LABELS[link.type]}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}