// import { v4 as uuidv4 } from 'uuid';
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushMessage {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// In-memory storage (use database in production)
const subscriptions: Map<string, PushSubscription> = new Map();

export function subscribeUser(sub: PushSubscription, userId: string): string {
  const id = generateId();
  subscriptions.set(id, sub);
  return id;
}

export function unsubscribeUser(subId: string): boolean {
  return subscriptions.delete(subId);
}

export function getSubscriptions(): PushSubscription[] {
  return Array.from(subscriptions.values());
}

export async function sendPushNotification(sub: PushSubscription, message: PushMessage): Promise<boolean> {
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon || '/favicon.ico',
    tag: message.tag,
    requireInteraction: message.requireInteraction,
  });

  try {
    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MIME-Version': '1.0',
        'Content-Encoding': 'aesgcm',
      },
      body: payload,
    });

    return response.ok;
  } catch (error) {
    console.error('Push notification failed:', error);
    return false;
  }
}

export async function sendNotificationToAll(message: PushMessage): Promise<void> {
  const subs = getSubscriptions();
  for (const sub of subs) {
    await sendPushNotification(sub, message);
  }
}

// VAPID keys for web push (generate your own for production)
export const VAPID_PUBLIC_KEY = 'BGjZLQJKlz9QJ2jK7vN5wE8mX3cY6fT1hR2kL4oP6qS8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2uV4wX6yZ8aB0cD2eF4gH6iJ8kL0mN2oP4qR6sT8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uV8wX0yZ2';