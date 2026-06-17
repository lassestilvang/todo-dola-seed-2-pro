import type { Task } from '@/lib/types';

export interface IssueSync {
  id: string;
  taskId: string;
  provider: 'github' | 'gitlab';
  issueId: string;
  issueUrl: string;
  title: string;
  status: 'open' | 'closed' | 'merged';
  lastSynced: number;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
}

export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  url: string;
  state: 'opened' | 'closed';
}

// Sync task with GitHub issue
export async function syncWithGitHub(
  task: Task,
  token: string,
  owner: string,
  repo: string
): Promise<IssueSync> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.name,
      body: task.description || '',
      labels: task.labels?.map(l => l.name) || [],
    }),
  });

  const issue = await response.json();

  return {
    id: `gh_${issue.id}`,
    taskId: task.id,
    provider: 'github',
    issueId: issue.id.toString(),
    issueUrl: issue.html_url,
    title: issue.title,
    status: issue.state === 'open' ? 'open' : 'closed',
    lastSynced: Date.now(),
  };
}

// Sync task with GitLab issue
export async function syncWithGitLab(
  task: Task,
  token: string,
  projectId: string
): Promise<IssueSync> {
  const response = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/issues`, {
    method: 'POST',
    headers: {
      'Private-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.name,
      description: task.description || '',
      labels: task.labels?.map(l => l.name) || [],
    }),
  });

  const issue = await response.json();

  return {
    id: `gl_${issue.id}`,
    taskId: task.id,
    provider: 'gitlab',
    issueId: issue.id.toString(),
    issueUrl: issue.web_url,
    title: issue.title,
    status: issue.state === 'opened' ? 'open' : 'closed',
    lastSynced: Date.now(),
  };
}

// Update task from issue changes
export async function updateTaskFromIssue(
  sync: IssueSync,
  token: string,
  taskId: string
): Promise<{ name?: string; description?: string; completed?: boolean }> {
  let issue;

  if (sync.provider === 'github') {
    const response = await fetch(`https://api.github.com/repos/${sync.issueUrl.split('/')[4]}/${sync.issueUrl.split('/')[5]}/issues/${sync.issueId}`, {
      headers: { 'Authorization': `token ${token}` },
    });
    issue = await response.json();
  } else {
    // GitLab implementation
    return {};
  }

  return {
    name: issue.title,
    description: issue.body,
    completed: issue.state === 'closed',
  };
}