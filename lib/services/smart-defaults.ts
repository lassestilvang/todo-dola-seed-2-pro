import type { Task, Label } from '@/lib/types';

export interface SmartDefaultSuggestion {
  type: 'subtask' | 'label' | 'priority';
  value: string;
  reason: string;
  confidence: number;
}

// Common project/task patterns and their typical subtasks
const PROJECT_PATTERNS: Record<string, string[]> = {
  'website': ['Design', 'Frontend', 'Backend', 'Testing', 'Deployment'],
  'project': ['Planning', 'Research', 'Execution', 'Review', 'Completion'],
  'report': ['Research', 'Draft', 'Review', 'Final'],
  'presentation': ['Slides', 'Content', 'Rehearsal', 'Delivery'],
  'meeting': ['Preparation', 'Agenda', 'Notes', 'Follow-up'],
  'launch': ['Planning', 'Development', 'Testing', 'Launch'],
  'event': ['Planning', 'Coordination', 'Execution', 'Follow-up'],
};

// Keywords that indicate complex tasks needing subtasks
const COMPLEXITY_INDICATORS = [
  'project', 'campaign', 'initiative', 'website', 'app', 'system',
  'launch', 'release', 'migration', 'integration', 'rebuild',
];

// Keyword to label mapping
const KEYWORD_LABEL_MAP: Record<string, string> = {
  'work': 'work',
  'personal': 'personal',
  'urgent': 'urgent',
  'important': 'important',
  'shopping': 'shopping',
  'health': 'health',
  'fitness': 'fitness',
  'learning': 'learning',
  'research': 'research',
};

export function getSmartDefaults(taskName: string, availableLabels: Label[]): SmartDefaultSuggestion[] {
  const suggestions: SmartDefaultSuggestion[] = [];
  const lowerName = taskName.toLowerCase();

  // Check for subtask suggestions
  const complexityMatch = COMPLEXITY_INDICATORS.find(indicator => lowerName.includes(indicator));
  if (complexityMatch) {
    const pattern = PROJECT_PATTERNS[complexityMatch];
    if (pattern) {
      suggestions.push({
        type: 'subtask',
        value: pattern.join(', '),
        reason: `Typical subtasks for ${complexityMatch} projects`,
        confidence: 0.8,
      });
    }
  }

  // Check for label suggestions
  for (const [keyword, labelName] of Object.entries(KEYWORD_LABEL_MAP)) {
    if (lowerName.includes(keyword)) {
      const existingLabel = availableLabels.find(l => l.name.toLowerCase() === labelName);
      if (existingLabel) {
        suggestions.push({
          type: 'label',
          value: existingLabel.id,
          reason: `Task contains "${keyword}" keyword`,
          confidence: 0.7,
        });
      } else {
        suggestions.push({
          type: 'label',
          value: labelName,
          reason: `Create "${labelName}" label for this task`,
          confidence: 0.6,
        });
      }
    }
  }

  // Auto-priority based on keywords
  if (lowerName.includes('urgent') || lowerName.includes('asap')) {
    suggestions.push({
      type: 'priority',
      value: 'high',
      reason: 'Contains urgent keyword',
      confidence: 0.9,
    });
  } else if (lowerName.includes('important') || lowerName.includes('critical')) {
    suggestions.push({
      type: 'priority',
      value: 'medium',
      reason: 'Contains important keyword',
      confidence: 0.8,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export function generateSubtasksFromPattern(taskName: string): string[] {
  const lowerName = taskName.toLowerCase();

  for (const [pattern, subtasks] of Object.entries(PROJECT_PATTERNS)) {
    if (lowerName.includes(pattern)) {
      return subtasks.map(s => `${s} - ${taskName}`);
    }
  }

  // Default subtasks for complex tasks
  if (COMPLEXITY_INDICATORS.some(indicator => lowerName.includes(indicator))) {
    return ['Planning', 'Research', 'Execution', 'Review'];
  }

  return [];
}