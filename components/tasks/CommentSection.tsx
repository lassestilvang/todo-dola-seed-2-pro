'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/lib/types';

interface CommentSectionProps {
  taskId: string;
  initialComments: Comment[];
}

export default function CommentSection({ taskId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          content: newComment,
          author: 'You',
        }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } else {
        toast.error('Failed to add comment');
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error('Failed to delete comment');
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Comments ({comments.length})
      </h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none min-h-10 max-h-32"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || loading}
            className="h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-3">
              <div className="flex-1">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-300">
                      {comment.author || 'Anonymous'}
                    </span>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-500 hover:text-red-400"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-300">{comment.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}