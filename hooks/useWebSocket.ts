import { useEffect, useState, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

interface WebSocketOptions {
  workspaceId: string;
  userId: string;
  userName: string;
}

interface TaskUpdate {
  id: string;
  changes: Record<string, unknown>;
  updatedBy: string;
  updatedAt: number;
}

export function useWebSocket({ workspaceId, userId, userName }: WebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-workspace', workspaceId, userId, userName);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user-joined', (user: { userId: string; userName: string }) => {
      setOnlineUsers(prev => new Set(prev).add(user.userId));
    });

    socket.on('user-left', (userId: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId, userId, userName]);

  const emitTaskUpdate = useCallback((task: TaskUpdate) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('task-updated', workspaceId, task);
    }
  }, [workspaceId]);

  const subscribeToTasks = useCallback((callback: (task: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('task-changed', callback);
    socketRef.current.on('task-added', callback);
    socketRef.current.on('task-removed', (taskId: string) => callback({ id: taskId, deleted: true }));

    return () => {
      socketRef.current?.off('task-changed');
      socketRef.current?.off('task-added');
      socketRef.current?.off('task-removed');
    };
  }, []);

  const subscribeToComments = useCallback((callback: (comment: any) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on('comment-received', callback);

    return () => {
      socketRef.current?.off('comment-received');
    };
  }, []);

  return {
    isConnected,
    onlineUsers: Array.from(onlineUsers),
    emitTaskUpdate,
    subscribeToTasks,
    subscribeToComments,
  };
}

export type { TaskUpdate };