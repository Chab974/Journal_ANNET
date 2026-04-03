import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

import { readRawRequestBody } from '../scripts/lib/request-body.mjs';

test('readRawRequestBody lit le flux brut d’une requête Node sans accéder à request.body', async () => {
  let bodyGetterAccessed = false;
  const request = Readable.from(['{"a":1}']);

  Object.defineProperty(request, 'body', {
    get() {
      bodyGetterAccessed = true;
      return { a: 1 };
    },
  });

  const rawBody = await readRawRequestBody(request);

  assert.equal(rawBody, '{"a":1}');
  assert.equal(bodyGetterAccessed, false);
});

test('readRawRequestBody lit une requête Web via text()', async () => {
  const request = new Request('https://example.test/webhook', {
    body: '{"a":1}',
    method: 'POST',
  });

  const rawBody = await readRawRequestBody(request);

  assert.equal(rawBody, '{"a":1}');
});
