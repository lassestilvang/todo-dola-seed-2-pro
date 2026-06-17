export interface EmailTemplate {
  subject: string;
  html: string;
}

export function getTaskReminderTemplate(task: {
  id: string;
  name: string;
  description?: string | null;
  deadline?: number | null;
}, userName?: string): EmailTemplate {
  const deadline = task.deadline ? new Date(task.deadline).toLocaleString() : 'No deadline';

  return {
    subject: `Task Reminder: ${task.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { color: #3b82f6; font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          .task-name { font-size: 20px; font-weight: 500; color: #1f2937; margin-bottom: 8px; }
          .description { color: #6b7280; margin-bottom: 16px; }
          .deadline { background: #fef3c7; padding: 8px 12px; border-radius: 6px; display: inline-block; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
          .button { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Task Reminder</div>
          <div class="task-name">${task.name}</div>
          ${task.description ? `<div class="description">${task.description}</div>` : ''}
          <div class="deadline">Due: ${deadline}</div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/task/${task.id}" class="button">View Task</a>
          <div class="footer">
            Sent to ${userName || 'User'} • ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function getDailySummaryTemplate(tasks: Array<{
  name: string;
  completed: boolean;
  deadline?: number | null;
}>, userName: string): EmailTemplate {
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return {
    subject: `Daily Task Summary - ${pendingTasks.length} pending, ${completedTasks.length} completed`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          .stats { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat-box { flex: 1; padding: 16px; border-radius: 6px; text-align: center; }
          .stat-box.pending { background: #ffedd5; }
          .stat-box.completed { background: #dcfce7; }
          .stat-number { font-size: 32px; font-weight: 600; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .task-list { margin-top: 16px; }
          .task-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .task-item:last-child { border-bottom: none; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Daily Task Summary</div>
          <p>Hi ${userName},</p>
          <div class="stats">
            <div class="stat-box pending">
              <div class="stat-number">${pendingTasks.length}</div>
              <div class="stat-label">Pending Tasks</div>
            </div>
            <div class="stat-box completed">
              <div class="stat-number">${completedTasks.length}</div>
              <div class="stat-label">Completed Tasks</div>
            </div>
          </div>
          <div class="task-list">
            ${tasks.slice(0, 5).map(task => `
              <div class="task-item">
                <span style="color: ${task.completed ? '#22c55e' : '#374151'}">
                  ${task.completed ? '✓' : '○'} ${task.name}
                </span>
              </div>
            `).join('')}
          </div>
          <div class="footer">
            Sent automatically by Todo Dola Seed 2 Pro
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function getWelcomeTemplate(userName: string): EmailTemplate {
  return {
    subject: 'Welcome to Todo Dola Seed 2 Pro!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
          .header { font-size: 32px; font-weight: 600; color: #3b82f6; margin-bottom: 16px; }
          .subheader { color: #6b7280; margin-bottom: 24px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Welcome, ${userName}!</div>
          <p class="subheader">You've successfully joined Todo Dola Seed 2 Pro. Start organizing your tasks today!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/" class="button">Get Started</a>
        </div>
      </body>
      </html>
    `,
  };
}