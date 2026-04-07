import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseVercelDeployHookFailure,
  triggerVercelDeployHook,
} from '../scripts/lib/vercel-deploy-hook.mjs'

test('parseVercelDeployHookFailure extrait le reset d’un quota horaire Vercel structuré', () => {
  const now = Date.parse('2026-04-07T22:39:36.728Z')
  const failure = parseVercelDeployHookFailure({
    details: JSON.stringify({
      error: {
        code: 'api-deploy-hook-trigger',
        limit: {
          total: 60,
          remaining: 0,
          reset: 1775605176728,
        },
        message:
          'Too many requests - try again in 60 minutes (more than 60, code: "api-deploy-hook-trigger").',
      },
    }),
    now,
    status: 429,
  })

  assert.equal(failure.code, 'api-deploy-hook-trigger')
  assert.equal(failure.limit.total, 60)
  assert.equal(failure.limit.remaining, 0)
  assert.equal(failure.limit.resetAt, '2026-04-07T23:39:36.728Z')
  assert.equal(failure.retryAfterMs, 60 * 60 * 1000)
  assert.equal(failure.retryAt, '2026-04-07T23:39:36.728Z')
})

test('parseVercelDeployHookFailure reconnait une limite quotidienne Vercel en texte brut', () => {
  const now = Date.parse('2026-04-08T08:00:00.000Z')
  const failure = parseVercelDeployHookFailure({
    details:
      'Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day").',
    now,
    status: 429,
  })

  assert.equal(failure.code, 'api-deployments-free-per-day')
  assert.equal(failure.retryAfterMs, 24 * 60 * 60 * 1000)
  assert.equal(failure.retryAt, '2026-04-09T08:00:00.000Z')
})

test('triggerVercelDeployHook renvoie un résultat ok quand Vercel accepte le deploy hook', async () => {
  const result = await triggerVercelDeployHook({
    deployHookUrl: 'https://vercel.test/deploy',
    fetchImpl: async () => ({
      headers: {
        get(name) {
          return name.toLowerCase() === 'content-type' ? 'application/json' : ''
        },
      },
      json: async () => ({
        job: {
          id: 'deploy-1',
        },
      }),
      ok: true,
      status: 201,
    }),
  })

  assert.equal(result.ok, true)
  assert.equal(result.job.id, 'deploy-1')
  assert.equal(result.status, 201)
})
