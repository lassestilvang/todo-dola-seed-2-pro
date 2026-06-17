type ErrorContext = {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

class ErrorTracker {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!process.env.SENTRY_DSN;
  }

  captureError(error: Error, context?: ErrorContext): void {
    if (!this.isEnabled) {
      console.error('Error (Sentry not configured):', error.message, context);
      return;
    }
    // Sentry would be initialized in _app.tsx or middleware
    console.error('Error captured:', error.message, context);
  }

  captureMessage(message: string, context?: ErrorContext): void {
    if (!this.isEnabled) {
      console.log('Message (Sentry not configured):', message, context);
      return;
    }
    console.log('Message captured:', message, context);
  }

  startTransaction(name: string, op: string) {
    if (!this.isEnabled) {
      return {
        setName: () => {},
        setTag: () => {},
        setStatus: () => {},
        finish: () => {},
      };
    }
    return {
      setName: () => {},
      setTag: () => {},
      setStatus: () => {},
      finish: () => {},
    };
  }
}

export const errorTracker = new ErrorTracker();

export function trackError(error: Error, context?: ErrorContext) {
  errorTracker.captureError(error, context);
}

export function trackMessage(message: string, context?: ErrorContext) {
  errorTracker.captureMessage(message, context);
}