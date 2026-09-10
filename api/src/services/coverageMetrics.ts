/**
 * Servicio de cálculo de métricas de cobertura funcional.
 * 
 * Recibe datos crudos (userStories, testCases, epics) y calcula
 * las 5 métricas de cobertura definidas en la HDU #4:
 * - Requerimientos: HDUs con al menos un caso de prueba
 * - Diseño: casos de prueba diseñados respecto de las HDUs
 * - Ejecución: casos ejecutados respecto de los diseñados
 * - Resultados: pruebas exitosas respecto de las ejecutadas
 * - Automatización: pruebas automatizadas respecto del total
 * 
 * Este servicio es puro (síncrono y sin dependencias externas),
 * lo que facilita los tests unitarios sin necesidad de mockear
 * la base de datos.
 */

// ── Tipos de entrada (datos crudos desde Prisma) ──

export interface TestLinkInput {
  id: string;
  testCase?: {
    id: string;
    automationStatus?: string | null;
  } | null;
}

export interface TestSuiteInput {
  id: string;
  status: string;
  testLinks: TestLinkInput[];
}

export interface UserStoryInput {
  id: string;
  displayId?: string | null;
  title: string;
  status: string;
  priority?: string | null;
  epicId?: string | null;
  featureId?: string | null;
  epic?: { id: string; name: string } | null;
  feature?: { id: string; name: string; status?: string } | null;
  testSuite?: TestSuiteInput | null;
}

export interface TestCaseInput {
  id: string;
  automationStatus?: string | null;
}

export interface EpicInput {
  id: string;
  name: string;
  status: string;
  features?: Array<{ id: string; name: string; status?: string }>;
  userStories?: Array<{
    id: string;
    testSuite?: TestSuiteInput | null;
  }>;
}

export interface ProjectInput {
  id: string;
  name: string;
}

// ── Tipos de salida ──

export interface CoverageMetricsResult {
  projectId: string;
  projectName: string;
  summary: {
    requirementCoverage: number;
    designCoverage: number;
    executionCoverage: number;
    resultCoverage: number;
    automationCoverage: number;
  };
  counts: {
    totalHDUs: number;
    hduWithTests: number;
    hduWithoutTests: number;
    totalTestCases: number;
    automatedTests: number;
    totalSuites: number;
    executedSuites: number;
    passedSuites: number;
    nonExecutedCases: number;
    failedCases: number;
    blockedCases: number;
  };
  caseStatusBreakdown: {
    nonExecuted: number;
    failed: number;
    blocked: number;
    passed: number;
  };
  hduWithoutTests: Array<{
    id: string;
    displayId: string | null;
    title: string;
    status: string;
    epicName: string;
    featureName: string;
  }>;
  epicBreakdown: Array<{
    id: string;
    name: string;
    status: string;
    totalHDUs: number;
    hduWithTests: number;
    coverage: number;
  }>;
  featureBreakdown: Array<{
    id: string;
    name: string;
    epicName: string;
    status: string;
    totalHDUs: number;
    hduWithTests: number;
    coverage: number;
  }>;
  recommendations: string[];
  risks: string[];
  generatedAt: string;
}

/**
 * Calcula las métricas de cobertura funcional a partir de datos crudos.
 * 
 * @param project - Proyecto al que pertenecen los datos
 * @param userStories - HDUs con sus suites y casos vinculados
 * @param testCases - Todos los casos de prueba del proyecto
 * @param epics - Epicas (con features y HDUs) para desglose
 * @returns Objeto con todas las métricas calculadas
 * 
 * @example
 * const result = calculateCoverageMetrics(project, userStories, testCases, epics);
 * result.summary.requirementCoverage; // 67
 */
