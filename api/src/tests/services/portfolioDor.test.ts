import {
  buildPortfolioDorPreview,
  parsePortfolioDorFixRequest,
  validatePortfolioDor,
} from '../../services/portfolioDor';

const epic = {
  id: 'epic-1',
  name: 'Gestión de autenticación segura',
  description: 'Permite gestionar el acceso seguro de los usuarios y validar todos los resultados observables del proceso.',
  status: 'PLANNING',
  featureCount: 0,
  storyCount: 0,
  updatedAt: '2026-10-04T09:00:00.000Z',
  staticAnalysis: null,
};

describe('Portfolio DoR', () => {
  it('requires child coverage for an epic', () => {
    const validation = validatePortfolioDor({
      kind: 'EPIC',
      name: epic.name,
      description: epic.description,
      featureCount: 0,
    });

    expect(validation.isReady).toBe(false);
    expect(validation.checklist.find((item) => item.id === 'childCoverage')?.passed).toBe(false);
  });

  it('marks a feature ready when name, scope and stories are complete', () => {
    const validation = validatePortfolioDor({
      kind: 'FEATURE',
      name: 'Inicio de sesión con MFA',
      description: 'Permite que el usuario valide su identidad y reciba un resultado verificable al iniciar sesión.',
      storyCount: 2,
    });

    expect(validation.isReady).toBe(true);
    expect(validation.score).toBe(100);
  });

  it('rejects unsafe status and preserves conflicts in preview', () => {
    expect(() => parsePortfolioDorFixRequest({ fixes: [{ field: 'status', value: '' }] }, 'EPIC')).toThrow();

    const request = parsePortfolioDorFixRequest({
      fixes: [
        { field: 'name', value: 'Nombre válido para la épica A' },
        { field: 'name', value: 'Nombre incompatible para la épica B' },
      ],
    }, 'EPIC');
    const preview = buildPortfolioDorPreview('EPIC', epic, request);

    expect(preview.conflicts).toHaveLength(1);
    expect(preview.changes).toHaveLength(0);
  });

  it('allows a manual recommendation without creating an automatic field change', () => {
    const request = parsePortfolioDorFixRequest({
      recommendations: [{ checkId: 'scope', checkName: 'Alcance', message: 'Revisar dependencias manualmente' }],
    }, 'EPIC');
    const preview = buildPortfolioDorPreview('EPIC', epic, request);

    expect(preview.manualRecommendations).toHaveLength(1);
    expect(preview.changes).toHaveLength(0);
  });
});