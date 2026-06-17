'use client';

import { useState } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Workspace } from '@/lib/types';

interface WorkspaceListProps {
  workspaces: Workspace[];
  onSelect: (workspace: Workspace) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  selectedWorkspace?: Workspace | null;
}

export function WorkspaceList({ workspaces, onSelect, onCreate, onDelete, selectedWorkspace }: WorkspaceListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workspaces</h2>
        <Button size="sm" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-1" />
          New Workspace
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No workspaces yet</p>
            <Button size="sm" onClick={onCreate}>
              Create your first workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:max-w-2xl">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedWorkspace?.id === workspace.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onSelect(workspace)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{workspace.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(workspace.id);
                    }}
                    disabled={deletingId === workspace.id}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workspace.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{workspace.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}