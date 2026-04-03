import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVercelLogsArgs, formatLocalLogLine } from '../scripts/lib/vercel-logs.mjs';

test('buildVercelLogsArgs construit la commande Vercel attendue', () => {
  assert.deepEqual(
    buildVercelLogsArgs({
      environment: 'production',
      query: 'Notion webhook',
      target: 'journal-annet.vercel.app',
    }),
    ['logs', 'journal-annet.vercel.app', '--environment', 'production', '--follow', '--query', 'Notion webhook'],
  );
});

test('formatLocalLogLine préfixe les lignes avec une date ISO et une source', () => {
  assert.equal(
    formatLocalLogLine('message test', {
      source: 'stderr',
      timestamp: new Date('2026-04-03T19:30:00.000Z'),
    }),
    '[2026-04-03T19:30:00.000Z] [stderr] message test\n',
  );
});
