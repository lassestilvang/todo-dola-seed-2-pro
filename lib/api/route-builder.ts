import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

type Handler = (req: NextRequest, context?: { params?: Promise<{ id: string }> }) => Promise<NextResponse>;

interface RouteBuilderOptions {
  entityName: string;
  idParam?: string;
}

export function buildCrudRoutes(options: RouteBuilderOptions, handlers: {
  getList?: (req: NextRequest) => Promise<NextResponse>;
  getItem?: (req: NextRequest, id: string) => Promise<NextResponse>;
  create?: (req: NextRequest) => Promise<NextResponse>;
  update?: (req: NextRequest, id: string) => Promise<NextResponse>;
  delete?: (req: NextRequest, id: string) => Promise<NextResponse>;
  customActions?: {
    [key: string]: (req: NextRequest, context: { params?: Promise<{ id: string }> }) => Promise<NextResponse>;
  };
}) {
  return {
    async GET(req: NextRequest, context?: { params?: Promise<{ id: string }> }) {
      const id = context?.params ? (await context.params).id : null;
      if (id && handlers.getItem) {
        return handlers.getItem(req, id);
      }
      if (handlers.getList) {
        return handlers.getList(req);
      }
      return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
    },

    async POST(req: NextRequest) {
      if (!handlers.create) {
        return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
      }
      return handlers.create(req);
    },

    async PATCH(req: NextRequest, context?: { params?: Promise<{ id: string }> }) {
      const id = context?.params ? (await context.params).id : null;
      if (!id || !handlers.update) {
        return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
      }
      return handlers.update(req, id);
    },

    async DELETE(req: NextRequest, context?: { params?: Promise<{ id: string }> }) {
      const id = context?.params ? (await context.params).id : null;
      if (!id || !handlers.delete) {
        return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
      }
      return handlers.delete(req, id);
    },

    ...(options.idParam && handlers.customActions ? {
      ...Object.entries(handlers.customActions).reduce((acc, [key, handler]) => ({
        ...acc,
        ...(key === 'GET' ? { async GETCustom(req: NextRequest, id: string) {
          return handler(req, { params: Promise.resolve({ id }) });
        }} : {}),
      }), {}),
    } : {}),
  };
}

export function createEntity(entityName: string, data: Record<string, unknown>) {
  return {
    id: randomUUID(),
    created_at: Date.now(),
    updated_at: Date.now(),
    ...data,
  };
}

export function validateRequiredFields(data: Record<string, unknown>, fields: string[]): { valid: boolean; missing?: string[] } {
  const missing = fields.filter(f => data[f] === undefined || data[f] === null);
  return { valid: missing.length === 0, missing: missing.length > 0 ? missing : undefined };
}

export function validateUuid(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}