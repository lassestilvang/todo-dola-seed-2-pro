import type { Task } from '@/lib/types';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: number;
  endDate: number | null;
  location?: string;
  attendees?: string[];
}

export interface CalendarProvider {
  name: string;
  authorize(): Promise<void>;
  fetchEvents(from: number, to: number): Promise<CalendarEvent[]>;
  createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string>;
  updateEvent(id: string, event: Partial<Omit<CalendarEvent, 'id'>>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
}

// Google Calendar Provider
export class GoogleCalendarProvider implements CalendarProvider {
  name = 'google';
  private accessToken: string | null = null;

  async authorize(): Promise<void> {
    // In a real implementation, this would use OAuth2
    // For now, we'll use a mock implementation
    this.accessToken = localStorage.getItem('google_calendar_token');
  }

  async fetchEvents(from: number, to: number): Promise<CalendarEvent[]> {
    if (!this.accessToken) await this.authorize();

    // Mock implementation - in production, call Google Calendar API
    return [];
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    if (!this.accessToken) await this.authorize();

    const id = `cal_${Date.now()}`;
    return id;
  }

  async updateEvent(id: string, event: Partial<Omit<CalendarEvent, 'id'>>): Promise<void> {
    // Mock implementation
  }

  async deleteEvent(id: string): Promise<void> {
    // Mock implementation
  }
}

// Outlook Calendar Provider
export class OutlookCalendarProvider implements CalendarProvider {
  name = 'outlook';
  private accessToken: string | null = null;

  async authorize(): Promise<void> {
    this.accessToken = localStorage.getItem('outlook_calendar_token');
  }

  async fetchEvents(from: number, to: number): Promise<CalendarEvent[]> {
    if (!this.accessToken) await this.authorize();
    return [];
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
    if (!this.accessToken) await this.authorize();
    return `cal_${Date.now()}`;
  }

  async updateEvent(id: string, event: Partial<Omit<CalendarEvent, 'id'>>): Promise<void> {}

  async deleteEvent(id: string): Promise<void> {}
}

// Convert task to calendar event
export function taskToCalendarEvent(task: Task): CalendarEvent {
  return {
    id: task.id,
    title: task.name,
    description: task.description || '',
    startDate: task.date || task.createdAt,
    endDate: task.deadline,
    location: undefined,
    attendees: undefined,
  };
}

// Convert calendar event to task
export function calendarEventToTask(event: CalendarEvent): Partial<Task> {
  return {
    id: event.id,
    name: event.title,
    description: event.description,
    date: event.startDate,
    deadline: event.endDate,
    completed: false,
  };
}