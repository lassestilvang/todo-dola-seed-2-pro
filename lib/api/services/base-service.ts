import { NextRequest, NextResponse } from 'next/server';
import { ApiError, ErrorCodes, handleApiError } from '../middleware';
import { withRateLimit, withErrorHandling } from '../handler';

export abstract class BaseService {
  protected abstract resourceName: string;

  protected createResponse(data: unknown, status: number = 200): NextResponse {
    return NextResponse.json({ data }, { status });
  }

  protected createErrorResponse(error: string, status: number, code?: string): NextResponse {
    return NextResponse.json({ error, code }, { status });
  }

  protected async getPaginatedResponse<T>(
    items: T[],
    total: number,
    limit: number,
    offset: number
  ): Promise<NextResponse> {
    return NextResponse.json({
      data: items,
      total,
      meta: { limit, offset }
    });
  }

  // Factory method for creating handlers with standard middleware
  public createHandler(
    handler: (request: NextRequest, context?: Record<string, unknown>) => Promise<Response>
  ) {
    return withErrorHandling(withRateLimit()(handler));
  }
}

export { ApiError, ErrorCodes, handleApiError };