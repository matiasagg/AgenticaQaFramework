import { ApiError } from '../middleware/errorHandler';

/**
 * Converts provider errors into API errors without confusing them with the
 * SaaS authentication session. A GitHub 401 is an invalid project PAT, not an
 * invalid JWT for the currently authenticated user.
 */
export function toGitHubSyncApiError(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : String(error);

  if (/GitHub API error al actualizar issue #[^:]+: 401\b/i.test(message)) {
    return new ApiError(
      'GitHub rechazó las credenciales del proyecto (401 Bad credentials). Actualiza el GitHub PAT en la configuración del proyecto; no uses aquí un token de Azure DevOps.',
      502,
    );
  }

  return new ApiError(`Error al sincronizar con GitHub: ${message}`, 502);
}
