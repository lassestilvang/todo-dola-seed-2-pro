'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar, Check, X } from 'lucide-react';
import type { Task } from '@/lib/types';

interface CalendarSyncProps {
  tasks: Task[];
  onSync: (provider: string, tasks: Task[]) => Promise<void>;
}

const providers = [
  { id: 'google', name: 'Google Calendar' },
  { id: 'outlook', name: 'Outlook Calendar' },
  { id: 'ical', name: 'iCal' },
];

export default function CalendarSync({ tasks, onSync }: CalendarSyncProps) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    if (!selectedProvider) return;

    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      await onSync(selectedProvider, tasks);
      setSyncStatus('success');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Calendar Sync
      </h3>

      <div className="space-y-3">
        <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as string)}>
          <SelectTrigger>
            <SelectValue placeholder="Select calendar provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSync}
            disabled={!selectedProvider || isSyncing}
            className="flex-1"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Tasks
              </>
            )}
          </Button>

          {syncStatus === 'success' && (
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" />
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <X className="w-4 h-4 text-red-400" />
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>• Tasks with dates will be synced to your calendar</p>
        <p>• Changes will be pushed to {selectedProvider || 'selected provider'}</p>
      </div>
    </div>
  );
}