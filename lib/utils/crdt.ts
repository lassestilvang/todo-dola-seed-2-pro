// Simplified CRDT implementation for real-time collaboration
// In production, you'd use a library like Yjs or automerge

export type CRDTOperation = {
  id: string;
  type: 'insert' | 'delete' | 'update';
  entityId: string;
  field?: string;
  value?: unknown;
  timestamp: number;
  clientId: string;
};

export class CRDTStore {
  private operations: CRDTOperation[] = [];
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  // Generate a unique operation ID
  private generateId(): string {
    return `${this.clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create an insert operation
  insert(entityId: string, field: string, value: unknown): CRDTOperation {
    return {
      id: this.generateId(),
      type: 'insert',
      entityId,
      field,
      value,
      timestamp: Date.now(),
      clientId: this.clientId,
    };
  }

  // Create an update operation
  update(entityId: string, field: string, value: unknown): CRDTOperation {
    return {
      id: this.generateId(),
      type: 'update',
      entityId,
      field,
      value,
      timestamp: Date.now(),
      clientId: this.clientId,
    };
  }

  // Create a delete operation
  delete(entityId: string): CRDTOperation {
    return {
      id: this.generateId(),
      type: 'delete',
      entityId,
      timestamp: Date.now(),
      clientId: this.clientId,
    };
  }

  // Add operation to the store
  addOperation(op: CRDTOperation): void {
    this.operations.push(op);
  }

  // Get all operations
  getOperations(): CRDTOperation[] {
    return [...this.operations];
  }

  // Merge operations from another client
  mergeOperations(ops: CRDTOperation[]): void {
    for (const op of ops) {
      if (!this.operations.some(existing => existing.id === op.id)) {
        this.operations.push(op);
      }
    }
  }

  // Get operations since a timestamp
  getOperationsSince(timestamp: number): CRDTOperation[] {
    return this.operations.filter(op => op.timestamp > timestamp);
  }
}

// Conflict resolution for task updates
export function resolveTaskConflicts(
  tasks: Map<string, any>,
  operations: CRDTOperation[]
): Map<string, any> {
  const resolved = new Map(tasks);

  for (const op of operations.sort((a, b) => a.timestamp - b.timestamp)) {
    const task = resolved.get(op.entityId);

    if (!task) {
      if (op.type === 'insert') {
        resolved.set(op.entityId, { [op.field!]: op.value });
      }
      continue;
    }

    if (op.type === 'delete') {
      resolved.delete(op.entityId);
    } else if (op.type === 'update' || op.type === 'insert') {
      resolved.set(op.entityId, {
        ...task,
        [op.field!]: op.value,
        updatedAt: op.timestamp,
      });
    }
  }

  return resolved;
}