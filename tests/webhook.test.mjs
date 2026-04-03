import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNotionSignature,
  extractPageParentIds,
  isRelevantNotionEvent,
  isRelevantNotionEventWithResolver,
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
        data: { parent: { data_source_id: 'ds-publications', id: 'workspace-1', type: 'workspace' } },
        entity: { id: 'page-2', type: 'page' },
        type: 'page.properties_updated',
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

test('isRelevantNotionEventWithResolver retrouve la data source d’une page quand le payload ne la porte pas', async () => {
  const result = await isRelevantNotionEventWithResolver(
    {
      data: { parent: { id: 'workspace-1', type: 'space' } },
      entity: { id: 'page-2', type: 'page' },
      type: 'page.properties_updated',
    },
    ['ds-publications'],
    async () => ({
      id: 'page-2',
      parent: {
        data_source_id: 'ds-publications',
        type: 'data_source_id',
      },
    }),
  );

  assert.equal(result, true);
});

test('extractPageParentIds récupère les identifiants de parent utiles pour le filtrage', () => {
  assert.deepEqual(
    extractPageParentIds({
      parent: {
        data_source_id: 'ds-publications',
        database_id: 'db-legacy',
        id: 'workspace-1',
        type: 'data_source_id',
      },
    }),
    ['workspace-1', 'ds-publications', 'db-legacy', 'ds-publications'],
  );
});
