/**
 * DoR (Definition of Ready) Validator Service
 * 
 * Este servicio valida que una Historia de Usuario (HDU) cumpla con los criterios
 * de Definition of Ready antes de proceder con la generación de pruebas.
 * 
 * Los criterios DoR incluyen:
 * - Título claro y descriptivo
 * - Descripción completa con formato "Como [rol], quiero [acción], para [beneficio]"
 * - Criterios de aceptación definidos
 * - Prioridad asignada
 * - Estimación de story points
 * - Dependencias identificadas
 * - No ambigüedad en los requisitos
 */

export interface DorCheckItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  weight: number; // Peso del criterio (0-100)
  suggestion?: string;
}

export interface DorValidationResult {
  score: number; // 0-100
  isReady: boolean;
  checklist: DorCheckItem[];
  summary: string;
  recommendations: string[];
}

export interface UserStoryInput {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  storyPoints?: number;
}

/**
 * Valida una Historia de Usuario contra los criterios DoR
 * 
 * @param userStory - Datos de la historia de usuario a validar
 * @returns Resultado de la validación DoR con score y recomendaciones
 */
export function validateDoR(userStory: UserStoryInput): DorValidationResult {
  const checklist: DorCheckItem[] = [];
  const recommendations: string[] = [];

  // 1. Validar título claro y descriptivo
  const titleCheck = validateTitle(userStory.title);
  checklist.push(titleCheck);
  if (!titleCheck.passed && titleCheck.suggestion) {
    recommendations.push(titleCheck.suggestion);
  }

  // 2. Validar descripción con formato estándar
  const descriptionCheck = validateDescription(userStory.description);
  checklist.push(descriptionCheck);
  if (!descriptionCheck.passed && descriptionCheck.suggestion) {
    recommendations.push(descriptionCheck.suggestion);
  }

  // 3. Validar criterios de aceptación
  const acceptanceCheck = validateAcceptanceCriteria(userStory.acceptanceCriteria);
  checklist.push(acceptanceCheck);
  if (!acceptanceCheck.passed && acceptanceCheck.suggestion) {
    recommendations.push(acceptanceCheck.suggestion);
  }

  // 4. Validar prioridad asignada
  const priorityCheck = validatePriority(userStory.priority);
  checklist.push(priorityCheck);
  if (!priorityCheck.passed && priorityCheck.suggestion) {
    recommendations.push(priorityCheck.suggestion);
  }

  // 5. Validar story points
  const storyPointsCheck = validateStoryPoints(userStory.storyPoints);
  checklist.push(storyPointsCheck);
  if (!storyPointsCheck.passed && storyPointsCheck.suggestion) {
    recommendations.push(storyPointsCheck.suggestion);
  }

  // 6. Validar no ambigüedad
  const ambiguityCheck = validateNoAmbiguity(userStory.description);
  checklist.push(ambiguityCheck);
  if (!ambiguityCheck.passed && ambiguityCheck.suggestion) {
    recommendations.push(ambiguityCheck.suggestion);
  }

  // 7. Validar que los criterios de aceptación son testeables
  const testableCheck = validateTestableCriteria(userStory.acceptanceCriteria);
  checklist.push(testableCheck);
  if (!testableCheck.passed && testableCheck.suggestion) {
    recommendations.push(testableCheck.suggestion);
  }

  // Calcular score total
  const totalWeight = checklist.reduce((sum, item) => sum + item.weight, 0);
  const passedWeight = checklist
    .filter(item => item.passed)
    .reduce((sum, item) => sum + item.weight, 0);
  
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  // Determinar si está listo (score >= 70% y los criterios críticos pasaron)
  const criticalItems = ['title', 'description', 'acceptanceCriteria'];
  const criticalPassed = checklist
    .filter(item => criticalItems.includes(item.id))
    .every(item => item.passed);
  
  const isReady = score >= 70 && criticalPassed;

  // Generar resumen
  const passedCount = checklist.filter(item => item.passed).length;
  const summary = isReady
    ? `La HDU cumple con los criterios DoR (${passedCount}/${checklist.length} criterios pasados, score: ${score}%)`
    : `La HDU no cumple con los criterios DoR (${passedCount}/${checklist.length} criterios pasados, score: ${score}%). Se requiere score >= 70%`;

  return {
    score,
    isReady,
    checklist,
    summary,
    recommendations,
  };
}

/**
 * Valida que el título sea claro y descriptivo
 */
function validateTitle(title: string): DorCheckItem {
  const minLength = 10;
  const maxLength = 100;
  const hasMinLength = title.length >= minLength;
  const hasValidLength = title.length <= maxLength;
  const isDescriptive = !/^(feature|bug|task|story)\s*$/i.test(title.trim());

  const passed = hasMinLength && hasValidLength && isDescriptive;

  return {
    id: 'title',
    name: 'Título claro y descriptivo',
    description: 'El título debe tener entre 10 y 100 caracteres y ser descriptivo',
    passed,
    weight: 15,
    suggestion: passed ? undefined : 
      !hasMinLength ? 'El título es muy corto. Debe tener al menos 10 caracteres.' :
      !hasValidLength ? 'El título es muy largo. Debe tener máximo 100 caracteres.' :
      'El título no es descriptivo. Usa un nombre más específico.',
  };
}

