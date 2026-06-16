// Re-export everything from modular database files for backward compatibility
// New code should import directly from the specific modules

export * from './core';
export * from './tasks';
export * from './lists';
export * from './labels';
export * from './subtasks';
export * from './templates';
export * from './comments';
export * from './task-notes';
export * from './task-links';
export * from './task-dependencies';
export * from './sharing';
export * from './goals';
export * from './habits';
export { getAllHabitCompletions } from './habits';
export * from './time-blocks';
export * from './time-entries';
export * from './custom-views';
export * from './workspaces';
export * from './search';
export * from './recurring';
export * from './activities';
export * from './task-history';
export * from './reminders';
export * from './notifications';
export { createNotificationWithTimestamp } from './notifications';
export * from './task-assignments';
export * from './mentions';