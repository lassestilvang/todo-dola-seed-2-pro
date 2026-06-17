import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getRedis, isRedisAvailable } from '@/lib/cache';

// Rate limiting storage (in-memory fallback, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token storage
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const rateLimits: Record<string, RateLimitConfig> = {
  default: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  api: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute for API
  auth: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute for auth
  webhook: { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute for webhooks
};

// Structured error codes for consistent API error handling
export const ErrorCodes = {
  // 400 Bad Request
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_UUID: 'INVALID_UUID',
  INVALID_JSON: 'INVALID_JSON',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 401 Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 403 Forbidden
  FORBIDDEN: 'FORBIDDEN',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // 404 Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // 409 Conflict
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',

  // 429 Too Many Requests
  RATE_LIMITED: 'RATE_LIMITED',

  // 500 Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DB_ERROR: 'DB_ERROR',
  DB_INIT_ERROR: 'DB_INIT_ERROR',
  TX_ERROR: 'TX_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const path = request.nextUrl.pathname;
  return `${ip}:${path}`;
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowMs = config.windowMs;
  const limit = config.limit;

  // Use Redis if available for distributed rate limiting
  if (isRedisAvailable()) {
    const redis = getRedis();
    const redisKey = `rate_limit:${key}`;

    try {
      const multi = redis.multi();
      multi.incr(redisKey);
      multi.ttl(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000));
      const results = await multi.exec();

      const count = results?.[0]?.[1] as number || 0;
      const ttl = results?.[1]?.[1] as number || 0;

      if (count > limit) {
        return { allowed: false, remaining: 0, reset: now + ttl * 1000 };
      }

      return { allowed: true, remaining: limit - count, reset: now + ttl * 1000 };
    } catch (error) {
      console.error('Redis rate limit error, falling back to memory:', error);
    }
  }

  // Fallback to in-memory rate limiting
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, reset: record.resetTime };
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Comprehensive XSS sanitization
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*\s+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html;/gi, '')
    .trim();
}

// Generate CSRF token
export function generateCsrfToken(): string {
  const token = createHash('sha256').update(Math.random().toString()).digest('hex');
  return token;
}

// Validate CSRF token
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  return token === expectedToken;
}

// Get client token from request
export function getClientToken(request: NextRequest): string | null {
  return request.headers.get('x-csrf-token');
}

export function validateUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateRequiredFields(data: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(field => data[field] === undefined || data[field] === null);
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`, ErrorCodes.MISSING_FIELDS, { missingFields: missing });
  }
}

// Sanitize HTML content (basic implementation)
export function sanitizeHtml(input: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = input;
    return div.innerHTML;
  }
  // Fallback for server-side
  return sanitizeInput(input);
}

// Validate input length
export function validateLength(input: string, min: number, max: number): boolean {
  return input.length >= min && input.length <= max;
}

// Escape SQL identifiers (table names, column names)
export function escapeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new ApiError(400, 'Invalid identifier', ErrorCodes.INVALID_INPUT);
  }
  return identifier;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status }
    );
  }
  if (error instanceof Error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
  }
  return NextResponse.json({ error: 'Unknown error', code: ErrorCodes.INTERNAL_ERROR }, { status: 500 });
}