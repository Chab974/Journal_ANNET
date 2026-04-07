const githubApiBaseUrl = 'https://api.github.com';

function splitRepositorySlug(value) {
  const [owner, repositoryName] = String(value ?? '').split('/');
  return {
    owner: owner?.trim() || null,
    repositoryName: repositoryName?.trim() || null,
  };
}

function toJsonBody(body) {
  if (body === undefined || body === null) {
    return undefined;
  }

  return typeof body === 'string' ? body : JSON.stringify(body);
}

export function parsePositiveInteger(value, label) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} invalide.`);
  }

  return parsed;
}

export function resolveGitHubRepositoryConfig(env = process.env, { tokenRequired = true } = {}) {
  const repository = splitRepositorySlug(env.GITHUB_REPOSITORY);
  const owner = env.GITHUB_REPOSITORY_OWNER || repository.owner;
  const repositoryName = env.GITHUB_REPOSITORY_NAME || repository.repositoryName;
  const token = env.GITHUB_API_TOKEN || env.GITHUB_WEBHOOK_TOKEN || env.GITHUB_TOKEN || null;

  if (!owner || !repositoryName) {
    throw new Error('Variables GitHub manquantes: GITHUB_REPOSITORY_OWNER et GITHUB_REPOSITORY_NAME.');
  }

  if (tokenRequired && !token) {
    throw new Error('Token GitHub manquant. Définir GITHUB_API_TOKEN, GITHUB_WEBHOOK_TOKEN ou GITHUB_TOKEN.');
  }

  return {
    owner,
    repositoryName,
    token,
  };
}

export async function githubRequest(
  config,
  path,
  {
    body,
    expectedStatus = null,
    fetchImpl = global.fetch,
    headers = {},
    method = 'GET',
  } = {},
) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch indisponible pour appeler l’API GitHub.');
  }

  const response = await fetchImpl(`${githubApiBaseUrl}${path}`, {
    body: toJsonBody(body),
    headers: {
      Accept: 'application/vnd.github+json',
      ...(config?.token ? { Authorization: `Bearer ${config.token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'User-Agent': 'journal-annet-reconcile',
      ...headers,
    },
    method,
  });

  if (expectedStatus !== null && response.status !== expectedStatus) {
    const details = await response.text();
    throw new Error(`Échec GitHub ${method} ${path} (${response.status}): ${details}`);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec GitHub ${method} ${path} (${response.status}): ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function fetchGitHubIssue(config, { issueNumber, fetchImpl } = {}) {
  return githubRequest(config, `/repos/${config.owner}/${config.repositoryName}/issues/${issueNumber}`, {
    expectedStatus: 200,
    fetchImpl,
    method: 'GET',
  });
}

export async function updateGitHubIssue(config, { body, issueNumber, title, fetchImpl } = {}) {
  return githubRequest(config, `/repos/${config.owner}/${config.repositoryName}/issues/${issueNumber}`, {
    body: {
      ...(body !== undefined ? { body } : {}),
      ...(title ? { title } : {}),
    },
    expectedStatus: 200,
    fetchImpl,
    method: 'PATCH',
  });
}

export async function dispatchGitHubWorkflow(
  config,
  {
    fetchImpl,
    inputs = {},
    ref = 'main',
    workflowFile,
  } = {},
) {
  if (!workflowFile) {
    throw new Error('workflowFile GitHub manquant.');
  }

  await githubRequest(
    config,
    `/repos/${config.owner}/${config.repositoryName}/actions/workflows/${workflowFile}/dispatches`,
    {
      body: {
        inputs,
        ref,
      },
      expectedStatus: 204,
      fetchImpl,
      method: 'POST',
    },
  );

  return {
    dispatched: true,
    workflowFile,
  };
}
