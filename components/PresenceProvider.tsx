'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface PresenceContextValue {
  socket: Socket | null;
  connected: boolean;
  users: Map<string, { id: string; name?: string; email?: string }>;
}

const PresenceContext = createContext<PresenceContextValue>({
  socket: null,
  connected: false,
  users: new Map(),
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<Map<string, { id: string; name?: string; email?: string }>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current) return;

    const newSocket = io(undefined, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('user-presence', (data: { userId: string; user: { id: string; name?: string; email?: string }; action: 'online' | 'offline' | 'viewing' }) => {
      setUsers(prev => {
        const next = new Map(prev);
        if (data.action === 'offline') {
          next.delete(data.userId);
        } else {
          next.set(data.userId, data.user);
        }
        return next;
      });
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ socket, connected, users }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);