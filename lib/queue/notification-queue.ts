interface Job {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

interface JobProcessor {
  (data: Record<string, unknown>): Promise<void>;
}

class NotificationQueue {
  private jobs: Job[] = [];
  private processors: Map<string, JobProcessor> = new Map();
  private processing = false;

  registerProcessor(type: string, processor: JobProcessor) {
    this.processors.set(type, processor);
  }

  async add(type: string, data: Record<string, unknown>): Promise<string> {
    const job: Job = {
      id: Math.random().toString(36).substring(2, 15),
      type,
      data,
      createdAt: Date.now(),
      attempts: 0,
    };

    this.jobs.push(job);
    this.process();

    return job.id;
  }

  private async process() {
    if (this.processing || this.jobs.length === 0) return;

    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) break;

      const processor = this.processors.get(job.type);
      if (processor) {
        try {
          await processor(job.data);
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          job.attempts++;

          if (job.attempts < 3) {
            // Retry after 5 seconds
            setTimeout(() => this.jobs.unshift(job), 5000);
          }
        }
      }
    }

    this.processing = false;
  }

  get length() {
    return this.jobs.length;
  }
}

export const notificationQueue = new NotificationQueue();

// Register processors
import { sendTaskReminderEmail, sendDailySummaryEmail } from '../utils/email-service';

notificationQueue.registerProcessor('task-reminder', async (data) => {
  const { task, userName, userEmail } = data;
  await sendTaskReminderEmail(task as any, userName as string, userEmail as string);
});

notificationQueue.registerProcessor('daily-summary', async (data) => {
  const { tasks, userName, userEmail } = data;
  await sendDailySummaryEmail(tasks as any[], userName as string, userEmail as string);
});

notificationQueue.registerProcessor('welcome', async (data) => {
  const { userName, userEmail } = data;
  const { sendWelcomeEmail } = await import('../utils/email-service');
  await sendWelcomeEmail(userName as string, userEmail as string);
});