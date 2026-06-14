'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Upload, FileJson, FileText, FileSpreadsheet, Calendar, LoaderCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportImportProps {
  onImportComplete?: () => void;
}

export default function ExportImport({ onImportComplete }: ExportImportProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<'dola' | 'todoist' | 'trello'>('dola');

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'json' | 'markdown' | 'pdf' | 'csv' | 'ics' = 'json') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');

      if (format === 'pdf') {
        // Get data for PDF generation
        const result = await res.json();
        const tasks: any[] = result.data?.tasks || [];
        const lists: any[] = result.data?.lists || [];
        const labels: any[] = result.data?.labels || [];

        // Generate PDF using jsPDF
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const listMap = new Map(lists.map((l: any) => [l.id, l]));
        const labelMap = new Map(labels.map((l: any) => [l.id, l]));

        let yPos = 20;
        const lineHeight = 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Task Export', 20, yPos);
        yPos += 15;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
        yPos += 15;

        // Group tasks by list
        const tasksByList = tasks.reduce((acc: Record<string, any[]>, task: any) => {
          const listId = task.list_id || 'inbox';
          if (!acc[listId]) acc[listId] = [];
          acc[listId].push(task);
          return acc;
        }, {});

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);

        Object.entries(tasksByList).forEach(([listId, listTasks]) => {
          const list = listMap.get(listId) || { name: 'Inbox' };

          // Check if we need a new page
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.text(list.name, 20, yPos);
          yPos += 10;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          listTasks.forEach((task: any) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }

            const isCompleted = task.completed === 1;
            const status = isCompleted ? '[x]' : '[ ]';
            const taskLabels = task.labels ? JSON.parse(task.labels).map((l: any) => labelMap.get(l.id)).filter(Boolean) : [];

            doc.text(`${status} ${task.name}`, 25, yPos);
            yPos += lineHeight;

            if (task.description) {
              const descLines = doc.splitTextToSize(task.description, 170);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.text(descLines, 25, yPos);
              yPos += descLines.length * lineHeight;
            }

            if (task.priority && task.priority !== 'none') {
              doc.text(`Priority: ${task.priority}`, 25, yPos);
              yPos += lineHeight;
            }

            if (task.date) {
              doc.text(`Due: ${new Date(task.date).toLocaleDateString()}`, 25, yPos);
              yPos += lineHeight;
            }

            if (taskLabels.length > 0) {
              doc.text(`Labels: ${taskLabels.map((l: any) => l.name).join(', ')}`, 25, yPos);
              yPos += lineHeight;
            }

            yPos += 3;
          });

          yPos += 5;
        });

        const filename = `tasks-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        toast.success('PDF exported successfully');
        setExportDialogOpen(false);
        return;
      }

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'markdown') {
        content = await res.text();
        filename = `tasks-${new Date().toISOString().split('T')[0]}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'csv') {
        content = await res.text();
        filename = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'ics') {
        content = await res.text();
        filename = `tasks-${new Date().toISOString().split('T')[0]}.ics`;
        mimeType = 'text/calendar';
      } else {
        content = JSON.stringify(await res.json(), null, 2);
        filename = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const formatNames = { json: 'JSON', markdown: 'Markdown', csv: 'CSV', ics: 'ICS' };
      toast.success(`Backup exported as ${formatNames[format]}`);
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch(`/api/import?format=${importFormat}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Import failed');
      }

      const result = await res.json();
      const count = result.totalItems || 'data';
      toast.success(`Successfully imported ${count} items`);
      setImportDialogOpen(false);
      onImportComplete?.();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400">
              Export all your tasks, lists, labels, and history.
            </p>
            <div className="space-y-2">
              <Button onClick={() => handleExport('json')} className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
              <Button onClick={() => handleExport('markdown')} className="w-full justify-start" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export as Markdown
              </Button>
              <Button onClick={() => handleExport('csv')} className="w-full justify-start" variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              <Button onClick={() => handleExport('ics')} className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Export as Calendar (ICS)
              </Button>
              <Button onClick={() => handleExport('pdf')} className="w-full justify-start" variant="outline" disabled={exporting}>
                {exporting ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export as PDF
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400">
              This will replace all existing data with the imported data. This action cannot be undone.
            </p>

            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-2">Select source format:</div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer">
                  <FileJson className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Todo Dola Backup</p>
                    <p className="text-xs text-gray-400">JSON format from this app</p>
                  </div>
                  <input
                    type="radio"
                    name="format"
                    value="dola"
                    checked={importFormat === 'dola'}
                    onChange={() => setImportFormat('dola')}
                  />
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer">
                  <FileJson className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Todoist</p>
                    <p className="text-xs text-gray-400">Import from Todoist JSON export</p>
                  </div>
                  <input
                    type="radio"
                    name="format"
                    value="todoist"
                    checked={importFormat === 'todoist'}
                    onChange={() => setImportFormat('todoist')}
                  />
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-700 rounded hover:bg-gray-800 cursor-pointer">
                  <FileText className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Trello</p>
                    <p className="text-xs text-gray-400">Import from Trello board export</p>
                  </div>
                  <input
                    type="radio"
                    name="format"
                    value="trello"
                    checked={importFormat === 'trello'}
                    onChange={() => setImportFormat('trello')}
                  />
                </label>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImport(file);
                    setImportDialogOpen(false);
                  }
                }}
                className="hidden"
                id="import-file"
                disabled={importing}
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {importing ? 'Importing...' : 'Click to select file'}
                </span>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}