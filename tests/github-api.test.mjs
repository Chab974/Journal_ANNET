import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGitHubRepositoryConfig } from '../scripts/lib/github-api.mjs';

test('resolveGitHubRepositoryConfig récupère owner et repo depuis les variables Vercel', () => {
  const config = resolveGitHubRepositoryConfig(
    {
      GITHUB_WEBHOOK_TOKEN: 'gh_secret',
      VERCEL_GIT_REPO_OWNER: 'Chab974',
      VERCEL_GIT_REPO_SLUG: 'Journal_ANNET',
    },
    { tokenRequired: true },
  );

  assert.deepEqual(config, {
    owner: 'Chab974',
    repositoryName: 'Journal_ANNET',
    token: 'gh_secret',
  });
});

test('resolveGitHubRepositoryConfig priorise les variables GitHub explicites sur le fallback Vercel', () => {
  const config = resolveGitHubRepositoryConfig(
    {
      GITHUB_REPOSITORY_NAME: 'repo-explicite',
      GITHUB_REPOSITORY_OWNER: 'owner-explicite',
      GITHUB_TOKEN: 'gh_secret',
      VERCEL_GIT_REPO_OWNER: 'owner-vercel',
      VERCEL_GIT_REPO_SLUG: 'repo-vercel',
    },
    { tokenRequired: true },
  );

  assert.deepEqual(config, {
    owner: 'owner-explicite',
    repositoryName: 'repo-explicite',
    token: 'gh_secret',
  });
});
