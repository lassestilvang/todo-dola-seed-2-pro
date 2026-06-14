'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Clock, Check, X, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  taskId: string;
  taskName: string;
  type: 'reminder' | 'overdue' | 'due_today' | 'completed';
  timestamp: number;
  read: boolean;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?action=check');
      if (res.ok) {
        const data = await res.json();
        const newNotifications: Notification[] = data.notifications.map((n: { taskId: string; taskName: string; reminder: number }) => ({
          id: `${n.taskId}-${n.reminder}`,
          taskId: n.taskId,
          taskName: n.taskName,
          type: 'reminder',
          timestamp: n.reminder,
          read: false,
        }));
        setNotifications(prev => [...newNotifications, ...prev.filter(n => !n.read)]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    // Check permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission as 'granted' | 'denied' | 'default');
    }

    // Fetch notifications periodically
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermission(permission as 'granted' | 'denied' | 'default');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'due_today':
        return <Calendar className="w-4 h-4 text-yellow-400" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      default:
        return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label="Open notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-gray-700 p-3">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {permission !== 'granted' && (
              <Button variant="ghost" size="sm" onClick={requestPermission}>
                Enable
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <BellOff className="w-8 h-8 text-gray-500 mb-2" />
              <p className="text-sm text-gray-400">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 border-b border-gray-700 p-3 last:border-0 ${
                  !notification.read ? 'bg-gray-800/50' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.taskName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {notification.type === 'reminder' && 'Reminder'}
                    {notification.type === 'overdue' && 'Overdue'}
                    {notification.type === 'due_today' && 'Due today'}
                    {' '}
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1 hover:bg-gray-700 rounded"
                      aria-label="Mark as read"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="p-1 hover:bg-gray-700 rounded"
                    aria-label="Remove notification"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}