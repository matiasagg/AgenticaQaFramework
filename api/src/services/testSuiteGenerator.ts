/**
 * Test Suite Generator Service
 * 
 * Este servicio genera suites de pruebas funcionales automáticamente
 * a partir de una Historia de Usuario (HDU) que ha pasado la validación DoR.
 * 
 * El proceso incluye:
 * 1. Análisis de los criterios de aceptación
 * 2. Generación de casos de prueba funcionales
 * 3. Generación de casos de prueba de regresión
 * 4. Generación de casos de prueba de integración
 * 5. Cálculo de cobertura estimada
 */

export interface GeneratedTestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: TestStep[];
  expectedResults: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'FUNCTIONAL' | 'REGRESSION' | 'E2E' | 'INTEGRATION' | 'EXPLORATORY';
  automationStatus: 'MANUAL' | 'AUTOMATED' | 'IN_PROGRESS';
  relatedAcceptanceCriteria: string[];
}

export interface TestStep {
  order: number;
  action: string;
  expectedResult?: string;
}

export interface CoverageAnalysis {
  acceptanceCriteriaCoverage: number; // Porcentaje de criterios cubiertos
  functionalCoverage: number; // Cobertura funcional estimada
  edgeCasesCovered: number; // Cantidad de casos borde identificados
  totalTestCases: number;
  coverageByPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface TestSuite {
  title: string;
  description: string;
  testCases: GeneratedTestCase[];
  coverage: CoverageAnalysis;
  metadata: {
    generatedAt: string;
    userStoryId: string;
    projectId: string;
    totalTestCases: number;
    estimatedExecutionTime: number; // en minutos
  };
}

export interface UserStoryForGeneration {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints?: number;
}

/**
 * Genera una suite de pruebas funcionales a partir de una HDU validada
 * 
 * @param userStory - Historia de usuario que pasó la validación DoR
 * @returns Suite de pruebas completa con casos de prueba y análisis de cobertura
 */
export function generateTestSuite(
  userStory: UserStoryForGeneration,
  projectId: string
): TestSuite {
  const testCases: GeneratedTestCase[] = [];

  // 1. Generar casos de prueba funcionales para cada criterio de aceptación
  const functionalTests = generateFunctionalTests(userStory);
  testCases.push(...functionalTests);

  // 2. Generar casos de prueba de regresión
  const regressionTests = generateRegressionTests(userStory);
  testCases.push(...regressionTests);

  // 3. Generar casos de prueba de integración
  const integrationTests = generateIntegrationTests(userStory);
  testCases.push(...integrationTests);

  // 4. Generar casos de prueba exploratorios
  const exploratoryTests = generateExploratoryTests(userStory);
  testCases.push(...exploratoryTests);

  // 5. Generar casos borde
  const edgeCaseTests = generateEdgeCaseTests(userStory);
  testCases.push(...edgeCaseTests);

  // Calcular cobertura
  const coverage = calculateCoverage(testCases, userStory);

  // Calcular tiempo estimado de ejecución
  const estimatedTime = testCases.reduce((total, tc) => {
    return total + (tc.steps.length * 2); // 2 minutos por paso estimado
  }, 0);

  return {
    title: `Suite de Pruebas: ${userStory.title}`,
    description: `Suite de pruebas generada automáticamente para la historia de usuario: "${userStory.title}". ` +
      `Incluye ${testCases.length} casos de prueba cubriendo funcionalidad, regresión, integración y casos borde.`,
    testCases,
    coverage,
    metadata: {
      generatedAt: new Date().toISOString(),
      userStoryId: userStory.id,
      projectId,
      totalTestCases: testCases.length,
      estimatedExecutionTime: estimatedTime,
    },
  };
}

/**
 * Genera casos de prueba funcionales basados en los criterios de aceptación
 */
function generateFunctionalTests(userStory: UserStoryForGeneration): GeneratedTestCase[] {
  const tests: GeneratedTestCase[] = [];

  userStory.acceptanceCriteria.forEach((criteria, index) => {
    const testId = `FUNC-${index + 1}`;
    
    // Generar pasos básicos para verificar el criterio
    const steps: TestStep[] = [
      {
        order: 1,
        action: `Preparar el entorno de prueba para: ${criteria.substring(0, 50)}...`,
        expectedResult: 'Entorno de prueba configurado correctamente',
      },
      {
        order: 2,
        action: `Ejecutar la funcionalidad descrita en: ${criteria}`,
        expectedResult: criteria,
      },
      {
        order: 3,
        action: 'Verificar el resultado contra el criterio de aceptación',
        expectedResult: 'El resultado coincide con lo esperado',
      },
    ];

    tests.push({
      id: testId,
      title: `Verificar: ${criteria.substring(0, 60)}`,
      description: `Caso de prueba funcional para verificar el criterio de aceptación: "${criteria}"`,
      preconditions: [
        'Usuario autenticado en el sistema',
        'Datos de prueba configurados',
        'El sistema está en estado inicial',
      ],
      steps,
      expectedResults: [
        criteria,
        'La funcionalidad se comporta según lo especificado',
        'No se producen errores durante la ejecución',
      ],
      priority: mapPriority(userStory.priority),
      type: 'FUNCTIONAL',
      automationStatus: 'MANUAL',
      relatedAcceptanceCriteria: [criteria],
    });
  });

  return tests;
}

/**
 * Genera casos de prueba de regresión
 */
function generateRegressionTests(userStory: UserStoryForGeneration): GeneratedTestCase[] {
  const tests: GeneratedTestCase[] = [];

  // Caso de prueba de regresión principal
  tests.push({
    id: 'REG-001',
    title: `Regresión: Funcionalidad principal de "${userStory.title}"`,
    description: `Verifica que la funcionalidad principal sigue funcionando correctamente después de cambios en el sistema`,
    preconditions: [
      'La funcionalidad principal está implementada',
      'Existen datos de prueba válidos',
      'El sistema está en producción o ambiente de staging',
    ],
    steps: [
      { order: 1, action: 'Acceder a la funcionalidad principal', expectedResult: 'La funcionalidad es accesible' },
      { order: 2, action: 'Ejecutar el flujo principal de la funcionalidad', expectedResult: 'El flujo se completa sin errores' },
      { order: 3, action: 'Verificar que los resultados son correctos', expectedResult: 'Los resultados son los esperados' },
    ],
    expectedResults: [
      'La funcionalidad principal opera correctamente',
      'No hay regresiones en el comportamiento',
      'Los datos se procesan correctamente',
    ],
    priority: 'HIGH',
    type: 'REGRESSION',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  // Caso de prueba de regresión para datos
  tests.push({
    id: 'REG-002',
    title: `Regresión: Validación de datos en "${userStory.title}"`,
    description: 'Verifica que las validaciones de datos siguen funcionando correctamente',
    preconditions: [
      'Existen validaciones de datos implementadas',
      'Hay datos de prueba válidos e inválidos disponibles',
    ],
    steps: [
      { order: 1, action: 'Ingresar datos válidos en el formulario', expectedResult: 'Los datos son aceptados' },
      { order: 2, action: 'Ingresar datos inválidos', expectedResult: 'Se muestran mensajes de error apropiados' },
      { order: 3, action: 'Verificar que los mensajes de error son correctos', expectedResult: 'Los mensajes son claros y descriptivos' },
    ],
    expectedResults: [
      'Los datos válidos son aceptados',
      'Los datos inválidos son rechazados con mensajes apropiados',
      'No se procesan datos incorrectos',
    ],
    priority: 'MEDIUM',
    type: 'REGRESSION',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  return tests;
}

/**
 * Genera casos de prueba de integración
 */
function generateIntegrationTests(userStory: UserStoryForGeneration): GeneratedTestCase[] {
  const tests: GeneratedTestCase[] = [];

  tests.push({
    id: 'INT-001',
    title: `Integración: Comunicación con servicios externos para "${userStory.title}"`,
    description: 'Verifica la correcta integración con servicios y APIs externas',
    preconditions: [
      'Los servicios externos están disponibles',
      'Las credenciales de API están configuradas',
      'Hay conectividad de red',
    ],
    steps: [
      { order: 1, action: 'Verificar conectividad con servicios externos', expectedResult: 'Conexión exitosa' },
      { order: 2, action: 'Enviar solicitud al servicio externo', expectedResult: 'Solicitud enviada correctamente' },
      { order: 3, action: 'Recibir y procesar respuesta del servicio', expectedResult: 'Respuesta procesada correctamente' },
    ],
    expectedResults: [
      'La comunicación con servicios externos es exitosa',
      'Los datos se transmiten correctamente',
      'Se manejan correctamente los errores de comunicación',
    ],
    priority: 'HIGH',
    type: 'INTEGRATION',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  tests.push({
    id: 'INT-002',
    title: `Integración: Base de datos para "${userStory.title}"`,
    description: 'Verifica la correcta interacción con la base de datos',
    preconditions: [
      'La base de datos está disponible',
      'Las tablas necesarias existen',
      'Hay datos de prueba configurados',
    ],
    steps: [
      { order: 1, action: 'Verificar conexión a la base de datos', expectedResult: 'Conexión exitosa' },
      { order: 2, action: 'Ejecutar operación de lectura', expectedResult: 'Datos leídos correctamente' },
      { order: 3, action: 'Ejecutar operación de escritura', expectedResult: 'Datos escritos correctamente' },
    ],
    expectedResults: [
      'Las operaciones de base de datos son exitosas',
      'Los datos se almacenan y recuperan correctamente',
      'Se manejan errores de base de datos apropiadamente',
    ],
    priority: 'HIGH',
    type: 'INTEGRATION',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  return tests;
}

/**
 * Genera casos de prueba exploratorios
 */
function generateExploratoryTests(userStory: UserStoryForGeneration): GeneratedTestCase[] {
  const tests: GeneratedTestCase[] = [];

  tests.push({
    id: 'EXP-001',
    title: `Exploratorio: Flujo alternativo en "${userStory.title}"`,
    description: 'Prueba exploratoria para descubrir comportamientos inesperados en flujos alternativos',
    preconditions: [
      'La funcionalidad principal está disponible',
      'Se tienen permisos de usuario estándar',
    ],
    steps: [
      { order: 1, action: 'Iniciar la funcionalidad desde un punto no estándar', expectedResult: 'El sistema responde apropiadamente' },
      { order: 2, action: 'Seguir un flujo alternativo al principal', expectedResult: 'El flujo alternativo es manejado' },
      { order: 3, action: 'Documentar cualquier comportamiento inesperado', expectedResult: 'Hallazgos documentados' },
    ],
    expectedResults: [
      'Se identifican flujos alternativos',
      'Se documentan comportamientos inesperados',
      'No hay errores críticos en flujos alternativos',
    ],
    priority: 'MEDIUM',
    type: 'EXPLORATORY',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  return tests;
}

/**
 * Genera casos de prueba de casos borde
 */
function generateEdgeCaseTests(userStory: UserStoryForGeneration): GeneratedTestCase[] {
  const tests: GeneratedTestCase[] = [];

  tests.push({
    id: 'EDGE-001',
    title: `Caso borde: Valores límite en "${userStory.title}"`,
    description: 'Verifica el comportamiento del sistema con valores límite y casos extremos',
    preconditions: [
      'La funcionalidad está implementada',
      'Se conocen los límites de los campos',
    ],
    steps: [
      { order: 1, action: 'Ingresar valores en el límite inferior', expectedResult: 'El sistema maneja el valor correctamente' },
      { order: 2, action: 'Ingresar valores en el límite superior', expectedResult: 'El sistema maneja el valor correctamente' },
      { order: 3, action: 'Ingresar valores fuera de los límites', expectedResult: 'Se muestra error apropiado' },
    ],
    expectedResults: [
      'Los valores límite son aceptados correctamente',
      'Los valores fuera de rango son rechazados',
      'Los mensajes de error son claros',
    ],
    priority: 'MEDIUM',
    type: 'FUNCTIONAL',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  tests.push({
    id: 'EDGE-002',
    title: `Caso borde: Campos vacíos en "${userStory.title}"`,
    description: 'Verifica el comportamiento cuando se dejan campos vacíos',
    preconditions: [
      'El formulario o funcionalidad tiene campos opcionales y obligatorios',
    ],
    steps: [
      { order: 1, action: 'Dejar campos obligatorios vacíos', expectedResult: 'Se muestra error de validación' },
      { order: 2, action: 'Dejar campos opcionales vacíos', expectedResult: 'El sistema procesa correctamente' },
      { order: 3, action: 'Llenar solo campos obligatorios', expectedResult: 'El formulario se procesa correctamente' },
    ],
    expectedResults: [
      'Los campos obligatorios vacíos muestran error',
      'Los campos opcionales vacíos son aceptados',
      'El sistema no permite datos incompletos',
    ],
    priority: 'HIGH',
    type: 'FUNCTIONAL',
    automationStatus: 'MANUAL',
    relatedAcceptanceCriteria: userStory.acceptanceCriteria,
  });

  return tests;
}

/**
 * Calcula la cobertura de la suite de pruebas
 */
function calculateCoverage(
  testCases: GeneratedTestCase[],
  userStory: UserStoryForGeneration
): CoverageAnalysis {
  const coveredCriteria = new Set<string>();
  
  testCases.forEach(tc => {
    tc.relatedAcceptanceCriteria.forEach(criteria => {
      coveredCriteria.add(criteria);
    });
  });

  const acceptanceCriteriaCoverage = userStory.acceptanceCriteria.length > 0
    ? Math.round((coveredCriteria.size / userStory.acceptanceCriteria.length) * 100)
    : 0;

  const highPriority = testCases.filter(tc => tc.priority === 'HIGH').length;
  const mediumPriority = testCases.filter(tc => tc.priority === 'MEDIUM').length;
  const lowPriority = testCases.filter(tc => tc.priority === 'LOW').length;

  return {
    acceptanceCriteriaCoverage,
    functionalCoverage: Math.min(95, 70 + testCases.length * 2), // Estimación basada en cantidad de tests
    edgeCasesCovered: testCases.filter(tc => tc.id.startsWith('EDGE')).length,
    totalTestCases: testCases.length,
    coverageByPriority: {
      high: highPriority,
      medium: mediumPriority,
      low: lowPriority,
    },
  };
}

/**
 * Mapea la prioridad de la HDU a prioridad de prueba
 */
function mapPriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const upper = priority?.toUpperCase();
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'LOW') return 'LOW';
  return 'MEDIUM';
}

export default {
  generateTestSuite,
};