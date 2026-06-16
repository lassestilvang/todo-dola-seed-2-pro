'use client';

import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AtSign, Send } from 'lucide-react';

interface CommentWithMentionsProps {
  taskId: string;
  onAddComment: (content: string, author?: string) => void;
  currentUser?: string;
}

interface MentionUser {
  id: string;
  name: string;
  email: string;
}

const availableUsers: MentionUser[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' },
];

export default function CommentWithMentions({ taskId, onAddComment, currentUser }: CommentWithMentionsProps) {
  const [content, setContent] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredUsers = availableUsers.filter(
    (u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1, textareaRef.current?.selectionStart || 0);
      if (textAfterAt.includes(' ')) {
        setIsMentionOpen(false);
      } else {
        setMentionQuery(textAfterAt);
        setIsMentionOpen(true);
      }
    } else {
      setIsMentionOpen(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const before = content.substring(0, content.lastIndexOf('@', start));
    const after = content.substring(end);

    const newContent = `${before}@${user.name} ${after}`;
    setContent(newContent);
    setIsMentionOpen(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursor = before.length + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onAddComment(content.trim(), currentUser);
      setContent('');
      setIsMentionOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsMentionOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... Use @ to mention users"
          rows={3}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 bottom-2 h-6 w-6 p-0"
          title="Mention user"
          onClick={() => setIsMentionOpen(true)}
        >
          <AtSign className="w-3 h-3" />
        </Button>

        {isMentionOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-50">
            <div className="p-1 max-h-48 overflow-y-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  className="w-full text-left p-2 text-sm rounded hover:bg-gray-800/50 transition-colors"
                  onClick={() => insertMention(user)}
                >
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={!content.trim()} className="w-full sm:w-auto">
        <Send className="w-4 h-4 mr-2" />
        Comment
      </Button>
    </div>
  );
}