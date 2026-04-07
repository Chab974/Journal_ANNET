const retryWindowUnits = new Map([
  ['minute', 60 * 1000],
  ['minutes', 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['hours', 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['days', 24 * 60 * 60 * 1000],
])

const vercelRateLimitCodes = new Set([
  'api-deploy-hook-trigger',
  'api-deployments-free-per-day',
])

function toFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function tryParseJson(input) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return null
  }

  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function extractErrorCode(input) {
  if (typeof input !== 'string') {
    return null
  }

  const match = input.match(/code:\s*"([^"]+)"/i)
  return match?.[1] ?? null
}

export function parseRetryAfterMs(input) {
  if (typeof input !== 'string') {
    return null
  }

  const match = input.match(/(?:try again in\s+)?(\d+)\s*(minute|minutes|hour|hours|day|days)\b/i)
  if (!match) {
    return null
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multiplier = retryWindowUnits.get(unit)

  if (!Number.isFinite(amount) || !multiplier) {
    return null
  }

  return amount * multiplier
}

export function parseVercelDeployHookFailure({
  details,
  now = Date.now(),
  status,
}) {
  const rawDetails = String(details ?? '').trim()
  const parsed = tryParseJson(rawDetails)
  const error = parsed?.error ?? null
  const code = typeof error?.code === 'string' ? error.code : extractErrorCode(rawDetails)
  const message =
    typeof error?.message === 'string' && error.message.trim().length > 0
      ? error.message.trim()
      : rawDetails

  const reset = toFiniteNumber(error?.limit?.reset)
  const retryAfterMs =
    (reset !== null ? Math.max(reset - now, 0) : null) ??
    parseRetryAfterMs(message) ??
    parseRetryAfterMs(rawDetails)

  const isRateLimited =
    status === 429 ||
    vercelRateLimitCodes.has(code) ||
    /too many requests|rate[_ -]?limited|resource is limited/i.test(`${message}\n${rawDetails}`)

  if (!isRateLimited) {
    return null
  }

  const retryAt =
    reset !== null
      ? new Date(reset).toISOString()
      : retryAfterMs !== null
        ? new Date(now + retryAfterMs).toISOString()
        : null

  const total = toFiniteNumber(error?.limit?.total)
  const remaining = toFiniteNumber(error?.limit?.remaining)
  const limit =
    total !== null || remaining !== null || reset !== null
      ? {
          remaining,
          reset,
          resetAt: reset !== null ? new Date(reset).toISOString() : retryAt,
          total,
        }
      : null

  return {
    code,
    details: rawDetails,
    limit,
    message,
    retryAfterMs,
    retryAt,
    status,
  }
}

export function toRateLimitedDeployResult(failure, source = 'live') {
  return {
    code: failure?.code ?? null,
    limit: failure?.limit ?? null,
    message: failure?.message ?? '',
    ok: false,
    rateLimited: true,
    retryAfterMs: failure?.retryAfterMs ?? null,
    retryAt: failure?.retryAt ?? null,
    skipped: true,
    source,
    status: failure?.status ?? 429,
  }
}

export async function triggerVercelDeployHook({
  deployHookUrl,
  fetchImpl = global.fetch,
  now = Date.now(),
} = {}) {
  if (!deployHookUrl) {
    throw new Error('Variable VERCEL_DEPLOY_HOOK_URL manquante pour relancer le déploiement Vercel.');
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch indisponible pour appeler le deploy hook Vercel.');
  }

  const response = await fetchImpl(deployHookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'journal-annet-webhook',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    const rateLimitFailure = parseVercelDeployHookFailure({
      details,
      now,
      status: response.status,
    });

    if (rateLimitFailure) {
      return toRateLimitedDeployResult(rateLimitFailure);
    }

    throw new Error(`Échec du deploy hook Vercel (${response.status}): ${details}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return {
      ...(await response.json()),
      ok: true,
      status: response.status,
    };
  }

  return {
    ok: true,
    status: response.status,
  };
}
