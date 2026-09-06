export type StoryWorkflowStatus =
  | 'NEW'
  | 'IN_ANALYSIS'
  | 'DOR_IN_PROGRESS'
  | 'DOR_DONE'
  | 'READY_FOR_DEVELOPMENT'
  | 'IN_DEVELOPMENT'
  | 'READY_FOR_QA'
  | 'DOD_IN_PROGRESS'
  | 'DOD_DONE'
  | 'DONE'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'ARCHIVED';

export const STORY_WORKFLOW_TRANSITIONS: Record<StoryWorkflowStatus, StoryWorkflowStatus[]> = {
  NEW: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['DOR_IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  DOR_IN_PROGRESS: ['DOR_DONE', 'BLOCKED', 'CANCELLED'],
  DOR_DONE: ['READY_FOR_DEVELOPMENT', 'BLOCKED', 'CANCELLED'],
  READY_FOR_DEVELOPMENT: ['IN_DEVELOPMENT', 'BLOCKED', 'CANCELLED'],
  IN_DEVELOPMENT: ['READY_FOR_QA', 'BLOCKED', 'CANCELLED'],
  READY_FOR_QA: ['DOD_IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  DOD_IN_PROGRESS: ['DOD_DONE', 'BLOCKED', 'CANCELLED'],
  DOD_DONE: ['DONE', 'BLOCKED', 'CANCELLED'],
  DONE: [],
  BLOCKED: ['IN_ANALYSIS', 'DOR_IN_PROGRESS', 'READY_FOR_DEVELOPMENT', 'IN_DEVELOPMENT', 'READY_FOR_QA', 'DOD_IN_PROGRESS', 'CANCELLED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function getAllowedTransitions(status: StoryWorkflowStatus): StoryWorkflowStatus[] {
  return STORY_WORKFLOW_TRANSITIONS[status] ?? [];
}

export function normalizeExternalStatus(status: string): StoryWorkflowStatus {
  const normalized = status.toLowerCase();

  if (['new', 'open', 'todo', 'draft'].includes(normalized)) return 'NEW';
  if (['in_analysis', 'analysis', 'review'].includes(normalized)) return 'IN_ANALYSIS';
  if (['dor_in_progress', 'in_review', 'dor', 'ready_for_review'].includes(normalized)) return 'DOR_IN_PROGRESS';
  if (['dor_done', 'ready', 'accepted'].includes(normalized)) return 'DOR_DONE';
  if (['ready_for_development', 'ready_for_dev', 'backlog_ready'].includes(normalized)) return 'READY_FOR_DEVELOPMENT';
  if (['in_progress', 'development', 'building'].includes(normalized)) return 'IN_DEVELOPMENT';
  if (['ready_for_qa', 'qa_ready'].includes(normalized)) return 'READY_FOR_QA';
  if (['dod_in_progress', 'doD', 'definition_of_done_in_progress'].includes(normalized)) return 'DOD_IN_PROGRESS';
  if (['dod_done', 'done_ready'].includes(normalized)) return 'DOD_DONE';
  if (['done', 'completed', 'resolved'].includes(normalized)) return 'DONE';
  if (['blocked', 'stuck'].includes(normalized)) return 'BLOCKED';
  if (['cancelled', 'canceled', 'rejected'].includes(normalized)) return 'CANCELLED';
  if (['archived', 'closed'].includes(normalized)) return 'ARCHIVED';

  return 'NEW';
}

export function advanceStoryStatus(input: {
  currentStatus: StoryWorkflowStatus | string;
  dorScore?: number | null;
  isReady?: boolean;
}): { nextStatus: StoryWorkflowStatus; canAdvance: boolean; reason?: string } {
  const current = normalizeExternalStatus(String(input.currentStatus || 'NEW'));
  const dorScore = input.dorScore ?? 0;
  const isReady = Boolean(input.isReady);

  if (current === 'NEW') {
    return { nextStatus: 'IN_ANALYSIS', canAdvance: true };
  }

  if (current === 'IN_ANALYSIS') {
    return { nextStatus: 'DOR_IN_PROGRESS', canAdvance: true };
  }

  if (current === 'DOR_IN_PROGRESS') {
    if (isReady && dorScore >= 70) {
      return { nextStatus: 'DOR_DONE', canAdvance: true };
    }
    return { nextStatus: 'DOR_IN_PROGRESS', canAdvance: false, reason: 'DoR incompleto' };
  }

  if (current === 'DOR_DONE') {
    return { nextStatus: 'READY_FOR_DEVELOPMENT', canAdvance: true };
  }

  if (current === 'READY_FOR_DEVELOPMENT') {
    return { nextStatus: 'IN_DEVELOPMENT', canAdvance: true };
  }

  if (current === 'IN_DEVELOPMENT') {
    return { nextStatus: 'READY_FOR_QA', canAdvance: true };
  }

  if (current === 'READY_FOR_QA') {
    return { nextStatus: 'DOD_IN_PROGRESS', canAdvance: true };
  }

  if (current === 'DOD_IN_PROGRESS') {
    return { nextStatus: 'DOD_DONE', canAdvance: true };
  }

  if (current === 'DOD_DONE') {
    return { nextStatus: 'DONE', canAdvance: true };
  }

  return { nextStatus: current, canAdvance: false, reason: 'Estado terminal' };
}

export function buildAiStoryRecommendations(input: {
  title: string;
  description?: string | null;
  acceptanceCriteria?: string[];
  priority?: string | null;
  storyPoints?: number | string | null;
}): {
  score: number;
  recommendations: string[];
  suggestedStatus: StoryWorkflowStatus;
} {
  const title = (input.title ?? '').trim();
  const description = (input.description ?? '').trim();
  const criteria = (input.acceptanceCriteria ?? []).filter((c) => String(c ?? '').trim().length > 0);
  const priority = (input.priority ?? 'MEDIUM').toString().toUpperCase();
  const storyPoints = Number(input.storyPoints ?? 0);

  let score = 25;

  if (title.length >= 12) score += 15;
  if (description.length >= 40) score += 20;
  if (criteria.length >= 2) score += 20;
  if (['HIGH', 'MEDIUM', 'LOW'].includes(priority)) score += 10;
  if (storyPoints > 0) score += 10;

  const recommendations: string[] = [];
  if (title.length < 12) recommendations.push('Mejora el título para que describa claramente el valor del usuario.');
  if (description.length < 40) recommendations.push('Agrega una descripción más completa con contexto, rol y objetivo.');
  if (criteria.length < 2) recommendations.push('Añade al menos dos criterios de aceptación verificables.');
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) recommendations.push('Asigna una prioridad explícita.');
  if (!storyPoints || storyPoints <= 0) recommendations.push('Define story points para estimar el alcance.');

  if (recommendations.length === 0) {
    recommendations.push('Validar si hay casos límite o escenarios alternativos que deban aparecer en criterios de aceptación.');
    recommendations.push('Confirmar que el beneficio del usuario y la necesidad de negocio quedan explícitos en la historia.');
  }

  const suggestedStatus = score >= 70 ? 'DOR_DONE' : 'DOR_IN_PROGRESS';

  return {
    score: Math.min(100, Math.max(0, score)),
    recommendations,
    suggestedStatus,
  };
}
