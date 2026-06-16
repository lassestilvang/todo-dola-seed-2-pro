import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, subtitle, trend, icon, className }: StatCardProps) {
  return (
    <div className={cn('p-4 rounded-lg bg-gray-900 border border-gray-800', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      {trend && <p className="text-xs text-green-400 mt-1">{trend}</p>}
    </div>
  );
}