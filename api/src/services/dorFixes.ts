import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { DorSuggestedFix } from './dorValidator';

export const DOR_FIX_FIELDS = [
  'title',
  'description',
  'acceptanceCriteria',
  'priority',
  'storyPoints',
] as const;

const suggestedFixSchema = z.object({
  field: z.enum(DOR_FIX_FIELDS),
  value: z.union([z.string(), z.array(z.string()), z.number()]),
});

const recommendationSchema = z.object({
  checkId: z.string().trim().min(1),
  checkName: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1),
  suggestedFix: suggestedFixSchema.optional(),
});

const requestSchema = z.object({
  fixes: z.array(suggestedFixSchema).max(20).optional().default([]),
  recommendations: z.array(recommendationSchema).max(50).optional().default([]),
  baseUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export interface DorFixRecommendationInput {
  checkId: string;
  checkName?: string;
  message: string;
  suggestedFix?: DorSuggestedFix;
}

export interface DorFixRequest {
  fixes: DorSuggestedFix[];
  recommendations: DorFixRecommendationInput[];
  baseUpdatedAt?: string;
}

export interface DorFieldChange {
  field: DorSuggestedFix['field'];
  previousValue: string | string[] | number | null;
  proposedValue: string | string[] | number | null;
  recommendationIds: string[];
}

export interface DorFixConflict {
  field: DorSuggestedFix['field'];
  values: Array<string | string[] | number>;
  message: string;
}

export interface DorSyncRecommendation {
  action: 'SYNC' | 'CONFIGURE' | 'NONE';
  linkedToGitHub: boolean;
  pendingChanges: boolean;
  repository?: string;
  issueNumber?: string;
  message: string;
}

export interface DorFixPreview {
  baseUpdatedAt: string;
  changes: DorFieldChange[];
  conflicts: DorFixConflict[];
  manualRecommendations: DorFixRecommendationInput[];
  selectedRecommendations: DorFixRecommendationInput[];
  pendingRecommendations: DorFixRecommendationInput[];
  changedFields: string[];
}

export interface UserStoryDorFixInput {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints: number | null;
  updatedAt: Date | string;
  technicalNotes?: string[];
  externalSystem?: string | null;
  externalId?: string | null;
  syncStatus?: string | null;
  staticAnalysis?: unknown;
}

export class DorFixInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DorFixInputError';
  }
}

function normalizeFix(fix: z.infer<typeof suggestedFixSchema>): DorSuggestedFix {
  switch (fix.field) {
    case 'title':
    case 'description':
      if (typeof fix.value !== 'string' || fix.value.trim() === '') {
        throw new DorFixInputError(`El campo ${fix.field} debe contener texto no vacío.`);
      }
      return { field: fix.field, value: fix.value.trim() };
    case 'priority': {
      if (typeof fix.value !== 'string') {
        throw new DorFixInputError('La prioridad debe ser HIGH, MEDIUM o LOW.');
      }
      const priority = fix.value.trim().toUpperCase();
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
        throw new DorFixInputError('La prioridad debe ser HIGH, MEDIUM o LOW.');
      }
      return { field: 'priority', value: priority };
    }
    case 'storyPoints':
      if (typeof fix.value !== 'number' || !Number.isInteger(fix.value) || ![1, 2, 3, 5, 8, 13, 21].includes(fix.value)) {
        throw new DorFixInputError('Los story points deben ser un entero Fibonacci: 1, 2, 3, 5, 8, 13 o 21.');
      }
      return { field: 'storyPoints', value: fix.value };
    case 'acceptanceCriteria': {
      const criteria: string[] = Array.isArray(fix.value)
        ? fix.value
        : typeof fix.value === 'string' ? [fix.value] : [];
      if (criteria.length === 0 || criteria.some((criterion) => criterion.trim() === '')) {
        throw new DorFixInputError('Los criterios de aceptación deben ser textos no vacíos.');
      }
      return { field: 'acceptanceCriteria', value: criteria.map((criterion) => criterion.trim()) };
    }
  }
}

function normalizeRecommendation(
  recommendation: z.infer<typeof recommendationSchema>,
): DorFixRecommendationInput {
  return {
    checkId: recommendation.checkId,
    ...(recommendation.checkName ? { checkName: recommendation.checkName } : {}),
    message: recommendation.message,
    ...(recommendation.suggestedFix
      ? { suggestedFix: normalizeFix(recommendation.suggestedFix) }
      : {}),
  };
}

