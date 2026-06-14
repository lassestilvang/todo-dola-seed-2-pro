'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Paperclip, FileText, Image, Video, Music } from 'lucide-react';
import { toast } from 'sonner';

interface AttachmentUploadProps {
  taskId: string;
  currentAttachment?: string | null;
  onAttachmentChange?: (_filename: string | null) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <Image className="w-4 h-4" />;
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return <Video className="w-4 h-4" />;
  if (['mp3', 'wav', 'ogg'].includes(ext)) return <Music className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentUpload({ taskId, currentAttachment, onAttachmentChange }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);

    try {
      const res = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      onAttachmentChange?.(data.filename);
      toast.success('File uploaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setSelectedFile(null);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!currentAttachment || !confirm('Delete this attachment?')) return;

    try {
      const res = await fetch(`/api/attachments?filename=${currentAttachment}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      onAttachmentChange?.(null);
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete attachment');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="attachment-upload"
        />
        <label
          htmlFor="attachment-upload"
          className={`flex-1 text-center text-sm text-gray-400 border border-dashed border-gray-700 rounded px-3 py-2 cursor-pointer hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload file'}
        </label>
        {currentAttachment && (
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {getFileIcon(selectedFile.name)}
          <span className="truncate">{selectedFile.name}</span>
          <span>({formatFileSize(selectedFile.size)})</span>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}