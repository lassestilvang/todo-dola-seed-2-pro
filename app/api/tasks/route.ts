import { taskService } from '@/lib/api/services/task-service';
import type { NextRequest } from 'next/server';

export const GET = taskService.createHandler((request: NextRequest) =>
  taskService.getAll(request)
);

export const POST = taskService.createHandler((request: NextRequest) =>
  taskService.create(request)
);