export function parseDorFixRequest(body: unknown): DorFixRequest {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DorFixInputError(issue?.message || 'El formato de las mejoras DoR no es válido.');
  }

  const recommendations = parsed.data.recommendations.map(normalizeRecommendation);
  const fixes = [
    ...parsed.data.fixes.map(normalizeFix),
    ...recommendations
      .map((recommendation) => recommendation.suggestedFix)
      .filter((fix): fix is DorSuggestedFix => Boolean(fix)),
  ];

  if (fixes.length === 0 && recommendations.length === 0) {
    throw new DorFixInputError('Selecciona al menos una mejora DoR o recomendación.');
  }

  return {
    fixes,
    recommendations,
    ...(parsed.data.baseUpdatedAt ? { baseUpdatedAt: parsed.data.baseUpdatedAt } : {}),
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function valueForField(story: UserStoryDorFixInput, field: DorSuggestedFix['field']): string | string[] | number | null {
  switch (field) {
    case 'title': return story.title;
    case 'description': return story.description;
    case 'acceptanceCriteria': return story.acceptanceCriteria;
    case 'priority': return story.priority;
    case 'storyPoints': return story.storyPoints;
  }
}

function extractPersistedRecommendations(story: UserStoryDorFixInput): DorFixRecommendationInput[] {
  const analysis = story.staticAnalysis as { recommendationsDetailed?: unknown } | null;
  if (!Array.isArray(analysis?.recommendationsDetailed)) return [];

  return analysis.recommendationsDetailed.flatMap((recommendation) => {
    if (!recommendation || typeof recommendation !== 'object') return [];
    const candidate = recommendation as Record<string, unknown>;
    if (typeof candidate.checkId !== 'string' || typeof candidate.message !== 'string') return [];
    const suggestedFix = candidate.suggestedFix;
    return [{
      checkId: candidate.checkId,
      ...(typeof candidate.checkName === 'string' ? { checkName: candidate.checkName } : {}),
      message: candidate.message,
      ...(suggestedFix && typeof suggestedFix === 'object'
        ? { suggestedFix: normalizeFix(suggestedFixSchema.parse(suggestedFix)) }
        : {}),
    }];
  });
}

function recommendationKey(recommendation: DorFixRecommendationInput): string {
  return `${recommendation.checkId}:${recommendation.message}`;
}

export function buildDorFixPreview(
  story: UserStoryDorFixInput,
  request: DorFixRequest,
): DorFixPreview {
  const grouped = new Map<DorSuggestedFix['field'], DorSuggestedFix[]>();
  for (const fix of request.fixes) {
    const values = grouped.get(fix.field) || [];
    values.push(fix);
    grouped.set(fix.field, values);
  }

  const conflicts: DorFixConflict[] = [];
  const changes: DorFieldChange[] = [];

  for (const [field, fieldFixes] of grouped.entries()) {
    const uniqueValues = fieldFixes.reduce<Array<string | string[] | number>>((values, fix) => {
      if (!values.some((value) => valuesEqual(value, fix.value))) values.push(fix.value);
      return values;
    }, []);

    if (uniqueValues.length > 1) {
      conflicts.push({
        field,
        values: uniqueValues,
        message: `Hay propuestas incompatibles para el campo ${field}. Selecciona una sola antes de confirmar.`,
      });
      continue;
    }

    let proposedValue = uniqueValues[0] ?? valueForField(story, field);
    // Nunca se pierden criterios existentes al aplicar una propuesta automática.
    if (field === 'acceptanceCriteria' && Array.isArray(proposedValue)) {
      proposedValue = Array.from(new Set([...story.acceptanceCriteria, ...proposedValue]));
    }

    const previousValue = valueForField(story, field);
    if (!valuesEqual(previousValue, proposedValue)) {
      changes.push({
        field,
        previousValue,
        proposedValue,
        recommendationIds: request.recommendations
          .filter((recommendation) => recommendation.suggestedFix?.field === field && valuesEqual(recommendation.suggestedFix.value, uniqueValues[0]))
          .map((recommendation) => recommendationKey(recommendation)),
      });
    }
  }

  const persistedRecommendations = extractPersistedRecommendations(story);
  const selectedKeys = new Set(request.recommendations.map(recommendationKey));
  const pendingRecommendations = persistedRecommendations.filter(
    (recommendation) => !selectedKeys.has(recommendationKey(recommendation)),
  );
  const selectedRecommendations = request.recommendations;
  const manualRecommendations = selectedRecommendations.filter((recommendation) => !recommendation.suggestedFix);

  return {
    baseUpdatedAt: new Date(story.updatedAt).toISOString(),
    changes,
    conflicts,
    manualRecommendations,
    selectedRecommendations,
    pendingRecommendations,
    changedFields: changes.map((change) => change.field),
  };
}

export function buildDorSyncRecommendation(
  story: Pick<UserStoryDorFixInput, 'externalSystem' | 'externalId' | 'syncStatus'>,
  project?: { repository?: string | null } | null,
): DorSyncRecommendation {
  const repository = project?.repository || undefined;
  const linkedToGitHub = story.externalSystem === 'GITHUB' && Boolean(story.externalId);
  const pendingChanges = linkedToGitHub && story.syncStatus !== 'SYNCED';

  if (linkedToGitHub && pendingChanges) {
    return {
      action: 'SYNC',
      linkedToGitHub: true,
      pendingChanges: true,
      ...(repository ? { repository } : {}),
      issueNumber: story.externalId || undefined,
      message: 'La HDU está vinculada a GitHub y tiene cambios pendientes. Revisa y sincroniza el issue cuando confirmes los cambios.',
    };
  }

  if (!linkedToGitHub && repository) {
    return {
      action: 'CONFIGURE',
      linkedToGitHub: false,
      pendingChanges: false,
      repository,
      message: 'El proyecto tiene un repositorio configurado, pero esta HDU no está vinculada a un issue de GitHub. Configura o importa la integración antes de sincronizar.',
    };
  }

  return {
    action: 'NONE',
    linkedToGitHub,
    pendingChanges,
    ...(repository ? { repository } : {}),
    ...(story.externalId ? { issueNumber: story.externalId } : {}),
    message: linkedToGitHub
      ? 'La HDU está sincronizada con GitHub.'
      : 'No hay una integración de GitHub configurada para esta HDU.',
  };
}

export function dorFixRequestError(error: unknown): ApiError {
  if (error instanceof DorFixInputError) return new ApiError(error.message, 400);
  return new ApiError('No se pudo interpretar la selección de mejoras DoR.', 400);
}