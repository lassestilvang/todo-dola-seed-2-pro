import nodemailer from 'nodemailer';
import { getTaskReminderTemplate, getDailySummaryTemplate, getWelcomeTemplate } from './email-templates';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
}

// Create transporter
function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

// Send notification email
export async function sendNotificationEmail(
  email: NotificationEmail,
  config: EmailConfig
): Promise<boolean> {
  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from: `"Todo Dola" <${config.auth.user}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Generate task reminder email
export function generateTaskReminderEmail(task: { id: string; name: string; description?: string | null; deadline?: number | null }, userName?: string) {
  return getTaskReminderTemplate(task, userName);
}

// Generate daily summary email
export function generateDailySummaryEmail(tasks: Array<{ name: string; completed: boolean; deadline?: number | null }>, userName: string) {
  return getDailySummaryTemplate(tasks, userName);
}

// Generate welcome email
export function generateWelcomeEmail(userName: string) {
  return getWelcomeTemplate(userName);
}