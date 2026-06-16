'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';
import type { Label as LabelType } from '@/lib/types';

interface BulkLabelOperationsProps {
  selectedTaskIds: string[];
  labels: LabelType[];
  onToggleLabel: (taskIds: string[], labelId: string) => void;
}

export default function BulkLabelOperations({
  selectedTaskIds,
  labels,
  onToggleLabel,
}: BulkLabelOperationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (selectedTaskIds.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="touch-target"
      >
        <Tag className="w-4 h-4 mr-2" />
        Labels ({selectedTaskIds.length})
      </Button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Add/Remove Labels</div>
            {labels.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center gap-2 p-2 text-left rounded hover:bg-gray-800/50 transition-colors"
                onClick={() => {
                  onToggleLabel(selectedTaskIds, label.id);
                  setIsOpen(false);
                }}
              >
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: label.color || '#3b82f6', color: 'white' }}
                >
                  {label.emoji || label.name.charAt(0)}
                </span>
                <span className="flex-1 text-sm">{label.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}