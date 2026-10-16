import { z } from 'zod';
import { validateDoR, DorValidationResult } from './dorValidator';
import { ApiError } from '../middleware/errorHandler';

export type PortfolioDorEntity = 'BUG' | 'FEATURE' | 'EPIC';
export type PortfolioFixField =
  | 'title'
  | 'name'
  | 'description'
  | 'severity'
  | 'priority'
  | 'stepsToReproduce'
  | 'acceptanceCriteria'
  | 'expectedResult'
  | 'actualResult'
  | 'environment'
  | 'status';

export interface PortfolioDorFix {
  field: PortfolioFixField;
  value: string | string[] | number;
}

export interface PortfolioDorRecommendation {
  checkId: string;
  checkName: string;
  message: string;
  source: 'rules' | 'ai';
  suggestedFix?: PortfolioDorFix;
}

export interface PortfolioDorCheckItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  weight: number;
  suggestion?: string;
  evaluatedValue?: string | string[] | number;
  suggestedFix?: PortfolioDorFix;
}

export interface PortfolioDorValidation {
  score: number;
  isReady: boolean;
  checklist: PortfolioDorCheckItem[];
  summary: string;
  recommendations: string[];
  recommendationsDetailed: PortfolioDorRecommendation[];
}

export interface PortfolioDorInput {
  kind: PortfolioDorEntity;
  name?: string;
  title?: string;
  description: string;
  severity?: string;
  stepsToReproduce?: string[];
  expectedResult?: string;
  actualResult?: string;
  environment?: string | null;
  status?: string;
  featureCount?: number;
  storyCount?: number;
}

export interface PortfolioDorFixRequest {
  fixes: PortfolioDorFix[];
  recommendations: PortfolioDorRecommendation[];
  baseUpdatedAt?: string;
}

export interface PortfolioDorChange {
  field: PortfolioFixField;
  previousValue: string | string[] | number | null;
  proposedValue: string | string[] | number | null;
  recommendationIds: string[];
}

export interface PortfolioDorPreview {
  baseUpdatedAt: string;
  changes: PortfolioDorChange[];
  conflicts: Array<{ field: PortfolioFixField; values: Array<string | string[] | number>; message: string }>;
  manualRecommendations: PortfolioDorRecommendation[];
  selectedRecommendations: PortfolioDorRecommendation[];
  pendingRecommendations: PortfolioDorRecommendation[];
  changedFields: PortfolioFixField[];
}

const fields = [
  'title', 'name', 'description', 'severity', 'priority', 'stepsToReproduce',
  'acceptanceCriteria', 'expectedResult', 'actualResult', 'environment', 'status',
] as const;

const fixSchema = z.object({
  field: z.enum(fields),
  value: z.union([z.string(), z.array(z.string()), z.number()]),
});

const recommendationSchema = z.object({
  checkId: z.string().trim().min(1),
  checkName: z.string().trim().min(1),
  message: z.string().trim().min(1),
  source: z.enum(['rules', 'ai']).default('rules'),
  suggestedFix: fixSchema.optional(),
});

const requestSchema = z.object({
  fixes: z.array(fixSchema).max(20).optional().default([]),
  recommendations: z.array(recommendationSchema).max(50).optional().default([]),
  baseUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export class PortfolioDorInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortfolioDorInputError';
  }
}

function normalizeValue(field: PortfolioFixField, value: string | string[] | number): string | string[] | number {
  const listFields = field === 'stepsToReproduce' || field === 'acceptanceCriteria';
  if (listFields) {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    if (!values.length || values.some((item) => !item.trim())) {
      throw new PortfolioDorInputError(`El campo ${field} debe contener textos no vacíos.`);
    }
    return values.map((item) => item.trim());
  }

  if (['title', 'name', 'description', 'expectedResult', 'actualResult', 'environment'].includes(field)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new PortfolioDorInputError(`El campo ${field} debe contener texto no vacío.`);
    }
    return value.trim();
  }

  if (field === 'priority') {
    if (typeof value !== 'string' || !['HIGH', 'MEDIUM', 'LOW'].includes(value.trim().toUpperCase())) {
      throw new PortfolioDorInputError('La prioridad debe ser HIGH, MEDIUM o LOW.');
    }
    return value.trim().toUpperCase();
  }

  if (field === 'severity') {
    if (typeof value !== 'string' || !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(value.trim().toUpperCase())) {
      throw new PortfolioDorInputError('La severidad debe ser CRITICAL, HIGH, MEDIUM o LOW.');
    }
    return value.trim().toUpperCase();
  }

  if (field === 'status') {
    if (typeof value !== 'string' || !value.trim()) throw new PortfolioDorInputError('El estado no puede estar vacío.');
    return value.trim().toUpperCase();
  }

  return value;
}

function normalizeFix(fix: z.infer<typeof fixSchema>): PortfolioDorFix {
  return { field: fix.field, value: normalizeValue(fix.field, fix.value) };
}

