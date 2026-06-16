import { Plus, CheckSquare, Calendar, Tag, ListTodo, FileText, Target, Clock, BarChart3, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'task' | 'calendar' | 'label' | 'list' | 'template' | 'goal' | 'time' | 'chart' | 'notification' | 'collaboration';
}

type IconType = 'task' | 'calendar' | 'label' | 'list' | 'template' | 'goal' | 'time' | 'chart' | 'notification' | 'collaboration';

function getIcon(icon?: IconType) {
  const iconMap: Record<IconType, React.ReactNode> = {
    task: <CheckSquare className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    calendar: <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    label: <Tag className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    list: <ListTodo className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    template: <FileText className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    goal: <Target className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    time: <Clock className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    chart: <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    notification: <Bell className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
    collaboration: <Users className="w-16 h-16 text-gray-500 mx-auto mb-3" />,
  };
  return iconMap[icon || 'task'] || <CheckSquare className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
}

export default function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="p-6 sm:p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
      {getIcon(icon)}
      <p className="text-gray-300 mb-2 text-lg font-medium">{title}</p>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}