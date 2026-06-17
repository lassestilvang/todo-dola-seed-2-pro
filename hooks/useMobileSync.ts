import { useEffect, useState } from 'react';
import { initDb, getTasks, getLists, getLabels } from '@/lib/db/queries';
import type { SyncData } from '@/lib/utils/sync';
import { pushSync } from '@/lib/utils/sync';

export function useMobileSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      await initDb();
      const syncData: SyncData = {
        lists: [],
        labels: [],
        tasks: [],
        subtasks: [],
        taskLabels: [],
        taskDependencies: [],
        timeEntries: [],
        taskTemplates: [],
        comments: [],
        lastModified: lastSync,
      };

      // Push local changes
      await pushSync(syncData);

      setLastSync(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(sync, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [lastSync]);

  return { isSyncing, lastSync, error, sync };
}

async function getLocalChanges(since: number) {
  // Return local changes since timestamp
  return { tasks: [], lists: [], labels: [] };
}

async function fetchServerChanges(since: number) {
  const res = await fetch(`/api/sync?lastSync=${since}`);
  if (!res.ok) throw new Error('Failed to fetch changes');
  return res.json();
}

async function mergeChanges(local: any, server: any) {
  // Merge logic for conflict resolution
  console.log('Merging changes:', { local, server });
}