function assertAllowedFields(kind: PortfolioDorEntity, request: PortfolioDorFixRequest): void {
  const allowed = kind === 'BUG'
    ? new Set<PortfolioFixField>(['title', 'description', 'severity', 'priority', 'stepsToReproduce', 'acceptanceCriteria', 'expectedResult', 'actualResult', 'environment'])
    : new Set<PortfolioFixField>(['name', 'description', 'status']);
  const fixes = [
    ...request.fixes,
    ...request.recommendations.flatMap((recommendation) => recommendation.suggestedFix ? [recommendation.suggestedFix] : []),
  ];
  const invalid = fixes.find((fix) => !allowed.has(fix.field));
  if (invalid) throw new PortfolioDorInputError(`El campo ${invalid.field} no es aplicable a ${kind}.`);
}

export function parsePortfolioDorFixRequest(body: unknown, kind: PortfolioDorEntity): PortfolioDorFixRequest {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) throw new PortfolioDorInputError(parsed.error.issues[0]?.message || 'El formato del fix DoR no es válido.');

  const recommendations = parsed.data.recommendations.map((recommendation) => ({
    ...recommendation,
    ...(recommendation.suggestedFix ? { suggestedFix: normalizeFix(recommendation.suggestedFix) } : {}),
  }));
  const fixes = [
    ...parsed.data.fixes.map(normalizeFix),
    ...recommendations.flatMap((recommendation) => recommendation.suggestedFix ? [recommendation.suggestedFix] : []),
  ];

  if (!fixes.length && !recommendations.length) throw new PortfolioDorInputError('Selecciona al menos una mejora DoR.');
  const request = { fixes, recommendations, ...(parsed.data.baseUpdatedAt ? { baseUpdatedAt: parsed.data.baseUpdatedAt } : {}) };
  assertAllowedFields(kind, request);
  return request;
}

function bugCriteria(input: PortfolioDorInput): string[] {
  return [
    ...(input.stepsToReproduce || []).map((step) => `Reproducir: ${step}`),
    input.expectedResult ? `Resultado esperado: ${input.expectedResult}` : '',
    input.actualResult ? `Resultado actual: ${input.actualResult}` : '',
  ].filter(Boolean);
}

function makeCheck(
  id: string,
  name: string,
  description: string,
  passed: boolean,
  weight: number,
  evaluatedValue: string | string[] | number | undefined,
  suggestion?: string,
  suggestedFix?: PortfolioDorFix,
): PortfolioDorCheckItem {
  return { id, name, description, passed, weight, evaluatedValue, suggestion, suggestedFix };
}

function validateContainer(input: PortfolioDorInput): PortfolioDorValidation {
  const label = input.kind === 'EPIC' ? 'épica' : 'feature';
  const name = (input.name || '').trim();
  const description = (input.description || '').trim();
  const childCount = input.kind === 'EPIC' ? input.featureCount || 0 : input.storyCount || 0;
  const childLabel = input.kind === 'EPIC' ? 'feature' : 'HDU';
  const checklist = [
    makeCheck(
      'name',
      'Nombre claro y descriptivo',
      `El nombre de la ${label} debe tener al menos 10 caracteres.`,
      name.length >= 10,
      30,
      name,
      name.length >= 10 ? undefined : `Define un nombre más descriptivo para la ${label}.`,
      name.length >= 10 ? undefined : { field: 'name', value: `${name || 'Nueva'} ${label} funcional` },
    ),
    makeCheck(
      'description',
      'Descripción con alcance',
      `La descripción debe explicar el objetivo y alcance de la ${label}.`,
      description.length >= 50,
      35,
      description,
      description.length >= 50 ? undefined : 'Agrega objetivo, alcance y valor esperado con al menos 50 caracteres.',
      description.length >= 50 ? undefined : { field: 'description', value: `Como equipo de producto, queremos desarrollar ${name || `esta ${label}`}, para entregar un resultado verificable al usuario.` },
    ),
    makeCheck(
      'childCoverage',
      `Tiene ${childLabel}s asociados`,
      `La ${label} debe tener al menos un ${childLabel} asociado para estar lista.`,
      childCount > 0,
      25,
      childCount,
      childCount > 0 ? undefined : `Asocia al menos un ${childLabel} antes de marcar la ${label} como lista.`,
    ),
    makeCheck(
      'scope',
      'Alcance verificable',
      'La descripción debe incluir un resultado o alcance verificable.',
      /(permit|entreg|valid|mostrar|gener|inclu|debe|resultado|objetivo)/i.test(description),
      10,
      description,
      /(permit|entreg|valid|mostrar|gener|inclu|debe|resultado|objetivo)/i.test(description)
        ? undefined
        : 'Incluye un resultado observable o una condición verificable en la descripción.',
    ),
  ];
  const totalWeight = checklist.reduce((sum, item) => sum + item.weight, 0);
  const passedWeight = checklist.filter((item) => item.passed).reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);
  const criticalPassed = checklist.filter((item) => ['name', 'description'].includes(item.id)).every((item) => item.passed);
  const isReady = score >= 70 && criticalPassed && checklist.find((item) => item.id === 'childCoverage')?.passed === true;
  const recommendationsDetailed = checklist
    .filter((item) => !item.passed && item.suggestion)
    .map((item) => ({
      checkId: item.id,
      checkName: item.name,
      message: item.suggestion as string,
      source: 'rules' as const,
      ...(item.suggestedFix ? { suggestedFix: item.suggestedFix } : {}),
    }));

  return {
    score,
    isReady,
    checklist,
    summary: isReady
      ? `La ${label} cumple DoR (${checklist.filter((item) => item.passed).length}/${checklist.length}, score: ${score}%)`
      : `La ${label} necesita mejoras DoR (${checklist.filter((item) => item.passed).length}/${checklist.length}, score: ${score}%)`,
    recommendations: recommendationsDetailed.map((recommendation) => recommendation.message),
    recommendationsDetailed,
  };
}

