/**
 * GitHub Integration Service
 *
 * Servicio para sincronizar issues de GitHub con el SaaS.
 * Importa issues como Historias de Usuario (HDUs) y puede
 * sincronizar ramas y PRs asociados.
 *
 * Usa el token global GITHUB_TOKEN (config.github.token).
 */
import { config } from '../config';

const GITHUB_API = 'https://api.github.com';

/** Issue de GitHub (formato API v3) */
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  labels: Array<{ name: string }>;
  assignee?: { login: string } | null;
  assignees?: Array<{ login: string }>;
  html_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene el owner/repo desde la URL de un repositorio.
 * Ej: https://github.com/matiasagg/AgenticaQaFramework → matiasagg/AgenticaQaFramework
 */
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Obtiene los issues de un repositorio de GitHub.
 *
 * @param repoUrl - URL del repositorio (https://github.com/owner/repo)
 * @param state - Estado de los issues a traer (open, closed, all)
 * @returns Lista de issues
 */
function getGitHubToken(tokenOverride?: string | null): string {
  const overrideToken = (tokenOverride ?? '').trim();
  const fallbackToken = (process.env.GITHUB_TOKEN ?? config.github.token ?? '').trim();

  const isValidToken = (value: string): boolean => {
    if (!value) return false;
    if (/^your[-_ ]?github/i.test(value) || /placeholder|example|sample/i.test(value)) return false;
    if (/\s/.test(value)) return false;
    return /^[\x21-\x7E]+$/.test(value);
  };

  if (isValidToken(overrideToken)) {
    return overrideToken;
  }

  if (overrideToken && !isValidToken(overrideToken)) {
    console.warn('GitHub token del proyecto inválido o corrupto. Se intentará usar GITHUB_TOKEN global.');
  }

  if (isValidToken(fallbackToken)) {
    return fallbackToken;
  }

  throw new Error('GITHUB_TOKEN no configurado o inválido. Configura un token real en el proyecto (PAT) o en api/.env');
}

async function fetchGitHubJson(url: string, token: string) {
  const requestOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'QA-SaaS-Platform',
    },
  };

  let lastError: any = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
      }

      return response.json();
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || '');
      // Los errores HTTP de la API de GitHub (404, 401, etc.) NO son de red:
      // se re-lanzan tal cual para no ocultar el código de estado real.
      if (message.includes('GitHub API error')) throw error;
      const lowerMessage = message.toLowerCase();
      const isTransientNetworkError =
        lowerMessage.includes('fetch failed') ||
        lowerMessage.includes('econnreset') ||
        lowerMessage.includes('etimedout') ||
        lowerMessage.includes('enotfound') ||
        lowerMessage.includes('socket');

      if (!isTransientNetworkError || attempt === 2) {
        const cause = error?.cause?.message || error?.cause?.code || 'sin detalle adicional';
        throw new Error(`No se pudo conectar con GitHub (${cause}). Verifica red/proxy/firewall y el token.`);
      }
    }
  }

  const cause = lastError?.cause?.message || lastError?.message || 'error de red desconocido';
  throw new Error(`No se pudo conectar con GitHub (${cause}).`);
}

