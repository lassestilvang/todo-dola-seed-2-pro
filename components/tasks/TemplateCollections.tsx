'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Upload, Package } from 'lucide-react';
import type { TaskTemplate } from '@/lib/types';

interface TemplateCollection {
  id: string;
  name: string;
  description: string;
  templates: TaskTemplate[];
  createdAt: number;
}

interface TemplateCollectionsProps {
  templates: TaskTemplate[];
  onImport: (templates: TaskTemplate[]) => void;
}

export default function TemplateCollections({ templates, onImport }: TemplateCollectionsProps) {
  const [collections, setCollections] = useState<TemplateCollection[]>(() => {
    const saved = localStorage.getItem('template-collections');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const exportCollection = (collection: TemplateCollection) => {
    const data = {
      name: collection.name,
      description: collection.description,
      templates: collection.templates,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onImport(data.templates || data);
        setIsDialogOpen(false);
      } catch (error) {
        console.error('Failed to parse collection:', error);
      }
    };
    reader.readAsText(file);
  };

  const createCollection = () => {
    const name = prompt('Collection name?');
    if (!name) return;

    const collection: TemplateCollection = {
      id: `coll_${Date.now()}`,
      name,
      description: '',
      templates: templates,
      createdAt: Date.now(),
    };

    const updated = [...collections, collection];
    setCollections(updated);
    localStorage.setItem('template-collections', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Template Collections</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={createCollection}>
            <Package className="w-4 h-4 mr-1" />
            New Collection
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2" />
          <p>No collections yet</p>
          <p className="text-sm">Create a collection to organize your templates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map(collection => (
            <div key={collection.id} className="border rounded-lg p-3">
              <h4 className="font-medium">{collection.name}</h4>
              <p className="text-xs text-gray-500 mb-2">
                {collection.templates.length} templates
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => exportCollection(collection)}
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Import a template collection from a JSON file
            </p>
            <input
              type="file"
              accept=".json"
              onChange={importCollection}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500/10 file:text-sm file:font-medium"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}