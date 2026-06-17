import { NextRequest, NextResponse } from 'next/server';
import { rateLimits, checkRateLimit, getRateLimitKey, sanitizeInput, validateUuid, handleApiError, ApiError } from './middleware';

export type ApiHandler = (request: NextRequest, context?: Record<string, unknown> | { params: Promise<{ id: string }> }) => Promise<Response> | Response;

export function withRateLimit(config: keyof typeof rateLimits = 'api') {
  return (handler: ApiHandler) => async (request: NextRequest, context?: Record<string, unknown>) => {
    const key = getRateLimitKey(request);
    const limitConfig = rateLimits[config];
    const { allowed, remaining, reset } = await checkRateLimit(key, limitConfig);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retryAfter: Math.ceil((reset - Date.now()) / 1000) }),
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limitConfig.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
          },
        }
      );
    }

    const response = await handler(request, context);

    // Add rate limit headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(limitConfig.limit));
    headers.set('X-RateLimit-Remaining', String(remaining));
    headers.set('X-RateLimit-Reset', String(reset));

    return new Response(response.body, { ...response, headers });
  };
}

export function withErrorHandling(handler: ApiHandler) {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function validateParams(params: Record<string, string>): Record<string, string> {
  const validated: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      validated[key] = sanitizeInput(value);
    }
  }
  return validated;
}

export function validatePathParams(params: Record<string, string>, requiredKeys: string[]): boolean {
  for (const key of requiredKeys) {
    if (!params[key] || !validateUuid(params[key])) {
      return false;
    }
  }
  return true;
}

export { ApiError, validateUuid };