const DEFAULT_ALLOWED_REGISTRY_HOSTS = ['registry.npmjs.org'];

export function collectLockfileValidationIssues(
  lockfile,
  {
    allowedRegistryHosts = DEFAULT_ALLOWED_REGISTRY_HOSTS,
  } = {},
) {
  const issues = [];
  const allowedHosts = new Set(allowedRegistryHosts);

  if (!lockfile || typeof lockfile !== 'object' || Array.isArray(lockfile)) {
    return ['Le lockfile doit être un objet JSON valide.'];
  }

  if (!lockfile.packages || typeof lockfile.packages !== 'object' || Array.isArray(lockfile.packages)) {
    return ['Le lockfile doit exposer une section "packages".'];
  }

  for (const [packagePath, metadata] of Object.entries(lockfile.packages)) {
    if (!packagePath || !metadata || typeof metadata !== 'object') {
      continue;
    }

    if (metadata.link) {
      continue;
    }

    const packageLabel = packagePath;

    if (typeof metadata.resolved !== 'string' || !metadata.resolved.trim()) {
      issues.push(`${packageLabel}: champ "resolved" manquant.`);
      continue;
    }

    let resolvedUrl;
    try {
      resolvedUrl = new URL(metadata.resolved);
    } catch {
      issues.push(`${packageLabel}: URL "resolved" invalide (${metadata.resolved}).`);
      continue;
    }

    if (resolvedUrl.protocol !== 'https:') {
      issues.push(`${packageLabel}: protocole interdit pour "resolved" (${resolvedUrl.protocol}).`);
    }

    if (!allowedHosts.has(resolvedUrl.hostname)) {
      issues.push(`${packageLabel}: hôte npm non autorisé (${resolvedUrl.hostname}).`);
    }

    if (typeof metadata.integrity !== 'string' || !metadata.integrity.trim()) {
      issues.push(`${packageLabel}: champ "integrity" manquant.`);
    }
  }

  return issues;
}

export function assertLockfileIsValid(lockfile, options = {}) {
  const issues = collectLockfileValidationIssues(lockfile, options);
  if (issues.length > 0) {
    const error = new Error(`Lockfile invalide:\n- ${issues.join('\n- ')}`);
    error.issues = issues;
    throw error;
  }
}
