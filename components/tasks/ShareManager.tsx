'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareManagerProps {
  taskId: string;
}

interface ShareInfo {
  shareToken: string;
  sharedAt: number;
  sharedBy: string | null;
}

export default function ShareManager({ taskId }: ShareManagerProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchShareInfo();
  }, [taskId]);

  async function fetchShareInfo() {
    try {
      const res = await fetch(`/api/share?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setShareInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch share info:', error);
    }
  }

  async function createShareLink() {
    setLoading(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (res.ok) {
        const { shareToken } = await res.json();
        setShareInfo({ shareToken, sharedAt: Date.now(), sharedBy: null });
        copyToClipboard(shareToken);
      } else {
        toast.error('Failed to create share link');
      }
    } catch {
      toast.error('Failed to create share link');
    } finally {
      setLoading(false);
    }
  }

  async function revokeShare() {
    if (!confirm('Are you sure you want to revoke this share link?')) return;

    try {
      const res = await fetch(`/api/share/${shareInfo?.shareToken}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShareInfo(null);
        toast.success('Share link revoked');
      } else {
        toast.error('Failed to revoke share link');
      }
    } catch {
      toast.error('Failed to revoke share link');
    }
  }

  function copyToClipboard(token: string) {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Share link copied to clipboard!');
  }

  const shareUrl = shareInfo ? `${window.location.origin}/shared/${shareInfo.shareToken}` : '';

  return (
    <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Share2 className="w-4 h-4" />
        Share Task
      </h2>

      {!shareInfo ? (
        <Button onClick={createShareLink} disabled={loading} variant="outline">
          {loading ? 'Creating...' : 'Create Share Link'}
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Share URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-1.5 text-sm bg-gray-800 rounded border border-gray-700"
              />
              <Button size="sm" onClick={() => copyToClipboard(shareInfo.shareToken)}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={revokeShare} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Link
          </Button>
        </div>
      )}
    </div>
  );
}