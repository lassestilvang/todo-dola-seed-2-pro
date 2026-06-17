import type { Task } from '@/lib/types';

export interface UserContext {
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    place?: string;
  };
  timestamp: number;
  appUsage?: {
    app: string;
    duration: number;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
}

export interface ContextSuggestion {
  taskId: string;
  reason: string;
  confidence: number;
}

// Location-based task suggestions
const LOCATION_TASKS: Record<string, string[]> = {
  'home': ['laundry', 'clean', 'family', 'personal'],
  'work': ['meeting', 'project', 'email', 'report'],
  'office': ['meeting', 'project', 'email', 'report'],
  'gym': ['workout', 'exercise', 'fitness', 'health'],
  'store': ['shopping', 'buy', 'purchase'],
  'restaurant': ['eat', 'meal', 'food'],
};

// Time-based suggestions
const TIME_TASK_PATTERNS: Record<string, string[]> = {
  'morning': ['review', 'plan', 'email', 'coffee', 'breakfast'],
  'afternoon': ['meeting', 'call', 'project', 'task'],
  'evening': ['relax', 'family', 'dinner', 'read'],
  'night': ['sleep', 'wind down', 'review'],
};

export function getSuggestions(
  tasks: Task[],
  context: UserContext,
  limit: number = 5
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];
  const now = Date.now();

  // Filter available tasks (not completed, not overdue)
  const availableTasks = tasks.filter(t => !t.completed && (!t.deadline || t.deadline > now));

  for (const task of availableTasks) {
    let confidence = 0;
    const reasons: string[] = [];

    // Location-based matching
    if (context.location?.place) {
      const placeLower = context.location.place.toLowerCase();
      const placeKeywords = LOCATION_TASKS[placeLower as keyof typeof LOCATION_TASKS] || [];
      const taskText = (task.name + ' ' + (task.description || '')).toLowerCase();

      for (const keyword of placeKeywords) {
        if (taskText.includes(keyword)) {
          confidence += 0.3;
          reasons.push(`At ${context.location.place}`);
        }
      }
    }

    // Time-of-day matching
    const timeKeywords = TIME_TASK_PATTERNS[context.timeOfDay] || [];
    const taskText = (task.name + ' ' + (task.description || '')).toLowerCase();

    for (const keyword of timeKeywords) {
      if (taskText.includes(keyword)) {
        confidence += 0.2;
        reasons.push(`Morning tasks`);
      }
    }

    // Deadline proximity
    if (task.deadline) {
      const hoursUntilDue = (task.deadline - now) / (1000 * 60 * 60);
      if (hoursUntilDue < 24 && hoursUntilDue > 0) {
        confidence += 0.25;
        reasons.push('Due soon');
      }
    }

    // Priority boost
    if (task.priority === 'high') {
      confidence += 0.15;
      reasons.push('High priority');
    }

    if (confidence > 0.3) {
      suggestions.push({
        taskId: task.id,
        reason: reasons.join(', '),
        confidence: Math.min(confidence, 1),
      });
    }
  }

  // Sort by confidence
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function detectLocation(): Promise<UserContext['location']> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        resolve(undefined);
      }
    );
  });
}

export function getTimeContext(): UserContext {
  const now = new Date();
  const hours = now.getHours();

  let timeOfDay: UserContext['timeOfDay'];
  if (hours >= 5 && hours < 12) {
    timeOfDay = 'morning';
  } else if (hours >= 12 && hours < 17) {
    timeOfDay = 'afternoon';
  } else if (hours >= 17 && hours < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  return {
    timestamp: now.getTime(),
    timeOfDay,
    dayOfWeek: now.getDay(),
  };
}

export async function getContextSuggestions(tasks: Task[]): Promise<ContextSuggestion[]> {
  const location = await detectLocation();
  const timeContext = getTimeContext();

  const context: UserContext = {
    ...timeContext,
    ...(location && { location }),
  };

  return getSuggestions(tasks, context);
}