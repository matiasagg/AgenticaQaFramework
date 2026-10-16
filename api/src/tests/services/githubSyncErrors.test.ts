import { toGitHubSyncApiError } from '../../services/githubSyncErrors';

describe('GitHub sync errors', () => {
  it('does not expose provider credential failures as SaaS session failures', () => {
    const error = toGitHubSyncApiError(new Error(
      'GitHub API error al actualizar issue #48: 401 - {"message":"Bad credentials"}',
    ));

    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('GitHub PAT');
  });

  it('keeps other provider failures as upstream errors', () => {
    const error = toGitHubSyncApiError(new Error('GitHub API error al actualizar issue #48: 404'));

    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('Error al sincronizar con GitHub');
  });
});