export function calculateCoverageMetrics(
  project: ProjectInput,
  userStories: UserStoryInput[],
  testCases: TestCaseInput[],
  epics: EpicInput[]
): CoverageMetricsResult {
  // ── Cobertura de requerimientos: HDUs con al menos un caso de prueba ──
  const totalHDUs = userStories.length;
  const hduWithTests = userStories.filter(
    (hdu) => hdu.testSuite && hdu.testSuite.testLinks.length > 0
  ).length;
  const requirementCoverage = totalHDUs > 0 ? Math.round((hduWithTests / totalHDUs) * 100) : 0;

  // ── Cobertura de diseño: casos de prueba diseñados respecto de las HDUs ──
  // Se considera que una HDU tiene diseño de pruebas si tiene una suite con casos
  const hduWithDesign = hduWithTests;
  const designCoverage = totalHDUs > 0 ? Math.round((hduWithDesign / totalHDUs) * 100) : 0;

  // ── Cobertura de ejecución: casos ejecutados respecto de los diseñados ──
  // Se considera "ejecutado" si la suite tiene estado READY o APPROVED
  const totalTestCasesDesigned = testCases.length;
  const suitesWithTests = userStories
    .filter((hdu) => hdu.testSuite)
    .map((hdu) => hdu.testSuite!);
  const executedSuites = suitesWithTests.filter(
    (suite) => suite.status === 'READY' || suite.status === 'APPROVED'
  ).length;
  const executionCoverage = suitesWithTests.length > 0
    ? Math.round((executedSuites / suitesWithTests.length) * 100)
    : 0;

  // ── Cobertura de resultados: pruebas exitosas respecto de las ejecutadas ──
  // Se considera "exitoso" si la suite tiene estado APPROVED
  const passedSuites = suitesWithTests.filter(
    (suite) => suite.status === 'APPROVED'
  ).length;
  const resultCoverage = executedSuites > 0
    ? Math.round((passedSuites / executedSuites) * 100)
    : 0;

  // ── Cobertura de automatización: pruebas automatizadas respecto del total ──
  const automatedTests = testCases.filter(
    (tc) => tc.automationStatus === 'AUTOMATED'
  ).length;
  const automationCoverage = totalTestCasesDesigned > 0
    ? Math.round((automatedTests / totalTestCasesDesigned) * 100)
    : 0;

  // ── HDUs sin casos de prueba ──
  const hduWithoutTests = userStories
    .filter((hdu) => !hdu.testSuite || hdu.testSuite.testLinks.length === 0)
    .map((hdu) => ({
      id: hdu.id,
      displayId: hdu.displayId,
      title: hdu.title,
      status: hdu.status,
      epicName: hdu.epic?.name || 'Sin épica',
      featureName: hdu.feature?.name || 'Sin feature',
    }));

  // ── Identificar casos no ejecutados, fallidos y bloqueados ──
  // Se clasifican los casos según el estado de su suite y de la HDU:
  // - No ejecutados: casos en suites con estado DRAFT o GENERATING
  // - Fallidos: casos en suites con estado READY (ejecutadas pero no aprobadas)
  // - Bloqueados: casos vinculados a HDUs con estado BLOCKED/CANCELLED
  const nonExecutedCases: string[] = [];
  const failedCases: string[] = [];
  const blockedCases: string[] = [];

  for (const hdu of userStories) {
    const suite = hdu.testSuite;
    if (!suite || suite.testLinks.length === 0) continue;

    // Determinar si la HDU está bloqueada
    const isHduBlocked = hdu.status === 'BLOCKED' || hdu.status === 'CANCELLED';

    for (const link of suite.testLinks) {
      const testCase = link.testCase;
      if (!testCase) continue;

      if (isHduBlocked) {
        // Caso bloqueado porque su HDU está bloqueada o cancelada
        blockedCases.push(testCase.id);
      } else if (suite.status === 'DRAFT' || suite.status === 'GENERATING') {
        // Suite aún no ejecutada
        nonExecutedCases.push(testCase.id);
      } else if (suite.status === 'READY') {
        // Suite ejecutada pero no aprobada → puede contener fallos
        failedCases.push(testCase.id);
      }
    }
  }

  // ── Desglose por épica ──
  const epicBreakdown = epics.map((epic) => {
    const epicHduCount = epic.userStories?.length ?? 0;
    const epicHduWithTests = (epic.userStories ?? []).filter(
      (hdu) => hdu.testSuite && hdu.testSuite.testLinks.length > 0
    ).length;
    return {
      id: epic.id,
      name: epic.name,
      status: epic.status,
      totalHDUs: epicHduCount,
      hduWithTests: epicHduWithTests,
      coverage: epicHduCount > 0 ? Math.round((epicHduWithTests / epicHduCount) * 100) : 0,
    };
  });

  // ── Desglose por feature ──
  // Se construye a partir de las userStories (que ya incluyen feature y epic)
  // para no depender del scope de `epics.map()` y evitar errores de tipos.
  const featureMap = new Map<string, {
    id: string;
    name: string;
    epicName: string;
    status: string;
    totalHDUs: number;
    hduWithTests: number;
  }>();

  for (const hdu of userStories) {
    if (!hdu.featureId) continue;
    const featureId = hdu.featureId;
    const hasTests = hdu.testSuite && hdu.testSuite.testLinks.length > 0;

    if (!featureMap.has(featureId)) {
      featureMap.set(featureId, {
        id: featureId,
        name: hdu.feature?.name || 'Sin nombre',
        epicName: hdu.epic?.name || 'Sin épica',
        status: hdu.feature?.status || 'N/A',
        totalHDUs: 0,
        hduWithTests: 0,
      });
    }

    const entry = featureMap.get(featureId)!;
    entry.totalHDUs++;
    if (hasTests) entry.hduWithTests++;
  }

  const featureBreakdown = Array.from(featureMap.values()).map((feature) => ({
    ...feature,
    coverage: feature.totalHDUs > 0
      ? Math.round((feature.hduWithTests / feature.totalHDUs) * 100)
      : 0,
  }));

  // ── Recomendaciones generadas por IA (basadas en reglas) ──
  const recommendations: string[] = [];
  if (requirementCoverage < 50) {
    recommendations.push('La cobertura de requerimientos es baja. Priorice generar casos de prueba para las HDUs sin cobertura.');
  }
  if (automationCoverage < 30) {
    recommendations.push('Considere automatizar más casos de prueba para mejorar la eficiencia de ejecución.');
  }
  if (hduWithoutTests.length > 0) {
    recommendations.push(`Identificadas ${hduWithoutTests.length} HDUs sin casos de prueba. Asigne un SDET para cubrirlas.`);
  }
  if (executionCoverage < 70) {
    recommendations.push('La cobertura de ejecución es baja. Ejecute las suites pendientes para obtener resultados actualizados.');
  }
  if (resultCoverage < 80 && executedSuites > 0) {
    recommendations.push('Hay suites ejecutadas sin aprobar. Revise los resultados y corrija los casos fallidos.');
  }
  if (recommendations.length === 0) {
    recommendations.push('¡Buen trabajo! Las métricas de cobertura son saludables. Mantenga la consistencia en la ejecución de pruebas.');
  }

  // ── Identificar riesgos ──
  const risks: string[] = [];
  const highPriorityWithoutTests = userStories.filter(
    (hdu) => hdu.priority === 'HIGH' && (!hdu.testSuite || hdu.testSuite.testLinks.length === 0)
  );
  if (highPriorityWithoutTests.length > 0) {
    risks.push(`${highPriorityWithoutTests.length} HDU(s) de alta prioridad sin casos de prueba.`);
  }
  if (requirementCoverage < 30) {
    risks.push('Cobertura de requerimientos crítica (< 30%). Riesgo alto de defectos en producción.');
  }

  return {
    projectId: project.id,
    projectName: project.name,
    summary: {
      requirementCoverage,
      designCoverage,
      executionCoverage,
      resultCoverage,
      automationCoverage,
    },
    counts: {
      totalHDUs,
      hduWithTests,
      hduWithoutTests: hduWithoutTests.length,
      totalTestCases: totalTestCasesDesigned,
      automatedTests,
      totalSuites: suitesWithTests.length,
      executedSuites,
      passedSuites,
      nonExecutedCases: nonExecutedCases.length,
      failedCases: failedCases.length,
      blockedCases: blockedCases.length,
    },
    caseStatusBreakdown: {
      nonExecuted: nonExecutedCases.length,
      failed: failedCases.length,
      blocked: blockedCases.length,
      passed: passedSuites,
    },
    hduWithoutTests,
    epicBreakdown,
    featureBreakdown,
    recommendations,
    risks,
    generatedAt: new Date().toISOString(),
  };
}