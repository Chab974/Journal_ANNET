import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { fromRepo } from '../scripts/lib/utils.mjs';

test('vercel.json expose les headers de sécurité attendus', async () => {
  const rawConfig = await readFile(fromRepo('vercel.json'), 'utf8');
  const config = JSON.parse(rawConfig);

  assert.ok(Array.isArray(config.headers));
  assert.ok(config.headers.length > 0);

  const globalHeaders = config.headers.find((entry) => entry.source === '/(.*)');
  assert.ok(globalHeaders);

  const headerMap = new Map(globalHeaders.headers.map((header) => [header.key, header.value]));

  assert.match(headerMap.get('Content-Security-Policy'), /default-src 'self'/);
  assert.match(headerMap.get('Content-Security-Policy'), /script-src 'self'/);
  assert.match(headerMap.get('Content-Security-Policy'), /style-src 'self'/);
  assert.match(headerMap.get('Content-Security-Policy'), /img-src 'self' data:/);
  assert.match(headerMap.get('Strict-Transport-Security'), /includeSubDomains/);
  assert.equal(headerMap.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headerMap.get('X-Frame-Options'), 'DENY');
  assert.equal(headerMap.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headerMap.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
});
