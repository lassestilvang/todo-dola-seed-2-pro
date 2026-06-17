import { sendNotificationEmail, generateTaskReminderEmail, generateDailySummaryEmail, generateWelcomeEmail } from './email-notifications';

interface EmailProvider {
  send(to: string, subject: string, html: string): Promise<boolean>;
}

class SendGridProvider implements EmailProvider {
  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, falling back to SMTP');
      return this.fallback(to, subject, html);
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SMTP_USER || 'noreply@todo-dola.com' },
          subject,
          content: [{ type: 'html', value: html }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('SendGrid error:', error);
      return this.fallback(to, subject, html);
    }
  }

  private async fallback(to: string, subject: string, html: string): Promise<boolean> {
    return sendNotificationEmail(
      { to, subject, html },
      {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      }
    );
  }
}

class SESProvider implements EmailProvider {
  async send(to: string, subject: string, html: string): Promise<boolean> {
    // AWS SES implementation
    // This would use AWS SDK
    return this.fallback(to, subject, html);
  }

  private async fallback(to: string, subject: string, html: string): Promise<boolean> {
    return sendNotificationEmail(
      { to, subject, html },
      {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      }
    );
  }
}

let emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    const provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    emailProvider = provider === 'ses' ? new SESProvider() : new SendGridProvider();
  }
  return emailProvider;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const provider = getEmailProvider();
  return provider.send(to, subject, html);
}

export async function sendTaskReminderEmail(
  task: { id: string; name: string; description?: string | null; deadline?: number | null },
  userName: string,
  userEmail: string
): Promise<boolean> {
  const email = generateTaskReminderEmail(task, userName);
  return sendEmail(userEmail, email.subject, email.html);
}

export async function sendDailySummaryEmail(
  tasks: Array<{ name: string; completed: boolean; deadline?: number | null }>,
  userName: string,
  userEmail: string
): Promise<boolean> {
  const email = generateDailySummaryEmail(tasks, userName);
  return sendEmail(userEmail, email.subject, email.html);
}

export async function sendWelcomeEmail(
  userName: string,
  userEmail: string
): Promise<boolean> {
  const email = generateWelcomeEmail(userName);
  return sendEmail(userEmail, email.subject, email.html);
}