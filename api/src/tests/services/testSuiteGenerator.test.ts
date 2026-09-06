/**
 * Tests unitarios para el servicio Test Suite Generator.
 * Valida la generación automática de suites de pruebas a partir de HDUs.
 */

import { describe, it, expect } from 'vitest';
import { generateTestSuite, UserStoryForGeneration } from '../../services/testSuiteGenerator';

describe('Test Suite Generator Service', () => {
  /** Historia de usuario válida para generación */
  const validUserStory: UserStoryForGeneration = {
    id: 'us-001',
    title: 'Login de usuario con 2FA',
    description: 'Como usuario registrado, quiero iniciar sesión con 2FA para proteger mi cuenta',
    acceptanceCriteria: [
      'El sistema debe mostrar campo para código 2FA tras credenciales correctas',
      'El código 2FA debe expirar en 30 segundos',
    ],
    priority: 'HIGH',
    storyPoints: 8,
  };

  const projectId = 'proj-001';

  describe('generateTestSuite', () => {
    it('debe generar una suite con título y descripción', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      expect(suite.title).toContain(validUserStory.title);
      expect(suite.description).toContain('Suite de pruebas');
      expect(suite.description).toContain(validUserStory.title);
    });

    it('debe generar al menos 1 caso de prueba por criterio de aceptación', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      // 2 criterios × funcional + regresión (2) + integración (2) + exploratorio (1) + edge (2)
      expect(suite.testCases.length).toBeGreaterThanOrEqual(validUserStory.acceptanceCriteria.length);
    });

    it('debe incluir metadata con IDs y timestamps', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      expect(suite.metadata.userStoryId).toBe(validUserStory.id);
      expect(suite.metadata.projectId).toBe(projectId);
      expect(suite.metadata.generatedAt).toBeDefined();
      expect(suite.metadata.totalTestCases).toBe(suite.testCases.length);
      expect(suite.metadata.estimatedExecutionTime).toBeGreaterThan(0);
    });

    it('debe generar casos funcionales para cada criterio de aceptación', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const functionalTests = suite.testCases.filter((tc) => tc.type === 'FUNCTIONAL');
      expect(functionalTests.length).toBeGreaterThanOrEqual(validUserStory.acceptanceCriteria.length);

      // Verificar que cada criterio tiene al menos un test funcional relacionado
      for (const criteria of validUserStory.acceptanceCriteria) {
        const hasRelated = functionalTests.some((tc) =>
          tc.relatedAcceptanceCriteria.includes(criteria)
        );
        expect(hasRelated).toBe(true);
      }
    });

    it('debe generar casos de regresión', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const regressionTests = suite.testCases.filter((tc) => tc.type === 'REGRESSION');
      expect(regressionTests.length).toBeGreaterThanOrEqual(1);
    });

    it('debe generar casos de integración', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const integrationTests = suite.testCases.filter((tc) => tc.type === 'INTEGRATION');
      expect(integrationTests.length).toBeGreaterThanOrEqual(1);
    });

    it('debe generar casos exploratorios', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const exploratoryTests = suite.testCases.filter((tc) => tc.type === 'EXPLORATORY');
      expect(exploratoryTests.length).toBeGreaterThanOrEqual(1);
    });

    it('debe generar casos borde', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const edgeCaseTests = suite.testCases.filter((tc) => tc.id.startsWith('EDGE'));
      expect(edgeCaseTests.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Casos de prueba generados', () => {
    it('cada caso debe tener estructura completa', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      for (const tc of suite.testCases) {
        expect(tc.id).toBeDefined();
        expect(tc.title).toBeDefined();
        expect(tc.description).toBeDefined();
        expect(tc.preconditions.length).toBeGreaterThan(0);
        expect(tc.steps.length).toBeGreaterThan(0);
        expect(tc.expectedResults.length).toBeGreaterThan(0);
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(tc.priority);
        expect(['FUNCTIONAL', 'REGRESSION', 'E2E', 'INTEGRATION', 'EXPLORATORY']).toContain(tc.type);
        expect(['MANUAL', 'AUTOMATED', 'IN_PROGRESS']).toContain(tc.automationStatus);
      }
    });

    it('cada paso debe tener orden y acción', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      for (const tc of suite.testCases) {
        for (let i = 0; i < tc.steps.length; i++) {
          expect(tc.steps[i].order).toBe(i + 1);
          expect(tc.steps[i].action.length).toBeGreaterThan(0);
        }
      }
    });

    it('los casos funcionales deben estar relacionados con criterios de aceptación', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const functionalTests = suite.testCases.filter((tc) => tc.id.startsWith('FUNC'));
      for (const tc of functionalTests) {
        expect(tc.relatedAcceptanceCriteria.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Análisis de cobertura', () => {
    it('debe calcular cobertura de criterios de aceptación', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      expect(suite.coverage.acceptanceCriteriaCoverage).toBeGreaterThanOrEqual(0);
      expect(suite.coverage.acceptanceCriteriaCoverage).toBeLessThanOrEqual(100);
    });

    it('debe incluir cobertura por prioridad', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const { high, medium, low } = suite.coverage.coverageByPriority;
      expect(high + medium + low).toBe(suite.testCases.length);
    });

    it('debe contar casos borde', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      expect(suite.coverage.edgeCasesCovered).toBeGreaterThanOrEqual(1);
    });

    it('cobertura funcional debe ser razonable', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      expect(suite.coverage.functionalCoverage).toBeGreaterThanOrEqual(70);
      expect(suite.coverage.functionalCoverage).toBeLessThanOrEqual(95);
    });
  });

  describe('Mapeo de prioridad', () => {
    it('debe respetar la prioridad HIGH de la HDU', () => {
      const highPriorityStory = { ...validUserStory, priority: 'HIGH' };
      const suite = generateTestSuite(highPriorityStory, projectId);

      const functionalTests = suite.testCases.filter((tc) => tc.id.startsWith('FUNC'));
      expect(functionalTests[0].priority).toBe('HIGH');
    });

    it('debe mapear prioridad LOW correctamente', () => {
      const lowPriorityStory = { ...validUserStory, priority: 'LOW' };
      const suite = generateTestSuite(lowPriorityStory, projectId);

      const functionalTests = suite.testCases.filter((tc) => tc.id.startsWith('FUNC'));
      expect(functionalTests[0].priority).toBe('LOW');
    });
  });

  describe('Tiempo estimado', () => {
    it('debe calcular tiempo estimado basado en pasos', () => {
      const suite = generateTestSuite(validUserStory, projectId);

      const totalSteps = suite.testCases.reduce((sum, tc) => sum + tc.steps.length, 0);
      expect(suite.metadata.estimatedExecutionTime).toBe(totalSteps * 2);
    });
  });
});