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
  const token = (tokenOverride ?? process.env.GITHUB_TOKEN ?? config.github.token ?? '').trim();

  if (!token || /^your[-_ ]?github/i.test(token) || /placeholder|example|sample/i.test(token)) {
    throw new Error('GITHUB_TOKEN no configurado. Configura un token real de GitHub en el proyecto o en api/.env');
  }

  return token;
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

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'QA-SaaS-Platform',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  // Filtrar PRs (la API de issues incluye los PRs también)
  const issues = (await response.json()) as GitHubIssue[];
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
  priority: string;
  githubIssueNumber: number;
  githubUrl: string;
} {
  // Extraer criterios de aceptación del cuerpo del issue (secciones comunes)
  const body = issue.body || '';
  const acceptanceCriteria = extractAcceptanceCriteria(body);

  // Mapear labels de prioridad
  const priority = mapPriority(issue.labels.map((l) => l.name));

  return {
    title: issue.title,
    description: body || issue.title,
    acceptanceCriteria,
    priority,
    githubIssueNumber: issue.number,
    githubUrl: issue.html_url,
  };
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
 * o listas con checkboxes.
 */
function extractAcceptanceCriteria(body: string): string[] {
  if (!body) return [];

  // Buscar sección de criterios de aceptación
  const sectionRegex = /(?:criterios?\s+de\s+aceptaci[oó]n|acceptance\s+criteria)[:\s]*\n?((?:\s*[-*]\s*.+\n?)*)/i;
  const sectionMatch = body.match(sectionRegex);
  if (sectionMatch?.[1]) {
    return sectionMatch[1]
      .split('\n')
      .map((line) => line.replace(/^[\s*+-]+/, '').trim())
      .filter((line) => line.length > 0);
  }

  // Fallback: buscar checkboxes o listas con guiones
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

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'QA-SaaS-Platform',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const branches = (await response.json()) as Array<{ name: string }>;
  return branches.map((b) => b.name);
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

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'QA-SaaS-Platform',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  const prs = (await response.json()) as Array<{
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

export default {
  fetchIssues,
  fetchBranches,
  fetchPullRequests,
  mapIssueToUserStory,
  hasGitHubIssueChanged,
  parseRepoUrl,
};