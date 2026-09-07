import { describe, it, expect } from 'vitest';
import {
  getAllowedTransitions,
  advanceStoryStatus,
  buildAiStoryRecommendations,
  normalizeExternalStatus,
} from '../../services/storyWorkflow';

describe('HDU workflow service', () => {
  it('should list allowed transitions from the current HDU status', () => {
    expect(getAllowedTransitions('NEW')).toContain('IN_ANALYSIS');
    expect(getAllowedTransitions('DOR_DONE')).toContain('READY_FOR_DEVELOPMENT');
    expect(getAllowedTransitions('DONE')).toEqual([]);
  });

  it('should advance a story to Ready for development after DoR completion', () => {
    const result = advanceStoryStatus({
      currentStatus: 'DOR_DONE',
      dorScore: 85,
      isReady: true,
    });

    expect(result.nextStatus).toBe('READY_FOR_DEVELOPMENT');
    expect(result.canAdvance).toBe(true);
  });

  it('should block status advance when DoR is not completed', () => {
    const result = advanceStoryStatus({
      currentStatus: 'DOR_IN_PROGRESS',
      dorScore: 58,
      isReady: false,
    });

    expect(result.canAdvance).toBe(false);
    expect(result.nextStatus).toBe('DOR_IN_PROGRESS');
  });

  it('should normalize external statuses to the internal HDU workflow', () => {
    expect(normalizeExternalStatus('open')).toBe('NEW');
    expect(normalizeExternalStatus('in_review')).toBe('DOR_IN_PROGRESS');
    expect(normalizeExternalStatus('ready')).toBe('DOR_DONE');
    expect(normalizeExternalStatus('in_progress')).toBe('IN_DEVELOPMENT');
    expect(normalizeExternalStatus('done')).toBe('DONE');
    expect(normalizeExternalStatus('closed')).toBe('ARCHIVED');
  });

  it('should generate AI recommendations with a score and suggested next status', () => {
    const result = buildAiStoryRecommendations({
      title: 'Login con autenticación',
      description: 'Como usuario, quiero iniciar sesión para entrar al sistema',
      acceptanceCriteria: ['Debe permitir ingresar credenciales', 'Debe validar usuario'],
      priority: 'HIGH',
      storyPoints: 3,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.suggestedStatus).toBe('DOR_DONE');
  });
});
