/**
 * Tests unitarios para el servicio DoR Validator.
 * Valida que la lógica de Definition of Ready funcione correctamente
 * para diferentes escenarios de historias de usuario.
 */

import { describe, it, expect } from 'vitest';
import { validateDoR, UserStoryInput } from '../../services/dorValidator';

describe('DoR Validator Service', () => {
  /** Historia de usuario que cumple todos los criterios DoR */
  const validUserStory: UserStoryInput = {
    title: 'Login de usuario con autenticación de dos factores',
    description: 'Como usuario registrado, quiero poder iniciar sesión con autenticación de dos factores para proteger mi cuenta de accesos no autorizados',
    acceptanceCriteria: [
      'El sistema debe mostrar un campo para el código 2FA después de ingresar credenciales correctas',
      'El código 2FA debe tener una validez de 30 segundos',
      'El sistema debe mostrar un mensaje de error cuando el código 2FA es incorrecto',
    ],
    priority: 'HIGH',
    storyPoints: 8,
  };

  describe('validateDoR', () => {
    it('debe retornar isReady=true para una HDU que cumple todos los criterios', () => {
      const result = validateDoR(validUserStory);

      expect(result.isReady).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.checklist.length).toBe(7);
    });

    it('debe retornar el detalle del checklist con todos los criterios', () => {
      const result = validateDoR(validUserStory);

      const checkIds = result.checklist.map((c) => c.id);
      expect(checkIds).toContain('title');
      expect(checkIds).toContain('description');
      expect(checkIds).toContain('acceptanceCriteria');
      expect(checkIds).toContain('priority');
      expect(checkIds).toContain('storyPoints');
      expect(checkIds).toContain('noAmbiguity');
      expect(checkIds).toContain('testableCriteria');
    });

    it('debe calcular el score correctamente basado en los items pasados', () => {
      const result = validateDoR(validUserStory);

      const passedWeight = result.checklist
        .filter((item) => item.passed)
        .reduce((sum, item) => sum + item.weight, 0);
      const totalWeight = result.checklist.reduce((sum, item) => sum + item.weight, 0);
      const expectedScore = Math.round((passedWeight / totalWeight) * 100);

      expect(result.score).toBe(expectedScore);
    });
  });

  describe('Validación de título', () => {
    it('debe fallar con título muy corto (menos de 10 caracteres)', () => {
      const story = { ...validUserStory, title: 'Login' };
      const result = validateDoR(story);

      const titleCheck = result.checklist.find((c) => c.id === 'title');
      expect(titleCheck?.passed).toBe(false);
      expect(result.recommendations.some((r) => r.includes('corto'))).toBe(true);
    });

    it('debe fallar con título muy largo (más de 100 caracteres)', () => {
      const longTitle = 'Este es un título extremadamente largo que excede el máximo de caracteres permitido para un título de historia de usuario en el sistema';
      const story = { ...validUserStory, title: longTitle };
      const result = validateDoR(story);

      const titleCheck = result.checklist.find((c) => c.id === 'title');
      expect(titleCheck?.passed).toBe(false);
    });

    it('debe fallar con título no descriptivo', () => {
      const story = { ...validUserStory, title: 'feature task' };
      const result = validateDoR(story);

      const titleCheck = result.checklist.find((c) => c.id === 'title');
      expect(titleCheck?.passed).toBe(false);
    });
  });

  describe('Validación de descripción', () => {
    it('debe fallar sin formato estándar "Como..., quiero..., para..."', () => {
      const story = { ...validUserStory, description: 'El sistema necesita login con 2FA' };
      const result = validateDoR(story);

      const descCheck = result.checklist.find((c) => c.id === 'description');
      expect(descCheck?.passed).toBe(false);
      expect(result.recommendations.some((r) => r.includes('formato'))).toBe(true);
    });

    it('debe aceptar formato Markdown multilinea exactamente como GitHub (HDU-27)', () => {
      const story = {
        ...validUserStory,
        description: [
          '## 📋 Mostrar en el reporte DoR, que punto de la HDU a mejorar',
          '',
          '**ID:** HDU-012',
          '**Prioridad:** [Alta]',
          '**Agente Asignado:** [FDA/SDET/QAE/DOA/TLA/POA]',
          '',
          '## Descripción',
          '**Como** [usuario del SaaS]',
          '**Quiero** [que en el informe del analisis del DoR muestre que puntos de la HDU esta relacionado con la mejora propuesta]',
          '**Para** [mejorar la lectura del informe y el hands-on]',
        ].join('\n'),
      };
      const result = validateDoR(story);

      const descCheck = result.checklist.find((c) => c.id === 'description');
      expect(descCheck?.passed).toBe(true);
    });

    it('debe aceptar formato en inglés "As..., I want..., so that..."', () => {
      const story = {
        ...validUserStory,
        description: 'As a registered user, I want to login with 2FA so that my account is protected',
      };
      const result = validateDoR(story);

      const descCheck = result.checklist.find((c) => c.id === 'description');
      expect(descCheck?.passed).toBe(true);
    });

    it('debe fallar con descripción muy corta', () => {
      const story = {
        ...validUserStory,
        description: 'Como usuario, quiero login para acceder',
      };
      const result = validateDoR(story);

      const descCheck = result.checklist.find((c) => c.id === 'description');
      expect(descCheck?.passed).toBe(false);
    });
  });

  describe('Validación de criterios de aceptación', () => {
    it('debe fallar sin criterios de aceptación', () => {
      const story = { ...validUserStory, acceptanceCriteria: [] };
      const result = validateDoR(story);

      const criteriaCheck = result.checklist.find((c) => c.id === 'acceptanceCriteria');
      expect(criteriaCheck?.passed).toBe(false);
    });

    it('debe aprobar con un solo criterio válido (mínimo 1)', () => {
      const story = { ...validUserStory, acceptanceCriteria: ['El informe del DoR muestra los puntos de la HDU relacionados al comentario'] };
      const result = validateDoR(story);

      const criteriaCheck = result.checklist.find((c) => c.id === 'acceptanceCriteria');
      expect(criteriaCheck?.passed).toBe(true);
    });

    it('debe fallar con criterios muy cortos (menos de 10 caracteres)', () => {
      const story = { ...validUserStory, acceptanceCriteria: ['Funcione', 'Sin errores aquí'] };
      const result = validateDoR(story);

      const criteriaCheck = result.checklist.find((c) => c.id === 'acceptanceCriteria');
      expect(criteriaCheck?.passed).toBe(false);
    });
  });

  describe('Validación de prioridad', () => {
    it('debe fallar con prioridad inválida', () => {
      const story = { ...validUserStory, priority: 'URGENT' };
      const result = validateDoR(story);

      const priorityCheck = result.checklist.find((c) => c.id === 'priority');
      expect(priorityCheck?.passed).toBe(false);
    });

    it('debe aceptar prioridad MEDIUM', () => {
      const story = { ...validUserStory, priority: 'MEDIUM' };
      const result = validateDoR(story);

      const priorityCheck = result.checklist.find((c) => c.id === 'priority');
      expect(priorityCheck?.passed).toBe(true);
    });
  });

  describe('Validación de story points', () => {
    it('debe fallar con story points no Fibonacci', () => {
      const story = { ...validUserStory, storyPoints: 4 };
      const result = validateDoR(story);

      const spCheck = result.checklist.find((c) => c.id === 'storyPoints');
      expect(spCheck?.passed).toBe(false);
    });

    it('debe aceptar story points válidos (1,2,3,5,8,13,21)', () => {
      const validPoints = [1, 2, 3, 5, 8, 13, 21];

      for (const points of validPoints) {
        const story = { ...validUserStory, storyPoints: points };
        const result = validateDoR(story);

        const spCheck = result.checklist.find((c) => c.id === 'storyPoints');
        expect(spCheck?.passed).toBe(true);
      }
    });
  });

  describe('Validación de ambigüedad', () => {
    it('debe fallar con términos ambiguos como "etc" y "quizás"', () => {
      const story = {
        ...validUserStory,
        description: 'Como usuario, quiero poder hacer login, register, etc. para quizás acceder al sistema',
      };
      const result = validateDoR(story);

      const ambiguityCheck = result.checklist.find((c) => c.id === 'noAmbiguity');
      expect(ambiguityCheck?.passed).toBe(false);
    });

    it('debe pasar con descripción sin términos ambiguos', () => {
      const result = validateDoR(validUserStory);

      const ambiguityCheck = result.checklist.find((c) => c.id === 'noAmbiguity');
      expect(ambiguityCheck?.passed).toBe(true);
    });

    it('NO debe marcar "mejor" dentro de "mejorar" (regresión HDU-27)', () => {
      const story = {
        ...validUserStory,
        description: 'Como usuario, quiero ver el informe de análisis para mejorar la lectura y el hands-on',
      };
      const result = validateDoR(story);

      const ambiguityCheck = result.checklist.find((c) => c.id === 'noAmbiguity');
      expect(ambiguityCheck?.passed).toBe(true);
    });

    it('NO debe marcar "fácil" dentro de "difícil"', () => {
      const story = {
        ...validUserStory,
        description: 'Como usuario, quiero verificar que el proceso no sea difícil para completar la tarea',
      };
      const result = validateDoR(story);

      const ambiguityCheck = result.checklist.find((c) => c.id === 'noAmbiguity');
      expect(ambiguityCheck?.passed).toBe(true);
    });
  });

  describe('Validación de criterios testeables', () => {
    it('debe fallar si ningún criterio tiene verbos verificables', () => {
      const story = {
        ...validUserStory,
        acceptanceCriteria: [
          'El login debe verse bien',
          'La interfaz debe ser agradable',
        ],
      };
      const result = validateDoR(story);

      const testableCheck = result.checklist.find((c) => c.id === 'testableCriteria');
      expect(testableCheck?.passed).toBe(false);
    });

    it('debe pasar con criterios que contienen verbos verificables', () => {
      const result = validateDoR(validUserStory);

      const testableCheck = result.checklist.find((c) => c.id === 'testableCriteria');
      expect(testableCheck?.passed).toBe(true);
    });

    it('debe aceptar el criterio real de HDU-27 que usa el verbo "muestra"', () => {
      const story = {
        ...validUserStory,
        acceptanceCriteria: ['El informe del DoR muestra los puntos de la HDU relacionados al comentario'],
      };
      const result = validateDoR(story);

      const testableCheck = result.checklist.find((c) => c.id === 'testableCriteria');
      expect(testableCheck?.passed).toBe(true);
    });
  });

  describe('Score y readiness', () => {
    it('debe marcar como no ready si score < 70%', () => {
      const badStory: UserStoryInput = {
        title: 'X',
        description: 'Sin formato',
        acceptanceCriteria: [],
        priority: '',
      };
      const result = validateDoR(badStory);

      expect(result.score).toBeLessThan(70);
      expect(result.isReady).toBe(false);
    });

    it('debe incluir resumen descriptivo en el resultado', () => {
      const result = validateDoR(validUserStory);

      expect(result.summary).toContain('DoR');
      expect(result.summary).toContain('%');
    });
  });
});