import type { Task, TaskTemplate, Label } from '@/lib/types';

interface TemplateGenerationInput {
  description: string;
  taskType?: 'default' | 'project' | 'meeting' | 'habit' | 'errand';
}

interface GeneratedTemplate {
  name: string;
  description: string;
  listId: string;
  priority: 'high' | 'medium' | 'low' | 'none';
  labels: string[];
  subtasks: string[];
}

const TEMPLATE_PATTERNS: Record<string, {
  patterns: RegExp[];
  template: (match: RegExpMatchArray | null) => GeneratedTemplate;
}> = {
  project: {
    patterns: [
      /project.*?(setup|launch|initiate|start)/i,
      /build.*?(app|system|feature|product)/i,
      /develop.*?(software|website|tool)/i,
    ],
    template: () => ({
      name: 'New Project',
      description: 'Set up project with initial planning and requirements gathering',
      listId: 'work',
      priority: 'high',
      labels: ['planning', 'project'],
      subtasks: [
        'Define project scope and requirements',
        'Create project timeline',
        'Set up project repository',
        'Identify team members',
        'Create initial documentation',
      ],
    }),
  },
  meeting: {
    patterns: [
      /meeting.*?(with|about|regarding)/i,
      /call.*?(with|about|regarding)/i,
      /interview.*?(with|about)/i,
    ],
    template: (match) => {
      const withMatch = match?.[1] || 'team';
      return {
        name: `Meeting with ${withMatch}`,
        description: 'Prepare agenda and meeting materials',
        listId: 'work',
        priority: 'medium',
        labels: ['meeting'],
        subtasks: [
          'Create meeting agenda',
          'Send calendar invite',
          'Prepare presentation materials',
          'Schedule follow-up',
        ],
      };
    },
  },
  habit: {
    patterns: [
      /daily.*?(routine|habits?|practice)/i,
      /exercise|workout|fitness/i,
      /read.*?(book|article)/i,
      /journal|reflect/i,
    ],
    template: () => ({
      name: 'Daily Habit',
      description: 'Maintain consistent daily practice',
      listId: 'personal',
      priority: 'low',
      labels: ['habit', 'daily'],
      subtasks: [],
    }),
  },
  errand: {
    patterns: [
      /buy.*?(groceries| supplies)/i,
      /go.*?(store|shop)/i,
      /pick.*?(up|up)/i,
      /run.*?(errand|task)/i,
    ],
    template: () => ({
      name: 'Errand',
      description: 'Complete necessary errand or task',
      listId: 'personal',
      priority: 'medium',
      labels: ['errand'],
      subtasks: [],
    }),
  },
};

export const PRESET_TEMPLATES: GeneratedTemplate[] = [
  {
    name: 'Weekly Review',
    description: "Review the week's accomplishments and plan for next week",
    listId: 'work',
    priority: 'medium',
    labels: ['review', 'weekly'],
    subtasks: [
      'Review completed tasks',
      'Assess progress toward goals',
      'Identify areas for improvement',
      "Plan next week's priorities",
      'Update habit tracking',
    ],
  },
  {
    name: 'Project Kickoff',
    description: 'Initial setup for a new project or feature',
    listId: 'work',
    priority: 'high',
    labels: ['project', 'kickoff'],
    subtasks: [
      'Define project scope',
      'Create project timeline',
      'Identify stakeholders',
      'Set up project tools',
      'Plan first sprint/milestone',
    ],
  },
  {
    name: 'Content Creation',
    description: 'Process for creating blog posts, videos, or other content',
    listId: 'work',
    priority: 'medium',
    labels: ['content', 'creative'],
    subtasks: [
      'Research topic',
      'Create outline',
      'Write first draft',
      'Review and edit',
      'Add visuals/media',
      'Publish and promote',
    ],
  },
  {
    name: 'Learning Session',
    description: 'Dedicated time for skill development',
    listId: 'personal',
    priority: 'low',
    labels: ['learning', 'education'],
    subtasks: [
      'Set learning objectives',
      'Find learning resources',
      'Practice new skills',
      'Review and apply knowledge',
    ],
  },
];

export function generateTemplateFromDescription(
  input: TemplateGenerationInput
): GeneratedTemplate {
  const { description, taskType = 'default' } = input;
  const lowerDesc = description.toLowerCase();

  for (const [type, config] of Object.entries(TEMPLATE_PATTERNS)) {
    for (const pattern of config.patterns) {
      const match = description.match(pattern);
      if (match) {
        return config.template(match);
      }
    }
  }

  if (lowerDesc.includes('meeting') || lowerDesc.includes('call')) {
    return TEMPLATE_PATTERNS.meeting.template(null);
  }

  if (lowerDesc.includes('project') || lowerDesc.includes('build')) {
    return TEMPLATE_PATTERNS.project.template(null);
  }

  if (lowerDesc.includes('exercise') || lowerDesc.includes('workout')) {
    return TEMPLATE_PATTERNS.habit.template(null);
  }

  if (lowerDesc.includes('buy') || lowerDesc.includes('shop')) {
    return TEMPLATE_PATTERNS.errand.template(null);
  }

  return {
    name: description.split(' ').slice(0, 4).join(' '),
    description: description,
    listId: 'inbox',
    priority: 'none',
    labels: [],
    subtasks: [],
  };
}

export function getPresetTemplates(): GeneratedTemplate[] {
  return [...PRESET_TEMPLATES];
}

export function getTemplateSuggestions(userTaskHistory: Task[]): GeneratedTemplate[] {
  const labelCounts: Record<string, number> = {};
  const listCounts: Record<string, number> = {};

  for (const task of userTaskHistory) {
    for (const label of task.labels || []) {
      labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
    }
    if (task.listId) {
      listCounts[task.listId] = (listCounts[task.listId] || 0) + 1;
    }
  }

  const topLabels = Object.entries(labelCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([label]) => label);

  return PRESET_TEMPLATES.filter(t =>
    t.labels.some(l => topLabels.includes(l))
  );
}

// Template Variables Support
export interface TemplateVariables {
  project?: string;
  username?: string;
  date?: string;
  time?: string;
  [key: string]: string | undefined;
}

const VARIABLE_PATTERNS: Record<string, () => string> = {
  '{date}': () => new Date().toISOString().split('T')[0],
  '{date+1d}': () => new Date(Date.now() + 86400000).toISOString().split('T')[0],
  '{date+3d}': () => new Date(Date.now() + 259200000).toISOString().split('T')[0],
  '{date+7d}': () => new Date(Date.now() + 604800000).toISOString().split('T')[0],
  '{username}': () => 'User',
  '{project}': () => 'Project',
  '{time}': () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
};

export function processTemplateVariables(
  template: GeneratedTemplate,
  variables: TemplateVariables = {}
): GeneratedTemplate {
  const replaceVars = (text: string): string => {
    let result = text;
    for (const [pattern, getter] of Object.entries(VARIABLE_PATTERNS)) {
      let value = getter();
      // Override with user-provided variables
      if (pattern === '{project}' && variables.project) value = variables.project;
      if (pattern === '{username}' && variables.username) value = variables.username;
      if (pattern === '{date}' && variables.date) value = variables.date;
      result = result.replace(new RegExp(pattern, 'g'), value);
    }
    return result;
  };

  return {
    name: replaceVars(template.name),
    description: replaceVars(template.description),
    listId: template.listId,
    priority: template.priority,
    labels: template.labels.map(replaceVars),
    subtasks: template.subtasks.map(replaceVars),
  };
}