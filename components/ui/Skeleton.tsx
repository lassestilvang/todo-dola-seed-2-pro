'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count }: SkeletonProps) {
  if (count && count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4 bg-gray-800 rounded', className)} />
        ))}
      </>
    );
  }
  return <div className={cn('h-4 bg-gray-800 rounded animate-pulse', className)} />;
}

export function TaskListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
          <Skeleton className="w-5 h-5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-10 h-10 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-gray-900 rounded-lg">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-900 rounded-lg">
          <Skeleton className="h-5 w-1/2 mb-3" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="p-4 bg-gray-900 rounded-lg">
          <Skeleton className="h-5 w-1/2 mb-3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}