/**
 * Valida que la descripción siga el formato estándar de historia de usuario
 */
function validateDescription(description: string): DorCheckItem {
  const formatRegex = /como\s+.+,\s*quiero\s+.+,\s*para\s+.+/i;
  const altFormatRegex = /as\s+.+,\s*I\s+want\s+.+,\s*so\s+that\s+.+/i;
  const hasFormat = formatRegex.test(description) || altFormatRegex.test(description);
  const minLength = description.length >= 30;

  const passed = hasFormat && minLength;

  return {
    id: 'description',
    name: 'Descripción con formato estándar',
    description: 'La descripción debe seguir el formato: "Como [rol], quiero [acción], para [beneficio]"',
    passed,
    weight: 25,
    suggestion : passed ? undefined :
      !hasFormat ? 'Usa el formato estándar: "Como [rol], quiero [acción], para [beneficio]"' :
      'La descripción es muy corta. Agrega más detalles sobre la funcionalidad.',
  };
}

/**
 * Valida que existan criterios de aceptación definidos
 */
function validateAcceptanceCriteria(criteria: string[]): DorCheckItem {
  const hasCriteria = criteria.length > 0;
  const minCriteria = criteria.length >= 2;
  const allValid = criteria.every(c => c.length >= 10);

  const passed = hasCriteria && minCriteria && allValid;

  return {
    id: 'acceptanceCriteria',
    name: 'Criterios de aceptación definidos',
    description: 'Debe haber al menos 2 criterios de aceptación, cada uno con al menos 10 caracteres',
    passed,
    weight: 25,
    suggestion: passed ? undefined :
      !hasCriteria ? 'Agrega criterios de aceptación para definir cuándo la historia está completa.' :
      !minCriteria ? 'Agrega al menos 2 criterios de aceptación para una mejor cobertura.' :
      'Algunos criterios son muy cortos. Cada criterio debe tener al menos 10 caracteres.',
  };
}

/**
 * Valida que la prioridad esté asignada correctamente
 */
function validatePriority(priority: string): DorCheckItem {
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
  const isValid = validPriorities.includes(priority?.toUpperCase());

  return {
    id: 'priority',
    name: 'Prioridad asignada',
    description: 'La historia debe tener una prioridad válida (HIGH, MEDIUM, LOW)',
    passed: isValid,
    weight: 10,
    suggestion: isValid ? undefined : 'Asigna una prioridad válida: HIGH, MEDIUM o LOW.',
  };
}

/**
 * Valida que los story points estén definidos
 */
function validateStoryPoints(storyPoints?: number): DorCheckItem {
  const validPoints = [1, 2, 3, 5, 8, 13, 21];
  const hasPoints = storyPoints !== undefined && storyPoints !== null;
  const isValid = hasPoints && validPoints.includes(storyPoints);

  return {
    id: 'storyPoints',
    name: 'Story points definidos',
    description: 'La historia debe tener una estimación en story points (Fibonacci: 1,2,3,5,8,13,21)',
    passed: isValid,
    weight: 10,
    suggestion: isValid ? undefined :
      !hasPoints ? 'Asigna story points usando la secuencia Fibonacci (1,2,3,5,8,13,21).' :
      'Usa valores Fibonacci para story points: 1,2,3,5,8,13,21.',
  };
}

/**
 * Valida que la descripción no contenga términos ambiguos
 */
function validateNoAmbiguity(description: string): DorCheckItem {
  const ambiguousTerms = [
    'etc', 'etc.', 'y otros', 'y demás', 'algo', 'cosas',
    'más o menos', 'másomenos', 'quizás', 'tal vez', 'puede ser',
    'bueno', 'rápido', 'fácil', 'simple', 'mejor', 'optimizar'
  ];
  
  const foundTerms = ambiguousTerms.filter(term => 
    description.toLowerCase().includes(term.toLowerCase())
  );

  const passed = foundTerms.length === 0;

  return {
    id: 'noAmbiguity',
    name: 'Sin ambigüedad',
    description: 'La descripción no debe contener términos ambiguos o subjetivos',
    passed,
    weight: 10,
    suggestion: passed ? undefined :
      `Evita términos ambiguos: ${foundTerms.join(', ')}. Sé específico en los requisitos.`,
  };
}

/**
 * Valida que los criterios de aceptación sean testeables
 */
function validateTestableCriteria(criteria: string[]): DorCheckItem {
  const testableKeywords = [
    'debe', 'deberá', 'deberia', 'should', 'must', 'will',
    'verificar', 'comprobar', 'validar', 'check', 'verify',
    'mostrar', 'display', 'return', 'retornar', 'enviar', 'send'
  ];

  const hasTestableCriteria = criteria.length > 0 && criteria.some(criterion =>
    testableKeywords.some(keyword => 
      criterion.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const passed = hasTestableCriteria;

  return {
    id: 'testableCriteria',
    name: 'Criterios testeables',
    description: 'Al menos un criterio de aceptación debe contener verbos de acción verificables',
    passed,
    weight: 5,
    suggestion: passed ? undefined :
      'Usa verbos de acción verificables en los criterios: debe, verificar, comprobar, mostrar, retornar, etc.',
  };
}

export default {
  validateDoR,
};