export async function fetchIssues(
  repoUrl: string,
  state: 'open' | 'closed' | 'all' = 'open',
  tokenOverride?: string | null
): Promise<GitHubIssue[]> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error(`URL de repositorio inválida: ${repoUrl}`);

  const token = getGitHubToken(tokenOverride);

  const url = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/issues?state=${state}&per_page=100`;

  // Filtrar PRs (la API de issues incluye los PRs también)
  const issues = (await fetchGitHubJson(url, token)) as GitHubIssue[];
  return issues.filter((issue) => !issue.html_url.includes('/pull/'));
}

/**
 * Importa issues de GitHub como Historias de Usuario.
 * Función pura de mapeo: convierte un issue de GitHub a datos de HDU.
 *
 * @param issue - Issue de GitHub
 * @returns Datos listos para crear una UserStory
 */
export function buildIssueDescription(description: string | null | undefined, githubUrl: string): string {
  const normalizedDescription = (description ?? '').trim();
  const issueReference = `\n\n---\n🔗 Issue original: ${githubUrl}`;

  if (!normalizedDescription) {
    return `Issue original: ${githubUrl}`;
  }

  const alreadyHasReference = normalizedDescription.toLowerCase().includes(githubUrl.toLowerCase())
    || normalizedDescription.toLowerCase().includes('issue original:');

  if (alreadyHasReference) {
    const cleanedDescription = normalizedDescription
      .replace(/\n\s*---\s*\n\s*🔗\s*Issue(?:\s+original)?:\s*https?:\/\/[^\s]+\s*$/i, '')
      .trim();
    return `${cleanedDescription || normalizedDescription}${issueReference}`;
  }

  return `${normalizedDescription}${issueReference}`;
}

export function mapIssueToUserStory(issue: GitHubIssue): {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  definitionOfDone: string[];
  technicalNotes: string[];
  evidences: string[];
  dependencies: string[];
  storyPoints: number | null;
  priority: string;
  githubIssueNumber: number;
  githubUrl: string;
  assignee: string | null;
  labels: string[];
  branchName: string | null;
} {
  // Extraer criterios de aceptación del cuerpo del issue (secciones comunes)
  const body = issue.body || '';
  const acceptanceCriteria = extractAcceptanceCriteria(body);
  // Extraer criterios de Definition of Done de su sección específica
  const definitionOfDone = extractDefinitionOfDone(body);
  // Secciones enriquecidas con campo propio en la HDU
  const technicalNotes = extractBulletSection(body, /notas?\s+t[eé]cnicas?|technical\s+notes/i);
  const evidences = extractBulletSection(body, /evidencias?|evidences?/i);
  const dependencies = extractBulletSection(body, /dependencias?|dependencies?/i);
  // Extraer story points si el issue los declara (ej: "**Story Points:** 5")
  const storyPoints = extractStoryPoints(body);
  const branchName = body.match(/\*\*Rama:\*\*\s*`?([^`\n]+)`?/i)?.[1]?.trim() || null;

  // Mapear labels de prioridad
  const priority = mapPriority(issue.labels.map((l) => l.name));

  return {
    title: issue.title,
    // La descripción se limpia: las secciones que tienen campo propio
    // (criterios de aceptación, DoD, metadatos/prioridad/story points)
    // no deben duplicarse dentro de la descripción.
    description: cleanIssueDescription(body) || issue.title,
    acceptanceCriteria,
    definitionOfDone,
    technicalNotes,
    evidences,
    dependencies,
    storyPoints,
    priority,
    githubIssueNumber: issue.number,
    githubUrl: issue.html_url,
    assignee: issue.assignee?.login || issue.assignees?.[0]?.login || null,
    labels: issue.labels.map((label) => label.name),
    branchName,
  };
}

/** Construye el título que se publica en GitHub para una HDU del SaaS. */
export function buildGitHubHduTitle(displayId: string | null | undefined, title: string): string {
  const cleanTitle = title
    .replace(/^\s*HDU\s*[-_:]\s*\d+\s*[-–—:]\s*/i, '')
    .replace(/^\s*\[\s*HDU(?:\s*[-_:]\s*\d+)?\s*\]\s*/i, '')
    .trim();

  return displayId ? `${displayId} - ${cleanTitle}` : cleanTitle;
}

/**
 * Extrae los criterios de Definition of Done del cuerpo de un issue.
 * Busca secciones "Definition of Done", "DoD", "Definición de Terminado", etc.
 */
