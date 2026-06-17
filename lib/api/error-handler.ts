// Re-export from middleware for backwards compatibility
export { ApiError, handleApiError, validateRequiredFields, ErrorCodes } from './middleware';
export type { ApiError as ApiErrorType, ErrorCode } from './middleware';

import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from './middleware';

export async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON in request body');
  }
}

export function createSuccessResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status: number = 500, details?: unknown): NextResponse {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}