export function validatePortfolioDor(input: PortfolioDorInput): PortfolioDorValidation {
  if (input.kind === 'BUG') {
    const result: DorValidationResult = validateDoR({
      title: input.title || '',
      description: input.description,
      acceptanceCriteria: bugCriteria(input),
      priority: input.severity === 'CRITICAL' ? 'HIGH' : input.severity || '',
      storyPoints: 1,
    });
    return {
      ...result,
      checklist: result.checklist as unknown as PortfolioDorCheckItem[],
      recommendationsDetailed: result.recommendationsDetailed as unknown as PortfolioDorRecommendation[],
    };
  }
  return validateContainer(input);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function currentValue(entity: Record<string, unknown>, kind: PortfolioDorEntity, field: PortfolioFixField): string | string[] | number | null {
  if (kind === 'BUG') {
    if (field === 'priority') return typeof entity.severity === 'string' ? entity.severity : null;
    return (entity[field] as string | string[] | number | null | undefined) ?? null;
  }
  return (entity[field] as string | string[] | number | null | undefined) ?? null;
}

function persistedRecommendations(entity: Record<string, unknown>): PortfolioDorRecommendation[] {
  const analysis = entity.staticAnalysis as { recommendationsDetailed?: unknown } | null;
  if (!Array.isArray(analysis?.recommendationsDetailed)) return [];
  return analysis.recommendationsDetailed.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    if (typeof value.checkId !== 'string' || typeof value.checkName !== 'string' || typeof value.message !== 'string') return [];
    let suggestedFix: PortfolioDorFix | undefined;
    if (value.suggestedFix && typeof value.suggestedFix === 'object') {
      try { suggestedFix = normalizeFix(fixSchema.parse(value.suggestedFix)); } catch { suggestedFix = undefined; }
    }
    return [{ checkId: value.checkId, checkName: value.checkName, message: value.message, source: 'rules' as const, ...(suggestedFix ? { suggestedFix } : {}) }];
  });
}

function recommendationKey(recommendation: PortfolioDorRecommendation): string {
  return `${recommendation.checkId}:${recommendation.message}`;
}

export function buildPortfolioDorPreview(
  kind: PortfolioDorEntity,
  entity: Record<string, unknown>,
  request: PortfolioDorFixRequest,
): PortfolioDorPreview {
  const grouped = new Map<PortfolioFixField, PortfolioDorFix[]>();
  for (const fix of request.fixes) grouped.set(fix.field, [...(grouped.get(fix.field) || []), fix]);
  const conflicts: PortfolioDorPreview['conflicts'] = [];
  const changes: PortfolioDorChange[] = [];

  for (const [field, fixes] of grouped) {
    const uniqueValues = fixes.reduce<Array<string | string[] | number>>((values, fix) => {
      if (!values.some((value) => valuesEqual(value, fix.value))) values.push(fix.value);
      return values;
    }, []);
    if (uniqueValues.length > 1) {
      conflicts.push({ field, values: uniqueValues, message: `Hay propuestas incompatibles para ${field}. Selecciona una sola.` });
      continue;
    }
    const previousValue = currentValue(entity, kind, field);
    const proposedValue = uniqueValues[0] ?? previousValue;
    if (!valuesEqual(previousValue, proposedValue)) {
      changes.push({
        field,
        previousValue,
        proposedValue,
        recommendationIds: request.recommendations
          .filter((recommendation) => recommendation.suggestedFix?.field === field && valuesEqual(recommendation.suggestedFix.value, proposedValue))
          .map(recommendationKey),
      });
    }
  }

  const selectedKeys = new Set(request.recommendations.map(recommendationKey));
  const pendingRecommendations = persistedRecommendations(entity).filter((recommendation) => !selectedKeys.has(recommendationKey(recommendation)));
  return {
    baseUpdatedAt: new Date(String(entity.updatedAt)).toISOString(),
    changes,
    conflicts,
    manualRecommendations: request.recommendations.filter((recommendation) => !recommendation.suggestedFix),
    selectedRecommendations: request.recommendations,
    pendingRecommendations,
    changedFields: changes.map((change) => change.field),
  };
}

export function portfolioDorRequestError(error: unknown): ApiError {
  if (error instanceof PortfolioDorInputError) return new ApiError(error.message, 400);
  return new ApiError('No se pudo interpretar la selección de mejoras DoR.', 400);
}