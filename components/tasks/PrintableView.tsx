'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import type { Task, Label } from '@/lib/types';

interface PrintableViewProps {
  tasks: Task[];
  labels: Label[];
}

export default function PrintableView({ tasks, labels }: PrintableViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = {
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        completed: t.completed,
        date: t.date ? new Date(t.date).toISOString() : null,
        deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
        priority: t.priority,
        labels: t.labels?.map(l => l.name),
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Print / Export Tasks</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Print Now
              </Button>
              <Button onClick={handleExport} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>

            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="print-content">
                <h1 className="text-2xl font-bold mb-4">Task List</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Generated: {new Date().toLocaleString()}
                </p>

                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="task-card border rounded-lg p-4">
                      <div className="task-header flex justify-between items-start mb-2">
                        <h2 className="task-title font-bold">{task.name}</h2>
                        <span className={`task-status border rounded-full w-5 h-5 ${task.completed ? 'bg-foreground' : ''}`} />
                      </div>

                      {task.description && (
                        <p className="text-sm mb-2">{task.description}</p>
                      )}

                      <div className="task-details text-sm text-muted-foreground space-y-1">
                        {task.date && (
                          <div>
                            <span className="font-medium">Date:</span> {new Date(task.date).toLocaleDateString()}
                          </div>
                        )}
                        {task.deadline && (
                          <div>
                            <span className="font-medium">Deadline:</span> {new Date(task.deadline).toLocaleDateString()}
                          </div>
                        )}
                        {task.priority && task.priority !== 'none' && (
                          <div>
                            <span className="font-medium">Priority:</span> {task.priority}
                          </div>
                        )}
                      </div>

                      {task.labels && task.labels.length > 0 && (
                        <div className="task-labels mt-2">
                          <span className="font-medium">Labels:</span>{' '}
                          {task.labels.map((l) => (
                            <span key={l.id} className="label-badge border rounded px-2 py-1 text-xs mr-1 inline-block">
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} className="touch-target">
        <Printer className="w-4 h-4 mr-2" />
        Print/Export
      </Button>
    </>
  );
}