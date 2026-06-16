'use client';

import { usePresence } from './PresenceProvider';
import { User } from 'lucide-react';

export function PresenceIndicator() {
  const { connected, users } = usePresence();

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-900 border border-gray-800">
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
      <span className="text-xs text-gray-400">
        {connected ? `${users.size} online` : 'Connecting...'}
      </span>
      {users.size > 0 && (
        <div className="flex -space-x-2">
          {Array.from(users.values()).slice(0, 3).map(user => (
            <div
              key={user.id}
              className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center"
              title={user.name || user.email}
            >
              <User className="w-3 h-3 text-gray-400" />
            </div>
          ))}
          {users.size > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center">
              <span className="text-xs text-gray-400">+{users.size - 3}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}