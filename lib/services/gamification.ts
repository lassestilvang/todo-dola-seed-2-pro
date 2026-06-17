import type { Task } from '@/lib/types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserProgress {
  streak: number;
  longestStreak: number;
  tasksCompleted: number;
  badges: string[];
  level: number;
  experience: number;
}

export const BADGES: Badge[] = [
  {
    id: 'first-task',
    name: 'First Task',
    description: 'Complete your first task',
    icon: '✓',
    criteria: 'Complete 1 task',
    rarity: 'common',
  },
  {
    id: 'week-streak',
    name: 'Week Streak',
    description: 'Complete tasks for 7 days in a row',
    icon: '🔥',
    criteria: '7-day streak',
    rarity: 'rare',
  },
  {
    id: 'month-streak',
    name: 'Month Streak',
    description: 'Complete tasks for 30 days in a row',
    icon: '🔥🔥',
    criteria: '30-day streak',
    rarity: 'epic',
  },
  {
    id: 'productivity-master',
    name: 'Productivity Master',
    description: 'Complete 100 tasks',
    icon: '🏆',
    criteria: '100 tasks completed',
    rarity: 'epic',
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 10 tasks before 9 AM',
    icon: '🌅',
    criteria: '10 morning tasks',
    rarity: 'rare',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete 10 tasks after 10 PM',
    icon: '🦉',
    criteria: '10 late-night tasks',
    rarity: 'rare',
  },
];

export function calculateStreak(tasks: Task[]): number {
  const completedTasks = tasks
    .filter(t => t.completed && t.completedAt)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  if (completedTasks.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  for (const task of completedTasks) {
    const taskDate = new Date(task.completedAt!);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayTime - taskDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function calculateExperience(tasksCompleted: number, streak: number): number {
  let exp = 0;

  // Base experience per task
  exp += tasksCompleted * 10;

  // Streak bonus
  exp += streak * 5;

  // Bonus for long streaks
  if (streak >= 30) exp += 500;
  else if (streak >= 7) exp += 100;

  return exp;
}

export function calculateLevel(experience: number): number {
  return Math.floor(experience / 100) + 1;
}

export function checkForNewBadges(progress: UserProgress, newTasksCompleted: number): Badge[] {
  const newBadges: Badge[] = [];

  // First task badge
  if (progress.tasksCompleted - newTasksCompleted <= 0 && progress.tasksCompleted > 0) {
    if (!progress.badges.includes('first-task')) {
      newBadges.push(BADGES[0]);
    }
  }

  // Week streak badge
  if (progress.streak >= 7 && !progress.badges.includes('week-streak')) {
    newBadges.push(BADGES[1]);
  }

  // Month streak badge
  if (progress.streak >= 30 && !progress.badges.includes('month-streak')) {
    newBadges.push(BADGES[2]);
  }

  // Productivity master badge
  if (progress.tasksCompleted >= 100 && !progress.badges.includes('productivity-master')) {
    newBadges.push(BADGES[3]);
  }

  return newBadges;
}

export function getProgressStats(tasks: Task[]): UserProgress {
  const streak = calculateStreak(tasks);
  const tasksCompleted = tasks.filter(t => t.completed).length;
  const experience = calculateExperience(tasksCompleted, streak);
  const level = calculateLevel(experience);

  return {
    streak,
    longestStreak: streak, // In real app, track this separately
    tasksCompleted,
    badges: [], // Would load from DB
    level,
    experience,
  };
}