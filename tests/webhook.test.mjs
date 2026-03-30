import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNotionSignature,
  isRelevantNotionEvent,
  verifyNotionSignature,
} from '../scripts/lib/notion/webhook.mjs';

test('verifyNotionSignature accepte une charge utile signée avec le verification_token', () => {
  const rawBody = JSON.stringify({
    entity: { id: 'pub-1', type: 'page' },
    type: 'page.content_updated',
  });
  const verificationToken = 'secret_123';
  const signature = computeNotionSignature(rawBody, verificationToken);

  assert.equal(
    verifyNotionSignature({
      rawBody,
      signature,
      verificationToken,
    }),
    true,
  );
  assert.equal(
    verifyNotionSignature({
      rawBody,
      signature,
      verificationToken: 'secret_456',
    }),
    false,
  );
});

test('isRelevantNotionEvent filtre les événements éditoriaux sur les data sources pilotées', () => {
  assert.equal(
    isRelevantNotionEvent(
      {
        data: { parent: { id: 'ds-publications', type: 'data_source' } },
        entity: { id: 'page-1', type: 'page' },
        type: 'page.content_updated',
      },
      ['ds-publications'],
    ),
    true,
  );

  assert.equal(
    isRelevantNotionEvent(
      {
        entity: { id: 'comment-1', type: 'comment' },
        type: 'comment.created',
      },
      ['ds-publications'],
    ),
    false,
  );
});
