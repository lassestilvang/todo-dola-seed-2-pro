// Monitoring and analytics utilities

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

// Error tracking (Sentry-like)
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to error tracking service
    console.error('Error captured:', { error: error.message, stack: error.stack, context });
  } else {
    console.error(error);
  }
}

// Analytics tracking
export function trackEvent(event: AnalyticsEvent) {
  if (process.env.NODE_ENV === 'production') {
    // In production, send to analytics service
    console.log('Event tracked:', event);
  } else {
    console.log('Event:', event);
  }
}

// Performance monitoring
export function measureFeatureUsage(feature: string, duration: number) {
  trackEvent({
    name: 'feature_usage',
    properties: { feature, duration },
  });
}

// Initialize monitoring
export function initMonitoring() {
  // Monitoring initialization
  if (process.env.NODE_ENV === 'production') {
    console.log('Monitoring initialized');
  }
}