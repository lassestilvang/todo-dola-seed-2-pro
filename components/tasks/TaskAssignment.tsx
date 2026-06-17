'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Trash2 } from 'lucide-react';
import type { Task } from '@/lib/types';

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface TaskAssignmentProps {
  task: Task;
  assignedUsers?: AssignedUser[];
  onAssign: (taskId: string, userId: string) => void;
  onUnassign: (taskId: string, userId: string) => void;
}

const availableUsers: AssignedUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com' },
];

export default function TaskAssignment({
  task,
  assignedUsers = [],
  onAssign,
  onUnassign,
}: TaskAssignmentProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = (userId: string) => {
    onAssign(task.id, userId);
    setIsAssigning(false);
  };

  const assignedUser = assignedUsers.find((u) => u.id === task.assignedTo);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Assignment</span>
      </div>

      {assignedUser ? (
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium">{assignedUser.name}</div>
              <div className="text-xs text-muted-foreground">{assignedUser.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onUnassign(task.id, assignedUser.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-2">Unassigned</div>
      )}

      {isAssigning ? (
        <div className="absolute bg-popover border rounded-md shadow-lg z-50 w-64">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Select user</div>
            {availableUsers.map((user) => (
              <button
                key={user.id}
                className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-800/50 transition-colors"
                onClick={() => handleAssign(user.id)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setIsAssigning(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          {assignedUser ? 'Reassign' : 'Assign'}
        </Button>
      )}
    </div>
  );
}