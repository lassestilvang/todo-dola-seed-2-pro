#!/usr/bin/env node

/**
 * Background Worker for Task Reminders
 *
 * Run with: npx tsx worker.ts
 * Or in production: node dist/worker.js
 */

import { startReminderScheduler, stopReminderScheduler } from './lib/services/scheduler';

console.log('Starting background worker...');

// Start the reminder scheduler
startReminderScheduler();

console.log('Background worker started successfully');
console.log('Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  stopReminderScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  stopReminderScheduler();
  process.exit(0);
});