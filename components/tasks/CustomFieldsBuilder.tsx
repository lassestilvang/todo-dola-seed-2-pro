'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CustomField } from '@/lib/types';

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export default function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');

  const addField = () => {
    if (!newFieldName.trim()) return;

    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: newFieldName,
      type: newFieldType,
      options: newFieldType === 'select' ? [] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onChange([...fields, newField]);
    setNewFieldName('');
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates, updatedAt: Date.now() } : f));
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Custom Fields</h3>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Field name"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="flex-1"
            />
            <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as CustomField['type'])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addField} disabled={!newFieldName.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {fields.map(field => (
              <SortableField
                key={field.id}
                field={field}
                onUpdate={updateField}
                onRemove={() => removeField(field.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SortableFieldProps {
  field: CustomField;
  onUpdate: (id: string, updates: Partial<CustomField>) => void;
  onRemove: () => void;
}

function SortableField({ field, onUpdate, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: 'none',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-gray-900 rounded">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-700 rounded"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input
          value={field.name}
          onChange={(e) => onUpdate(field.id, { name: e.target.value })}
          placeholder="Field name"
        />
        <Select value={field.type} onValueChange={(v) => onUpdate(field.id, { type: v as CustomField['type'] })}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="select">Select</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}