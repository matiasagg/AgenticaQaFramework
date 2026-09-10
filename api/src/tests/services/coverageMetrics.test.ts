/**
 * Tests unitarios para el servicio de métricas de cobertura.
 * 
 * Cubre la HDU #4 (Cobertura de requerimientos y ejecuciones de prueba).
 * Valida el cálculo de las 5 métricas de cobertura, el desglose por
 * épica/feature, HDUs sin cobertura, casos no ejecutados/fallidos/
 * bloqueados, recomendaciones y riesgos.
 */

import {
  calculateCoverageMetrics,
  UserStoryInput,
  TestCaseInput,
  EpicInput,
  ProjectInput,
} from '../../services/coverageMetrics';

describe('Coverage Metrics Service', () => {
  const project: ProjectInput = { id: 'proj-001', name: 'Proyecto Test' };

  // ── Helper: crea una HDU con o sin suite de pruebas ──
  const buildUserStory = (
    id: string,
    opts: {
      status?: string;
      priority?: string;
      epicId?: string | null;
      featureId?: string | null;
      suite?: { status: string; caseIds: string[] } | null;
    } = {}
  ): UserStoryInput => {
    const { status = 'NEW', priority = 'MEDIUM', epicId = null, featureId = null, suite = null } = opts;
    return {
      id,
      displayId: `HDU-${id}`,
      title: `Historia ${id}`,
      status,
      priority,
      epicId,
      featureId,
      epic: epicId ? { id: epicId, name: `Épica ${epicId}` } : null,
      feature: featureId ? { id: featureId, name: `Feature ${featureId}` } : null,
      testSuite: suite
        ? {
            id: `suite-${id}`,
            status: suite.status,
            testLinks: suite.caseIds.map((cid) => ({
              id: `link-${id}-${cid}`,
              testCase: { id: cid, automationStatus: 'MANUAL' },
            })),
          }
        : null,
    };
  };

  const buildTestCase = (id: string, automationStatus = 'MANUAL'): TestCaseInput => ({
    id,
    automationStatus,
  });

  const buildEpic = (
    id: string,
    storyIds: string[]
  ): EpicInput => ({
    id,
    name: `Épica ${id}`,
    status: 'PLANNING',
    features: [],
    userStories: storyIds.map((sid) => ({
      id: sid,
      testSuite: null,
    })),
  });

  describe('Cobertura de requerimientos', () => {
    it('calcula el porcentaje de HDUs con al menos un caso de prueba', () => {
      const userStories: UserStoryInput[] = [
        // HDU con suite con 2 casos → con cobertura
        buildUserStory('us-1', {
          suite: { status: 'READY', caseIds: ['tc-1', 'tc-2'] },
        }),
        // HDU sin suite → sin cobertura
        buildUserStory('us-2'),
        // HDU con suite vacía → sin cobertura
        buildUserStory('us-3', { suite: { status: 'DRAFT', caseIds: [] } }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 1 de 3 HDUs tiene casos → 33%
      expect(result.summary.requirementCoverage).toBe(33);
      expect(result.counts.totalHDUs).toBe(3);
      expect(result.counts.hduWithTests).toBe(1);
      expect(result.counts.hduWithoutTests).toBe(2);
    });

    it('retorna 0 cuando no hay HDUs', () => {
      const result = calculateCoverageMetrics(project, [], [], []);
      expect(result.summary.requirementCoverage).toBe(0);
      expect(result.counts.totalHDUs).toBe(0);
    });
  });

  describe('Cobertura de diseño', () => {
    it('considera diseño = HDUs con suite con casos', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', { suite: { status: 'READY', caseIds: ['tc-1'] } }),
        buildUserStory('us-2', { suite: { status: 'DRAFT', caseIds: ['tc-2'] } }),
        buildUserStory('us-3'),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 2 de 3 HDUs tienen diseño → 67%
      expect(result.summary.designCoverage).toBe(67);
    });
  });

  describe('Cobertura de ejecución y resultados', () => {
    it('considera ejecutadas las suites READY o APPROVED', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', { suite: { status: 'READY', caseIds: ['tc-1'] } }),
        buildUserStory('us-2', { suite: { status: 'APPROVED', caseIds: ['tc-2'] } }),
        buildUserStory('us-3', { suite: { status: 'DRAFT', caseIds: ['tc-3'] } }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2'), buildTestCase('tc-3')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 2 de 3 suites ejecutadas → 67%
      expect(result.summary.executionCoverage).toBe(67);
      expect(result.counts.executedSuites).toBe(2);
      expect(result.counts.totalSuites).toBe(3);
    });

    it('calcula cobertura de resultados (aprobadas / ejecutadas)', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', { suite: { status: 'APPROVED', caseIds: ['tc-1'] } }),
        buildUserStory('us-2', { suite: { status: 'READY', caseIds: ['tc-2'] } }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 1 aprobada de 2 ejecutadas → 50%
      expect(result.summary.resultCoverage).toBe(50);
      expect(result.counts.passedSuites).toBe(1);
    });
  });

  describe('Cobertura de automatización', () => {
    it('calcula el porcentaje de casos automatizados', () => {
      const userStories: UserStoryInput[] = [];
      const testCases = [
        buildTestCase('tc-1', 'AUTOMATED'),
        buildTestCase('tc-2', 'AUTOMATED'),
        buildTestCase('tc-3', 'MANUAL'),
        buildTestCase('tc-4', 'IN_PROGRESS'),
      ];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 2 de 4 → 50%
      expect(result.summary.automationCoverage).toBe(50);
      expect(result.counts.automatedTests).toBe(2);
      expect(result.counts.totalTestCases).toBe(4);
    });
  });

  describe('Estados de casos de prueba', () => {
    it('identifica casos no ejecutados, fallidos y bloqueados', () => {
      const userStories: UserStoryInput[] = [
        // Suite DRAFT → no ejecutado
        buildUserStory('us-1', { suite: { status: 'DRAFT', caseIds: ['tc-1'] } }),
        // Suite READY pero no aprobada → fallido
        buildUserStory('us-2', { suite: { status: 'READY', caseIds: ['tc-2'] } }),
        // HDU bloqueada → casos bloqueados
        buildUserStory('us-3', {
          status: 'BLOCKED',
          suite: { status: 'READY', caseIds: ['tc-3'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2'), buildTestCase('tc-3')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.counts.nonExecutedCases).toBe(1); // tc-1
      expect(result.counts.failedCases).toBe(1); // tc-2
      expect(result.counts.blockedCases).toBe(1); // tc-3

      expect(result.caseStatusBreakdown.nonExecuted).toBe(1);
      expect(result.caseStatusBreakdown.failed).toBe(1);
      expect(result.caseStatusBreakdown.blocked).toBe(1);
    });
  });

  describe('HDUs sin casos de prueba', () => {
    it('lista las HDUs que no tienen suite o suite vacía', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', {
          epicId: 'ep-1',
          featureId: 'feat-1',
        }),
        buildUserStory('us-2', {
          suite: { status: 'DRAFT', caseIds: [] },
        }),
        buildUserStory('us-3', {
          suite: { status: 'READY', caseIds: ['tc-1'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.hduWithoutTests.length).toBe(2);
      expect(result.hduWithoutTests[0].displayId).toBe('HDU-us-1');
      expect(result.hduWithoutTests[0].epicName).toBe('Épica ep-1');
      expect(result.hduWithoutTests[0].featureName).toBe('Feature feat-1');
    });
  });

  describe('Desglose por épica', () => {
    it('calcula cobertura por épica', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', {
          epicId: 'ep-1',
          suite: { status: 'READY', caseIds: ['tc-1'] },
        }),
        buildUserStory('us-2', { epicId: 'ep-1' }),
        buildUserStory('us-3', {
          epicId: 'ep-2',
          suite: { status: 'READY', caseIds: ['tc-2'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2')];
      const epics: EpicInput[] = [
        buildEpic('ep-1', ['us-1', 'us-2']),
        buildEpic('ep-2', ['us-3']),
      ];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.epicBreakdown.length).toBe(2);

      const epic1 = result.epicBreakdown.find((e) => e.id === 'ep-1');
      expect(epic1?.totalHDUs).toBe(2);
      expect(epic1?.hduWithTests).toBe(1);
      expect(epic1?.coverage).toBe(50);

      const epic2 = result.epicBreakdown.find((e) => e.id === 'ep-2');
      expect(epic2?.totalHDUs).toBe(1);
      expect(epic2?.hduWithTests).toBe(1);
      expect(epic2?.coverage).toBe(100);
    });
  });

  describe('Desglose por feature', () => {
    it('calcula cobertura por feature usando userStories', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', {
          epicId: 'ep-1',
          featureId: 'feat-1',
          suite: { status: 'READY', caseIds: ['tc-1'] },
        }),
        buildUserStory('us-2', {
          epicId: 'ep-1',
          featureId: 'feat-1',
        }),
        buildUserStory('us-3', {
          epicId: 'ep-1',
          featureId: 'feat-2',
          suite: { status: 'READY', caseIds: ['tc-2'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1'), buildTestCase('tc-2')];
      const epics: EpicInput[] = [buildEpic('ep-1', ['us-1', 'us-2', 'us-3'])];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.featureBreakdown.length).toBe(2);

      const feat1 = result.featureBreakdown.find((f) => f.id === 'feat-1');
      expect(feat1?.totalHDUs).toBe(2);
      expect(feat1?.hduWithTests).toBe(1);
      expect(feat1?.coverage).toBe(50);
      expect(feat1?.epicName).toBe('Épica ep-1');

      const feat2 = result.featureBreakdown.find((f) => f.id === 'feat-2');
      expect(feat2?.totalHDUs).toBe(1);
      expect(feat2?.hduWithTests).toBe(1);
      expect(feat2?.coverage).toBe(100);
    });
  });

  describe('Recomendaciones y riesgos', () => {
    it('genera recomendaciones cuando la cobertura es baja', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1'),
        buildUserStory('us-2'),
        buildUserStory('us-3'),
      ];
      const testCases: TestCaseInput[] = [];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.summary.requirementCoverage).toBe(0);
    });

    it('identifica HDUs de alta prioridad sin pruebas como riesgo', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', { priority: 'HIGH' }),
        buildUserStory('us-2', {
          priority: 'HIGH',
          suite: { status: 'READY', caseIds: ['tc-1'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      // 1 HDU de alta prioridad sin pruebas
      expect(result.risks.some((r) => r.includes('alta prioridad'))).toBe(true);
    });

    it('genera mensaje positivo cuando todo es saludable', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', {
          suite: { status: 'APPROVED', caseIds: ['tc-1'] },
        }),
      ];
      const testCases = [buildTestCase('tc-1', 'AUTOMATED')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);

      expect(result.recommendations.some((r) => r.includes('Buen trabajo'))).toBe(true);
    });
  });

  describe('Casos límite', () => {
    it('maneja proyectos sin épicas, features o HDUs', () => {
      const result = calculateCoverageMetrics(project, [], [], []);
      expect(result.epicBreakdown).toEqual([]);
      expect(result.featureBreakdown).toEqual([]);
      expect(result.hduWithoutTests).toEqual([]);
      expect(result.summary.requirementCoverage).toBe(0);
      expect(result.summary.executionCoverage).toBe(0);
      expect(result.summary.resultCoverage).toBe(0);
    });

    it('maneja HDUs sin featureId (no aparecen en desglose de features)', () => {
      const userStories: UserStoryInput[] = [
        buildUserStory('us-1', { suite: { status: 'READY', caseIds: ['tc-1'] } }),
      ];
      const testCases = [buildTestCase('tc-1')];
      const epics: EpicInput[] = [];

      const result = calculateCoverageMetrics(project, userStories, testCases, epics);
      expect(result.featureBreakdown).toEqual([]);
    });
  });
});