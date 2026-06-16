'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Send, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPassword?: string;
}

export function EmailIntegration() {
  const [config, setConfig] = useState<EmailConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUser: '',
    imapPassword: '',
  });
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setEnabled(true);
        toast.success('Email integration configured');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          <h3 className="font-semibold">Email Integration</h3>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <p className="text-sm text-gray-400">
        Configure email to automatically create tasks from emails and send reminders.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>SMTP Settings (for sending)</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="SMTP Host"
              value={config.host}
              onChange={e => setConfig({ ...config, host: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Port"
              value={config.port}
              onChange={e => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.secure}
              onCheckedChange={checked => setConfig({ ...config, secure: checked })}
            />
            <Label>TLS/SSL</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Authentication</Label>
          <Input
            type="email"
            placeholder="Email address"
            value={config.user}
            onChange={e => setConfig({ ...config, user: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Password / App Password"
            value={config.password}
            onChange={e => setConfig({ ...config, password: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>IMAP Settings (for receiving emails)</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="IMAP Host"
              value={config.imapHost || ''}
              onChange={e => setConfig({ ...config, imapHost: e.target.value })}
            />
            <Input
              type="number"
              placeholder="IMAP Port"
              value={config.imapPort || 993}
              onChange={e => setConfig({ ...config, imapPort: parseInt(e.target.value) || 993 })}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading || !enabled}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </form>

      <div className="text-xs text-gray-500">
        <p>• Use app-specific passwords for Gmail, Outlook, etc.</p>
        <p>• IMAP allows receiving emails as tasks</p>
        <p>• SMTP sends task reminders and notifications</p>
      </div>
    </div>
  );
}