export function extractDefinitionOfDone(body: string): string[] {
  if (!body) return [];

  // El encabezado debe estar en su propia línea (evita falsos positivos
  // como la palabra "DoD" dentro de un párrafo anterior).
  const headerRegex = /^[ \t]*#{1,4}[ \t]*((?:definition\s+of\s+done)|(?:definici[oó]n\s+de\s+terminado)|(?:definici[oó]n\s+de\s+hecho)|dod)[ \t]*:?[ \t]*$/im;
  const headerMatch = body.match(headerRegex);
  if (!headerMatch) return [];

  // Tomar las líneas posteriores al encabezado, hasta el próximo encabezado.
  const afterHeader = body.slice(headerMatch.index! + headerMatch[0].length);
  const nextHeader = afterHeader.search(/^[ \t]*#{1,4}\s+/m);
  const sectionContent = (nextHeader === -1 ? afterHeader : afterHeader.slice(0, nextHeader)).trim();
  if (!sectionContent) return [];

  return sectionContent
    .split('\n')
    .map((line) => line.replace(/^[\s*+-]+\[?[ x]?\]?\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 15);
}

/**
 * Extrae los bullets de una sección genérica identificada por su encabezado.
 * Se usa para las secciones enriquecidas (Notas Técnicas, Evidencias, Dependencias).
 *
 * @param body - Cuerpo Markdown del issue
 * @param headerPattern - Regex del texto del encabezado (sin el "#")
 * @returns Lista de bullets de la sección (sin prefijo "- [x]")
 */
export function extractBulletSection(body: string, headerPattern: RegExp): string[] {
  if (!body) return [];

  const headerRegex = new RegExp(`^[ \\t]*#{1,4}[ \\t]*(?:${headerPattern.source})[ \\t]*:?[ \\t]*$`, 'im');
  const headerMatch = body.match(headerRegex);
  if (!headerMatch) return [];

  const afterHeader = body.slice(headerMatch.index! + headerMatch[0].length);
  const nextHeader = afterHeader.search(/^[ \t]*#{1,4}\s+/m);
  const sectionContent = (nextHeader === -1 ? afterHeader : afterHeader.slice(0, nextHeader)).trim();
  if (!sectionContent) return [];

  return sectionContent
    .split('\n')
    .map((line) => line.replace(/^[\s*+-]+\[?[ x]?\]?\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 15);
}

/**
 * Extrae los story points declarados en el cuerpo del issue.
 * Formatos soportados: "**Story Points:** 5", "Story points: 5", "SP: 5".
 */
export function extractStoryPoints(body: string): number | null {
  if (!body) return null;
  // Toleramos asteriscos de negrita Markdown: "- **Story Points:** 5"
  const match = body.match(/(?:story\s*points?|\bsp\b)\s*\**\s*[:=]\s*\**\s*(\d{1,2})/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return isNaN(value) ? null : value;
}

/**
 * Limpia la descripción de un issue removiendo las secciones que tienen
 * campo propio en la HDU (criterios de aceptación, DoD, metadatos con
 * prioridad/story points). Así esos datos no aparecen duplicados dentro
 * de la descripción.
 */
export function cleanIssueDescription(body: string): string {
  if (!body) return '';

  // Remover secciones completas por encabezado (## o **) hasta el
  // siguiente encabezado o el fin del documento.
  const sectionHeaders = [
    /^[ \t]*#{1,4}\s*(?:criterios?\s+de\s+aceptaci[oó]n|acceptance\s+criteria)[^\n]*\n?/im,
    /^[ \t]*#{1,4}\s*(?:definition\s+of\s+done|definici[oó]n\s+de\s+terminado|definici[oó]n\s+de\s+hecho|dod)[^\n]*\n?/im,
    /^[ \t]*#{1,4}\s*(?:notas?\s+t[eé]cnicas?|technical\s+notes)[^\n]*\n?/im,
    /^[ \t]*#{1,4}\s*(?:evidencias?|evidences?)[^\n]*\n?/im,
    /^[ \t]*#{1,4}\s*(?:dependencias?|dependencies?)[^\n]*\n?/im,
    /^[ \t]*#{1,4}\s*metadatos[^\n]*\n?/im,
  ];

  let cleaned = body;
  for (const headerRegex of sectionHeaders) {
    const match = cleaned.match(headerRegex);
    if (!match) continue;
    const start = match.index! + match[0].length;
    // La sección llega hasta el próximo encabezado de cualquier nivel
    const rest = cleaned.slice(start);
    const nextHeader = rest.search(/^[ \t]*#{1,4}\s+/m);
    const sectionEnd = nextHeader === -1 ? cleaned.length : start + nextHeader;
    cleaned = cleaned.slice(0, match.index!) + cleaned.slice(sectionEnd);
  }

  // Remover líneas sueltas de metadatos tipo "- **Prioridad:** ..." /
  // "- **Story Points:** ..." que quedaron fuera de una sección.
  cleaned = cleaned
    .split('\n')
    .filter((line) => !/^\s*[-*]\s*\*\*\s*(prioridad|story\s*points?|sp)\s*\*\*\s*:/i.test(line))
    .join('\n');

  return cleaned.trim();
}

/**
 * Indica si un issue cambió en GitHub después de la última sincronización.
 */
export function hasGitHubIssueChanged(issue: GitHubIssue, syncedAt?: Date | string | null): boolean {
  if (!syncedAt) return true;
  return new Date(issue.updated_at).getTime() > new Date(syncedAt).getTime();
}

/**
 * Extrae criterios de aceptación del cuerpo de un issue.
 * Busca secciones comunes: "Criterios de aceptación", "Acceptance Criteria",
 * listas con checkboxes o un único párrafo bajo el encabezado.
 *
 * Estrategias en orden:
 * 1. Sección con bullets (- / * / checkbox) → cada bullet es un criterio.
 * 2. Sección sin bullets → toma los párrafos (uno o más) que siguen al header.
 * 3. Fallback global → busca cualquier bullet/checkbox en todo el cuerpo.
 */
function extractAcceptanceCriteria(body: string): string[] {
  if (!body) return [];

  // Buscar sección de criterios de aceptación
  const sectionRegex = /(?:criterios?\s+de\s+aceptaci[oó]n|acceptance\s+criteria)[:\s]*\n?((?:\s*[-*]\s*.+\n?)*)/i;
  const sectionMatch = body.match(sectionRegex);

  if (sectionMatch) {
    const sectionContent = (sectionMatch[1] || '').trim();

    // Caso 1: criterios listados con bullets dentro de la sección
    if (sectionContent) {
      const bulletCriteria = sectionContent
        .split('\n')
        .map((line) => line.replace(/^[\s*+-]+/, '').trim())
        .filter((line) => line.length > 0);
      if (bulletCriteria.length > 0) return bulletCriteria.slice(0, 10);
    }

    // Caso 2: sin bullets CSS. Tomamos el texto de la sección completa
    // y lo partimos por líneas en blanco (párrafos).
    const headerIndex = body.search(sectionRegex);
    const afterHeader = body.slice(headerIndex + (sectionMatch[0] || '').length).trim();

    // El texto hasta el siguiente encabezado "## " o hasta el fin del body
    const rawSection = afterHeader.split(/^##\s+/m)[0]?.trim() || '';
    if (rawSection.length >= 10) {
      return rawSection
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 10)
        .slice(0, 10);
    }
  }

  // Fallback: buscar checkboxes o listas con guiones en todo el body
  const lines = body.split('\n');
  const criteria = lines
    .filter((line) => /^\s*[-*]\s+\[?[ x]?\]?/.test(line))
    .map((line) => line.replace(/^[\s*+-]+\[?[ x]?\]?\s*/, '').trim())
    .filter((line) => line.length >= 10);

  return criteria.slice(0, 10);
}

/**
 * Mapea labels de GitHub a prioridad del sistema.
 */
function mapPriority(labels: string[]): string {
  const lowerLabels = labels.map((l) => l.toLowerCase());
  if (lowerLabels.includes('p0') || lowerLabels.includes('critical') || lowerLabels.includes('alta')) {
    return 'HIGH';
  }
  if (lowerLabels.includes('p2') || lowerLabels.includes('baja') || lowerLabels.includes('low')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

/**
 * Mapea labels de GitHub a severidad del sistema.
 * Labels reconocidos: critical, high, medium, low, p0, p1, p2, alta, baja.
 */
export function mapSeverity(labels: string[]): string {
  const lowerLabels = labels.map((l) => l.toLowerCase());
  if (lowerLabels.includes('critical') || lowerLabels.includes('p0') || lowerLabels.includes('alta')) {
    return 'CRITICAL';
  }
  if (lowerLabels.includes('high') || lowerLabels.includes('p1')) {
    return 'HIGH';
  }
  if (lowerLabels.includes('low') || lowerLabels.includes('p2') || lowerLabels.includes('baja')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

/**
 * Extrae pasos para reproducir del cuerpo del issue.
 * Busca secciones: "Pasos para reproducir", "Steps to reproduce", "Reproduction steps".
 */
function extractStepsToReproduce(body: string): string[] {
  if (!body) return [];

  const sectionRegex = /(?:pasos?\s+para\s+reproducir|steps?\s+to\s+reproduce|reproduction\s+steps?)[:\s]*\n?((?:\s*[-*]\s*.+\n?)*)/i;
  const sectionMatch = body.match(sectionRegex);

  if (sectionMatch?.[1]) {
    const steps = sectionMatch[1]
      .split('\n')
      .map((line) => line.replace(/^[\s*+-]+/, '').trim())
      .filter((line) => line.length > 0);
    if (steps.length > 0) return steps.slice(0, 10);
  }

  return [];
}

/**
 * Importa issues de GitHub como BugReports.
 * Función pura de mapeo: convierte un issue de GitHub a datos de BugReport.
 *
 * @param issue - Issue de GitHub
 * @returns Datos listos para crear un BugReport
 */
export function mapIssueToBugReport(issue: GitHubIssue): {
  title: string;
  description: string;
  severity: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  githubIssueNumber: number;
  githubUrl: string;
  assignee: string | null;
  labels: string[];
  branchName: string | null;
} {
  const body = issue.body || '';
  const stepsToReproduce = extractStepsToReproduce(body);

  // Mapear labels de severidad
  const severity = mapSeverity(issue.labels.map((l) => l.name));

  // Extraer resultado esperado/real del cuerpo si existe
  const expectedMatch = body.match(/(?:resultado\s+esperado|expected\s+result)[:\s]*\n?([^\n]+)/i);
  const actualMatch = body.match(/(?:resultado\s+real|actual\s+result)[:\s]*\n?([^\n]+)/i);
  const branchName = body.match(/\*\*Rama:\*\*\s*`?([^`\n]+)`?/i)?.[1]?.trim() || null;

  return {
    title: issue.title,
    description: body || issue.title,
    severity,
    stepsToReproduce,
    expectedResult: expectedMatch?.[1]?.trim() || '',
    actualResult: actualMatch?.[1]?.trim() || '',
    githubIssueNumber: issue.number,
    githubUrl: issue.html_url,
    assignee: issue.assignee?.login || issue.assignees?.[0]?.login || null,
    labels: issue.labels.map((label) => label.name),
    branchName,
  };
}

/**
 * Obtiene las ramas de un repositorio.
 *
 * @param repoUrl - URL del repositorio
 * @returns Lista de nombres de ramas
 */
export async function fetchBranches(
  repoUrl: string,
  tokenOverride?: string | null
): Promise<string[]> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error(`URL de repositorio inválida: ${repoUrl}`);

  const token = getGitHubToken(tokenOverride);

  const url = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`;

  const branches = (await fetchGitHubJson(url, token)) as Array<{ name: string }>;
  return branches.map((b) => b.name);
}

/** Obtiene los usuarios con acceso al repositorio para asignar issues. */
export async function fetchCollaborators(
  repoUrl: string,
  tokenOverride?: string | null
): Promise<Array<{ login: string; avatarUrl?: string }>> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error(`URL de repositorio inválida: ${repoUrl}`);
  const token = getGitHubToken(tokenOverride);
  const collaborators = await fetchGitHubJson(
    `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/collaborators?per_page=100`,
    token
  ) as Array<{ login: string; avatar_url?: string }>;
  return collaborators.map((user) => ({ login: user.login, avatarUrl: user.avatar_url }));
}

/**
 * Obtiene los PRs de un repositorio.
 *
 * @param repoUrl - URL del repositorio
 * @param state - Estado de los PRs
 * @returns Lista de PRs con número, título, rama y URL
 */
export async function fetchPullRequests(
  repoUrl: string,
  state: 'open' | 'closed' | 'all' = 'open',
  tokenOverride?: string | null
): Promise<Array<{ number: number; title: string; branch: string; url: string; state: string }>> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error(`URL de repositorio inválida: ${repoUrl}`);

  const token = getGitHubToken(tokenOverride);

  const url = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/pulls?state=${state}&per_page=100`;

  const prs = (await fetchGitHubJson(url, token)) as Array<{
    number: number;
    title: string;
    head?: { ref?: string };
    html_url: string;
    state: string;
  }>;

  return prs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    branch: pr.head?.ref || 'unknown',
    url: pr.html_url,
    state: pr.state,
  }));
}

/**
 * Actualiza un issue de GitHub (HDU-012).
 *
 * Permite sincronizar los cambios de la HDU (título, descripción, criterios de
 * aceptación, prioridad, story points) con el issue original de GitHub. Se usa
 * cuando el usuario aplica mejoras DoR y quiere "pushear" los cambios al repo.
 *
 * @param repoUrl - URL del repositorio (https://github.com/owner/repo)
 * @param issueNumber - Número del issue a actualizar
 * @param updates - Campos a actualizar (title, body, state)
 * @param tokenOverride - Token opcional del proyecto (si no se usa el global)
 * @returns El issue actualizado
 * @throws Error si el token no está configurado o la API responde con error
 */
export async function updateGitHubIssue(
  repoUrl: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
    assignees?: string[];
  },
  tokenOverride?: string | null
): Promise<{ number: number; title: string; html_url: string; state: string }> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) throw new Error(`URL de repositorio inválida: ${repoUrl}`);

  const token = getGitHubToken(tokenOverride);

  // Construir solo los campos que se van a actualizar
  const body: Record<string, string | string[]> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.body !== undefined) body.body = updates.body;
  if (updates.state !== undefined) body.state = updates.state;
  if (updates.labels !== undefined) body.labels = updates.labels;
  if (updates.assignees !== undefined) body.assignees = updates.assignees;

  if (Object.keys(body).length === 0) {
    throw new Error('No se proporcionaron campos para actualizar (title, body, state, labels, assignees).');
  }

  const url = `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/issues/${issueNumber}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'QA-SaaS-Platform',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error al actualizar issue #${issueNumber}: ${response.status} - ${errorBody}`);
  }

  const updated = await response.json() as {
    number: number;
    title: string;
    html_url: string;
    state: string;
  };

  return updated;
}

/**
 * Construye el cuerpo del issue de GitHub a partir de los datos de la HDU (HDU-012).
 *
 * Genera un cuerpo Markdown estructurado con los campos de la HDU, incluyendo
 * la referencia al issue original. Se usa para sincronizar los cambios del
 * SaaS con el issue en GitHub.
 *
 * @param hdu - Datos de la historia de usuario
 * @returns Texto Markdown listo para usar como cuerpo del issue
 */
export function buildIssueBodyFromHdu(hdu: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  definitionOfDone?: string[] | null;
  technicalNotes?: string[] | null;
  evidences?: string[] | null;
  dependencies?: string[] | null;
  assignee?: string | null;
  labels?: string[] | null;
  branchName?: string | null;
  priority: string;
  storyPoints?: number | null;
  displayId?: string | null;
  githubUrl?: string | null;
}): string {
  const lines: string[] = [];

  // Referencia al issue original (si existe)
  if (hdu.githubUrl) {
    lines.push(`🔗 Issue original: ${hdu.githubUrl}`);
    lines.push('');
  }

  // ID de la HDU en el SaaS
  if (hdu.displayId) {
    lines.push(`**ID:** ${hdu.displayId}`);
    lines.push('');
  }

  // Descripción: se limpia de secciones que tienen campo propio (criterios,
  // DoD, metadatos) para no duplicar información en el issue.
  const descriptionText = cleanIssueDescription(hdu.description || '');
  const hasReference = descriptionText.toLowerCase().includes('issue original:') ||
    descriptionText.includes('🔗');

  if (hasReference) {
    lines.push(descriptionText);
  } else if (descriptionText) {
    lines.push(descriptionText);
    if (hdu.githubUrl) {
      lines.push('');
      lines.push(`---`);
      lines.push(`🔗 Issue original: ${hdu.githubUrl}`);
    }
  } else {
    lines.push(`Issue original: ${hdu.githubUrl || 'N/A'}`);
  }

  lines.push('');

  // Criterios de aceptación
  if (hdu.acceptanceCriteria && hdu.acceptanceCriteria.length > 0) {
    lines.push('## Criterios de Aceptación');
    lines.push('');
    for (const criterion of hdu.acceptanceCriteria) {
      lines.push(`- ${criterion}`);
    }
    lines.push('');
  }

  // Definition of Done
  if (hdu.definitionOfDone && hdu.definitionOfDone.length > 0) {
    lines.push('## Definition of Done');
    lines.push('');
    for (const criterion of hdu.definitionOfDone) {
      lines.push(`- ${criterion}`);
    }
    lines.push('');
  }

  // Notas Técnicas
  if (hdu.technicalNotes && hdu.technicalNotes.length > 0) {
    lines.push('## Notas Técnicas');
    lines.push('');
    for (const note of hdu.technicalNotes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Evidencias
  if (hdu.evidences && hdu.evidences.length > 0) {
    lines.push('## Evidencias');
    lines.push('');
    for (const ev of hdu.evidences) {
      lines.push(`- ${ev}`);
    }
    lines.push('');
  }

  // Dependencias
  if (hdu.dependencies && hdu.dependencies.length > 0) {
    lines.push('## Dependencias');
    lines.push('');
    for (const dep of hdu.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  // Metadatos (incluye asignación, labels y rama de trabajo)
  lines.push('## Metadatos');
  lines.push('');
  lines.push(`- **Prioridad:** ${hdu.priority || 'MEDIUM'}`);
  if (hdu.storyPoints) {
    lines.push(`- **Story Points:** ${hdu.storyPoints}`);
  }
  if (hdu.assignee) {
    lines.push(`- **Asignado a:** ${hdu.assignee}`);
  }
  if (hdu.labels && hdu.labels.length > 0) {
    lines.push(`- **Labels:** ${hdu.labels.join(', ')}`);
  }
  if (hdu.branchName) {
    lines.push(`- **Rama:** \`${hdu.branchName}\``);
  }

  return lines.join('\n');
}

export default {
  fetchIssues,
  fetchBranches,
  fetchCollaborators,
  fetchPullRequests,
  mapIssueToUserStory,
  hasGitHubIssueChanged,
  parseRepoUrl,
  updateGitHubIssue,
  buildIssueBodyFromHdu,
};
