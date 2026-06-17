interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'list' | 'label' | 'comment' | 'goal';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

const STORAGE_KEY = 'offline-operations';

export function getPendingOperations(): OfflineOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'synced'>): OfflineOperation {
  const operations = getPendingOperations();
  const newOp: OfflineOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    synced: false,
    ...operation,
  };
  operations.push(newOp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  return newOp;
}

export function markOperationSynced(id: string): void {
  const operations = getPendingOperations();
  const index = operations.findIndex(op => op.id === id);
  if (index !== -1) {
    operations[index].synced = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  }
}

export function removeOperation(id: string): void {
  const operations = getPendingOperations().filter(op => op.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
}

export function clearSyncedOperations(): void {
  const operations = getPendingOperations().filter(op => !op.synced);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
}

export function getSyncStats(): { pending: number; completed: number } {
  const operations = getPendingOperations();
  return {
    pending: operations.filter(op => !op.synced).length,
    completed: operations.filter(op => op.synced).length,
  };
}

export function resolveConflict(
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  strategy: 'local' | 'server' | 'merge' = 'merge'
): Record<string, unknown> {
  if (strategy === 'local') return localData;
  if (strategy === 'server') return serverData;

  // Merge strategy: prefer non-null values from both
  return { ...serverData, ...localData };
}