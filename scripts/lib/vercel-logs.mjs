export function buildVercelLogsArgs({
  environment = 'production',
  follow = true,
  query = '',
  target,
} = {}) {
  if (!target) {
    throw new Error('Cible Vercel manquante pour suivre les logs.');
  }

  const args = ['logs', target, '--environment', environment];

  if (follow) {
    args.push('--follow');
  }

  if (query) {
    args.push('--query', query);
  }

  return args;
}

export function formatLocalLogLine(line, {
  source = 'stdout',
  timestamp = new Date(),
} = {}) {
  const normalized = String(line ?? '').replace(/\r?\n$/, '');
  return `[${timestamp.toISOString()}] [${source}] ${normalized}\n`;
}
