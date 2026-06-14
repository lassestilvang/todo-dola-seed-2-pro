'use client';

import TaskListView from '@/components/tasks/TaskListView';

export default function InboxPage() {
  return <TaskListView view="all" title="Inbox" />;
}