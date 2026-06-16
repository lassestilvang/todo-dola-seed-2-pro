import { taskService } from '@/lib/api/services/task-service';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return taskService.createHandler(() => taskService.getById(request, id))(request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return taskService.createHandler(() => taskService.update(request, id))(request);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return taskService.createHandler(() => taskService.update(request, id))(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return taskService.createHandler(() => taskService.delete(request, id))(request);
}