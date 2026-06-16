import { getTaskById } from '@/lib/db/queries';
import FocusModeClient from './client';

export default async function FocusPage({ params }: { params: Promise<{ taskId: string }> }) {
  const taskId = (await params).taskId;
  const task = await getTaskById(taskId);

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Task not found</p>
      </div>
    );
  }

  return <FocusModeClient task={task} />;
}