import { Plus, CheckSquare, Calendar, Tag, ListTodo, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'task' | 'calendar' | 'label' | 'list' | 'template';
}

function getIcon(icon?: string) {
  switch (icon) {
    case 'calendar':
      return <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
    case 'label':
      return <Tag className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
    case 'list':
      return <ListTodo className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
    case 'template':
      return <FileText className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
    default:
      return <CheckSquare className="w-16 h-16 text-gray-500 mx-auto mb-3" />;
  }
}

export default function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="p-6 sm:p-8 rounded-lg bg-gray-900 border border-gray-800 text-center">
      {getIcon(icon)}
      <p className="text-gray-300 mb-2 text-lg">{title}</p>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}